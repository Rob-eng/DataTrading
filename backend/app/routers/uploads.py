import logging
import os
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Tuple, Any
import pandas as pd
import io
from decimal import Decimal, InvalidOperation

from .. import crud, models, schemas
from ..database import get_db
from ..core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/uploads",
    tags=["Uploads"],
    responses={404: {"description": "Não encontrado"}},
)

class CSVProcessingError(Exception):
    """Exceção customizada para erros de processamento de CSV"""
    pass

class NumericCleaningUtility:
    """Utilitário para limpeza de valores numéricos com diferentes formatos"""
    
    @staticmethod
    def clean_decimal_string(value: Any, allow_comma_as_decimal: bool = True) -> Optional[float]:
        """
        Limpa e converte string numérica para float, tratando vírgulas como decimais.
        
        Args:
            value: Valor a ser convertido
            allow_comma_as_decimal: Se True, trata vírgula como separador decimal
            
        Returns:
            float ou None se conversão falhar
        """
        if pd.isna(value) or value is None:
            return None
            
        # Converte para string e remove espaços
        str_value = str(value).strip()
        if not str_value or str_value.lower() in ['nan', 'null', '']:
            return None
        
        try:
            # Remove caracteres não numéricos exceto pontos, vírgulas e sinais
            # Mantém apenas: números, pontos, vírgulas, + e -
            cleaned = re.sub(r'[^\d.,+-]', '', str_value)
            
            if not cleaned:
                return None
            
            # Lida com diferentes formatos numéricos
            if allow_comma_as_decimal:
                # Se tem vírgula e ponto, assume formato brasileiro: 1.234,56
                if ',' in cleaned and '.' in cleaned:
                    # Remove pontos (separadores de milhares) e substitui vírgula por ponto
                    cleaned = cleaned.replace('.', '').replace(',', '.')
                # Se tem apenas vírgula, assume como decimal: 123,45
                elif ',' in cleaned and '.' not in cleaned:
                    cleaned = cleaned.replace(',', '.')
                # Se tem apenas ponto, mantém: 123.45
                # (não precisa fazer nada)
            
            return float(cleaned)
            
        except (ValueError, TypeError) as e:
            logger.warning(f"Falha ao converter valor numérico '{str_value}': {e}")
            return None

class ColumnMapper:
    """Utilitário para mapeamento inteligente de colunas do CSV"""
    
    def __init__(self, df_columns: List[str]):
        self.df_columns = df_columns
        self.columns_lower_map = {col.lower().strip(): col for col in df_columns}
    
    def find_column(self, target_columns: List[str], required: bool = False) -> Optional[str]:
        """
        Encontra uma coluna no DataFrame usando busca case-insensitive.
        
        Args:
            target_columns: Lista de nomes possíveis para a coluna
            required: Se True, levanta exceção se coluna não for encontrada
            
        Returns:
            Nome da coluna encontrada ou None
        """
        for target_col in target_columns:
            target_lower = target_col.lower().strip()
            if target_lower in self.columns_lower_map:
                found_col = self.columns_lower_map[target_lower]
                logger.debug(f"Coluna mapeada: '{target_col}' -> '{found_col}'")
                return found_col
        
        if required:
            raise CSVProcessingError(
                f"Coluna obrigatória não encontrada. Procurado: {target_columns}. "
                f"Disponíveis: {self.df_columns}"
            )
        
        return None
    
    def create_rename_map(self) -> Dict[str, str]:
        """Cria mapa de renomeação para padronizar nomes das colunas"""
        rename_map = {}
        
        # Mapear coluna de abertura
        open_col = self.find_column(settings.OPEN_TIME_COLUMNS, required=True)
        if open_col != 'Abertura':
            rename_map[open_col] = 'Abertura'
        
        # Mapear coluna de fechamento (opcional)
        close_col = self.find_column(settings.CLOSE_TIME_COLUMNS, required=False)
        if close_col and close_col != 'Fechamento':
            rename_map[close_col] = 'Fechamento'
        
        # Mapear coluna de resultado
        result_col = self.find_column(
            [settings.PRIMARY_RESULT_COLUMN_CSV] + settings.FALLBACK_RESULT_COLUMNS_CSV,
            required=True
        )
        if result_col != settings.RESULT_COLUMN_NAME:
            rename_map[result_col] = settings.RESULT_COLUMN_NAME
        
        # Mapear outras colunas opcionais
        ativo_col = self.find_column(settings.ATIVO_COLUMNS, required=False)
        if ativo_col and ativo_col != 'Ativo':
            rename_map[ativo_col] = 'Ativo'
        
        lotes_col = self.find_column(settings.LOTES_COLUMNS, required=False)
        if lotes_col and lotes_col != 'Lotes':
            rename_map[lotes_col] = 'Lotes'
        
        tipo_col = self.find_column(settings.TIPO_COLUMNS, required=False)
        if tipo_col and tipo_col != 'Tipo':
            rename_map[tipo_col] = 'Tipo'
        
        # Mapear coluna de robô (para Excel com múltiplos robôs)
        robo_col = self.find_column(settings.ROBO_COLUMNS, required=False)
        if robo_col and robo_col != settings.ROBO_COLUMN_NAME:
            rename_map[robo_col] = settings.ROBO_COLUMN_NAME
        
        return rename_map

class CSVOperationProcessor:
    """Processador principal para operações de CSV"""
    
    def __init__(self, df: pd.DataFrame, filename: str):
        self.df = df
        self.filename = filename
        self.numeric_cleaner = NumericCleaningUtility()
        self.processed_count = 0
        self.error_count = 0
        self.errors = []
    
    def process_dataframe(self) -> pd.DataFrame:
        """Processa e limpa o DataFrame completo"""
        logger.info(f"Processando CSV '{self.filename}'. Shape: {self.df.shape}")
        logger.info(f"Colunas originais: {list(self.df.columns)}")
        
        # Limpar nomes das colunas
        self.df.columns = self.df.columns.str.strip()
        
        # Mapear colunas
        mapper = ColumnMapper(list(self.df.columns))
        rename_map = mapper.create_rename_map()
        
        if rename_map:
            self.df.rename(columns=rename_map, inplace=True)
            logger.info(f"Colunas renomeadas: {rename_map}")
        
        logger.info(f"Colunas após mapeamento: {list(self.df.columns)}")
        
        return self.df
    
    def process_single_row(self, index: int, row: pd.Series) -> Optional[schemas.OperacaoCreate]:
        """
        Processa uma única linha do CSV.
        
        Returns:
            OperacaoCreate se linha válida, None se deve ser ignorada
        """
        try:
            # Validar campos obrigatórios
            data_abertura_raw = row.get('Abertura')
            resultado_raw = row.get(settings.RESULT_COLUMN_NAME)
            
            if pd.isna(data_abertura_raw) or pd.isna(resultado_raw):
                self._add_error(index, "Campos obrigatórios ausentes (Abertura ou Resultado)")
                return None
            
            # Converter data de abertura - PRESERVAR HORÁRIO EXATO DO ARQUIVO
            try:
                # Usar utc=False para não assumir UTC e manter horário local exato
                data_abertura = pd.to_datetime(data_abertura_raw, dayfirst=True, utc=False, errors='raise')
                # Garantir que seja naive (sem timezone) para preservar horário exato
                if hasattr(data_abertura, 'tz_localize'):
                    data_abertura = data_abertura.tz_localize(None)
                elif data_abertura.tz is not None:
                    data_abertura = data_abertura.replace(tzinfo=None)
            except Exception as e:
                self._add_error(index, f"Data abertura inválida '{data_abertura_raw}': {e}")
                return None
            
            # Converter data de fechamento (opcional) - PRESERVAR HORÁRIO EXATO DO ARQUIVO
            data_fechamento = None
            fechamento_raw = row.get('Fechamento')
            if pd.notna(fechamento_raw):
                try:
                    # Usar utc=False para não assumir UTC e manter horário local exato
                    data_fechamento = pd.to_datetime(fechamento_raw, dayfirst=True, utc=False, errors='raise')
                    # Garantir que seja naive (sem timezone) para preservar horário exato
                    if hasattr(data_fechamento, 'tz_localize'):
                        data_fechamento = data_fechamento.tz_localize(None)
                    elif data_fechamento.tz is not None:
                        data_fechamento = data_fechamento.replace(tzinfo=None)
                except Exception as e:
                    self._add_error(index, f"Data fechamento inválida '{fechamento_raw}': {e}", level='warning')
                    # Continua processamento mesmo com erro no fechamento
            
            # Converter resultado
            resultado = self.numeric_cleaner.clean_decimal_string(resultado_raw)
            if resultado is None:
                self._add_error(index, f"Resultado inválido '{resultado_raw}'")
                return None
            
            # Processar campos opcionais
            ativo = self._clean_string_field(row.get('Ativo'))
            lotes = self.numeric_cleaner.clean_decimal_string(row.get('Lotes'))
            tipo_operacao = self._parse_operation_type(row.get('Tipo'))
            
            # Criar schema da operação
            operacao_data = schemas.OperacaoCreate(
                resultado=resultado,
                data_abertura=data_abertura,
                data_fechamento=data_fechamento,
                ativo=ativo,
                lotes=lotes,
                tipo=tipo_operacao
            )
            
            self.processed_count += 1
            return operacao_data
            
        except Exception as e:
            self._add_error(index, f"Erro inesperado: {e}")
            return None
    
    def _add_error(self, index: int, message: str, level: str = 'error'):
        """Adiciona erro à lista de erros com contexto"""
        line_num = index + settings.CSV_SKIPROWS + 2  # +2 para linha real do arquivo
        error_entry = {
            'linha': line_num,
            'erro': message,
            'nivel': level
        }
        self.errors.append(error_entry)
        
        if level == 'error':
            self.error_count += 1
            logger.warning(f"Linha {line_num}: {message}")
        else:
            logger.info(f"Linha {line_num}: {message}")
    
    def _clean_string_field(self, value: Any) -> Optional[str]:
        """Limpa campo de string"""
        if pd.isna(value) or value is None:
            return None
        cleaned = str(value).strip()
        return cleaned if cleaned else None
    
    def _parse_operation_type(self, value: Any) -> schemas.TipoOperacaoEnum:
        """Converte string para enum de tipo de operação"""
        if pd.isna(value) or value is None:
            return schemas.TipoOperacaoEnum.DESCONHECIDO
        
        value_str = str(value).upper().strip()
        
        # Mapeamentos flexíveis
        if any(keyword in value_str for keyword in ['COMPRA', 'BUY', 'C']):
            return schemas.TipoOperacaoEnum.COMPRA
        elif any(keyword in value_str for keyword in ['VENDA', 'SELL', 'V']):
            return schemas.TipoOperacaoEnum.VENDA
        
        return schemas.TipoOperacaoEnum.DESCONHECIDO
    
    def get_processing_summary(self) -> Dict[str, Any]:
        """Retorna resumo do processamento"""
        return {
            'processadas': self.processed_count,
            'erros': self.error_count,
            'total_linhas': len(self.df),
            'detalhes_erros': self.errors[-10:] if self.errors else []  # Últimos 10 erros
        }

@router.post("/csv/", summary="Upload de arquivo CSV de operações")
async def upload_operacoes_csv(
    db: Session = Depends(get_db),
    arquivo_csv: UploadFile = File(..., description="Arquivo CSV contendo as operações"),
    nome_robo_form: Optional[str] = Form(None, description="Nome do Robô para associar as operações"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema para salvar os dados")
):
    """
    Faz upload robusto de um arquivo CSV, processa as operações com validação
    e tratamento de erros avançado, e salva no banco de dados.
    """
    filename = arquivo_csv.filename
    logger.info(f"Iniciando upload de CSV: {filename} (schema: {schema})")

    # Validações iniciais
    if not filename or not filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400, 
            detail="Formato de arquivo inválido. Apenas arquivos CSV são permitidos."
        )

    # Determinar nome do robô
    if nome_robo_form:
        nome_robo_base = nome_robo_form.strip()
    else:
        nome_robo_base = os.path.splitext(filename)[0].strip()

    if not nome_robo_base:
        raise HTTPException(
            status_code=400, 
            detail="Não foi possível determinar o nome do Robô."
        )

    try:
        # Verificar/Criar o Robô
        db_robo = crud.get_robo_by_nome(db, nome=nome_robo_base, schema_name=schema)
        if not db_robo:
            logger.info(f"Criando novo robô '{nome_robo_base}' no schema '{schema}'")
            robo_schema_in = schemas.RoboCreate(nome=nome_robo_base)
            db_robo = crud.create_robo(db=db, robo_in=robo_schema_in, schema_name=schema)
        else:
            logger.info(f"Usando robô existente: '{db_robo.nome}' (ID: {db_robo.id})")

        # Ler e processar CSV
        contents = await arquivo_csv.read()
        buffer = io.BytesIO(contents)

        try:
            df = pd.read_csv(
                buffer,
                skiprows=settings.CSV_SKIPROWS,
                encoding=settings.CSV_ENCODING,
                sep=settings.CSV_SEPARATOR,
                header=settings.CSV_HEADER,
                low_memory=False,
            )
        except Exception as e:
            raise CSVProcessingError(f"Erro ao ler CSV: {e}")
        finally:
            buffer.close()

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail=f"Arquivo CSV '{filename}' está vazio ou não contém dados válidos."
            )

        # Processar DataFrame
        processor = CSVOperationProcessor(df, filename)
        df_processed = processor.process_dataframe()

        # Processar cada linha
        operacoes_salvas = 0
        for index, row in df_processed.iterrows():
            operacao_data = processor.process_single_row(index, row)
            
            if operacao_data:
                try:
                    crud.create_operacao(
                        db=db, 
                        operacao_in=operacao_data, 
                        robo_id_for_op=db_robo.id, 
                        schema_name=schema
                    )
                    operacoes_salvas += 1
                except Exception as e:
                    processor._add_error(index, f"Erro ao salvar no banco: {e}")

        # Preparar resposta
        summary = processor.get_processing_summary()
        
        response_data = {
            "message": f"Processamento concluído para '{filename}'",
            "robo_nome": db_robo.nome,
            "robo_id": db_robo.id,
            "schema": schema,
            "operacoes_salvas": operacoes_salvas,
            "resumo": summary
        }

        # Log do resultado
        logger.info(
            f"CSV '{filename}' processado: {operacoes_salvas} operações salvas, "
            f"{summary['erros']} erros de {summary['total_linhas']} linhas"
        )

        return response_data

    except CSVProcessingError as e:
        logger.error(f"Erro de processamento CSV '{filename}': {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro interno ao processar '{filename}': {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Erro interno ao processar arquivo CSV: {str(e)}"
        )
    finally:
        await arquivo_csv.close()

class ExcelOperationProcessor(CSVOperationProcessor):
    """Processador especializado para operações de Excel"""
    
    def __init__(self, df: pd.DataFrame, filename: str, sheet_name: Optional[str] = None):
        super().__init__(df, filename)
        self.sheet_name = sheet_name
    
    def process_dataframe(self) -> pd.DataFrame:
        """Processa e limpa o DataFrame do Excel"""
        logger.info(f"Processando Excel '{self.filename}'. Shape: {self.df.shape}")
        if self.sheet_name:
            logger.info(f"Planilha: '{self.sheet_name}'")
        logger.info(f"Colunas originais: {list(self.df.columns)}")
        
        # Remover linhas completamente vazias (comum em Excel)
        self.df = self.df.dropna(how='all')
        
        # Limpar nomes das colunas
        self.df.columns = self.df.columns.str.strip()
        
        # Mapear colunas
        mapper = ColumnMapper(list(self.df.columns))
        rename_map = mapper.create_rename_map()
        
        if rename_map:
            self.df.rename(columns=rename_map, inplace=True)
            logger.info(f"Colunas renomeadas: {rename_map}")
        
        logger.info(f"Colunas após mapeamento: {list(self.df.columns)}")
        logger.info(f"Shape após limpeza: {self.df.shape}")
        
        return self.df

@router.post("/excel/", summary="Upload de arquivo Excel de operações")
async def upload_operacoes_excel(
    db: Session = Depends(get_db),
    arquivo_excel: UploadFile = File(..., description="Arquivo Excel contendo as operações (.xlsx ou .xls)"),
    nome_robo_form: Optional[str] = Form(None, description="Nome do Robô único (se arquivo contém apenas um robô)"),
    sheet_name: Optional[str] = Form(None, description="Nome da planilha (opcional - usa a primeira se não especificado)"),
    processar_multiplos_robos: bool = Form(True, description="Se True, detecta automaticamente múltiplos robôs na coluna Robo"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema para salvar os dados")
):
    """
    Faz upload robusto de um arquivo Excel, processa as operações com validação
    e tratamento de erros avançado, e salva no banco de dados.
    """
    filename = arquivo_excel.filename
    logger.info(f"Iniciando upload de Excel: {filename} (schema: {schema})")

    # Validações iniciais
    if not filename or not filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400, 
            detail="Formato de arquivo inválido. Apenas arquivos Excel (.xlsx, .xls) são permitidos."
        )

    # Determinar nome do robô
    if nome_robo_form:
        nome_robo_base = nome_robo_form.strip()
    else:
        nome_robo_base = os.path.splitext(filename)[0].strip()

    if not nome_robo_base:
        raise HTTPException(
            status_code=400, 
            detail="Não foi possível determinar o nome do Robô."
        )

    try:
        # Ler e processar Excel
        contents = await arquivo_excel.read()
        buffer = io.BytesIO(contents)

        try:
            # Detectar extensão e usar engine apropriado
            if filename.lower().endswith('.xlsx'):
                engine = 'openpyxl'
            else:  # .xls
                engine = 'xlrd'
            
            # Primeiro, ler as planilhas disponíveis
            excel_file = pd.ExcelFile(buffer, engine=engine)
            available_sheets = excel_file.sheet_names
            logger.info(f"Planilhas disponíveis: {available_sheets}")

            # Determinar qual planilha usar
            target_sheet = sheet_name if sheet_name else available_sheets[0]
            if target_sheet not in available_sheets:
                raise CSVProcessingError(
                    f"Planilha '{target_sheet}' não encontrada. "
                    f"Disponíveis: {available_sheets}"
                )
            
            logger.info(f"Usando planilha: '{target_sheet}'")
            
            # Ler a planilha específica
            df = pd.read_excel(
                buffer,
                sheet_name=target_sheet,
                skiprows=settings.EXCEL_SKIPROWS,
                header=settings.EXCEL_HEADER,
                engine=engine
            )
            
        except Exception as e:
            raise CSVProcessingError(f"Erro ao ler Excel: {e}")
        finally:
            buffer.close()

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail=f"Arquivo Excel '{filename}' está vazio ou não contém dados válidos."
            )

        # Processar DataFrame
        processor = ExcelOperationProcessor(df, filename, target_sheet)
        df_processed = processor.process_dataframe()

        # Detectar se deve processar múltiplos robôs
        operacoes_salvas = 0
        robos_processados = {}
        
        if processar_multiplos_robos and settings.ROBO_COLUMN_NAME in df_processed.columns:
            logger.info(f"Detectada coluna '{settings.ROBO_COLUMN_NAME}' - processando múltiplos robôs automaticamente")
            
            # Agrupar por nome do robô
            df_processed['RoboNome'] = df_processed[settings.ROBO_COLUMN_NAME].astype(str).str.strip()
            robos_unicos = df_processed['RoboNome'].dropna().unique()
            
            logger.info(f"Robôs detectados: {list(robos_unicos)}")
            
            for nome_robo in robos_unicos:
                if not nome_robo or nome_robo.lower() in ['nan', 'none', '']:
                    continue

                # Buscar/criar robô
                db_robo_atual = crud.get_robo_by_nome(db, nome=nome_robo, schema_name=schema)
                if not db_robo_atual:
                    logger.info(f"Criando novo robô '{nome_robo}' no schema '{schema}'")
                    robo_schema_in = schemas.RoboCreate(nome=nome_robo)
                    db_robo_atual = crud.create_robo(db=db, robo_in=robo_schema_in, schema_name=schema)
                else:
                    logger.info(f"Usando robô existente: '{db_robo_atual.nome}' (ID: {db_robo_atual.id})")
                
                robos_processados[nome_robo] = {
                    'robo_id': db_robo_atual.id,
                    'operacoes_salvas': 0,
                    'erros': 0
                }
                
                # Filtrar operações deste robô
                df_robo = df_processed[df_processed['RoboNome'] == nome_robo]
                
                # Processar operações do robô atual
                for index, row in df_robo.iterrows():
                    operacao_data = processor.process_single_row(index, row)
                    
                    if operacao_data:
                        try:
                            crud.create_operacao(
                                db=db, 
                                operacao_in=operacao_data, 
                                robo_id_for_op=db_robo_atual.id, 
                                schema_name=schema
                            )
                            robos_processados[nome_robo]['operacoes_salvas'] += 1
                            operacoes_salvas += 1
                        except Exception as e:
                            processor._add_error(index, f"Erro ao salvar no banco: {e}")
                            robos_processados[nome_robo]['erros'] += 1
        else:
            # Modo single robô (comportamento original)
            logger.info(f"Processando como robô único: '{nome_robo_base}'")
            
            # Verificar/Criar o Robô único
            db_robo = crud.get_robo_by_nome(db, nome=nome_robo_base, schema_name=schema)
            if not db_robo:
                logger.info(f"Criando novo robô '{nome_robo_base}' no schema '{schema}'")
                robo_schema_in = schemas.RoboCreate(nome=nome_robo_base)
                db_robo = crud.create_robo(db=db, robo_in=robo_schema_in, schema_name=schema)
            
            robos_processados[nome_robo_base] = {
                'robo_id': db_robo.id,
                'operacoes_salvas': 0,
                'erros': 0
            }
            
            # Processar cada linha
            for index, row in df_processed.iterrows():
                operacao_data = processor.process_single_row(index, row)
                
                if operacao_data:
                    try:
                        crud.create_operacao(
                            db=db, 
                            operacao_in=operacao_data, 
                            robo_id_for_op=db_robo.id, 
                            schema_name=schema
                        )
                        robos_processados[nome_robo_base]['operacoes_salvas'] += 1
                        operacoes_salvas += 1
                    except Exception as e:
                        processor._add_error(index, f"Erro ao salvar no banco: {e}")
                        robos_processados[nome_robo_base]['erros'] += 1

        # Preparar resposta
        summary = processor.get_processing_summary()
        
        response_data = {
            "message": f"Processamento concluído para '{filename}'",
            "schema": schema,
            "planilha_usada": target_sheet,
            "planilhas_disponiveis": available_sheets,
            "operacoes_salvas_total": operacoes_salvas,
            "robos_processados": robos_processados,
            "resumo": summary
        }

        # Log do resultado
        logger.info(
            f"Excel '{filename}' processado: {operacoes_salvas} operações salvas, "
            f"{summary['erros']} erros de {summary['total_linhas']} linhas"
        )

        return response_data

    except CSVProcessingError as e:
        logger.error(f"Erro de processamento Excel '{filename}': {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro interno ao processar Excel '{filename}': {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Erro interno ao processar arquivo Excel: {str(e)}"
        )
    finally:
        await arquivo_excel.close() 
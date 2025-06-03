import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io # Para ler o UploadFile como um buffer

from .. import crud, models, schemas # Ajuste para .. se estiver em routers/
from ..database import get_db
# Precisaremos adaptar a lógica de processamento de CSV
# Por enquanto, vamos focar na estrutura do endpoint
from ..core.config import ( # Importar configurações do CSV
    CSV_SKIPROWS, CSV_ENCODING, CSV_SEPARATOR, CSV_HEADER,
    RESULT_COLUMN_NAME, PRIMARY_RESULT_COLUMN_CSV, FALLBACK_RESULT_COLUMNS_CSV,
    ROBO_COLUMN_NAME
)
# Importar funções de limpeza (vamos precisar delas ou de uma versão adaptada)
# Supondo que elas serão adaptadas para não dependerem mais de um 'input_format'
# ou que podemos passar 'csv' para _clean_numeric_result_column.
# Por simplicidade, vamos reimplementar partes da lógica aqui ou chamar funções
# que não dependam de um 'input_format' complexo por enquanto.
# No futuro, podemos refatorar _clean_numeric_result_column para ser mais genérica.

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/uploads",
    tags=["Uploads"],
    responses={404: {"description": "Não encontrado"}},
)

# --- ADAPTAR ESTA LÓGICA DE LIMPEZA OU USAR UMA FUNÇÃO UTILITÁRIA ---
# Esta é uma versão simplificada da sua _clean_numeric_result_column
# focada em inteiros, como discutido.
def clean_integer_like_string(value_str: str) -> Optional[float]:
    """Limpa uma string para tentar convertê-la para um float representando um inteiro."""
    if pd.isna(value_str):
        return None
    cleaned = str(value_str).strip()
    cleaned = cleaned.replace(' ', '').replace('.', '').replace(',', '')
    if not cleaned: # String vazia após limpeza
        return None
    try:
        # Tenta converter para float e depois para int para truncar decimais indesejados
        # e depois volta para float para consistência no schema/modelo
        return float(int(float(cleaned)))
    except ValueError:
        logger.warning(f"Falha ao converter '{value_str}' (limpo: '{cleaned}') para numérico.")
        return None
# -------------------------------------------------------------------------


@router.post("/csv/", summary="Upload de arquivo CSV de operações para um Robô")
async def upload_operacoes_csv(
    db: Session = Depends(get_db),
    # Para um único arquivo CSV, o nome do robô pode vir do nome do arquivo ou de um campo de formulário.
    # Vamos começar com o nome do robô vindo do nome do arquivo.
    # Se quisermos que o usuário escolha/crie, adicionaremos um campo de formulário.
    arquivo_csv: UploadFile = File(..., description="Arquivo CSV contendo as operações"),
    # Opcional: Permitir que o usuário especifique o nome do robô via formulário
    nome_robo_form: Optional[str] = Form(None, description="Nome do Robô para associar as operações. Se não fornecido, será usado o nome do arquivo.")
):
    """
    Faz upload de um arquivo CSV, processa as operações e as salva no banco de dados,
    associando-as a um Robô (criando o Robô se não existir, baseado no nome do arquivo ou no formulário).
    """
    filename = arquivo_csv.filename
    logger.info(f"Recebido upload de CSV: {filename}")

    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Apenas CSV é permitido.")

    # Determina o nome do Robô
    if nome_robo_form:
        nome_robo_base = nome_robo_form.strip()
    else:
        nome_robo_base = os.path.splitext(filename)[0].strip() # Remove extensão .csv

    if not nome_robo_base:
        raise HTTPException(status_code=400, detail="Não foi possível determinar o nome do Robô a partir do nome do arquivo ou do formulário.")

    # Verifica/Cria o Robô
    db_robo = crud.get_robo_by_nome(db, nome=nome_robo_base)
    if not db_robo:
        logger.info(f"Robô '{nome_robo_base}' não encontrado. Criando novo robô...")
        robo_schema_in = schemas.RoboCreate(nome=nome_robo_base)
        db_robo = crud.create_robo(db=db, robo_in=robo_schema_in)
        logger.info(f"Robô '{db_robo.nome}' criado com ID: {db_robo.id}")
    else:
        logger.info(f"Usando robô existente: '{db_robo.nome}' (ID: {db_robo.id})")

    robo_id_final = db_robo.id
    operacoes_criadas_count = 0
    operacoes_falhadas_count = 0
    linhas_processadas = 0

    try:
        # Lê o conteúdo do UploadFile para um buffer na memória
        contents = await arquivo_csv.read()
        buffer = io.BytesIO(contents) # Para pandas ler como se fosse um arquivo

        # Processa o CSV com Pandas
        df = pd.read_csv(
            buffer,
            skiprows=CSV_SKIPROWS,
            encoding=CSV_ENCODING,
            sep=CSV_SEPARATOR,
            header=CSV_HEADER,
            low_memory=False
        )
        buffer.close() # Fecha o buffer

        logger.info(f"CSV '{filename}' lido. Shape inicial: {df.shape}. Colunas: {list(df.columns)}")

        # Renomear colunas importantes (simplificado - adaptar do seu data_processor)
        # Esta parte precisa ser robusta como no seu _parse_datetime_columns e _find_and_rename_result_column
        # Por agora, vamos assumir nomes fixos para simplificar
        df.columns = df.columns.str.strip() # Limpa espaços nos nomes das colunas

        rename_map = {}
        # Mapeamento de Data/Hora (exemplo simplificado)
        if 'Data Abertura' in df.columns: rename_map['Data Abertura'] = 'Abertura'
        elif 'Open Time' in df.columns: rename_map['Open Time'] = 'Abertura'
        if 'Data Fechamento' in df.columns: rename_map['Data Fechamento'] = 'Fechamento'
        elif 'Close Time' in df.columns: rename_map['Close Time'] = 'Fechamento'

        # Mapeamento de Resultado (exemplo simplificado)
        coluna_resultado_original = None
        if PRIMARY_RESULT_COLUMN_CSV in df.columns:
            coluna_resultado_original = PRIMARY_RESULT_COLUMN_CSV
        else:
            for col_fallback in FALLBACK_RESULT_COLUMNS_CSV:
                if col_fallback in df.columns:
                    coluna_resultado_original = col_fallback
                    break
        if coluna_resultado_original:
            rename_map[coluna_resultado_original] = RESULT_COLUMN_NAME
        else:
            raise HTTPException(status_code=400, detail=f"Coluna de resultado não encontrada no CSV '{filename}'.")

        df.rename(columns=rename_map, inplace=True)

        # Processar cada linha do DataFrame
        for index, row in df.iterrows():
            linhas_processadas += 1
            try:
                # Extrair e validar dados da linha
                data_abertura_str = row.get('Abertura')
                resultado_str = row.get(RESULT_COLUMN_NAME) # Usa o nome já renomeado

                if pd.isna(data_abertura_str) or pd.isna(resultado_str):
                    logger.warning(f"Linha {index+CSV_SKIPROWS+1} no CSV '{filename}' ignorada: Data de Abertura ou Resultado ausente.")
                    operacoes_falhadas_count += 1
                    continue

                # Converter data/hora
                try:
                    data_abertura_dt = pd.to_datetime(data_abertura_str, dayfirst=True, errors='raise')
                except Exception as e_dt_abertura:
                    logger.warning(f"Linha {index+CSV_SKIPROWS+1}: Falha ao converter Data Abertura '{data_abertura_str}': {e_dt_abertura}")
                    operacoes_falhadas_count += 1
                    continue

                data_fechamento_dt = None
                if 'Fechamento' in row and pd.notna(row['Fechamento']):
                    try:
                        data_fechamento_dt = pd.to_datetime(row['Fechamento'], dayfirst=True, errors='raise')
                    except Exception as e_dt_fechamento:
                        logger.warning(f"Linha {index+CSV_SKIPROWS+1}: Falha ao converter Data Fechamento '{row['Fechamento']}': {e_dt_fechamento}. Definindo como None.")
                        # data_fechamento_dt permanece None

                # Limpar resultado (assumindo que são inteiros)
                resultado_limpo = clean_integer_like_string(str(resultado_str))
                if resultado_limpo is None:
                    logger.warning(f"Linha {index+CSV_SKIPROWS+1}: Resultado '{resultado_str}' não pôde ser convertido para número.")
                    operacoes_falhadas_count += 1
                    continue

                # Criar schema da operação
                operacao_data = schemas.OperacaoCreate(
                    # setup_robo é preenchido pelo robo_id_final
                    resultado=resultado_limpo,
                    data_abertura=data_abertura_dt,
                    data_fechamento=data_fechamento_dt,
                    ativo=row.get('Ativo'), # Certifique-se que 'Ativo' é o nome correto da coluna
                    lotes=clean_integer_like_string(str(row.get('Qtd.'))) if 'Qtd.' in row else None, # Exemplo para 'Qtd.'
                    tipo=schemas.TipoOperacaoEnum(row.get('Tipo').upper()) if 'Tipo' in row and pd.notna(row['Tipo']) and row.get('Tipo').upper() in ['COMPRA', 'VENDA'] else schemas.TipoOperacaoEnum.DESCONHECIDO
                    # Nota: 'nome_robo_para_criacao' não é passado aqui, pois já temos o robo_id_final
                )

                # Salvar no banco
                crud.create_operacao(db=db, operacao_in=operacao_data, robo_id_for_op=robo_id_final)
                operacoes_criadas_count += 1

            except Exception as e_row:
                logger.error(f"Erro ao processar linha {index+CSV_SKIPROWS+1} do CSV '{filename}': {e_row}", exc_info=False) # exc_info=False para não poluir muito
                operacoes_falhadas_count += 1
                continue

        msg = f"Arquivo '{filename}' processado. {operacoes_criadas_count} operações salvas, {operacoes_falhadas_count} falharam de {linhas_processadas} linhas lidas (após skip)."
        logger.info(msg)
        return {"message": msg, "robo_nome": db_robo.nome, "robo_id": robo_id_final, "criadas": operacoes_criadas_count, "falhas": operacoes_falhadas_count}

    except pd.errors.EmptyDataError:
        logger.warning(f"Arquivo CSV '{filename}' está vazio ou não contém dados após pular linhas.")
        raise HTTPException(status_code=400, detail=f"Arquivo CSV '{filename}' vazio ou inválido.")
    except Exception as e:
        logger.error(f"Erro geral ao processar arquivo CSV '{filename}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar o arquivo CSV: {str(e)}")
    finally:
        await arquivo_csv.close() # Importante fechar o arquivo
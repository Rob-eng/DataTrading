from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

# Importa dos módulos do mesmo nível (..) ou de nível superior
from .. import crud, models, schemas # Ajustado para o nível correto
from ..database import get_db
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/operacoes", # Todas as rotas aqui começarão com isso
    tags=["Operações"],         # Agrupamento na documentação Swagger
    responses={404: {"description": "Não encontrado"}}, # Resposta padrão para 404
)

# --- ALTERAÇÃO NO ENDPOINT DE CRIAÇÃO DE OPERAÇÃO ---
@router.post("/", response_model=schemas.OperacaoRead, status_code=201)
def criar_nova_operacao(
    # Recebe os dados da operação.
    # robo_id e nome_robo_para_criacao são opcionais no schema OperacaoCreate,
    # mas a lógica aqui garante que um deles (ou um robô encontrado) seja usado.
    operacao_in: schemas.OperacaoCreate,
    db: Session = Depends(get_db)
):
    """
    Cria uma nova operação no banco de dados.

    - Se `robo_id` for fornecido em `operacao_in` e existir, usa esse robô.
    - Se `nome_robo_para_criacao` for fornecido:
        - Tenta encontrar um robô existente com esse nome.
        - Se não encontrar, cria um novo robô com esse nome.
    - Associa a operação ao ID do robô encontrado ou criado.
    - É obrigatório fornecer `robo_id` ou `nome_robo_para_criacao`.
    """
    robo_id_final: Optional[int] = None

    if operacao_in.robo_id is not None:
        db_robo = crud.get_robo_by_id(db, robo_id=operacao_in.robo_id)
        if not db_robo:
            raise HTTPException(status_code=404, detail=f"Robô com ID {operacao_in.robo_id} não encontrado.")
        robo_id_final = db_robo.id
        logger.info(f"Usando robô existente por ID: {robo_id_final} ({db_robo.nome})")
    elif operacao_in.nome_robo_para_criacao:
        nome_robo = operacao_in.nome_robo_para_criacao.strip()
        if not nome_robo:
             raise HTTPException(status_code=400, detail="Nome do robô para criação não pode ser vazio.")

        db_robo_existente = crud.get_robo_by_nome(db, nome=nome_robo)
        if db_robo_existente:
            robo_id_final = db_robo_existente.id
            logger.info(f"Usando robô existente por nome: {robo_id_final} ({nome_robo})")
        else:
            # Cria um novo robô
            logger.info(f"Robô '{nome_robo}' não encontrado. Criando novo robô...")
            novo_robo_schema = schemas.RoboCreate(nome=nome_robo)
            db_novo_robo = crud.create_robo(db=db, robo_in=novo_robo_schema)
            robo_id_final = db_novo_robo.id
            logger.info(f"Novo robô criado com ID: {robo_id_final} ({nome_robo})")
    else:
        raise HTTPException(
            status_code=400,
            detail="É necessário fornecer 'robo_id' ou 'nome_robo_para_criacao' para associar a operação a um robô."
        )

    if robo_id_final is None: # Checagem extra de segurança
        logger.error("Falha crítica: robo_id_final não foi definido antes de criar operação.")
        raise HTTPException(status_code=500, detail="Não foi possível determinar o ID do robô para a operação.")
    
    db_operacao = crud.create_operacao(db=db, operacao_in=operacao_in, robo_id_for_op=robo_id_final)
    return db_operacao

# Endpoint para listar operações (exemplo)
@router.get("/", response_model=List[schemas.OperacaoRead])
def listar_operacoes(
    db: Session = Depends(get_db),
    robo_id: Optional[int] = Query(None, description="Filtra operações por um único ID de robô"),
    robo_ids: Optional[str] = Query(None, description="Filtra operações por uma lista de IDs de robôs separados por vírgula"),
    schema: str = Query("oficial", description="Schema do banco de dados"),
    skip: int = 0,
    limit: int = 10000
):
    """
    Retorna uma lista de operações, com filtros opcionais por robô(s).
    """
    if robo_ids:
        robot_id_list = [int(rid) for rid in robo_ids.split(',') if rid.isdigit()]
        all_ops = []
        for r_id in robot_id_list:
            ops = crud.get_operacoes_by_robo(db=db, robo_id=r_id, schema_name=schema, limit=limit)
            all_ops.extend(ops)
        return all_ops
        
    if robo_id:
        return crud.get_operacoes_by_robo(db=db, robo_id=robo_id, schema_name=schema, skip=skip, limit=limit)
    
    return crud.get_operacoes(db=db, schema_name=schema, skip=skip, limit=limit)

@router.get("/{operacao_id}", response_model=schemas.OperacaoRead)
def ler_operacao_por_id(
    operacao_id: int,
    db: Session = Depends(get_db)
):
    """
    Retorna uma operação específica pelo seu ID.
    """
    db_operacao = crud.get_operacao(db, operacao_id=operacao_id)
    if db_operacao is None:
        raise HTTPException(status_code=404, detail="Operação não encontrada")
    return db_operacao


@router.delete("/{operacao_id}", status_code=200)
def deletar_operacao(
    operacao_id: int,
    db: Session = Depends(get_db),
    schema: str = "uploads_usuarios"
):
    """
    Deleta uma operação específica pelo seu ID.
    Útil para remover operações que foram enviadas por engano via upload.
    """
    db_operacao = crud.get_operacao(db, operacao_id=operacao_id, schema_name=schema)
    if db_operacao is None:
        raise HTTPException(status_code=404, detail="Operação não encontrada")
    
    success = crud.delete_operacao(db, operacao_id=operacao_id, schema_name=schema)
    if success:
        logger.info(f"Operação {operacao_id} deletada com sucesso")
        return {"message": f"Operação {operacao_id} deletada com sucesso"}
    else:
        raise HTTPException(status_code=500, detail="Erro ao deletar operação")

@router.delete("/robo/{robo_id}/operacoes", status_code=200)
def deletar_todas_operacoes_robo(
    robo_id: int,
    confirmar: bool = Body(..., description="Confirmação obrigatória para deletar todas as operações"),
    db: Session = Depends(get_db),
    schema: str = "uploads_usuarios"
):
    """
    Deleta TODAS as operações de um robô específico.
    Requer confirmação explícita via body {'confirmar': true}.
    Use com cuidado - esta ação é irreversível!
    """
    if not confirmar:
        raise HTTPException(
            status_code=400, 
            detail="Para deletar todas as operações, é necessário confirmar explicitamente enviando {'confirmar': true}"
        )
    
    # Verificar se o robô existe
    db_robo = crud.get_robo_by_id(db, robo_id=robo_id, schema_name=schema)
    if not db_robo:
        raise HTTPException(status_code=404, detail=f"Robô com ID {robo_id} não encontrado")
    
    # Buscar todas as operações do robô
    operacoes = crud.get_operacoes_by_robo(db, robo_id=robo_id, schema_name=schema, limit=10000)
    
    if not operacoes:
        return {"message": f"Robô {db_robo.nome} não possui operações para deletar"}
    
    # Deletar cada operação
    deleted_count = 0
    for operacao in operacoes:
        if crud.delete_operacao(db, operacao_id=operacao.id, schema_name=schema):
            deleted_count += 1
    
    logger.info(f"{deleted_count} operações do robô {db_robo.nome} (ID: {robo_id}) foram deletadas")
    return {
        "message": f"{deleted_count} operações do robô '{db_robo.nome}' foram deletadas com sucesso",
        "robo_nome": db_robo.nome,
        "operacoes_deletadas": deleted_count
    }

@router.get("/estatisticas/geral", status_code=200)
def obter_estatisticas_operacoes(
    db: Session = Depends(get_db),
    schema: str = "uploads_usuarios"  # Schema padrão
):
    """
    Retorna estatísticas gerais sobre operações no sistema.
    Útil para monitoramento e validação antes de deletar dados.
    """
    total_operacoes = crud.count_operacoes(db, schema_name=schema)
    total_robos = crud.count_robos(db, schema_name=schema)
    
    # Buscar operações mais recentes
    operacoes_recentes = crud.get_operacoes(db, schema_name=schema, skip=0, limit=5)
    
    # Contar operações por robô
    robos = crud.get_robos(db, schema_name=schema, limit=50)
    operacoes_por_robo = []
    
    for robo in robos:
        count_ops = len(crud.get_operacoes_by_robo(db, robo_id=robo.id, schema_name=schema, limit=10000))
        if count_ops > 0:
            operacoes_por_robo.append({
                "robo_id": robo.id,
                "robo_nome": robo.nome,
                "total_operacoes": count_ops
            })
    
    return {
        "total_operacoes": total_operacoes,
        "total_robos": total_robos,
        "operacoes_por_robo": sorted(operacoes_por_robo, key=lambda x: x["total_operacoes"], reverse=True),
        "operacoes_recentes": [
            {
                "id": op.id,
                "robo_id": op.robo_id,
                "resultado": op.resultado,
                "data_abertura": op.data_abertura,
                "ativo": op.ativo
            } for op in operacoes_recentes
        ]
    }

@router.delete("/limpar-dados/schema/{schema_name}", status_code=200)
def limpar_todos_dados_schema(
    schema_name: str,
    confirmar: bool = Body(..., description="Confirmação obrigatória para limpar todos os dados"),
    manter_robos: bool = Body(False, description="Se True, mantém os robôs e deleta apenas as operações"),
    db: Session = Depends(get_db)
):
    """
    ATENÇÃO: Deleta TODOS os dados de um schema específico.
    
    - Se manter_robos=True: Deleta apenas as operações, mantém os robôs
    - Se manter_robos=False: Deleta operações E robôs (limpeza completa)
    
    Requer confirmação explícita via body {'confirmar': true}.
    Use com extremo cuidado - esta ação é irreversível!
    """
    if not confirmar:
        raise HTTPException(
            status_code=400, 
            detail="Para limpar todos os dados, é necessário confirmar explicitamente enviando {'confirmar': true}"
        )
    
    if schema_name not in ["oficial", "uploads_usuarios"]:
        raise HTTPException(
            status_code=400, 
            detail="Schema deve ser 'oficial' ou 'uploads_usuarios'"
        )
    
    try:
        # Buscar estatísticas antes da limpeza
        total_operacoes_antes = crud.count_operacoes(db, schema_name=schema_name)
        total_robos_antes = crud.count_robos(db, schema_name=schema_name)
        
        # Deletar todas as operações
        operacoes_deletadas = crud.delete_all_operacoes(db, schema_name=schema_name)
        
        robos_deletados = 0
        if not manter_robos:
            # Deletar todos os robôs também
            robos_deletados = crud.delete_all_robos(db, schema_name=schema_name)
        
        logger.warning(f"LIMPEZA COMPLETA do schema '{schema_name}': {operacoes_deletadas} operações e {robos_deletados} robôs deletados")
        
        return {
            "message": f"Schema '{schema_name}' limpo com sucesso",
            "schema_name": schema_name,
            "operacoes_deletadas": operacoes_deletadas,
            "robos_deletados": robos_deletados,
            "robos_mantidos": manter_robos,
            "estatisticas_antes": {
                "total_operacoes": total_operacoes_antes,
                "total_robos": total_robos_antes
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao limpar schema '{schema_name}': {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Erro interno ao limpar dados: {str(e)}"
        )

# No futuro:
# - Endpoint para upload de arquivo CSV/Excel que lê, processa com Pandas
#   e usa crud.create_operacao para cada linha.
# - Endpoints com filtros (por data, robô, etc.) que usam funções CRUD mais complexas.
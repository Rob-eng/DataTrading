from fastapi import APIRouter, Depends, HTTPException, Body 
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

# Importa dos módulos do mesmo nível (..) ou de nível superior
from .. import crud, models, schemas # Ajustado para o nível correto
from ..database import get_db         # Ajustado para o nível correto
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/operacoes", # Todas as rotas aqui começarão com isso
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
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Retorna uma lista de operações.
    """
    operacoes = crud.get_operacoes(db, skip=skip, limit=limit)
    return operacoes

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


# No futuro:
# - Endpoint para upload de arquivo CSV/Excel que lê, processa com Pandas
#   e usa crud.create_operacao para cada linha.
# - Endpoints com filtros (por data, robô, etc.) que usam funções CRUD mais complexas.
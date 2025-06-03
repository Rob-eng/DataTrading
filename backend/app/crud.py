from sqlalchemy.orm import Session
from typing import Optional, List
from . import models, schemas # models e schemas do mesmo diretório app

# --- FUNÇÕES CRUD PARA ROBO ---
def get_robo_by_id(db: Session, robo_id: int) -> Optional[models.Robo]:
    return db.query(models.Robo).filter(models.Robo.id == robo_id).first()

def get_robo_by_nome(db: Session, nome: str) -> Optional[models.Robo]:
    return db.query(models.Robo).filter(models.Robo.nome == nome).first()

def get_robos(db: Session, skip: int = 0, limit: int = 100) -> List[models.Robo]:
    return db.query(models.Robo).order_by(models.Robo.nome).offset(skip).limit(limit).all()

def create_robo(db: Session, robo_in: schemas.RoboCreate) -> models.Robo:
    db_robo = models.Robo(nome=robo_in.nome)
    db.add(db_robo)
    db.commit()
    db.refresh(db_robo)
    return db_robo

# Função para buscar uma operação por ID (exemplo)
def get_operacao(db: Session, operacao_id: int) -> Optional[models.Operacao]:
    return db.query(models.Operacao).filter(models.Operacao.id == operacao_id).first()

# Função para buscar múltiplas operações com paginação (exemplo)
def get_operacoes(db: Session, skip: int = 0, limit: int = 100) -> List[models.Operacao]:
    return db.query(models.Operacao).offset(skip).limit(limit).all()

# Função para criar uma nova operação no banco (exemplo)
def create_operacao(db: Session, operacao_in: schemas.OperacaoCreate, robo_id_for_op: int) -> models.Operacao:
    # Converte o schema Pydantic (OperacaoCreate) para um dicionário
    # e então para um objeto do modelo SQLAlchemy (Operacao)
    operacao_data = operacao_in.model_dump(exclude={"nome_robo_para_criacao", "robo_id"})
    db_operacao = models.Operacao(**operacao_data, robo_id=robo_id_for_op)
    db.add(db_operacao) # Adiciona à sessão
    db.commit()          # Confirma a transação (salva no banco)
    db.refresh(db_operacao) # Atualiza o objeto db_operacao com dados do banco (ex: ID gerado)
    return db_operacao

# No futuro:
# - Funções para importar dados de DataFrames Pandas para o banco.
# - Funções para buscar operações com base em filtros complexos.
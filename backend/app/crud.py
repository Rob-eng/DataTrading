from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from . import models, schemas
from .core.config import settings

logger = logging.getLogger(__name__)

def set_search_path(db: Session, schema_name: str):
    """Define o search_path para um schema específico"""
    if schema_name:
        db.execute(text(f"SET search_path TO {schema_name}, public"))
        db.commit()  # Garantir que a configuração seja aplicada

# === CRUD PARA ROBÔS ===

def get_robo_by_id(db: Session, robo_id: int, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> Optional[models.Robo]:
    """Busca um robô por ID"""
    query = text(f"SELECT id, nome, criado_em FROM {schema_name}.robos WHERE id = :robo_id LIMIT 1")
    result = db.execute(query, {"robo_id": robo_id}).fetchone()
    if result:
        robo = models.Robo()
        robo.id = result[0]
        robo.nome = result[1] 
        robo.criado_em = result[2]
        return robo
    return None

def get_robo_by_nome(db: Session, nome: str, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> Optional[models.Robo]:
    """Busca um robô por nome"""
    # Usar query explícita com schema
    query = text(f"SELECT * FROM {schema_name}.robos WHERE nome = :nome LIMIT 1")
    result = db.execute(query, {"nome": nome}).fetchone()
    if result:
        # Converter resultado para objeto Robo
        robo = models.Robo()
        robo.id = result[0]
        robo.nome = result[1] 
        robo.criado_em = result[2]
        return robo
    return None

def get_robos(db: Session, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA, skip: int = 0, limit: int = 100) -> List[models.Robo]:
    """Lista todos os robôs"""
    query = text(f"""
        SELECT id, nome, criado_em
        FROM {schema_name}.robos
        ORDER BY criado_em DESC
        LIMIT :limit OFFSET :skip
    """)
    
    results = db.execute(query, {"limit": limit, "skip": skip}).fetchall()
    
    robos = []
    for result in results:
        robo = models.Robo()
        robo.id = result[0]
        robo.nome = result[1]
        robo.criado_em = result[2]
        robos.append(robo)
    
    return robos

def create_robo(db: Session, robo_in: schemas.RoboCreate, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> models.Robo:
    """Cria um novo robô"""
    # Usar SQL explícito com schema
    query = text(f"INSERT INTO {schema_name}.robos (nome) VALUES (:nome) RETURNING id, nome, criado_em")
    result = db.execute(query, {"nome": robo_in.nome}).fetchone()
    db.commit()
    
    # Converter resultado para objeto Robo
    robo = models.Robo()
    robo.id = result[0]
    robo.nome = result[1]
    robo.criado_em = result[2]
    return robo

# === CRUD PARA OPERAÇÕES ===

def get_operacao(db: Session, operacao_id: int, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> Optional[models.Operacao]:
    """Busca uma operação por ID"""
    set_search_path(db, schema_name)
    return db.query(models.Operacao).filter(models.Operacao.id == operacao_id).first()

def get_operacoes(db: Session, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA, skip: int = 0, limit: int = 100) -> List[models.Operacao]:
    """Lista todas as operações"""
    query = text(f"""
        SELECT id, robo_id, "Resultado_Valor", "Abertura", "Fechamento", ativo, lotes, tipo, criado_em, atualizado_em, fonte_dados_id
        FROM {schema_name}.operacoes
        ORDER BY "Abertura" DESC
        LIMIT :limit OFFSET :skip
    """)
    
    results = db.execute(query, {"limit": limit, "skip": skip}).fetchall()
    
    operacoes = []
    for result in results:
        operacao = models.Operacao()
        operacao.id = result[0]
        operacao.robo_id = result[1]
        operacao.resultado = result[2]
        operacao.data_abertura = result[3]
        operacao.data_fechamento = result[4]
        operacao.ativo = result[5]
        operacao.lotes = result[6]
        operacao.tipo = result[7]
        operacao.criado_em = result[8]
        operacao.atualizado_em = result[9]
        operacao.fonte_dados_id = result[10]
        operacoes.append(operacao)
    
    return operacoes

def get_operacoes_by_robo(db: Session, robo_id: int, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA, skip: int = 0, limit: int = 100) -> List[models.Operacao]:
    """Lista operações de um robô específico"""
    query = text(f"""
        SELECT id, robo_id, "Resultado_Valor", "Abertura", "Fechamento", ativo, lotes, tipo, criado_em, atualizado_em, fonte_dados_id
        FROM {schema_name}.operacoes
        WHERE robo_id = :robo_id
        ORDER BY "Abertura" DESC
        LIMIT :limit OFFSET :skip
    """)
    
    results = db.execute(query, {"robo_id": robo_id, "limit": limit, "skip": skip}).fetchall()
    
    operacoes = []
    for result in results:
        operacao = models.Operacao()
        operacao.id = result[0]
        operacao.robo_id = result[1]
        operacao.resultado = result[2]
        operacao.data_abertura = result[3]
        operacao.data_fechamento = result[4]
        operacao.ativo = result[5]
        operacao.lotes = result[6]
        operacao.tipo = result[7]
        operacao.criado_em = result[8]
        operacao.atualizado_em = result[9]
        operacao.fonte_dados_id = result[10]
        operacoes.append(operacao)
    
    return operacoes

def create_operacao(db: Session, operacao_in: schemas.OperacaoCreate, robo_id_for_op: int, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> models.Operacao:
    """Cria uma nova operação"""
    # Usar SQL explícito com schema
    query = text(f"""
        INSERT INTO {schema_name}.operacoes 
        (robo_id, "Resultado_Valor", "Abertura", "Fechamento", ativo, lotes, tipo, fonte_dados_id)
        VALUES 
        (:robo_id, :resultado, :data_abertura, :data_fechamento, :ativo, :lotes, :tipo, :fonte_dados_id)
        RETURNING id, robo_id, "Resultado_Valor", "Abertura", "Fechamento", ativo, lotes, tipo, criado_em, atualizado_em, fonte_dados_id
    """)
    
    # Preparar dados
    data = {
        "robo_id": robo_id_for_op,
        "resultado": operacao_in.resultado,
        "data_abertura": operacao_in.data_abertura,
        "data_fechamento": operacao_in.data_fechamento,
        "ativo": operacao_in.ativo,
        "lotes": operacao_in.lotes,
        "tipo": operacao_in.tipo.value if operacao_in.tipo else None,
        "fonte_dados_id": getattr(operacao_in, 'fonte_dados_id', None)
    }
    
    result = db.execute(query, data).fetchone()
    db.commit()
    
    # Converter resultado para objeto Operacao
    operacao = models.Operacao()
    operacao.id = result[0]
    operacao.robo_id = result[1]
    operacao.resultado = result[2]
    operacao.data_abertura = result[3]
    operacao.data_fechamento = result[4]
    operacao.ativo = result[5]
    operacao.lotes = result[6]
    operacao.tipo = result[7]
    operacao.criado_em = result[8]
    operacao.atualizado_em = result[9]
    operacao.fonte_dados_id = result[10]
    return operacao

# === FUNÇÕES AUXILIARES ===

def get_operacoes_by_ativo(db: Session, ativo: str, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA, skip: int = 0, limit: int = 100) -> List[models.Operacao]:
    """Lista operações de um ativo específico"""
    set_search_path(db, schema_name)
    return db.query(models.Operacao).filter(models.Operacao.ativo == ativo).offset(skip).limit(limit).all()

def get_operacoes_by_tipo(db: Session, tipo: models.TipoOperacaoEnum, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA, skip: int = 0, limit: int = 100) -> List[models.Operacao]:
    """Lista operações de um tipo específico"""
    set_search_path(db, schema_name)
    return db.query(models.Operacao).filter(models.Operacao.tipo == tipo).offset(skip).limit(limit).all()

def count_operacoes(db: Session, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> int:
    """Conta o total de operações"""
    set_search_path(db, schema_name)
    return db.query(models.Operacao).count()

def count_robos(db: Session, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> int:
    """Conta o total de robôs"""
    set_search_path(db, schema_name)
    return db.query(models.Robo).count()

# === FUNÇÕES ESPECÍFICAS PARA ANALYTICS ===

def get_operacoes_with_resultado(db: Session, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> List[models.Operacao]:
    """Lista operações que têm resultado não nulo"""
    set_search_path(db, schema_name)
    return db.query(models.Operacao).filter(models.Operacao.resultado.isnot(None)).all()

def get_operacoes_by_robo_with_resultado(db: Session, robo_id: int, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> List[models.Operacao]:
    """Lista operações de um robô que têm resultado não nulo"""
    set_search_path(db, schema_name)
    return db.query(models.Operacao).filter(
        models.Operacao.robo_id == robo_id,
        models.Operacao.resultado.isnot(None)
    ).all()

def get_operacoes_by_date_range(db: Session, data_inicio=None, data_fim=None, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> List[models.Operacao]:
    """Lista operações dentro de um período"""
    set_search_path(db, schema_name)
    query = db.query(models.Operacao)
    
    if data_inicio:
        query = query.filter(models.Operacao.data_abertura >= data_inicio)
    if data_fim:
        query = query.filter(models.Operacao.data_abertura <= data_fim)
    
    return query.all()

def get_distinct_ativos(db: Session, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> List[str]:
    """Lista todos os ativos únicos"""
    set_search_path(db, schema_name)
    result = db.query(models.Operacao.ativo).distinct().filter(models.Operacao.ativo.isnot(None)).all()
    return [ativo[0] for ativo in result if ativo[0]]

# === FUNÇÕES DE LIMPEZA ===

def delete_operacao(db: Session, operacao_id: int, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> bool:
    """Delete uma operação"""
    set_search_path(db, schema_name)
    db_operacao = db.query(models.Operacao).filter(models.Operacao.id == operacao_id).first()
    if db_operacao:
        db.delete(db_operacao)
        db.commit()
        return True
    return False

def delete_robo(db: Session, robo_id: int, schema_name: str = settings.DEFAULT_UPLOAD_SCHEMA) -> bool:
    """Delete um robô (se não tiver operações associadas)"""
    set_search_path(db, schema_name)
    db_robo = db.query(models.Robo).filter(models.Robo.id == robo_id).first()
    if db_robo:
        # Verificar se há operações associadas
        operacoes_count = db.query(models.Operacao).filter(models.Operacao.robo_id == robo_id).count()
        if operacoes_count == 0:
            db.delete(db_robo)
            db.commit()
            return True
        else:
            logger.warning(f"Não é possível deletar robô {robo_id}: tem {operacoes_count} operações associadas")
            return False
    return False 
from sqlalchemy.orm import Session
from typing import Optional, List
from . import models, schemas # models e schemas do mesmo diretório app

# --- FUNÇÕES CRUD PARA ROBO ---

from sqlalchemy.orm import Session, aliased
from sqlalchemy.sql.expression import table, column
from typing import Optional, List
from . import models, schemas

# --- FUNÇÕES CRUD ATUALIZADAS PARA ACEITAR SCHEMA ---

def _get_table_with_schema(model_class, schema_name: str):
    """Retorna um objeto Table com o schema aplicado."""
    # Esta é uma forma de obter a referência da tabela com o schema.
    # Para queries ORM, geralmente você trabalha com a classe do modelo diretamente,
    # e o schema pode ser inferido de alguma forma ou setado na sessão/query.
    # SQLAlchemy pode ser um pouco complicado com schemas dinâmicos em ORM puro.
    # Uma abordagem mais simples é setar o search_path na sessão.
    # Outra é usar o Core para queries mais complexas.
    # Por enquanto, vamos tentar com o modelo como está e ver se a sessão
    # pode ser configurada para um search_path.
    
    # Alternativa mais simples para o ORM:
    # O SQLAlchemy ORM geralmente não requer que você "mude" o schema do modelo em si
    # para cada query se as tabelas já existem nos schemas corretos.
    # A chave é como a SESSÃO está configurada ou como a QUERY é construída.
    # Para select/insert/update/delete, o ORM usará o schema padrão da conexão
    # ou o schema especificado no __table_args__ se não for None.

    # Vamos tentar uma abordagem onde a sessão tem seu search_path alterado.
    # Isso é mais complexo de gerenciar por request.

    # Abordagem mais simples:
    # Se as tabelas 'robos' e 'operacoes' existem em AMBOS os schemas,
    # e seus modelos não têm um schema fixo, o PostgreSQL usará o search_path
    # da sessão para decidir qual tabela usar se não houver qualificação.
    # Para garantir, podemos qualificar explicitamente no futuro se necessário,
    # ou usar diferentes engines/sessões por schema.

    # Por agora, vamos assumir que a sessão `db` passada já está configurada
    # ou que o PostgreSQL resolverá para o schema correto se as tabelas
    # não existirem no schema 'public' (padrão).
    # O `create_all` no main.py cuidou da criação nos schemas.
    return model_class


def get_robo_by_id(db: Session, robo_id: int, schema_name: str) -> Optional[models.Robo]:
    RoboModel = _get_table_with_schema(models.Robo, schema_name)
    # Para queries com schema explícito:
    # return db.query(RoboModel).filter(RoboModel.id == robo_id).execution_options(schema_translate_map={None: schema_name}).first()
    # A forma mais simples se o search_path da sessão puder ser gerenciado:
    return db.query(models.Robo).with_hint(models.Robo, f"SCHEMA '{schema_name}'", dialect_name="postgresql").filter(models.Robo.id == robo_id).first()
    # Ou, se as tabelas só existem nos schemas não-públicos, o PostgreSQL pode encontrá-las.

def get_robo_by_nome(db: Session, nome: str, schema_name: str) -> Optional[models.Robo]:
    # Tentativa com schema_translate_map (SQLAlchemy 1.4+)
    # return db.query(models.Robo).execution_options(
    #     schema_translate_map={None: schema_name}
    # ).filter(models.Robo.nome == nome).first()
    # Tentativa com with_hint (PostgreSQL específico)
    return db.query(models.Robo).filter(models.Robo.nome == nome).execution_options(schema_translate_map={None: schema_name}).first()


def get_robos(db: Session, schema_name: str, skip: int = 0, limit: int = 100) -> List[models.Robo]:
    return db.query(models.Robo).execution_options(
        schema_translate_map={None: schema_name}
    ).order_by(models.Robo.nome).offset(skip).limit(limit).all()

def create_robo(db: Session, robo_in: schemas.RoboCreate, schema_name: str) -> models.Robo:
    # Para criar, precisamos garantir que o objeto é associado ao schema correto ANTES do add/commit
    # Uma forma é clonar a tabela para o metadata com o schema e usar esse objeto.
    # Ou, se a sessão estiver configurada para o schema correto, deve funcionar.
    
    # Criando uma referência à tabela no schema específico
    robo_table_in_schema = models.Robo.__table__.tometadata(db.get_bind().engine.reflection._get_schema_metadata(schema_name, models.Base.metadata.schema), schema=schema_name)
    
    # Para INSERT com ORM e schema dinâmico, pode ser mais fácil usar SQL Core ou text
    # Ou, mais simples, se o search_path da sessão for manipulável:
    # db.execute(text(f"SET search_path TO {schema_name}, public;")) # CUIDADO COM SQL INJECTION AQUI
    
    # Vamos tentar criar o objeto e o SQLAlchemy deve usar o schema da sessão/conexão
    # se as tabelas só existem nos schemas específicos e não no public.
    # Se o __table_args__ = {'schema': None} for respeitado, e as tabelas
    # só existirem nos schemas 'oficial' e 'uploads_usuarios', o PG pode achar.
    
    # A maneira mais ORM de fazer INSERT em um schema específico sem alterar o search_path globalmente
    # é um pouco mais envolvida, mas vamos tentar a forma direta.
    # Se isso falhar, teremos que usar `table.insert().values(...)` com a tabela esquematizada.

    # Esta abordagem assume que o ORM construirá o INSERT para o schema correto
    # se as tabelas já foram criadas nele.
    db_robo = models.Robo(nome=robo_in.nome) # O schema virá da sessão ou do __table_args__ (que é None)
                                          # Precisamos que a *query* vá para o schema certo.

    # Temporariamente, para INSERT, pode ser mais fácil usar text() se o ORM puro complicar com schemas dinâmicos
    # No entanto, vamos confiar que o `create_schema_tables` criou nos lugares certos e o PG resolve.
    # A dependência `get_db` precisa ser ajustada se quisermos setar o search_path nela.
    
    # Para ter certeza, vamos usar um "hack" para o INSERT usando o nome qualificado da tabela.
    # Isso não é o ideal do ORM, mas funciona para INSERTs simples com schemas.
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    stmt = pg_insert(models.Robo.__table__.tometadata(MetaData(schema=schema_name))).values(
        nome=robo_in.nome
    ).returning(models.Robo.id, models.Robo.criado_em) # Adicionado criado_em
    
    result = db.execute(stmt)
    db.commit()
    inserted_id, criado_em = result.fetchone()
    
    # Retorna um objeto ORM completo (buscando o que foi inserido)
    # return get_robo_by_id(db, inserted_id, schema_name) << Isso pode causar recursão se a sessão não estiver setada
    # Vamos construir manualmente por enquanto
    return models.Robo(id=inserted_id, nome=robo_in.nome, criado_em=criado_em)

# Função para buscar uma operação por ID (exemplo)
def get_operacao(db: Session, operacao_id: int) -> Optional[models.Operacao]:
    return db.query(models.Operacao).execution_options(schema_translate_map={None: schema_name}).filter(models.Operacao.id == operacao_id).first()

# Função para buscar múltiplas operações com paginação (exemplo)
def get_operacoes(db: Session, skip: int = 0, limit: int = 100) -> List[models.Operacao]:
    return db.query(models.Operacao).execution_options(schema_translate_map={None: schema_name}).order_by(models.Operacao.data_abertura.desc()).offset(skip).limit(limit).all()

# Função para criar uma nova operação no banco (exemplo)
def create_operacao(db: Session, operacao_in: schemas.OperacaoCreate, robo_id_for_op: int, schema_name: str) -> models.Operacao:
    operacao_data = operacao_in.model_dump(exclude={"nome_robo_para_criacao", "robo_id"})
    
    # Similar ao create_robo, usando o nome qualificado da tabela para INSERT
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy import MetaData # Importar MetaData

    # Monta os valores para o INSERT
    insert_values = {**operacao_data, "robo_id": robo_id_for_op}
    # Garante que DateTime são passados corretamente
    if 'data_abertura' in insert_values and isinstance(insert_values['data_abertura'], datetime):
        insert_values['Abertura'] = insert_values.pop('data_abertura') # Usa o nome da coluna do BD
    if 'data_fechamento' in insert_values and isinstance(insert_values['data_fechamento'], datetime):
        insert_values['Fechamento'] = insert_values.pop('data_fechamento')
    if 'resultado' in insert_values:
        insert_values['Resultado_Valor'] = insert_values.pop('resultado')


    stmt = pg_insert(models.Operacao.__table__.tometadata(MetaData(schema=schema_name))).values(
        **insert_values
    ).returning(models.Operacao.id, models.Operacao.criado_em, models.Operacao.atualizado_em) # Adicionado atualizado_em
    
    result = db.execute(stmt)
    db.commit()
    inserted_id, criado_em, atualizado_em = result.fetchone()
    
    # Retorna um objeto ORM completo
    # return get_operacao(db, inserted_id, schema_name)
    # Construir manualmente para evitar problemas de sessão com schema
    return models.Operacao(id=inserted_id, robo_id=robo_id_for_op, **operacao_data, criado_em=criado_em, atualizado_em=atualizado_em)
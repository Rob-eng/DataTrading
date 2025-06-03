from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base # declarative_base para modelos
from .core.config import settings # Importa as configurações (onde está DATABASE_URL)

# A URL de conexão já está montada no arquivo de configurações (settings.DATABASE_URL)
# Ela já considera as variáveis de ambiente POSTGRES_USER, POSTGRES_PASSWORD, etc.
# do seu arquivo .env.
SQLALCHEMY_DATABASE_URL = str(settings.DATABASE_URL) # Converte o tipo Pydantic para string

# Cria a "engine" do SQLAlchemy, que gerencia a conexão com o banco.
# O 'pool_pre_ping=True' verifica as conexões do pool antes de usá-las,
# o que pode ajudar a evitar erros de conexão perdida em longos períodos de inatividade.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True
)

# Cria uma fábrica de sessões (SessionLocal). Cada instância de SessionLocal
# será uma sessão de banco de dados individual.
# autocommit=False: As transações não são commitadas automaticamente. Você controla o commit.
# autoflush=False: Os objetos não são "flushados" para o banco automaticamente. Você controla o flush.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Cria uma classe base para os modelos ORM (Data Access Objects).
# Todos os seus modelos de tabela (ex: Operacao, Robo) herdarão desta classe.
Base = declarative_base()


# --- Dependência para Injeção de Sessão de Banco de Dados ---
# Esta função será usada como uma dependência nas suas rotas FastAPI
# para obter uma sessão de banco de dados e garantir que ela seja fechada corretamente.
def get_db():
    """
    Gerador de dependência que fornece uma sessão de banco de dados SQLAlchemy.

    Garante que a sessão seja fechada após a requisição, mesmo se ocorrerem erros.
    """
    db = SessionLocal()
    try:
        yield db  # Fornece a sessão para a rota
    finally:
        db.close() # Fecha a sessão após a rota terminar
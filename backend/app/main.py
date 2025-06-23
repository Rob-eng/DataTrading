import logging
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from .core.config import settings
from .database import engine, Base, get_db # Importa engine, Base e get_db
from . import models, schemas, crud      # Importa módulos locais
from .routers import operacoes, robos, uploads, analytics, analytics_advanced        # Importa os routers de operações

logger = logging.getLogger(__name__)

def create_tables_in_schema(db_engine, schema_name: str):
    """
    Cria todas as tabelas definidas em models.Base no schema especificado,
    se elas ainda não existirem. O schema já deve existir.
    """
    logger.info(f"Verificando/criando tabelas para o schema: '{schema_name}'")
    try:
        # Itera sobre todas as tabelas definidas nos seus modelos SQLAlchemy
        for table in models.Base.metadata.sorted_tables:
            # Cria uma referência à tabela com o schema especificado
            table_with_schema = table.tometadata(models.Base.metadata, schema=schema_name)
            # Cria a tabela no banco de dados se ela não existir
            table_with_schema.create(bind=db_engine, checkfirst=True)
        logger.info(f"Tabelas no schema '{schema_name}' verificadas/criadas com sucesso.")
    except Exception as e_tbl:
        logger.error(f"Erro ao criar tabelas no schema '{schema_name}': {e_tbl}", exc_info=True)
        raise # Re-levanta a exceção para parar a inicialização se necessário


try:
    # Primeiro, garanta que os schemas existem (você criou manualmente)
    # Agora, crie as tabelas DENTRO desses schemas
    create_tables_in_schema(engine, "oficial")
    create_tables_in_schema(engine, "uploads_usuarios")
    print("Tabelas nos schemas 'oficial' e 'uploads_usuarios' verificadas/criadas.")
except Exception as e_init:
    print(f"ERRO CRÍTICO durante a inicialização e criação de tabelas: {e_init}")
    # Em um cenário de produção, você pode querer que a aplicação não inicie se isso falhar.

# Cria a instância da aplicação FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" # Caminho para o schema OpenAPI
)

# Configuração de CORS para permitir conexões do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todas as origens para desenvolvimento
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui os routers (onde os endpoints específicos são definidos)
app.include_router(operacoes.router, prefix=settings.API_V1_STR) # Inclui as rotas de /api/v1/operacoes
app.include_router(robos.router, prefix=settings.API_V1_STR)
app.include_router(uploads.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR) # Inclui as rotas de /api/v1/analytics
app.include_router(analytics_advanced.router, prefix=settings.API_V1_STR) # Inclui as rotas de /api/v1/analytics-advanced

# Endpoint raiz de verificação de saúde (health check)
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check():
    """
    Verifica se a API está rodando.
    """
    return {"status": "ok", "project_name": settings.PROJECT_NAME, "message": "API está operacional!"}

# (Aqui você adicionará mais routers e lógica no futuro)
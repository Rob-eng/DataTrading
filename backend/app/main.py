from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .core.config import settings
from .database import engine, Base, get_db # Importa engine, Base e get_db
from . import models, schemas, crud      # Importa módulos locais
from .routers import operacoes, robos, uploads        # Importa o router de operações

# --- CRIAÇÃO DAS TABELAS NO BANCO DE DADOS ---
# Esta linha garante que todas as tabelas definidas em models.py
# (que herdam de Base) sejam criadas no banco de dados conectado
# pelo 'engine' QUANDO a aplicação FastAPI inicia.
# Em um ambiente de produção mais robusto, você usaria ferramentas
# de migração como Alembic para gerenciar mudanças no esquema do banco.
# Para desenvolvimento e simplicidade inicial, isto é suficiente.
try:
    models.Base.metadata.create_all(bind=engine)
    print("Tabelas criadas (ou já existentes) no banco de dados.")
except Exception as e:
    print(f"ERRO ao tentar criar tabelas: {e}")
    # Em um cenário real, você pode querer tratar isso de forma mais robusta
    # ou até impedir o início da aplicação se o banco não estiver acessível.

# Cria a instância da aplicação FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" # Caminho para o schema OpenAPI
)

# Inclui os routers (onde os endpoints específicos são definidos)
app.include_router(operacoes.router) # Inclui as rotas de /api/v1/operacoes
app.include_router(robos.router)
app.include_router(uploads.router)

# Endpoint raiz de verificação de saúde (health check)
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check():
    """
    Verifica se a API está rodando.
    """
    return {"status": "ok", "project_name": settings.PROJECT_NAME, "message": "API está operacional!"}

# (Aqui você adicionará mais routers e lógica no futuro)
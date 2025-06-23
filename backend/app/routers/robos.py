from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, models, schemas # Ajuste para .. se estiver em routers/
from ..database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/robos",
    tags=["Robôs"],
    responses={404: {"description": "Não encontrado"}},
)

@router.post("/", response_model=schemas.RoboRead, status_code=201)
def criar_novo_robo(
    robo_in: schemas.RoboCreate,
    schema: str = Query("uploads_usuarios", description="Schema para operar: 'oficial' ou 'uploads_usuarios'"), # Exemplo com Query Param
    db: Session = Depends(get_db)
):
    db_robo_existente = crud.get_robo_by_nome(db, nome=robo_in.nome, schema_name=schema) # Passa o schema
    if db_robo_existente:
        raise HTTPException(status_code=400, detail=f"Robô com o nome '{robo_in.nome}' já existe no schema '{schema}'.")
    # ... (lógica para verificar se existe) ...
    return crud.create_robo(db=db, robo_in=robo_in, schema_name=schema)

@router.get("/", response_model=List[schemas.RoboRead])
def listar_robos(
    # Usando Query para definir o parâmetro 'schema'
    schema: str = Query("uploads_usuarios", description="Schema para operar: 'oficial' ou 'uploads_usuarios'"),
    skip: int = Query(0, ge=0), # Adicionando Query para skip e limit também
    limit: int = Query(100, ge=1, le=1000), # Exemplo de validação com ge/le
    db: Session = Depends(get_db)
):
    robos = crud.get_robos(db, schema_name=schema, skip=skip, limit=limit) # Passa o schema
    return robos

@router.get("/{robo_id}", response_model=schemas.RoboRead)
def ler_robo_por_id(
    robo_id: int,
    # Usando Query para definir o parâmetro 'schema'
    schema: str = Query("uploads_usuarios", description="Schema para operar: 'oficial' ou 'uploads_usuarios'"),
    db: Session = Depends(get_db)
):
    db_robo = crud.get_robo_by_id(db, robo_id=robo_id, schema_name=schema) # Passa o schema
    if db_robo is None:
        raise HTTPException(status_code=404, detail=f"Robô com ID {robo_id} não encontrado no schema '{schema}'.")
    return db_robo

# Você pode adicionar endpoints para atualizar ou deletar robôs se necessário no futuro
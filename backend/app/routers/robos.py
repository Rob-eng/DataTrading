from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import crud, models, schemas # Ajuste para .. se estiver em routers/
from ..database import get_db

router = APIRouter(
    prefix="/api/v1/robos",
    tags=["Robôs"],
    responses={404: {"description": "Não encontrado"}},
)

@router.post("/", response_model=schemas.RoboRead, status_code=201)
def criar_novo_robo(
    robo_in: schemas.RoboCreate,
    schema: str = Query("uploads_usuarios", description="Schema para operar: 'oficial' ou 'uploads_usuarios'"), # Exemplo com Query Param
    db: Session = Depends(get_db)
):
    # ... (lógica para verificar se existe) ...
    return crud.create_robo(db=db, robo_in=robo_in, schema_name=schema)

@router.get("/", response_model=List[schemas.RoboRead])
def listar_robos(
    schema: str = Query("uploads_usuarios", description="Schema para operar"),
    # ... (skip, limit) ...
):
    return crud.get_robos(db, schema_name=schema, skip=skip, limit=limit)

@router.get("/{robo_id}", response_model=schemas.RoboRead)
def ler_robo_por_id(
    robo_id: int,
    db: Session = Depends(get_db)
):
    """
    Retorna um robô específico pelo seu ID.
    """
    db_robo = crud.get_robo_by_id(db, robo_id=robo_id)
    if db_robo is None:
        raise HTTPException(status_code=404, detail="Robô não encontrado.")
    return db_robo

# Você pode adicionar endpoints para atualizar ou deletar robôs se necessário no futuro
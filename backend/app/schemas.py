from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
# Importa o Enum que definimos em models.py para validação
from .models import TipoOperacaoEnum


class RoboBase(BaseModel):
    nome: str = Field(..., examples=["MeuRoboSuper"])

class RoboCreate(RoboBase):
    pass # Por enquanto, criar um robô só precisa do nome

class RoboRead(RoboBase):
    id: int
    criado_em: datetime

    class Config:
        from_attributes = True
# --- Esquema Base para Operacao ---
# Define os campos comuns e seus tipos.
# Todos os campos são opcionais aqui porque este esquema pode ser usado
# tanto para criação (onde alguns são obrigatórios) quanto para leitura (onde todos vêm do BD).
class OperacaoBase(BaseModel):
    #setup_robo: Optional[str] = Field(None, examples=["MeuRoboA"])
    robo_id: Optional[int] = Field(None, description="ID do robô associado")
    nome_robo_para_criacao: Optional[str] = Field(None, description="Nome do robô (usado na criação se robo_id não fornecido)")
    resultado: Optional[float] = Field(None, examples=[150.75, -50.0])
    data_abertura: Optional[datetime] = Field(None, examples=["2024-05-05T10:30:00Z"])
    data_fechamento: Optional[datetime] = Field(None, examples=["2024-05-05T11:00:00Z"])
    ativo: Optional[str] = Field(None, examples=["WINM24"])
    lotes: Optional[float] = Field(None, examples=[1.0, 5.0])
    tipo: Optional[TipoOperacaoEnum] = Field(None, examples=[TipoOperacaoEnum.COMPRA])
    fonte_dados_id: Optional[str] = Field(None, description="Identificador da fonte dos dados")

    # Configuração para Pydantic (necessária para ORM mode em schemas de leitura)
    class Config:
        from_attributes = True # Anteriormente orm_mode = True

# --- Esquema para Criar uma Operação ---
# Herda de OperacaoBase e define quais campos são obrigatórios para criação.
class OperacaoCreate(OperacaoBase):
    #setup_robo: str = Field(..., examples=["MeuRoboX"]) # ... indica que é obrigatório
    resultado: float = Field(..., examples=[100.0])
    data_abertura: datetime = Field(..., examples=["2024-05-06T09:00:00"])
    # data_fechamento pode ser opcional na criação se a operação pode estar aberta
    # tipo e outros também podem ser opcionais dependendo da sua lógica de entrada

# --- Esquema para Ler uma Operação (Resposta da API) ---
# Herda de OperacaoBase e adiciona campos que só existem após a criação no BD (como id).
class OperacaoRead(OperacaoBase):
    id: int
    robo_info: Optional[RoboRead] = None
    criado_em: datetime
    atualizado_em: datetime
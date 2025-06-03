from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, Field # Adiciona Field para validação
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "RobDataTrading API"
    API_V1_STR: str = "/api/v1" # Prefixo comum para APIs versionadas

    # Chave secreta (pode ser usada para JWTs, etc.)
    SECRET_KEY: str

    # Configurações do Banco de Dados
    DATABASE_URL: PostgresDsn

    # Configurações do Uvicorn (se quiser definir aqui em vez do Dockerfile CMD)
    # mas manter no Dockerfile CMD é mais comum para Docker.
    # UVICORN_HOST: str = "0.0.0.0"
    # UVICORN_PORT: int = 8000
    # UVICORN_WORKERS: int = 1 # Começar com 1, pode aumentar depois

    # Configurações de ambiente
    ENVIRONMENT: Optional[str] = Field("development", env="ENVIRONMENT")
    
     # Configurações de nomes de Colunas
    RESULT_COLUMN_NAME: str = "Resultado_Valor"
    PRIMARY_RESULT_COLUMN_CSV: str = "Res. Operação (%)"
    FALLBACK_RESULT_COLUMNS_CSV: List[str] = ["Res. Operação", "Resultado", "Profit"]
    # Adicione as de Excel se for implementar upload de Excel depois
    # PRIMARY_RESULT_COLUMN_EXCEL: str = "Res. Operação (%)"
    # FALLBACK_RESULT_COLUMNS_EXCEL: List[str] = ["Res. Operação", "Resultado", "Profit"]
    OPEN_TIME_COLUMNS: List[str] = ["Abertura", "Data Abertura", "Open Time"]
    CLOSE_TIME_COLUMNS: List[str] = ["Fechamento", "Data Fechamento", "Close Time"]
    ROBO_COLUMN_NAME: str = "Robo" # Usado internamente para o modelo Robo

    # Configurações de Processamento de CSV
    CSV_SKIPROWS: int = 5
    CSV_ENCODING: str = "latin-1"
    CSV_SEPARATOR: str = ";"
    CSV_HEADER: int = 0 # 0 significa que a primeira linha lida (após skiprows) é o cabeçalho
    # -------------------------------------------------

    model_config = SettingsConfigDict(
        env_file=".env", # Nome do arquivo .env na raiz do projeto
        env_file_encoding='utf-8',
        extra='ignore' # Ignora variáveis extras no .env
    )

settings = Settings()
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, Field # Adiciona Field para validação
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "RobDataTrading API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str
    ENVIRONMENT: Optional[str] = Field("development", env="ENVIRONMENT")

    # Configurações do Banco de Dados (lidas do .env)
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: int = 5432

    DATABASE_URL: Optional[PostgresDsn] = None # Será montada pelo validator

    # Validator para construir DATABASE_URL a partir das partes
    @validator("DATABASE_URL", pre=True, always=True)
    def assemble_db_connection(cls, v: Optional[str], values: dict[str, Any]) -> Any:
        if isinstance(v, str) and v: # Se DATABASE_URL já estiver definida no .env, usa ela
            return v
        # Se não, monta a partir das partes POSTGRES_*
        # Garante que todos os valores necessários estão presentes
        user = values.get("POSTGRES_USER")
        password = values.get("POSTGRES_PASSWORD")
        server = values.get("POSTGRES_SERVER")
        port = values.get("POSTGRES_PORT")
        db_name = values.get("POSTGRES_DB")

        if not all([user, password, server, port, db_name]):
            raise ValueError("Faltam variáveis POSTGRES_* para construir DATABASE_URL")

        return PostgresDsn.build(
            scheme="postgresql",
            username=user,
            password=password,
            host=server,
            port=str(port), # Port precisa ser string para PydanticDsn.build
            path=f"/{db_name}", # Path precisa começar com /
        )

    # Constantes de processamento (como antes)
    RESULT_COLUMN_NAME: str = "Resultado_Valor"
    PRIMARY_RESULT_COLUMN_CSV: str = "Res. Operação (%)"
    FALLBACK_RESULT_COLUMNS_CSV: List[str] = ["Res. Operação", "Resultado", "Profit"]
    OPEN_TIME_COLUMNS: List[str] = ["Abertura", "Data Abertura", "Open Time"]
    CLOSE_TIME_COLUMNS: List[str] = ["Fechamento", "Data Fechamento", "Close Time"]
    ROBO_COLUMN_NAME: str = "Robo"
    CSV_SKIPROWS: int = 5
    CSV_ENCODING: str = "latin-1"
    CSV_SEPARATOR: str = ";"
    CSV_HEADER: int = 0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()
# Adicione este print para depuração no servidor
print(f"DEBUG [config.py]: DATABASE_URL montada = {settings.DATABASE_URL}")
print(f"DEBUG [config.py]: POSTGRES_SERVER = {settings.POSTGRES_SERVER}")
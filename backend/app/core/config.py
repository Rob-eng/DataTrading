from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, Field, model_validator # <<< MUDANÇA AQUI: model_validator
from typing import Optional, List, Any

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

    # DATABASE_URL agora é construída por um model_validator
    # Não a definimos como um campo direto aqui, mas como uma propriedade
    # ou a construímos no model_validator e a atribuímos.
    # Para simplificar, vamos deixar que ela seja um campo que o validator preenche.
    # Pydantic v2 espera que todos os campos não opcionais tenham um valor após a inicialização.
    DATABASE_URL: PostgresDsn # <<< TORNAR NÃO OPCIONAL

    # Usar model_validator é mais robusto para campos derivados em Pydantic v2
    @model_validator(mode='after') # 'after' para acessar outros campos já validados
    def assemble_db_connection(cls, values: Any) -> Any:
        # 'values' aqui será um objeto da própria classe Settings parcialmente preenchido
        # ou um dict se mode='before' fosse usado.
        # Vamos garantir que 'values' seja o objeto self para acessar campos
        if isinstance(values, dict): # Se for um dict (ex: no pre=True, o que não estamos usando)
            db_url = values.get("DATABASE_URL")
            if db_url: return values # Já está definido, retorna

            user = values.get("POSTGRES_USER")
            password = values.get("POSTGRES_PASSWORD")
            server = values.get("POSTGRES_SERVER")
            port = values.get("POSTGRES_PORT")
            db_name = values.get("POSTGRES_DB")
        else: # É uma instância da classe Settings (modo 'after')
            if values.DATABASE_URL: # Se já tiver sido setada por algum motivo
                 return values

            user = values.POSTGRES_USER
            password = values.POSTGRES_PASSWORD
            server = values.POSTGRES_SERVER
            port = values.POSTGRES_PORT
            db_name = values.POSTGRES_DB


        if not all([user, password, server, port is not None, db_name]): # port pode ser 0
            raise ValueError(
                "Faltam uma ou mais variáveis POSTGRES_* para construir DATABASE_URL. "
                f"Recebido: U={user}, P={'******' if password else None}, S={server}, Prt={port}, DB={db_name}"
            )

        # Constrói a URL
        built_url = PostgresDsn.build(
            scheme="postgresql",
            username=user,
            password=password,
            host=server,
            port=str(port),
            path=f"/{db_name}",
        )
        if isinstance(values, dict):
            values["DATABASE_URL"] = built_url
        else:
            values.DATABASE_URL = built_url # Atribui ao campo da instância
        return values


    # Constantes de processamento CSV
    RESULT_COLUMN_NAME: str = "Resultado_Valor"
    PRIMARY_RESULT_COLUMN_CSV: str = "Res. Operação (%)"
    FALLBACK_RESULT_COLUMNS_CSV: List[str] = ["Res. Operação", "Resultado", "Profit", "Result"]
    
    # Colunas de data/hora
    OPEN_TIME_COLUMNS: List[str] = ["Abertura", "Data Abertura", "Open Time", "Data de Abertura"]
    CLOSE_TIME_COLUMNS: List[str] = ["Fechamento", "Data Fechamento", "Close Time", "Data de Fechamento"]
    
    # Outras colunas
    ATIVO_COLUMNS: List[str] = ["Ativo", "Papel", "Symbol", "Instrumento"]
    LOTES_COLUMNS: List[str] = ["Qtd.", "Quantidade", "Lotes", "Quantity", "Volume"]
    TIPO_COLUMNS: List[str] = ["Tipo", "Operação", "Side", "Direction"]
    ROBO_COLUMN_NAME: str = "Robo"
    
    # Configurações de parsing do CSV
    CSV_SKIPROWS: int = 5
    CSV_ENCODING: str = "latin-1"
    CSV_SEPARATOR: str = ";"
    CSV_HEADER: int = 0
    
    # Schema padrão para uploads
    DEFAULT_UPLOAD_SCHEMA: str = "uploads_usuarios"


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()
print(f"DEBUG [config.py]: DATABASE_URL montada = {settings.DATABASE_URL}")
print(f"DEBUG [config.py]: POSTGRES_SERVER = {settings.POSTGRES_SERVER}")
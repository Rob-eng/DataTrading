CREATE TABLE IF NOT EXISTS uploads_usuarios.operacoes (
    id SERIAL PRIMARY KEY,
    robo_id INTEGER NOT NULL REFERENCES uploads_usuarios.robos(id),
    fonte_dados_id VARCHAR(100),
    "Resultado_Valor" FLOAT NOT NULL,
    "Abertura" TIMESTAMP WITH TIME ZONE NOT NULL,
    "Fechamento" TIMESTAMP WITH TIME ZONE,
    ativo VARCHAR(50),
    lotes FLOAT,
    tipo VARCHAR(20),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
); 
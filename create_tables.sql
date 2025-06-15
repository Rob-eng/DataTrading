-- Script para criar as tabelas necessárias
-- Criando schemas
CREATE SCHEMA IF NOT EXISTS oficial;
CREATE SCHEMA IF NOT EXISTS uploads_usuarios;

-- Criando tabelas no schema oficial
CREATE TABLE IF NOT EXISTS oficial.robos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oficial.operacoes (
    id SERIAL PRIMARY KEY,
    robo_id INTEGER NOT NULL REFERENCES oficial.robos(id),
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

-- Criando tabelas no schema uploads_usuarios
CREATE TABLE IF NOT EXISTS uploads_usuarios.robos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Criando índices para performance
CREATE INDEX IF NOT EXISTS idx_operacoes_robo_id ON oficial.operacoes(robo_id);
CREATE INDEX IF NOT EXISTS idx_operacoes_abertura ON oficial.operacoes("Abertura");
CREATE INDEX IF NOT EXISTS idx_operacoes_ativo ON oficial.operacoes(ativo);

CREATE INDEX IF NOT EXISTS idx_operacoes_robo_id_uploads ON uploads_usuarios.operacoes(robo_id);
CREATE INDEX IF NOT EXISTS idx_operacoes_abertura_uploads ON uploads_usuarios.operacoes("Abertura");
CREATE INDEX IF NOT EXISTS idx_operacoes_ativo_uploads ON uploads_usuarios.operacoes(ativo);

-- Confirmação
SELECT 'Tabelas criadas com sucesso!' as status; 
-- Script de inicialização automática do PostgreSQL
-- Este arquivo será executado automaticamente na primeira criação do container

-- Criar schemas necessários
CREATE SCHEMA IF NOT EXISTS oficial;
CREATE SCHEMA IF NOT EXISTS uploads_usuarios;

-- Exibir mensagem de confirmação
SELECT 'Schemas criados automaticamente na inicialização do PostgreSQL' as status; 
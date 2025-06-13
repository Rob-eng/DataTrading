-- Script de configuração inicial do banco de dados RobDataTrading
-- Execute este script após conectar ao banco PostgreSQL

-- Conectar ao banco de dados especificado no .env (robdatatrading_db por padrão)
\c robdatatrading_db

-- Criar schemas necessários
CREATE SCHEMA IF NOT EXISTS oficial;
CREATE SCHEMA IF NOT EXISTS uploads_usuarios;

-- Configurar permissões para o usuário da aplicação
-- Substitua 'robdatatrading_user' pelo usuário definido no seu .env
GRANT USAGE ON SCHEMA oficial TO robdatatrading_user;
GRANT USAGE ON SCHEMA uploads_usuarios TO robdatatrading_user;

GRANT CREATE ON SCHEMA oficial TO robdatatrading_user;
GRANT CREATE ON SCHEMA uploads_usuarios TO robdatatrading_user;

-- Dar permissões nas tabelas que serão criadas futuramente
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA oficial TO robdatatrading_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA uploads_usuarios TO robdatatrading_user;

-- Permitir criação de sequências (para campos auto-incremento)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA oficial TO robdatatrading_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA uploads_usuarios TO robdatatrading_user;

-- Configurar permissões padrão para tabelas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA oficial GRANT ALL PRIVILEGES ON TABLES TO robdatatrading_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA uploads_usuarios GRANT ALL PRIVILEGES ON TABLES TO robdatatrading_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA oficial GRANT ALL PRIVILEGES ON SEQUENCES TO robdatatrading_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA uploads_usuarios GRANT ALL PRIVILEGES ON SEQUENCES TO robdatatrading_user;

-- Exibir esquemas criados
\dn

-- Exibir mensagem de sucesso
SELECT 'Schemas "oficial" e "uploads_usuarios" criados com sucesso!' as status; 
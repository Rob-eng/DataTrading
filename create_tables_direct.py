#!/usr/bin/env python3
"""
Script para criar as tabelas diretamente no banco de dados
"""

import psycopg2
from psycopg2 import sql

# Configurações do banco
DB_CONFIG = {
    'host': 'localhost',
    'port': 5433,  # Porta mapeada no docker-compose
    'database': 'robdatatrading_db',
    'user': 'robdatatrading_user',
    'password': 'robdatatrading_password_123'
}

def create_tables():
    """Cria as tabelas necessárias no banco"""
    try:
        # Conectar ao banco
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        print("🔗 Conectado ao banco de dados")
        
        # Criar schemas
        cur.execute("CREATE SCHEMA IF NOT EXISTS oficial")
        cur.execute("CREATE SCHEMA IF NOT EXISTS uploads_usuarios")
        print("✅ Schemas criados")
        
        # Criar tabela de robôs no schema uploads_usuarios
        cur.execute('''
            CREATE TABLE IF NOT EXISTS uploads_usuarios.robos (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) UNIQUE NOT NULL,
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        ''')
        
        # Criar tabela de operações no schema uploads_usuarios
        cur.execute('''
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
            )
        ''')
        
        # Criar índices
        cur.execute('CREATE INDEX IF NOT EXISTS idx_operacoes_robo_id_uploads ON uploads_usuarios.operacoes(robo_id)')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_operacoes_abertura_uploads ON uploads_usuarios.operacoes("Abertura")')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_operacoes_ativo_uploads ON uploads_usuarios.operacoes(ativo)')
        
        print("✅ Tabelas criadas no schema uploads_usuarios")
        
        # Criar tabela de robôs no schema oficial
        cur.execute('''
            CREATE TABLE IF NOT EXISTS oficial.robos (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) UNIQUE NOT NULL,
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        ''')
        
        # Criar tabela de operações no schema oficial
        cur.execute('''
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
            )
        ''')
        
        # Criar índices
        cur.execute('CREATE INDEX IF NOT EXISTS idx_operacoes_robo_id ON oficial.operacoes(robo_id)')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_operacoes_abertura ON oficial.operacoes("Abertura")')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_operacoes_ativo ON oficial.operacoes(ativo)')
        
        print("✅ Tabelas criadas no schema oficial")
        
        # Confirmar as mudanças
        conn.commit()
        
        print("🎉 Todas as tabelas foram criadas com sucesso!")
        
        # Listar tabelas criadas
        cur.execute("""
            SELECT schemaname, tablename 
            FROM pg_tables 
            WHERE schemaname IN ('oficial', 'uploads_usuarios')
            ORDER BY schemaname, tablename
        """)
        tables = cur.fetchall()
        
        print("\n📋 Tabelas criadas:")
        for schema, table in tables:
            print(f"   • {schema}.{table}")
        
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")
        if conn:
            conn.rollback()
    
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
        print("🔌 Conexão com banco fechada")

if __name__ == "__main__":
    create_tables() 
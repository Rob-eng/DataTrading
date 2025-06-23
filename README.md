# RobDataTrading API

Sistema de trading de dados desenvolvido com FastAPI, PostgreSQL e Docker para análise e armazenamento de operações de robôs de trading.

## 🚀 Funcionalidades

- **API REST completa** para gerenciamento de operações e robôs
- **Upload de arquivos CSV** com processamento inteligente
- **Múltiplos schemas** para separar dados oficiais de uploads de usuários
- **Validação robusta** de dados com Pydantic
- **Estatísticas automáticas** de performance dos robôs
- **Containerização** com Docker para fácil deployment

## 📋 Pré-requisitos

- Docker e Docker Compose instalados
- Git

## 🛠️ Instalação e Configuração

### 1. Clone o repositório
```bash
git clone <url-do-repositório>
cd RobDataTrading
```

### 2. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo e edite conforme necessário
cp env.example .env

# Edite o arquivo .env com suas configurações
# As configurações padrão já funcionam para desenvolvimento local
```

### 3. Crie os schemas no banco de dados
Execute este script SQL no PostgreSQL para criar os schemas necessários:

```sql
-- Conectar ao banco robdatatrading_db e executar:
CREATE SCHEMA IF NOT EXISTS oficial;
CREATE SCHEMA IF NOT EXISTS uploads_usuarios;
```

### 4. Inicie os serviços
```bash
# Construir e iniciar todos os serviços
docker-compose up --build

# Ou para rodar em segundo plano
docker-compose up -d --build
```

### 5. Acesse a aplicação
- **API Swagger Docs**: http://localhost/docs
- **API ReDoc**: http://localhost/redoc
- **Health Check**: http://localhost/api/v1/health

## 📁 Estrutura do Projeto

```
RobDataTrading/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          # Configurações da aplicação
│   │   ├── routers/
│   │   │   ├── operacoes.py       # Endpoints de operações
│   │   │   ├── robos.py           # Endpoints de robôs
│   │   │   └── uploads.py         # Endpoints de upload CSV
│   │   ├── crud.py                # Operações de banco de dados
│   │   ├── database.py            # Configuração do banco
│   │   ├── models.py              # Modelos SQLAlchemy
│   │   ├── schemas.py             # Schemas Pydantic
│   │   └── main.py                # Aplicação principal
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml             # Configuração dos serviços
├── nginx.conf                     # Configuração do proxy
├── .gitignore
└── README.md
```

## 🔧 Uso da API

### Criar um Robô
```bash
curl -X POST "http://localhost/api/v1/robos/" \
  -H "Content-Type: application/json" \
  -d '{"nome": "MeuRoboA"}'
```

### Criar uma Operação
```bash
curl -X POST "http://localhost/api/v1/operacoes/" \
  -H "Content-Type: application/json" \
  -d '{
    "nome_robo_para_criacao": "MeuRoboA",
    "resultado": 150.5,
    "data_abertura": "2024-01-15T10:30:00",
    "data_fechamento": "2024-01-15T11:00:00",
    "ativo": "WINM24",
    "lotes": 1.0,
    "tipo": "COMPRA"
  }'
```

### Upload de arquivo CSV
```bash
curl -X POST "http://localhost/api/v1/uploads/csv/" \
  -F "arquivo_csv=@operacoes.csv" \
  -F "nome_robo_form=RoboTeste"
```

### Listar Operações
```bash
curl "http://localhost/api/v1/operacoes/"
```

## 📊 Formato do CSV

O sistema aceita CSVs com as seguintes colunas (nomes flexíveis):

### Colunas Obrigatórias:
- **Resultado**: `Res. Operação (%)`, `Resultado`, `Profit`, `Result`
- **Data Abertura**: `Abertura`, `Data Abertura`, `Open Time`

### Colunas Opcionais:
- **Data Fechamento**: `Fechamento`, `Data Fechamento`, `Close Time`
- **Ativo**: `Ativo`, `Papel`, `Symbol`, `Instrumento`
- **Quantidade**: `Qtd.`, `Quantidade`, `Lotes`, `Volume`
- **Tipo**: `Tipo`, `Operação`, `Side`, `Direction`

### Exemplo de CSV:
```csv
Abertura;Fechamento;Res. Operação (%);Ativo;Qtd.;Tipo
15/01/2024 10:30;15/01/2024 11:00;150,50;WINM24;1;COMPRA
15/01/2024 14:15;15/01/2024 14:45;-75,25;WINM24;2;VENDA
```

## 🗄️ Schemas do Banco

O sistema utiliza dois schemas:

- **`oficial`**: Para dados oficiais e validados
- **`uploads_usuarios`**: Para uploads de usuários (padrão)

Especifique o schema nos endpoints usando o parâmetro `schema`:
```bash
curl "http://localhost/api/v1/operacoes/?schema=oficial"
```

## 📈 Estatísticas

A API calcula automaticamente estatísticas para cada robô:
- Total de operações
- Resultado total e médio
- Operações positivas/negativas
- Taxa de acerto

## 🐳 Comandos Docker Úteis

```bash
# Ver logs da aplicação
docker-compose logs -f backend

# Reiniciar apenas o backend
docker-compose restart backend

# Parar todos os serviços
docker-compose down

# Remover volumes (dados do banco)
docker-compose down -v

# Status dos containers
docker-compose ps

# Logs específicos
docker-compose logs --tail=10 backend
docker-compose logs --tail=10 nginx

# Reiniciar serviços
docker-compose restart nginx
docker-compose restart backend

# Rebuild completo
docker-compose down
docker-compose up --build -d
```

## 🔍 Troubleshooting

### Erro de conexão com banco
1. Verifique se os serviços estão rodando: `docker-compose ps`
2. Verifique os logs: `docker-compose logs db`
3. Confirme se os schemas foram criados no banco

### Erro no upload de CSV
1. Verifique se o arquivo tem as colunas obrigatórias
2. Confirme a codificação (padrão: latin-1)
3. Verifique os logs: `docker-compose logs backend`

### Performance lenta
1. Verifique o uso de recursos: `docker stats`
2. Considere ajustar os limites no docker-compose.yml

## 🤝 Contribuição

1. Faça fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

## 📞 Suporte

Para suporte, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento. 

┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Frontend       │    │   Nginx      │    │   Backend       │
│  React/Vite     │───▶│   Proxy      │───▶│   FastAPI       │
│  :3000         │    │   :80        │    │   :8000         │
└─────────────────┘    └──────────────┘    └─────────────────┘
                                                    │
                                           ┌─────────────────┐
                                           │   PostgreSQL    │
                                           │   Database      │
                                           │   :5433         │
                                           └─────────────────┘ 
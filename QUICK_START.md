# 🚀 Quick Start - RobDataTrading

## Executar o projeto em 3 passos

### 1. Configurar variáveis de ambiente
```bash
cp env.example .env
```

### 2. Iniciar todos os serviços
```bash
docker-compose up --build
```

### 3. Testar a API
```bash
# Health check
curl http://localhost/api/v1/health

# Criar um robô
curl -X POST "http://localhost/api/v1/robos/" \
  -H "Content-Type: application/json" \
  -d '{"nome": "TesteRobo"}'

# Listar robôs
curl http://localhost/api/v1/robos/
```

## 📊 Acessar a documentação interativa
- **Swagger UI**: http://localhost/docs
- **ReDoc**: http://localhost/redoc

## 🛑 Parar os serviços
```bash
docker-compose down
```

## 🔄 Reiniciar após mudanças no código
```bash
docker-compose restart backend
```

## 📁 Exemplo de CSV para upload
```csv
Abertura;Fechamento;Res. Operação (%);Ativo;Qtd.;Tipo
15/01/2024 10:30;15/01/2024 11:00;150,50;WINM24;1;COMPRA
15/01/2024 14:15;15/01/2024 14:45;-75,25;WINM24;2;VENDA
```

Salve este conteúdo em um arquivo `operacoes.csv` e faça upload via:
```bash
curl -X POST "http://localhost/api/v1/uploads/csv/" \
  -F "arquivo_csv=@operacoes.csv" \
  -F "nome_robo_form=MeuRobo"
```

## 🐛 Se algo der errado
```bash
# Ver logs
docker-compose logs -f backend

# Recriar containers
docker-compose down -v
docker-compose up --build
``` 
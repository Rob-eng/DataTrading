# backend/Dockerfile

# Usar uma imagem base oficial do Python. Slim é menor. Bullseye é uma versão estável do Debian.
FROM python:3.11-slim-bullseye

# Definir variáveis de ambiente para melhor comportamento do Python em contêineres
ENV PYTHONDONTWRITEBYTECODE 1  # Impede Python de gerar arquivos .pyc (economiza espaço)
ENV PYTHONUNBUFFERED 1       # Força print() e logs a aparecerem imediatamente

# Definir o diretório de trabalho dentro do contêiner
# Todo comando subsequente será executado a partir deste diretório
WORKDIR /app

# Instalar dependências do sistema operacional que podem ser necessárias
# para algumas bibliotecas Python (ex: psycopg2-binary, Pillow para ReportLab se usado)
# libpq-dev: para psycopg2 (driver postgres)
# build-essential: para compilar pacotes C se necessário
# Para ReportLab/Matplotlib (se você adicionar depois):
# libfreetype6-dev libjpeg62-turbo-dev libpng-dev libtiff5-dev fonts-dejavu-core
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq-dev \
    build-essential \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copiar apenas o requirements.txt primeiro.
# Isso aproveita o cache do Docker: se o requirements.txt não mudar,
# o passo de instalação de dependências não será reexecutado em builds subsequentes.
COPY ./requirements.txt /app/requirements.txt

# Instalar dependências Python
# --no-cache-dir: Não armazena o cache do pip, economizando espaço na imagem final
# --upgrade pip: Garante que o pip está atualizado antes de instalar pacotes
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar o restante do código da aplicação para o diretório de trabalho /app
# O primeiro '.' refere-se ao contexto de build (pasta 'backend/' no docker-compose)
# O segundo '.' refere-se ao WORKDIR ('/app') dentro do contêiner
COPY ./app /app/app

# Expor a porta que o Uvicorn (servidor ASGI para FastAPI) usará dentro do contêiner
# Esta porta NÃO é automaticamente exposta para o host,
# isso é feito no docker-compose.yml
EXPOSE 8000

# Comando para rodar a aplicação FastAPI usando Uvicorn
# "app.main:app": 'app' é o diretório, 'main' é o arquivo main.py, 'app' é a instância FastAPI
# --host 0.0.0.0: Torna a aplicação acessível de fora do contêiner (essencial)
# --port 8000: Porta interna que o Uvicorn escutará
# --reload: (APENAS PARA DESENVOLVIMENTO) Recarrega automaticamente em mudanças no código. REMOVER EM PRODUÇÃO.
# Para produção, você ajustaria os workers e removeria --reload.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
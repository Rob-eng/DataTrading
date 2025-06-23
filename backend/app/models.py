from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as DBEnum, ForeignKey 
from sqlalchemy.orm import relationship # Renomeado para DBEnum para evitar conflito
from sqlalchemy.sql import func # Para valores padrão como data/hora atual
import enum # Módulo enum padrão do Python
from typing import Optional
from .database import Base # Importa a classe Base que criamos

class Robo(Base):
    __tablename__ = "robos"
    __table_args__ = {'schema': None}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(100), unique=True, index=True, nullable=False) # Nome do robô deve ser único
    # Você pode adicionar outros campos aqui no futuro, como 'margem_padrao', 'descricao', etc.
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamento: Um robô pode ter muitas operações
    operacoes = relationship("Operacao", back_populates="robo_info")

    def __repr__(self):
        return f"<Robo(id={self.id}, nome='{self.nome}')>"

# Define um Enum para o tipo de operação
class TipoOperacaoEnum(str, enum.Enum):
    COMPRA = "COMPRA" # Usar strings mais descritivas
    VENDA = "VENDA"
    DESCONHECIDO = "DESCONHECIDO" # Um valor padrão

class Operacao(Base):
    __tablename__ = "operacoes" # Nome da tabela no banco de dados
    __table_args__ = {'schema': None}
    # Coluna de ID, chave primária, auto-incrementável
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    robo_id = Column(Integer, ForeignKey("robos.id", use_alter=True, name="fk_operacao_robo_id"), nullable=False, index=True) # Aponta para robos.id
    # Removido o setup_robo direto, agora será via relacionamento
    # setup_robo = Column(String(100), index=True, nullable=False, name="Robo")
    
    fonte_dados_id = Column(String(100), index=True, nullable=True) # Ou Integer se for ID de usuário
    
    # Coluna para o nome do setup ou robô
    # index=True cria um índice nesta coluna para buscas mais rápidas
    #setup_robo = Column(String(100), index=True, nullable=False, name="Robo") # Ex: "MeuRoboA", "EstratégiaX"

    # Coluna para o resultado numérico da operação (pontos ou financeiro)
    # Usaremos Float para flexibilidade, mas você mencionou que são inteiros.
    # O tipo Float no banco pode armazenar inteiros sem problemas.
    resultado = Column(Float, nullable=False, name="Resultado_Valor")

    # Datas e Horas das operações - SEM timezone para preservar horários exatos do arquivo
    data_abertura = Column(DateTime(timezone=False), index=True, nullable=False, name="Abertura")
    data_fechamento = Column(DateTime(timezone=False), nullable=True, name="Fechamento") # Pode ser nulo se a op estiver aberta

    # Informações adicionais da operação
    ativo = Column(String(50), nullable=True) # Ex: "WINM24", "PETR4"
    lotes = Column(Float, nullable=True)      # Quantidade de lotes/contratos
    tipo = Column(DBEnum(TipoOperacaoEnum, name="tipo_operacao_enum_v2"), nullable=True, default=TipoOperacaoEnum.DESCONHECIDO)
    
    # Campos para análises avançadas de risco
    mae = Column(Float, nullable=True)        # Maximum Adverse Excursion - pior excursão adversa
    mfe = Column(Float, nullable=True)        # Maximum Favorable Excursion - melhor excursão favorável

    # Coluna para registrar quando o registro foi criado no banco
    # server_default=func.now() usa a função NOW() do PostgreSQL
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    # Coluna para registrar a última atualização do registro
    # onupdate=func.now() atualiza automaticamente no update
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    robo_info = relationship("Robo", back_populates="operacoes")

    def __repr__(self):
        return (f"<Operacao(id={self.id}, robo_id='{self.robo_id}', "
                f"resultado={self.resultado}, abertura='{self.data_abertura}')>")

def get_operacao_model_for_schema(schema_name: Optional[str]):
    # Retorna uma nova classe Operacao com o schema definido, se necessário
    # Isso é mais complexo e geralmente não é a forma padrão de lidar com schemas dinâmicos em queries
    # A forma mais comum é usar table.tometadata(metadata_obj_com_schema) ou especificar na query.
    # Por simplicidade no CRUD, vamos tentar outra abordagem.
    pass
# Você pode adicionar outros modelos aqui no futuro, como uma tabela para Robos, Ativos, etc.
# Exemplo (não vamos usar agora, mas para ilustração):
# class Robo(Base):
#     __tablename__ = "robos"
#     id = Column(Integer, primary_key=True, index=True)
#     nome = Column(String, unique=True, index=True, nullable=False)
#     margem_requerida = Column(Float, nullable=True)
#     # Relacionamento com Operacao (se necessário)
#     # operacoes = relationship("Operacao", back_populates="robo_info")
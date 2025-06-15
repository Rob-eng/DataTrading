import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import pandas as pd
from statistics import mean, stdev
import math

from .. import crud, models, schemas
from ..database import get_db
from ..core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics & Métricas"],
    responses={404: {"description": "Não encontrado"}},
)

class TradingMetricsCalculator:
    """Calculadora de métricas de trading"""
    
    @staticmethod
    def calculate_basic_metrics(operacoes: List[models.Operacao]) -> Dict[str, Any]:
        """Calcula métricas básicas de trading"""
        if not operacoes:
            return TradingMetricsCalculator._empty_metrics()
        
        resultados = [op.resultado for op in operacoes if op.resultado is not None]
        if not resultados:
            return TradingMetricsCalculator._empty_metrics()
        
        # Métricas básicas
        total_operacoes = len(operacoes)
        resultado_total = sum(resultados)
        resultado_medio = mean(resultados)
        
        # Operações positivas e negativas
        positivas = [r for r in resultados if r > 0]
        negativas = [r for r in resultados if r < 0]
        neutras = [r for r in resultados if r == 0]
        
        # Win Rate
        win_rate = (len(positivas) / total_operacoes) * 100 if total_operacoes > 0 else 0
        
        # Maior ganho e perda
        maior_ganho = max(resultados) if resultados else 0
        maior_perda = min(resultados) if resultados else 0
        
        # Gain médio e Loss médio
        gain_medio = mean(positivas) if positivas else 0
        loss_medio = abs(mean(negativas)) if negativas else 0
        
        return {
            "total_operacoes": total_operacoes,
            "resultado_total": round(resultado_total, 2),
            "resultado_medio": round(resultado_medio, 2),
            "operacoes_positivas": len(positivas),
            "operacoes_negativas": len(negativas),
            "operacoes_neutras": len(neutras),
            "win_rate": round(win_rate, 2),
            "loss_rate": round(100 - win_rate, 2),
            "maior_ganho": round(maior_ganho, 2),
            "maior_perda": round(maior_perda, 2),
            "gain_medio": round(gain_medio, 2),
            "loss_medio": round(loss_medio, 2)
        }
    
    @staticmethod
    def calculate_advanced_metrics(operacoes: List[models.Operacao]) -> Dict[str, Any]:
        """Calcula métricas avançadas de trading"""
        if not operacoes:
            return TradingMetricsCalculator._empty_advanced_metrics()
        
        resultados = [op.resultado for op in operacoes if op.resultado is not None]
        if not resultados:
            return TradingMetricsCalculator._empty_advanced_metrics()
        
        basic_metrics = TradingMetricsCalculator.calculate_basic_metrics(operacoes)
        
        # Payoff Ratio
        payoff = basic_metrics["gain_medio"] / basic_metrics["loss_medio"] if basic_metrics["loss_medio"] > 0 else 0
        
        # Fator de Lucro
        total_ganhos = sum([r for r in resultados if r > 0])
        total_perdas = abs(sum([r for r in resultados if r < 0]))
        fator_lucro = total_ganhos / total_perdas if total_perdas > 0 else float('inf') if total_ganhos > 0 else 0
        
        # Drawdown
        equity_curve = TradingMetricsCalculator._calculate_equity_curve(resultados)
        max_drawdown, max_drawdown_percent = TradingMetricsCalculator._calculate_drawdown(equity_curve)
        
        # Desvio padrão dos resultados
        std_deviation = stdev(resultados) if len(resultados) > 1 else 0
        
        # Sharpe Ratio simplificado (assumindo risk-free rate = 0)
        sharpe_ratio = basic_metrics["resultado_medio"] / std_deviation if std_deviation > 0 else 0
        
        # Recovery Factor
        recovery_factor = basic_metrics["resultado_total"] / abs(max_drawdown) if max_drawdown != 0 else 0
        
        # Consecutive wins/losses
        max_consecutive_wins, max_consecutive_losses = TradingMetricsCalculator._calculate_consecutive_stats(resultados)
        
        return {
            **basic_metrics,
            "payoff_ratio": round(payoff, 3),
            "fator_lucro": round(fator_lucro, 3),
            "max_drawdown": round(max_drawdown, 2),
            "max_drawdown_percent": round(max_drawdown_percent, 2),
            "desvio_padrao": round(std_deviation, 2),
            "sharpe_ratio": round(sharpe_ratio, 3),
            "recovery_factor": round(recovery_factor, 3),
            "max_consecutive_wins": max_consecutive_wins,
            "max_consecutive_losses": max_consecutive_losses,
            "total_ganhos": round(total_ganhos, 2),
            "total_perdas": round(total_perdas, 2)
        }
    
    @staticmethod
    def _calculate_equity_curve(resultados: List[float]) -> List[float]:
        """Calcula a curva de equity"""
        equity = [0]
        for resultado in resultados:
            equity.append(equity[-1] + resultado)
        return equity[1:]  # Remove o zero inicial
    
    @staticmethod
    def _calculate_drawdown(equity_curve: List[float]) -> tuple:
        """Calcula o drawdown máximo"""
        if not equity_curve:
            return 0, 0
        
        peak = equity_curve[0]
        max_drawdown = 0
        max_drawdown_percent = 0
        
        for value in equity_curve:
            if value > peak:
                peak = value
            
            drawdown = peak - value
            if drawdown > max_drawdown:
                max_drawdown = drawdown
                max_drawdown_percent = (drawdown / peak * 100) if peak > 0 else 0
        
        return max_drawdown, max_drawdown_percent
    
    @staticmethod
    def _calculate_consecutive_stats(resultados: List[float]) -> tuple:
        """Calcula estatísticas de vitórias/perdas consecutivas"""
        if not resultados:
            return 0, 0
        
        max_wins = current_wins = 0
        max_losses = current_losses = 0
        
        for resultado in resultados:
            if resultado > 0:
                current_wins += 1
                current_losses = 0
                max_wins = max(max_wins, current_wins)
            elif resultado < 0:
                current_losses += 1
                current_wins = 0
                max_losses = max(max_losses, current_losses)
            else:  # resultado == 0
                current_wins = current_losses = 0
        
        return max_wins, max_losses
    
    @staticmethod
    def _empty_metrics() -> Dict[str, Any]:
        """Retorna métricas vazias"""
        return {
            "total_operacoes": 0,
            "resultado_total": 0,
            "resultado_medio": 0,
            "operacoes_positivas": 0,
            "operacoes_negativas": 0,
            "operacoes_neutras": 0,
            "win_rate": 0,
            "loss_rate": 0,
            "maior_ganho": 0,
            "maior_perda": 0,
            "gain_medio": 0,
            "loss_medio": 0
        }
    
    @staticmethod
    def _empty_advanced_metrics() -> Dict[str, Any]:
        """Retorna métricas avançadas vazias"""
        return {
            **TradingMetricsCalculator._empty_metrics(),
            "payoff_ratio": 0,
            "fator_lucro": 0,
            "max_drawdown": 0,
            "max_drawdown_percent": 0,
            "desvio_padrao": 0,
            "sharpe_ratio": 0,
            "recovery_factor": 0,
            "max_consecutive_wins": 0,
            "max_consecutive_losses": 0,
            "total_ganhos": 0,
            "total_perdas": 0
        }

@router.get("/metricas-basicas", summary="Métricas básicas de performance")
async def get_metricas_basicas(
    db: Session = Depends(get_db),
    robo_id: Optional[int] = Query(None, description="ID do robô específico"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados")
):
    """
    Retorna métricas básicas de performance de trading:
    - Total de operações, resultado total, resultado médio
    - Win rate, operações positivas/negativas
    - Maior ganho, maior perda, gain/loss médios
    """
    try:
        # Buscar operações
        if robo_id:
            operacoes = crud.get_operacoes_by_robo(db, robo_id, schema_name=schema, skip=0, limit=10000)
        else:
            operacoes = crud.get_operacoes(db, schema_name=schema, skip=0, limit=10000)
        
        # Calcular métricas
        metricas = TradingMetricsCalculator.calculate_basic_metrics(operacoes)
        
        return {
            "metricas": metricas,
            "info": {
                "robo_id": robo_id,
                "schema": schema
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao calcular métricas básicas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/metricas-avancadas", summary="Métricas avançadas de performance")
async def get_metricas_avancadas(
    db: Session = Depends(get_db),
    robo_id: Optional[int] = Query(None, description="ID do robô específico"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados")
):
    """
    Retorna métricas avançadas de performance de trading:
    - Payoff Ratio, Fator de Lucro, Drawdown máximo
    - Sharpe Ratio, Recovery Factor
    - Vitórias/perdas consecutivas, desvio padrão
    """
    try:
        # Buscar operações
        if robo_id:
            operacoes = crud.get_operacoes_by_robo(db, robo_id, schema_name=schema, skip=0, limit=10000)
        else:
            operacoes = crud.get_operacoes(db, schema_name=schema, skip=0, limit=10000)
        
        # Calcular métricas avançadas
        metricas = TradingMetricsCalculator.calculate_advanced_metrics(operacoes)
        
        return {
            "metricas": metricas,
            "info": {
                "robo_id": robo_id,
                "schema": schema
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao calcular métricas avançadas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/comparacao-robos", summary="Comparação de performance entre robôs")
async def get_comparacao_robos(
    db: Session = Depends(get_db),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados")
):
    """
    Compara performance entre todos os robôs disponíveis.
    """
    try:
        # Buscar todos os robôs
        robos = crud.get_robos(db, schema_name=schema, skip=0, limit=1000)
        
        if not robos:
            return {"robos": [], "resumo": {"total_robos": 0}}
        
        comparacao = []
        
        for robo in robos:
            # Buscar operações do robô
            operacoes = crud.get_operacoes_by_robo(db, robo.id, schema_name=schema, skip=0, limit=10000)
            
            # Calcular métricas
            metricas = TradingMetricsCalculator.calculate_basic_metrics(operacoes)
            
            comparacao.append({
                "robo_id": robo.id,
                "robo_nome": robo.nome,
                "metricas": metricas
            })
        
        # Encontrar melhor e pior robô por resultado total
        melhor_robo = max(comparacao, key=lambda x: x["metricas"]["resultado_total"]) if comparacao else None
        pior_robo = min(comparacao, key=lambda x: x["metricas"]["resultado_total"]) if comparacao else None
        
        return {
            "robos": comparacao,
            "resumo": {
                "total_robos": len(comparacao),
                "melhor_robo": melhor_robo["robo_nome"] if melhor_robo else None,
                "pior_robo": pior_robo["robo_nome"] if pior_robo else None
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao comparar robôs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/equity-curve", summary="Curva de equity de um robô")
async def get_equity_curve(
    db: Session = Depends(get_db),
    robo_id: int = Query(..., description="ID do robô"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados")
):
    """
    Retorna dados para construção da curva de equity de um robô específico.
    Inclui resultado acumulado ao longo do tempo.
    """
    try:
        # Buscar operações do robô
        operacoes = crud.get_operacoes_by_robo(db, robo_id, schema_name=schema, skip=0, limit=10000)
        
        if not operacoes:
            raise HTTPException(status_code=404, detail=f"Nenhuma operação encontrada para o robô ID {robo_id}")
        
        # Filtrar operações com data e resultado válidos
        operacoes_validas = [
            op for op in operacoes 
            if op.data_abertura and op.resultado is not None
        ]
        
        if not operacoes_validas:
            raise HTTPException(status_code=404, detail="Nenhuma operação válida encontrada")
        
        # Ordenar por data de abertura
        operacoes_validas.sort(key=lambda x: x.data_abertura)
        
        # Construir curva de equity
        equity_data = []
        resultado_acumulado = 0
        
        for i, op in enumerate(operacoes_validas):
            resultado_acumulado += op.resultado
            
            equity_data.append({
                "operacao_numero": i + 1,
                "data": op.data_abertura.isoformat(),
                "resultado_operacao": round(op.resultado, 2),
                "resultado_acumulado": round(resultado_acumulado, 2),
                "ativo": op.ativo,
                "tipo": op.tipo if isinstance(op.tipo, str) else (op.tipo.value if op.tipo else None)
            })
        
        # Buscar informações do robô
        robo = crud.get_robo_by_id(db, robo_id, schema_name=schema)
        
        return {
            "robo": {
                "id": robo.id,
                "nome": robo.nome
            } if robo else None,
            "equity_curve": equity_data,
            "resumo": {
                "total_operacoes": len(equity_data),
                "resultado_final": round(resultado_acumulado, 2),
                "primeira_operacao": equity_data[0]["data"] if equity_data else None,
                "ultima_operacao": equity_data[-1]["data"] if equity_data else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerar curva de equity: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/analise-por-ativo", summary="Análise de performance por ativo")
async def get_analise_por_ativo(
    db: Session = Depends(get_db),
    robo_id: Optional[int] = Query(None, description="ID do robô específico"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados")
):
    """
    Retorna análise de performance agrupada por ativo.
    """
    try:
        # Buscar operações
        if robo_id:
            operacoes = crud.get_operacoes_by_robo(db, robo_id, schema_name=schema, skip=0, limit=10000)
        else:
            operacoes = crud.get_operacoes(db, schema_name=schema, skip=0, limit=10000)
        
        if not operacoes:
            return {"ativos": [], "resumo": {"total_ativos": 0}}
        
        # Agrupar por ativo
        ativos_dict = {}
        for op in operacoes:
            if op.ativo and op.resultado is not None:
                if op.ativo not in ativos_dict:
                    ativos_dict[op.ativo] = []
                ativos_dict[op.ativo].append(op)
        
        # Calcular métricas por ativo
        analise_ativos = []
        for ativo, ops in ativos_dict.items():
            metricas = TradingMetricsCalculator.calculate_basic_metrics(ops)
            analise_ativos.append({
                "ativo": ativo,
                "metricas": metricas
            })
        
        # Ordenar por resultado total (decrescente)
        analise_ativos.sort(key=lambda x: x["metricas"]["resultado_total"], reverse=True)
        
        return {
            "ativos": analise_ativos,
            "resumo": {
                "total_ativos": len(analise_ativos),
                "melhor_ativo": analise_ativos[0]["ativo"] if analise_ativos else None,
                "pior_ativo": analise_ativos[-1]["ativo"] if analise_ativos else None
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao analisar por ativo: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}") 
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date, time
import pandas as pd
from statistics import mean, stdev
import math
from collections import defaultdict
import numpy as np
from scipy import stats
import calendar

from .. import crud, models, schemas
from ..database import get_db
from ..core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/analytics-advanced",
    tags=["Analytics Avançado"],
    responses={404: {"description": "Não encontrado"}},
)

class FinancialCalculator:
    """Calculadora de métricas financeiras"""
    
    @staticmethod
    def get_point_value(ativo: str) -> float:
        """Obtém o valor do ponto para um ativo"""
        return settings.ASSET_POINT_VALUES.get(ativo, settings.ASSET_POINT_VALUES["DEFAULT"])
    
    @staticmethod
    def get_margin(ativo: str) -> float:
        """Obtém a margem de garantia para um ativo"""
        return settings.ASSET_MARGINS.get(ativo, settings.ASSET_MARGINS["DEFAULT"])
    
    @staticmethod
    def points_to_reais(pontos: float, ativo: str, contratos: int = 1) -> float:
        """Converte pontos para reais"""
        point_value = FinancialCalculator.get_point_value(ativo)
        return pontos * point_value * contratos
    
    @staticmethod
    def calculate_percentage_return(resultado_reais: float, ativo: str, contratos: int = 1) -> float:
        """Calcula retorno percentual baseado na margem"""
        margin = FinancialCalculator.get_margin(ativo) * contratos
        return (resultado_reais / margin) * 100 if margin > 0 else 0

class AdvancedRiskMetrics:
    """Métricas avançadas de risco e performance"""
    
    @staticmethod
    def calculate_drawdown(cumulative_returns: List[float]) -> Dict[str, float]:
        """Calcula drawdown máximo e métricas relacionadas"""
        if not cumulative_returns:
            return {"max_drawdown": 0, "max_drawdown_duration": 0, "current_drawdown": 0}
        
        peak = cumulative_returns[0]
        max_drawdown = 0
        current_drawdown = 0
        drawdown_start = None
        max_drawdown_duration = 0
        current_duration = 0
        
        for i, value in enumerate(cumulative_returns):
            if value > peak:
                peak = value
                if drawdown_start is not None:
                    # Fim do drawdown
                    max_drawdown_duration = max(max_drawdown_duration, current_duration)
                    drawdown_start = None
                    current_duration = 0
            else:
                if drawdown_start is None:
                    drawdown_start = i
                current_duration += 1
                
                drawdown = (peak - value) / peak if peak != 0 else 0
                current_drawdown = drawdown
                max_drawdown = max(max_drawdown, drawdown)
        
        # Se ainda estamos em drawdown
        if drawdown_start is not None:
            max_drawdown_duration = max(max_drawdown_duration, current_duration)
        
        return {
            "max_drawdown": round(max_drawdown * 100, 2),  # em %
            "max_drawdown_duration": max_drawdown_duration,  # em períodos
            "current_drawdown": round(current_drawdown * 100, 2)  # em %
        }
    
    @staticmethod
    def calculate_var(returns: List[float], confidence_level: float = 0.95) -> float:
        """Calcula Value at Risk (VaR)"""
        if not returns or len(returns) < 2:
            return 0
        
        sorted_returns = sorted(returns)
        index = int((1 - confidence_level) * len(sorted_returns))
        return abs(sorted_returns[index]) if index < len(sorted_returns) else 0
    
    @staticmethod
    def calculate_sharpe_ratio(returns: List[float], risk_free_rate: float = 0.1085) -> float:
        """Calcula Sharpe Ratio (assumindo CDI ~10.85% aa)"""
        if not returns or stdev(returns) == 0:
            return 0
        
        # Converter taxa anual para diária
        daily_rf_rate = (1 + risk_free_rate) ** (1/252) - 1
        
        excess_returns = [r - daily_rf_rate for r in returns]
        avg_excess_return = mean(excess_returns)
        volatility = stdev(returns)
        
        return (avg_excess_return / volatility) * math.sqrt(252) if volatility != 0 else 0
    
    @staticmethod
    def calculate_sortino_ratio(returns: List[float], risk_free_rate: float = 0.1085) -> float:
        """Calcula Sortino Ratio (considera apenas volatilidade negativa)"""
        if not returns:
            return 0
        
        daily_rf_rate = (1 + risk_free_rate) ** (1/252) - 1
        excess_returns = [r - daily_rf_rate for r in returns]
        avg_excess_return = mean(excess_returns)
        
        # Apenas retornos negativos para o denominador
        negative_returns = [r for r in returns if r < 0]
        downside_deviation = stdev(negative_returns) if len(negative_returns) > 1 else 0
        
        return (avg_excess_return / downside_deviation) * math.sqrt(252) if downside_deviation != 0 else 0
    
    @staticmethod
    def calculate_calmar_ratio(cumulative_returns: List[float], annualized_return: float) -> float:
        """Calcula Calmar Ratio (retorno anualizado / max drawdown)"""
        drawdown_info = AdvancedRiskMetrics.calculate_drawdown(cumulative_returns)
        max_drawdown = drawdown_info["max_drawdown"] / 100  # converter para decimal
        
        return annualized_return / max_drawdown if max_drawdown != 0 else 0
    
    @staticmethod
    def calculate_mae_mfe(operacoes: List[models.Operacao]) -> Dict[str, Any]:
        """Calcula Maximum Adverse Excursion e Maximum Favorable Excursion"""
        mae_data = []
        mfe_data = []
        
        for op in operacoes:
            if op.resultado is not None and op.mae is not None and op.mfe is not None:
                mae_data.append(abs(op.mae))  # MAE sempre positivo
                mfe_data.append(op.mfe)  # MFE pode ser positivo
        
        return {
            "mae_medio": round(mean(mae_data), 2) if mae_data else 0,
            "mae_maximo": round(max(mae_data), 2) if mae_data else 0,
            "mfe_medio": round(mean(mfe_data), 2) if mfe_data else 0,
            "mfe_maximo": round(max(mfe_data), 2) if mfe_data else 0,
            "eficiencia_mae": round(mean([op.resultado / abs(op.mae) if op.mae != 0 else 0 
                                        for op in operacoes if op.resultado is not None and op.mae is not None]), 2),
            "eficiencia_mfe": round(mean([op.resultado / op.mfe if op.mfe != 0 else 0 
                                        for op in operacoes if op.resultado is not None and op.mfe is not None]), 2)
        }

class SeasonalAnalyzer:
    """Analisador de padrões sazonais"""
    
    @staticmethod
    def analyze_monthly_performance(operacoes: List[models.Operacao]) -> Dict[str, Any]:
        """Analisa performance por mês"""
        monthly_data = defaultdict(list)
        
        for op in operacoes:
            if op.data_abertura and op.resultado is not None:
                month_key = f"{op.data_abertura.year}-{op.data_abertura.month:02d}"
                month_name = calendar.month_name[op.data_abertura.month]
                monthly_data[month_key].append({
                    "resultado": op.resultado,
                    "month_name": month_name,
                    "year": op.data_abertura.year,
                    "month": op.data_abertura.month
                })
        
        monthly_summary = []
        for month_key, ops in monthly_data.items():
            resultados = [op["resultado"] for op in ops]
            wins = len([r for r in resultados if r > 0])
            
            monthly_summary.append({
                "periodo": month_key,
                "mes_nome": ops[0]["month_name"],
                "ano": ops[0]["year"],
                "mes": ops[0]["month"],
                "operacoes": len(ops),
                "resultado_total": round(sum(resultados), 2),
                "resultado_medio": round(mean(resultados), 2),
                "taxa_acerto": round((wins / len(ops)) * 100, 2),
                "melhor_operacao": round(max(resultados), 2),
                "pior_operacao": round(min(resultados), 2)
            })
        
        # Análise por mês do ano (agregada)
        month_aggregate = defaultdict(list)
        for op in operacoes:
            if op.data_abertura and op.resultado is not None:
                month_aggregate[op.data_abertura.month].append(op.resultado)
        
        monthly_patterns = []
        for month in range(1, 13):
            if month in month_aggregate:
                resultados = month_aggregate[month]
                wins = len([r for r in resultados if r > 0])
                monthly_patterns.append({
                    "mes": month,
                    "mes_nome": calendar.month_name[month],
                    "operacoes": len(resultados),
                    "resultado_medio": round(mean(resultados), 2),
                    "taxa_acerto": round((wins / len(resultados)) * 100, 2),
                    "volatilidade": round(stdev(resultados), 2) if len(resultados) > 1 else 0
                })
            else:
                monthly_patterns.append({
                    "mes": month,
                    "mes_nome": calendar.month_name[month],
                    "operacoes": 0,
                    "resultado_medio": 0,
                    "taxa_acerto": 0,
                    "volatilidade": 0
                })
        
        return {
            "por_periodo": sorted(monthly_summary, key=lambda x: x["periodo"]),
            "padrao_mensal": monthly_patterns
        }
    
    @staticmethod
    def analyze_hourly_performance(operacoes: List[models.Operacao]) -> Dict[str, Any]:
        """Analisa performance por hora do dia"""
        hourly_data = defaultdict(list)
        
        for op in operacoes:
            if op.data_abertura and op.resultado is not None:
                hour = op.data_abertura.hour
                hourly_data[hour].append(op.resultado)
        
        hourly_summary = []
        for hour in range(24):
            if hour in hourly_data:
                resultados = hourly_data[hour]
                wins = len([r for r in resultados if r > 0])
                hourly_summary.append({
                    "hora": hour,
                    "hora_formatada": f"{hour:02d}:00",
                    "operacoes": len(resultados),
                    "resultado_total": round(sum(resultados), 2),
                    "resultado_medio": round(mean(resultados), 2),
                    "taxa_acerto": round((wins / len(resultados)) * 100, 2),
                    "volatilidade": round(stdev(resultados), 2) if len(resultados) > 1 else 0
                })
            else:
                hourly_summary.append({
                    "hora": hour,
                    "hora_formatada": f"{hour:02d}:00",
                    "operacoes": 0,
                    "resultado_total": 0,
                    "resultado_medio": 0,
                    "taxa_acerto": 0,
                    "volatilidade": 0
                })
        
        return {"por_hora": hourly_summary}
    
    @staticmethod
    def analyze_weekday_performance(operacoes: List[models.Operacao]) -> Dict[str, Any]:
        """Analisa performance por dia da semana"""
        weekday_data = defaultdict(list)
        weekday_names = {
            1: "Segunda-feira", 2: "Terça-feira", 3: "Quarta-feira",
            4: "Quinta-feira", 5: "Sexta-feira", 6: "Sábado", 7: "Domingo"
        }
        
        for op in operacoes:
            if op.data_abertura and op.resultado is not None:
                weekday = op.data_abertura.isoweekday()  # 1=Monday, 7=Sunday
                weekday_data[weekday].append(op.resultado)
        
        weekday_summary = []
        for weekday in range(1, 8):
            if weekday in weekday_data:
                resultados = weekday_data[weekday]
                wins = len([r for r in resultados if r > 0])
                weekday_summary.append({
                    "dia_semana": weekday,
                    "dia_nome": weekday_names[weekday],
                    "operacoes": len(resultados),
                    "resultado_total": round(sum(resultados), 2),
                    "resultado_medio": round(mean(resultados), 2),
                    "taxa_acerto": round((wins / len(resultados)) * 100, 2),
                    "volatilidade": round(stdev(resultados), 2) if len(resultados) > 1 else 0
                })
            else:
                weekday_summary.append({
                    "dia_semana": weekday,
                    "dia_nome": weekday_names[weekday],
                    "operacoes": 0,
                    "resultado_total": 0,
                    "resultado_medio": 0,
                    "taxa_acerto": 0,
                    "volatilidade": 0
                })
        
        return {"por_dia_semana": weekday_summary}

class DistributionAnalyzer:
    """Analisador de distribuição de retornos"""
    
    @staticmethod
    def analyze_return_distribution(operacoes: List[models.Operacao]) -> Dict[str, Any]:
        """Analisa distribuição estatística dos retornos"""
        resultados = [op.resultado for op in operacoes if op.resultado is not None]
        
        if len(resultados) < 4:
            return {"erro": "Dados insuficientes para análise estatística"}
        
        # Estatísticas básicas
        mean_return = mean(resultados)
        std_return = stdev(resultados)
        min_return = min(resultados)
        max_return = max(resultados)
        
        # Quartis
        sorted_results = sorted(resultados)
        n = len(sorted_results)
        q1 = sorted_results[n//4]
        q2 = sorted_results[n//2]  # mediana
        q3 = sorted_results[3*n//4]
        
        # Skewness e Kurtosis
        skewness = stats.skew(resultados)
        kurtosis_val = stats.kurtosis(resultados)
        
        # Teste de normalidade
        shapiro_stat, shapiro_p = stats.shapiro(resultados[:5000])  # máximo 5000 amostras
        
        # Histograma (10 bins)
        hist, bin_edges = np.histogram(resultados, bins=10)
        histogram_data = []
        for i in range(len(hist)):
            histogram_data.append({
                "faixa": f"{bin_edges[i]:.1f} a {bin_edges[i+1]:.1f}",
                "frequencia": int(hist[i]),
                "percentual": round((hist[i] / len(resultados)) * 100, 1)
            })
        
        # Outliers (método IQR)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outliers = [r for r in resultados if r < lower_bound or r > upper_bound]
        
        return {
            "estatisticas_basicas": {
                "media": round(mean_return, 2),
                "mediana": round(q2, 2),
                "desvio_padrao": round(std_return, 2),
                "minimo": round(min_return, 2),
                "maximo": round(max_return, 2),
                "amplitude": round(max_return - min_return, 2)
            },
            "quartis": {
                "q1": round(q1, 2),
                "q2_mediana": round(q2, 2),
                "q3": round(q3, 2),
                "iqr": round(iqr, 2)
            },
            "assimetria_curtose": {
                "skewness": round(skewness, 3),
                "kurtosis": round(kurtosis_val, 3),
                "interpretacao_skew": "Assimétrica à direita" if skewness > 0.5 else "Assimétrica à esquerda" if skewness < -0.5 else "Aproximadamente simétrica",
                "interpretacao_kurtosis": "Leptocúrtica (cauda pesada)" if kurtosis_val > 0 else "Platicúrtica (cauda leve)"
            },
            "teste_normalidade": {
                "shapiro_statistic": round(shapiro_stat, 4),
                "p_value": round(shapiro_p, 4),
                "eh_normal": shapiro_p > 0.05,
                "interpretacao": "Distribuição normal" if shapiro_p > 0.05 else "Distribuição não-normal"
            },
            "histograma": histogram_data,
            "outliers": {
                "quantidade": len(outliers),
                "percentual": round((len(outliers) / len(resultados)) * 100, 1),
                "valores": sorted([round(o, 2) for o in outliers])
            }
        }

class TemporalAnalyzer:
    """Analisador de métricas temporais"""
    
    @staticmethod
    def group_by_day(operacoes: List[models.Operacao]) -> Dict[str, List[models.Operacao]]:
        """Agrupa operações por dia"""
        daily_groups = defaultdict(list)
        for op in operacoes:
            if op.data_abertura:
                day_key = op.data_abertura.date().isoformat()
                daily_groups[day_key].append(op)
        return dict(daily_groups)
    
    @staticmethod
    def filter_by_time_range(operacoes: List[models.Operacao], start_time: str, end_time: str) -> List[models.Operacao]:
        """Filtra operações por horário"""
        try:
            start = datetime.strptime(start_time, "%H:%M").time()
            end = datetime.strptime(end_time, "%H:%M").time()
            
            filtered = []
            for op in operacoes:
                if op.data_abertura:
                    op_time = op.data_abertura.time()
                    if start <= op_time <= end:
                        filtered.append(op)
            return filtered
        except ValueError:
            return operacoes  # Retorna todas se formato inválido
    
    @staticmethod
    def filter_by_weekdays(operacoes: List[models.Operacao], weekdays: List[int]) -> List[models.Operacao]:
        """Filtra operações por dias da semana (1=Segunda, 7=Domingo)"""
        filtered = []
        for op in operacoes:
            if op.data_abertura:
                # isoweekday(): 1=Segunda, 7=Domingo
                if op.data_abertura.isoweekday() in weekdays:
                    filtered.append(op)
        return filtered

class RiskAnalyzer:
    """Analisador de gestão de risco"""
    
    @staticmethod
    def analyze_daily_performance(operacoes: List[models.Operacao]) -> Dict[str, Any]:
        """Analisa performance diária e detecta stops/travas"""
        daily_groups = TemporalAnalyzer.group_by_day(operacoes)
        
        daily_analysis = []
        positive_days = 0
        negative_days = 0
        neutral_days = 0
        
        for day, ops in daily_groups.items():
            day_result = sum(op.resultado for op in ops if op.resultado is not None)
            day_ops_count = len(ops)
            
            # Classificar o dia
            if day_result > 0:
                positive_days += 1
                day_type = "positivo"
            elif day_result < 0:
                negative_days += 1
                day_type = "negativo"
            else:
                neutral_days += 1
                day_type = "neutro"
            
            daily_analysis.append({
                "data": day,
                "resultado": round(day_result, 2),
                "operacoes": day_ops_count,
                "tipo_dia": day_type
            })
        
        # Taxa de acerto por tipo de dia
        total_days = len(daily_groups)
        win_rate_days = (positive_days / total_days * 100) if total_days > 0 else 0
        
        return {
            "dias_analisados": total_days,
            "dias_positivos": positive_days,
            "dias_negativos": negative_days,
            "dias_neutros": neutral_days,
            "taxa_acerto_dias": round(win_rate_days, 2),
            "detalhes_por_dia": sorted(daily_analysis, key=lambda x: x["data"])
        }
    
    @staticmethod
    def simulate_risk_controls(operacoes: List[models.Operacao], 
                             daily_loss_limit: float = None,
                             daily_profit_target: float = None,
                             max_daily_ops: int = None) -> Dict[str, Any]:
        """Simula aplicação de controles de risco"""
        if daily_loss_limit is None:
            daily_loss_limit = settings.DEFAULT_DAILY_LOSS_LIMIT
        if daily_profit_target is None:
            daily_profit_target = settings.DEFAULT_DAILY_PROFIT_TARGET
        if max_daily_ops is None:
            max_daily_ops = settings.DEFAULT_MAX_DAILY_OPERATIONS
        
        daily_groups = TemporalAnalyzer.group_by_day(operacoes)
        
        simulation_results = []
        total_without_controls = 0
        total_with_controls = 0
        days_stopped_loss = 0
        days_stopped_profit = 0
        days_stopped_max_ops = 0
        
        for day, ops in daily_groups.items():
            # Ordenar operações por horário
            ops_sorted = sorted(ops, key=lambda x: x.data_abertura if x.data_abertura else datetime.min)
            
            day_result_original = sum(op.resultado for op in ops_sorted if op.resultado is not None)
            total_without_controls += day_result_original
            
            # Simular controles
            day_result_controlled = 0
            ops_executed = 0
            stop_reason = None
            
            for op in ops_sorted:
                if op.resultado is None:
                    continue
                
                # Verificar limite de operações
                if ops_executed >= max_daily_ops:
                    stop_reason = "max_operacoes"
                    break
                
                # Aplicar resultado
                day_result_controlled += op.resultado
                ops_executed += 1
                
                # Verificar stop loss
                if day_result_controlled <= -daily_loss_limit:
                    stop_reason = "stop_loss"
                    break
                
                # Verificar trava de ganho
                if day_result_controlled >= daily_profit_target:
                    stop_reason = "trava_ganho"
                    break
            
            total_with_controls += day_result_controlled
            
            # Contabilizar stops
            if stop_reason == "stop_loss":
                days_stopped_loss += 1
            elif stop_reason == "trava_ganho":
                days_stopped_profit += 1
            elif stop_reason == "max_operacoes":
                days_stopped_max_ops += 1
            
            simulation_results.append({
                "data": day,
                "resultado_original": round(day_result_original, 2),
                "resultado_controlado": round(day_result_controlled, 2),
                "operacoes_originais": len(ops_sorted),
                "operacoes_executadas": ops_executed,
                "stop_aplicado": stop_reason
            })
        
        return {
            "configuracao": {
                "limite_perda_diaria": daily_loss_limit,
                "meta_ganho_diaria": daily_profit_target,
                "max_operacoes_dia": max_daily_ops
            },
            "resultado_sem_controles": round(total_without_controls, 2),
            "resultado_com_controles": round(total_with_controls, 2),
            "diferenca": round(total_with_controls - total_without_controls, 2),
            "dias_stop_loss": days_stopped_loss,
            "dias_trava_ganho": days_stopped_profit,
            "dias_max_operacoes": days_stopped_max_ops,
            "detalhes_por_dia": sorted(simulation_results, key=lambda x: x["data"])
        }

@router.get("/metricas-financeiras", summary="Métricas financeiras em reais e percentuais")
async def get_metricas_financeiras(
    db: Session = Depends(get_db),
    robo_id: Optional[int] = Query(None, description="ID do robô específico"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados"),
    contratos: int = Query(1, description="Número de contratos por operação"),
    margem_total: Optional[float] = Query(None, description="Margem total configurada pelo usuário (R$)")
):
    """
    Retorna métricas financeiras convertidas para reais e percentuais
    """
    try:
        # Buscar operações - CORRIGIDO: agora filtra corretamente por robo_id
        if robo_id:
            logger.info(f"Buscando operações para robô ID: {robo_id}")
            operacoes = crud.get_operacoes_by_robo(db, robo_id, schema_name=schema, skip=0, limit=10000)
            logger.info(f"Encontradas {len(operacoes)} operações para robô {robo_id}")
        else:
            logger.info("Buscando todas as operações")
            operacoes = crud.get_operacoes(db, schema_name=schema, skip=0, limit=10000)
            logger.info(f"Encontradas {len(operacoes)} operações totais")
        
        if not operacoes:
            return {"metricas": {}, "por_ativo": {}}
        
        # Métricas gerais
        total_pontos = sum(op.resultado for op in operacoes if op.resultado is not None)
        
        # Análise por ativo
        por_ativo = {}
        total_pontos = 0
        total_reais = 0
        
        for operacao in operacoes:
            if operacao.resultado is None or not operacao.ativo:
                continue
            
            ativo = operacao.ativo
            if ativo not in por_ativo:
                por_ativo[ativo] = {
                    "operacoes": 0,
                    "pontos_total": 0,
                    "reais_total": 0,
                    "retorno_percentual": 0
                }
            
            # Calcular valores
            pontos = operacao.resultado
            num_contratos = operacao.lotes or contratos
            reais = FinancialCalculator.points_to_reais(pontos, ativo, num_contratos)
            
            # Acumular por ativo
            por_ativo[ativo]["operacoes"] += 1
            por_ativo[ativo]["pontos_total"] += pontos
            por_ativo[ativo]["reais_total"] += reais
            
            # Acumular geral
            total_pontos += pontos
            total_reais += reais
        
        # Calcular margem total baseada na configuração
        if margem_total:
            # Usar margem total informada pelo usuário
            total_margin = margem_total
        else:
            # Calcular margem baseada no ativo mais comum ou padrão
            ativo_principal = max(por_ativo.keys(), key=lambda k: por_ativo[k]["operacoes"]) if por_ativo else "WINM25"
            margem_por_contrato = FinancialCalculator.get_margin(ativo_principal)
            total_margin = margem_por_contrato * contratos
        
        # Calcular retorno percentual por ativo (proporcional ao resultado)
        for ativo in por_ativo:
            # Calcular retorno percentual baseado na proporção dos resultados
            if total_margin > 0 and total_reais != 0:
                # Proporção da margem para este ativo baseada na contribuição dos resultados
                proporcao_resultado = por_ativo[ativo]["reais_total"] / total_reais if total_reais != 0 else 0
                margem_proporcional = total_margin * abs(proporcao_resultado)
                
                if margem_proporcional > 0:
                    por_ativo[ativo]["retorno_percentual"] = round(
                        (por_ativo[ativo]["reais_total"] / margem_proporcional) * 100, 2
                    )
                else:
                    por_ativo[ativo]["retorno_percentual"] = 0
            else:
                por_ativo[ativo]["retorno_percentual"] = 0
            
            # Arredondar valores
            por_ativo[ativo]["pontos_total"] = round(por_ativo[ativo]["pontos_total"], 2)
            por_ativo[ativo]["reais_total"] = round(por_ativo[ativo]["reais_total"], 2)
        
        # Retorno percentual geral
        retorno_percentual_geral = (total_reais / total_margin * 100) if total_margin > 0 else 0
        
        metricas_gerais = {
            "total_operacoes": len(operacoes),
            "total_pontos": round(total_pontos, 2),
            "total_reais": round(total_reais, 2),
            "margem_total_necessaria": round(total_margin, 2),
            "retorno_percentual": round(retorno_percentual_geral, 2),
            "contratos_considerados": contratos
        }
        
        return {
            "metricas": metricas_gerais,
            "por_ativo": por_ativo,
            "configuracao": {
                "valores_ponto": settings.ASSET_POINT_VALUES,
                "margens": settings.ASSET_MARGINS
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao calcular métricas financeiras: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/analise-dias-ganho-perda", summary="Taxa de acerto em dias positivos vs negativos")
async def get_analise_dias_ganho_perda(
    db: Session = Depends(get_db),
    robo_id: Optional[int] = Query(None, description="ID do robô específico"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados")
):
    """
    Analisa taxa de acerto separadamente em dias positivos e negativos
    """
    try:
        # Buscar operações
        if robo_id:
            operacoes = crud.get_operacoes_by_robo(db, robo_id, schema_name=schema, skip=0, limit=10000)
        else:
            operacoes = crud.get_operacoes(db, schema_name=schema, skip=0, limit=10000)
        
        # Agrupar por dias
        daily_groups = defaultdict(list)
        for op in operacoes:
            if op.data_abertura and op.resultado is not None:
                day_key = op.data_abertura.date().isoformat()
                daily_groups[day_key].append(op.resultado)
        
        # Classificar dias
        dias_positivos = []
        dias_negativos = []
        
        for day, resultados in daily_groups.items():
            resultado_dia = sum(resultados)
            if resultado_dia > 0:
                dias_positivos.append(resultados)
            elif resultado_dia < 0:
                dias_negativos.append(resultados)
        
        # Analisar operações em dias positivos
        ops_dias_positivos = []
        for dia in dias_positivos:
            ops_dias_positivos.extend(dia)
        
        win_rate_dias_positivos = 0
        if ops_dias_positivos:
            wins = len([r for r in ops_dias_positivos if r > 0])
            win_rate_dias_positivos = (wins / len(ops_dias_positivos)) * 100
        
        # Analisar operações em dias negativos
        ops_dias_negativos = []
        for dia in dias_negativos:
            ops_dias_negativos.extend(dia)
        
        win_rate_dias_negativos = 0
        if ops_dias_negativos:
            wins = len([r for r in ops_dias_negativos if r > 0])
            win_rate_dias_negativos = (wins / len(ops_dias_negativos)) * 100
        
        return {
            "resumo_geral": {
                "total_dias_analisados": len(daily_groups),
                "dias_positivos": len(dias_positivos),
                "dias_negativos": len(dias_negativos)
            },
            "analise_dias_positivos": {
                "total_operacoes": len(ops_dias_positivos),
                "operacoes_ganhadoras": len([r for r in ops_dias_positivos if r > 0]),
                "taxa_acerto": round(win_rate_dias_positivos, 2),
                "resultado_medio": round(mean(ops_dias_positivos), 2) if ops_dias_positivos else 0
            },
            "analise_dias_negativos": {
                "total_operacoes": len(ops_dias_negativos),
                "operacoes_ganhadoras": len([r for r in ops_dias_negativos if r > 0]),
                "taxa_acerto": round(win_rate_dias_negativos, 2),
                "resultado_medio": round(mean(ops_dias_negativos), 2) if ops_dias_negativos else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Erro na análise de dias ganho/perda: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/filtros-avancados", summary="Análise com filtros avançados")
async def get_filtros_avancados(
    db: Session = Depends(get_db),
    robo_id: Optional[int] = Query(None, description="ID do robô específico"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados"),
    horario_inicio: Optional[str] = Query(None, description="Horário início (HH:MM)"),
    horario_fim: Optional[str] = Query(None, description="Horário fim (HH:MM)"),
    dias_semana: Optional[str] = Query(None, description="Dias da semana (1-7, separados por vírgula)"),
    max_stops_dia: Optional[int] = Query(None, description="Máximo de stops por dia"),
    limite_risco_diario: Optional[float] = Query(None, description="Limite de risco diário (R$)"),
    meta_ganho_diario: Optional[float] = Query(None, description="Meta de ganho diário (R$)"),
    controle_por_robo: bool = Query(False, description="True = aplicar controles por robô individual, False = controle geral")
):
    """
    Análise completa com todos os filtros avançados solicitados
    """
    try:
        # Buscar operações
        if robo_id:
            operacoes = crud.get_operacoes_by_robo(db, robo_id, schema_name=schema, skip=0, limit=10000)
        else:
            operacoes = crud.get_operacoes(db, schema_name=schema, skip=0, limit=10000)
        
        # Aplicar filtros de horário
        if horario_inicio and horario_fim:
            operacoes_filtradas = []
            try:
                start_time = datetime.strptime(horario_inicio, "%H:%M").time()
                end_time = datetime.strptime(horario_fim, "%H:%M").time()
                
                for op in operacoes:
                    if op.data_abertura:
                        op_time = op.data_abertura.time()
                        if start_time <= op_time <= end_time:
                            operacoes_filtradas.append(op)
                operacoes = operacoes_filtradas
            except ValueError:
                pass  # Manter todas se formato inválido
        
        # Aplicar filtros de dias da semana
        if dias_semana:
            try:
                weekdays = [int(d.strip()) for d in dias_semana.split(",")]
                operacoes_filtradas = []
                for op in operacoes:
                    if op.data_abertura and op.data_abertura.isoweekday() in weekdays:
                        operacoes_filtradas.append(op)
                operacoes = operacoes_filtradas
            except ValueError:
                pass
        
        # Aplicar controles de risco e coletar operações controladas
        operacoes_controladas = []
        
        # Calcular resultado original (com filtros básicos apenas)
        resultado_original = sum(op.resultado for op in operacoes if op.resultado is not None)
        
        # Se não há controles de risco, usar todas as operações filtradas
        if not (limite_risco_diario or meta_ganho_diario or max_stops_dia):
            operacoes_controladas = operacoes
            resultado_com_controles = resultado_original
            dias_com_stop = 0
            dias_com_meta = 0
        else:
            # Análise com controles de risco
            resultado_com_controles = 0
            dias_com_stop = 0
            dias_com_meta = 0
            
            if controle_por_robo:
                # Controle por robô individual
                # Agrupar por robô e dia
                robo_daily_groups = defaultdict(lambda: defaultdict(list))
                for op in operacoes:
                    if op.data_abertura and op.resultado is not None:
                        day_key = op.data_abertura.date().isoformat()
                        robo_id_key = op.robo_id or 0
                        robo_daily_groups[robo_id_key][day_key].append(op)
                
                # Simular controles para cada robô separadamente
                for robo_id_key, daily_groups in robo_daily_groups.items():
                    for day, ops in daily_groups.items():
                        ops_sorted = sorted(ops, key=lambda x: x.data_abertura if x.data_abertura else datetime.min)
                        
                        # Simular controles para este robô neste dia
                        resultado_dia_controlado = 0
                        stops_aplicados = 0
                        
                        for op in ops_sorted:
                            # Verificar limite de stops por robô
                            if max_stops_dia and stops_aplicados >= max_stops_dia and op.resultado < 0:
                                continue  # Não executar mais stops para este robô
                            
                            resultado_dia_controlado += op.resultado
                            operacoes_controladas.append(op)  # Adicionar operação controlada
                            
                            if op.resultado < 0:
                                stops_aplicados += 1
                            
                            # Verificar limite de risco diário por robô
                            if limite_risco_diario and resultado_dia_controlado <= -abs(limite_risco_diario):
                                dias_com_stop += 1
                                break
                            
                            # Verificar meta de ganho diário por robô
                            if meta_ganho_diario and resultado_dia_controlado >= meta_ganho_diario:
                                dias_com_meta += 1
                                break
                        
                        resultado_com_controles += resultado_dia_controlado
                        
            else:
                # Controle geral (todos os robôs juntos)
                daily_groups = defaultdict(list)
                for op in operacoes:
                    if op.data_abertura and op.resultado is not None:
                        day_key = op.data_abertura.date().isoformat()
                        daily_groups[day_key].append(op)
                
                # Simular controles de risco
                for day, ops in daily_groups.items():
                    ops_sorted = sorted(ops, key=lambda x: x.data_abertura if x.data_abertura else datetime.min)
                    
                    # Simular controles
                    resultado_dia_controlado = 0
                    stops_aplicados = 0
                    
                    for op in ops_sorted:
                        # Verificar limite de stops geral
                        if max_stops_dia and stops_aplicados >= max_stops_dia and op.resultado < 0:
                            continue  # Não executar mais stops
                        
                        resultado_dia_controlado += op.resultado
                        operacoes_controladas.append(op)  # Adicionar operação controlada
                        
                        if op.resultado < 0:
                            stops_aplicados += 1
                        
                        # Verificar limite de risco diário geral
                        if limite_risco_diario and resultado_dia_controlado <= -abs(limite_risco_diario):
                            dias_com_stop += 1
                            break
                        
                        # Verificar meta de ganho diário geral
                        if meta_ganho_diario and resultado_dia_controlado >= meta_ganho_diario:
                            dias_com_meta += 1
                            break
                    
                    resultado_com_controles += resultado_dia_controlado
        
        # Métricas finais
        total_operacoes_original = len(operacoes)
        win_rate_original = 0
        if total_operacoes_original > 0:
            wins = len([op for op in operacoes if op.resultado and op.resultado > 0])
            win_rate_original = (wins / total_operacoes_original) * 100
        
        # Calcular dias analisados baseado no tipo de controle
        if controle_por_robo and (limite_risco_diario or meta_ganho_diario or max_stops_dia):
            # Para controle por robô, usar robo_daily_groups
            robo_daily_groups = defaultdict(lambda: defaultdict(list))
            for op in operacoes:
                if op.data_abertura and op.resultado is not None:
                    day_key = op.data_abertura.date().isoformat()
                    robo_id_key = op.robo_id or 0
                    robo_daily_groups[robo_id_key][day_key].append(op)
            total_dias = sum(len(daily_groups) for daily_groups in robo_daily_groups.values())
        else:
            # Para controle geral ou sem controles
            daily_groups = defaultdict(list)
            for op in operacoes:
                if op.data_abertura and op.resultado is not None:
                    day_key = op.data_abertura.date().isoformat()
                    daily_groups[day_key].append(op)
            total_dias = len(daily_groups)
        
        return {
            "filtros_aplicados": {
                "robo_id": robo_id,
                "horario_inicio": horario_inicio,
                "horario_fim": horario_fim,
                "dias_semana": dias_semana,
                "max_stops_dia": max_stops_dia,
                "limite_risco_diario": limite_risco_diario,
                "meta_ganho_diario": meta_ganho_diario,
                "controle_por_robo": controle_por_robo,
                "tipo_controle": "Por Robô Individual" if controle_por_robo else "Geral (Todos os Robôs)"
            },
            "resultados_originais": {
                "total_operacoes": total_operacoes_original,
                "resultado_total": round(resultado_original, 2),
                "win_rate": round(win_rate_original, 2),
                "dias_analisados": total_dias
            },
            "resultados_com_controles": {
                "resultado_total": round(resultado_com_controles, 2),
                "diferenca": round(resultado_com_controles - resultado_original, 2),
                "dias_com_stop_loss": dias_com_stop,
                "dias_com_meta_atingida": dias_com_meta
            },
            "performance_por_dia_semana": _analyze_weekday_performance(operacoes_controladas)
        }
        
    except Exception as e:
        logger.error(f"Erro nos filtros avançados: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

def _analyze_weekday_performance(operacoes):
    """Analisa performance por dia da semana"""
    weekday_stats = defaultdict(list)
    weekday_names = {1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta", 5: "Sexta", 6: "Sábado", 7: "Domingo"}
    
    for op in operacoes:
        if op.data_abertura and op.resultado is not None:
            weekday = op.data_abertura.isoweekday()
            weekday_stats[weekday].append(op.resultado)
    
    result = {}
    for weekday, results in weekday_stats.items():
        if results:
            wins = len([r for r in results if r > 0])
            result[weekday_names[weekday]] = {
                "operacoes": len(results),
                "resultado_total": round(sum(results), 2),
                "resultado_medio": round(mean(results), 2),
                "win_rate": round((wins / len(results)) * 100, 2)
            }
    
    return result

@router.get("/dados-graficos-robo", summary="Dados específicos para gráficos de um robô")
async def get_dados_graficos_robo(
    db: Session = Depends(get_db),
    robo_id: int = Query(..., description="ID do robô específico"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados")
):
    """
    Retorna todos os dados necessários para os gráficos de um robô específico
    """
    try:
        logger.info(f"Carregando dados gráficos para robô ID: {robo_id}")
        
        # Buscar operações específicas do robô
        operacoes = crud.get_operacoes_by_robo(db, robo_id, schema_name=schema, skip=0, limit=10000)
        
        if not operacoes:
            return {
                "equity_curve": [],
                "performance_by_asset": [],
                "monthly_performance": [],
                "scatter_data": [],
                "win_loss_distribution": []
            }

        logger.info(f"Processando {len(operacoes)} operações para robô {robo_id}")
        
        # 1. Curva de Capital (Equity Curve)
        operacoes_ordenadas = sorted(
            [op for op in operacoes if op.data_abertura and op.resultado is not None],
            key=lambda x: x.data_abertura
        )
        
        cumulative = 0
        equity_curve = []
        for op in operacoes_ordenadas:
            cumulative += op.resultado
            equity_curve.append({
                "date": op.data_abertura.isoformat(),
                "value": op.resultado,
                "cumulative": cumulative
            })

        # 2. Performance por Ativo
        by_asset = {}
        for op in operacoes:
            if op.ativo and op.resultado is not None:
                by_asset[op.ativo] = by_asset.get(op.ativo, 0) + op.resultado
        
        performance_by_asset = [
            {"label": ativo, "value": resultado}
            for ativo, resultado in by_asset.items()
        ]

        # 3. Performance Mensal
        by_month = {}
        for op in operacoes:
            if op.data_abertura and op.resultado is not None:
                month_key = f"{op.data_abertura.year}-{op.data_abertura.month:02d}"
                by_month[month_key] = by_month.get(month_key, 0) + op.resultado
        
        monthly_performance = [
            {"label": month, "value": resultado}
            for month, resultado in sorted(by_month.items())
        ]

        # 4. Scatter Data (Operações por Horário)
        scatter_data = []
        for op in operacoes:
            if op.data_abertura and op.resultado is not None:
                scatter_data.append({
                    "hour": op.data_abertura.hour,
                    "minute": op.data_abertura.minute,
                    "result": op.resultado,
                    "time": op.data_abertura.strftime("%H:%M")
                })

        # 5. Distribuição Win/Loss
        wins = len([op for op in operacoes if op.resultado and op.resultado > 0])
        losses = len([op for op in operacoes if op.resultado and op.resultado < 0])
        breakeven = len([op for op in operacoes if op.resultado == 0])
        
        win_loss_distribution = [
            {"label": "Ganhos", "value": wins, "color": "#10b981"},
            {"label": "Perdas", "value": losses, "color": "#ef4444"},
            {"label": "Empates", "value": breakeven, "color": "#6b7280"}
        ]

        logger.info(f"Dados processados com sucesso para robô {robo_id}")
        
        return {
            "equity_curve": equity_curve,
            "performance_by_asset": performance_by_asset,
            "monthly_performance": monthly_performance,
            "scatter_data": scatter_data,
            "win_loss_distribution": win_loss_distribution,
            "total_operacoes": len(operacoes)
        }
        
    except Exception as e:
        logger.error(f"Erro ao carregar dados gráficos do robô {robo_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/comparacao-benchmarks", summary="Comparação com CDI e IBOV")
async def get_comparacao_benchmarks(
    db: Session = Depends(get_db),
    robo_id: Optional[int] = Query(None, description="ID do robô específico"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados"),
    valor_investido: float = Query(100000, description="Valor total investido (R$)")
):
    """
    Compara performance da estratégia com CDI e IBOVESPA
    """
    try:
        # Buscar operações
        if robo_id:
            operacoes = crud.get_operacoes_by_robo(db, robo_id, schema_name=schema, skip=0, limit=10000)
        else:
            operacoes = crud.get_operacoes(db, schema_name=schema, skip=0, limit=10000)
        
        if not operacoes:
            return {"erro": "Nenhuma operação encontrada"}
        
        # Calcular período
        datas = [op.data_abertura for op in operacoes if op.data_abertura]
        if not datas:
            return {"erro": "Nenhuma data válida encontrada"}
        
        data_inicio = min(datas).date()
        data_fim = max(datas).date()
        dias_periodo = (data_fim - data_inicio).days + 1
        anos_periodo = dias_periodo / 365.25
        meses_periodo = dias_periodo / 30.44
        
        # Resultado da estratégia em pontos
        resultado_total_pontos = sum(op.resultado for op in operacoes if op.resultado is not None)
        
        # Converter para reais (estimativa usando valor médio)
        resultado_total_reais = 0
        for op in operacoes:
            if op.resultado is not None and op.ativo:
                contratos = op.lotes or 1
                reais = FinancialCalculator.points_to_reais(op.resultado, op.ativo, contratos)
                resultado_total_reais += reais
        
        # Se não conseguiu calcular em reais, usar estimativa
        if resultado_total_reais == 0:
            # Usar valor padrão do ponto
            resultado_total_reais = resultado_total_pontos * 0.20
        
        # Percentual da estratégia
        retorno_estrategia_percent = (resultado_total_reais / valor_investido) * 100
        retorno_anualizado = retorno_estrategia_percent / anos_periodo if anos_periodo > 0 else retorno_estrategia_percent
        
        # Benchmarks (simulados - em produção usar APIs reais)
        # CDI
        cdi_mensal = settings.CDI_RATE_ANNUAL / 12
        cdi_periodo = ((1 + cdi_mensal/100) ** meses_periodo - 1) * 100
        rendimento_cdi_reais = valor_investido * (cdi_periodo / 100)
        
        # IBOVESPA (estimativa - muito volátil)
        ibov_anual_estimado = 12.0  # Estimativa conservadora
        ibov_periodo = ((1 + ibov_anual_estimado/100) ** anos_periodo - 1) * 100
        rendimento_ibov_reais = valor_investido * (ibov_periodo / 100)
        
        # Comparações
        outperformance_cdi = retorno_estrategia_percent - cdi_periodo
        outperformance_ibov = retorno_estrategia_percent - ibov_periodo
        
        # Múltiplos
        multiplo_cdi = retorno_anualizado / settings.CDI_RATE_ANNUAL if settings.CDI_RATE_ANNUAL > 0 else 0
        multiplo_ibov = retorno_anualizado / ibov_anual_estimado if ibov_anual_estimado > 0 else 0
        
        return {
            "periodo_analise": {
                "data_inicio": data_inicio.isoformat(),
                "data_fim": data_fim.isoformat(),
                "dias": dias_periodo,
                "meses": round(meses_periodo, 1),
                "anos": round(anos_periodo, 2)
            },
            "investimento": {
                "valor_investido": valor_investido,
                "total_operacoes": len(operacoes)
            },
            "performance_estrategia": {
                "resultado_pontos": round(resultado_total_pontos, 2),
                "resultado_reais": round(resultado_total_reais, 2),
                "retorno_percentual": round(retorno_estrategia_percent, 2),
                "retorno_anualizado": round(retorno_anualizado, 2)
            },
            "benchmarks": {
                "cdi": {
                    "taxa_anual": settings.CDI_RATE_ANNUAL,
                    "rendimento_periodo": round(cdi_periodo, 2),
                    "rendimento_reais": round(rendimento_cdi_reais, 2)
                },
                "ibovespa": {
                    "taxa_anual_estimada": ibov_anual_estimado,
                    "rendimento_periodo": round(ibov_periodo, 2),
                    "rendimento_reais": round(rendimento_ibov_reais, 2)
                }
            },
            "comparacao": {
                "vs_cdi": {
                    "outperformance_percent": round(outperformance_cdi, 2),
                    "outperformance_reais": round(resultado_total_reais - rendimento_cdi_reais, 2),
                    "multiplo": round(multiplo_cdi, 2)
                },
                "vs_ibov": {
                    "outperformance_percent": round(outperformance_ibov, 2),
                    "outperformance_reais": round(resultado_total_reais - rendimento_ibov_reais, 2),
                    "multiplo": round(multiplo_ibov, 2)
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Erro na comparação com benchmarks: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/metricas-risco-avancadas", summary="Métricas avançadas de risco")
async def get_metricas_risco_avancadas(
    db: Session = Depends(get_db),
    robo_id: Optional[int] = Query(None, description="ID do robô específico"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados"),
    margem_total: Optional[float] = Query(None, description="Margem total (R$)")
):
    """
    Calcula métricas avançadas de risco: Drawdown, VaR, Sharpe, Sortino, Calmar
    """
    try:
        # Buscar operações
        if robo_id:
            operacoes = crud.get_operacoes_by_robo(db, robo_id, schema_name=schema, skip=0, limit=10000)
        else:
            operacoes = crud.get_operacoes(db, schema_name=schema, skip=0, limit=10000)
        
        if not operacoes:
            return {"erro": "Nenhuma operação encontrada"}
        
        # Preparar dados
        operacoes_ordenadas = sorted(
            [op for op in operacoes if op.data_abertura and op.resultado is not None],
            key=lambda x: x.data_abertura
        )
        
        if len(operacoes_ordenadas) < 10:
            return {"erro": "Dados insuficientes para análise de risco (mínimo 10 operações)"}
        
        # Calcular retornos
        resultados = [op.resultado for op in operacoes_ordenadas]
        
        # Curva de capital
        cumulative_returns = []
        cumulative = 0
        for resultado in resultados:
            cumulative += resultado
            cumulative_returns.append(cumulative)
        
        # Converter para retornos percentuais diários (baseado na margem)
        if margem_total:
            total_margin = margem_total
        else:
            # Usar margem padrão
            ativo_principal = "WINM25"  # default
            if operacoes_ordenadas:
                # Usar ativo mais comum
                ativos = [op.ativo for op in operacoes_ordenadas if op.ativo]
                if ativos:
                    from collections import Counter
                    ativo_principal = Counter(ativos).most_common(1)[0][0]
            
            margem_por_contrato = FinancialCalculator.get_margin(ativo_principal)
            total_margin = margem_por_contrato
        
        # Retornos diários em %
        daily_returns = []
        for resultado in resultados:
            # Converter pontos para reais
            resultado_reais = resultado * 0.20  # Valor estimado do ponto
            return_pct = (resultado_reais / total_margin) if total_margin > 0 else 0
            daily_returns.append(return_pct)
        
        # Calcular métricas
        drawdown_info = AdvancedRiskMetrics.calculate_drawdown(cumulative_returns)
        var_95 = AdvancedRiskMetrics.calculate_var(daily_returns, 0.95)
        var_99 = AdvancedRiskMetrics.calculate_var(daily_returns, 0.99)
        sharpe = AdvancedRiskMetrics.calculate_sharpe_ratio(daily_returns)
        sortino = AdvancedRiskMetrics.calculate_sortino_ratio(daily_returns)
        
        # Retorno anualizado
        total_return = sum(daily_returns)
        days = len(daily_returns)
        annualized_return = (total_return / days) * 252 if days > 0 else 0
        
        calmar = AdvancedRiskMetrics.calculate_calmar_ratio(cumulative_returns, annualized_return)
        
        # MAE/MFE se disponível
        mae_mfe = AdvancedRiskMetrics.calculate_mae_mfe(operacoes_ordenadas)
        
        # Análise de sequências
        consecutive_wins = 0
        consecutive_losses = 0
        max_consecutive_wins = 0
        max_consecutive_losses = 0
        current_streak = 0
        
        for resultado in resultados:
            if resultado > 0:
                if current_streak >= 0:
                    current_streak += 1
                else:
                    current_streak = 1
                max_consecutive_wins = max(max_consecutive_wins, current_streak)
            elif resultado < 0:
                if current_streak <= 0:
                    current_streak -= 1
                else:
                    current_streak = -1
                max_consecutive_losses = max(max_consecutive_losses, abs(current_streak))
        
        # Adicionar último streak
        if current_streak > 0:
            if streak_type == "win":
                win_streaks.append(current_streak)
            else:
                loss_streaks.append(current_streak)
        
        return {
            "periodo_analise": {
                "total_operacoes": len(operacoes_ordenadas),
                "dias_operando": days,
                "primeira_operacao": operacoes_ordenadas[0].data_abertura.date().isoformat(),
                "ultima_operacao": operacoes_ordenadas[-1].data_abertura.date().isoformat()
            },
            "metricas_drawdown": {
                "max_drawdown_percent": drawdown_info["max_drawdown"],
                "max_drawdown_duracao": drawdown_info["max_drawdown_duration"],
                "drawdown_atual": drawdown_info["current_drawdown"],
                "interpretacao": f"Maior perda consecutiva: {drawdown_info['max_drawdown']:.2f}%"
            },
            "value_at_risk": {
                "var_95_percent": round(var_95 * 100, 2),
                "var_99_percent": round(var_99 * 100, 2),
                "interpretacao_95": f"95% das vezes, a perda diária não excede {var_95*100:.2f}%",
                "interpretacao_99": f"99% das vezes, a perda diária não excede {var_99*100:.2f}%"
            },
            "ratios_performance": {
                "sharpe_ratio": round(sharpe, 3),
                "sortino_ratio": round(sortino, 3),
                "calmar_ratio": round(calmar, 3),
                "interpretacao_sharpe": "Excelente" if sharpe > 2 else "Bom" if sharpe > 1 else "Regular" if sharpe > 0 else "Ruim",
                "interpretacao_sortino": "Excelente" if sortino > 2 else "Bom" if sortino > 1 else "Regular" if sortino > 0 else "Ruim"
            },
            "retornos": {
                "retorno_total_percent": round(total_return * 100, 2),
                "retorno_anualizado_percent": round(annualized_return * 100, 2),
                "retorno_medio_diario": round(mean(daily_returns) * 100, 4),
                "volatilidade_diaria": round(stdev(daily_returns) * 100, 2) if len(daily_returns) > 1 else 0
            },
            "analise_sequencias": {
                "max_ganhos_consecutivos": max_consecutive_wins,
                "max_perdas_consecutivas": max_consecutive_losses,
                "streak_atual": current_streak
            },
            "mae_mfe": mae_mfe
        }
        
    except Exception as e:
        logger.error(f"Erro nas métricas de risco avançadas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/analise-sazonal", summary="Análise de padrões sazonais")
async def get_analise_sazonal(
    db: Session = Depends(get_db),
    robo_id: Optional[int] = Query(None, description="ID do robô específico"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados")
):
    """
    Analisa padrões sazonais: performance por mês, hora e dia da semana
    """
    try:
        # Buscar operações
        if robo_id:
            operacoes = crud.get_operacoes_by_robo(db, robo_id, schema_name=schema, skip=0, limit=10000)
        else:
            operacoes = crud.get_operacoes(db, schema_name=schema, skip=0, limit=10000)
        
        if not operacoes:
            return {"erro": "Nenhuma operação encontrada"}
        
        # Análise mensal
        monthly_analysis = SeasonalAnalyzer.analyze_monthly_performance(operacoes)
        
        # Análise por hora
        hourly_analysis = SeasonalAnalyzer.analyze_hourly_performance(operacoes)
        
        # Análise por dia da semana
        weekday_analysis = SeasonalAnalyzer.analyze_weekday_performance(operacoes)
        
        # Estatísticas resumo
        melhores_meses = sorted(monthly_analysis["padrao_mensal"], 
                               key=lambda x: x["resultado_medio"], reverse=True)[:3]
        piores_meses = sorted(monthly_analysis["padrao_mensal"], 
                             key=lambda x: x["resultado_medio"])[:3]
        
        melhores_horas = sorted([h for h in hourly_analysis["por_hora"] if h["operacoes"] > 0], 
                               key=lambda x: x["resultado_medio"], reverse=True)[:5]
        piores_horas = sorted([h for h in hourly_analysis["por_hora"] if h["operacoes"] > 0], 
                             key=lambda x: x["resultado_medio"])[:5]
        
        melhores_dias = sorted(weekday_analysis["por_dia_semana"], 
                              key=lambda x: x["resultado_medio"], reverse=True)[:3]
        piores_dias = sorted(weekday_analysis["por_dia_semana"], 
                            key=lambda x: x["resultado_medio"])[:3]
        
        return {
            "resumo_geral": {
                "total_operacoes": len(operacoes),
                "periodo_analisado": {
                    "inicio": min([op.data_abertura for op in operacoes if op.data_abertura]).date().isoformat(),
                    "fim": max([op.data_abertura for op in operacoes if op.data_abertura]).date().isoformat()
                }
            },
            "analise_mensal": monthly_analysis,
            "analise_horaria": hourly_analysis,
            "analise_semanal": weekday_analysis,
            "insights": {
                "melhores_meses": [{"mes": m["mes_nome"], "resultado": m["resultado_medio"]} for m in melhores_meses if m["operacoes"] > 0],
                "piores_meses": [{"mes": m["mes_nome"], "resultado": m["resultado_medio"]} for m in piores_meses if m["operacoes"] > 0],
                "melhores_horarios": [{"hora": h["hora_formatada"], "resultado": h["resultado_medio"]} for h in melhores_horas],
                "piores_horarios": [{"hora": h["hora_formatada"], "resultado": h["resultado_medio"]} for h in piores_horas],
                "melhores_dias_semana": [{"dia": d["dia_nome"], "resultado": d["resultado_medio"]} for d in melhores_dias if d["operacoes"] > 0],
                "piores_dias_semana": [{"dia": d["dia_nome"], "resultado": d["resultado_medio"]} for d in piores_dias if d["operacoes"] > 0]
            }
        }
        
    except Exception as e:
        logger.error(f"Erro na análise sazonal: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/distribuicao-retornos", summary="Análise de distribuição de retornos")
async def get_distribuicao_retornos(
    db: Session = Depends(get_db),
    robo_id: Optional[int] = Query(None, description="ID do robô específico"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados")
):
    """
    Analisa distribuição estatística dos retornos das operações
    """
    try:
        # Buscar operações
        if robo_id:
            operacoes = crud.get_operacoes_by_robo(db, robo_id, schema_name=schema, skip=0, limit=10000)
        else:
            operacoes = crud.get_operacoes(db, schema_name=schema, skip=0, limit=10000)
        
        if not operacoes:
            return {"erro": "Nenhuma operação encontrada"}
        
        # Análise de distribuição
        distribution_analysis = DistributionAnalyzer.analyze_return_distribution(operacoes)
        
        if "erro" in distribution_analysis:
            return distribution_analysis
        
        # Análise adicional de percentis
        resultados = [op.resultado for op in operacoes if op.resultado is not None]
        sorted_results = sorted(resultados)
        n = len(sorted_results)
        
        percentis = {}
        for p in [5, 10, 25, 50, 75, 90, 95]:
            index = int(p / 100 * n)
            if index >= n:
                index = n - 1
            percentis[f"p{p}"] = round(sorted_results[index], 2)
        
        # Análise de clustering (sequências)
        win_streaks = []
        loss_streaks = []
        current_streak = 0
        streak_type = None
        
        for resultado in resultados:
            if resultado > 0:
                if streak_type == "win":
                    current_streak += 1
                else:
                    if streak_type == "loss" and current_streak > 0:
                        loss_streaks.append(current_streak)
                    current_streak = 1
                    streak_type = "win"
            elif resultado < 0:
                if streak_type == "loss":
                    current_streak += 1
                else:
                    if streak_type == "win" and current_streak > 0:
                        win_streaks.append(current_streak)
                    current_streak = 1
                    streak_type = "loss"
        
        # Adicionar último streak
        if current_streak > 0:
            if streak_type == "win":
                win_streaks.append(current_streak)
            else:
                loss_streaks.append(current_streak)
        
        return {
            "distribuicao_completa": distribution_analysis,
            "percentis": percentis,
            "analise_clustering": {
                "sequencias_ganho": {
                    "total": len(win_streaks),
                    "media": round(mean(win_streaks), 1) if win_streaks else 0,
                    "maxima": max(win_streaks) if win_streaks else 0,
                    "distribuicao": win_streaks[:10]  # Primeiras 10
                },
                "sequencias_perda": {
                    "total": len(loss_streaks),
                    "media": round(mean(loss_streaks), 1) if loss_streaks else 0,
                    "maxima": max(loss_streaks) if loss_streaks else 0,
                    "distribuicao": loss_streaks[:10]  # Primeiras 10
                }
            },
            "risco_concentracao": {
                "resultado_maior_ganho": max(resultados) if resultados else 0,
                "resultado_maior_perda": min(resultados) if resultados else 0,
                "top_10_ganhos": sorted([r for r in resultados if r > 0], reverse=True)[:10],
                "top_10_perdas": sorted([r for r in resultados if r < 0])[:10]
            }
        }
        
    except Exception as e:
        logger.error(f"Erro na análise de distribuição: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/correlacao-robos", summary="Análise de correlação entre robôs")
async def get_correlacao_robos(
    db: Session = Depends(get_db),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados"),
    min_operacoes: int = Query(50, description="Mínimo de operações por robô")
):
    """
    Analisa correlação e diversificação entre diferentes robôs
    """
    try:
        # Buscar todos os robôs
        robos = crud.get_robos(db, schema_name=schema)
        
        if len(robos) < 2:
            return {"erro": "Necessário pelo menos 2 robôs para análise de correlação"}
        
        # Coletar dados de cada robô
        robos_data = {}
        for robo in robos:
            operacoes = crud.get_operacoes_by_robo(db, robo.id, schema_name=schema, skip=0, limit=10000)
            
            if len(operacoes) >= min_operacoes:
                # Agrupar por dia
                daily_results = defaultdict(float)
                for op in operacoes:
                    if op.data_abertura and op.resultado is not None:
                        day_key = op.data_abertura.date().isoformat()
                        daily_results[day_key] += op.resultado
                
                if len(daily_results) >= 10:  # Mínimo 10 dias
                    robos_data[robo.nome or f"Robô {robo.id}"] = daily_results
        
        if len(robos_data) < 2:
            return {"erro": "Dados insuficientes para análise de correlação"}
        
        # Criar matriz de correlação
        robo_names = list(robos_data.keys())
        
        # Encontrar período comum
        all_dates = set()
        for daily_results in robos_data.values():
            all_dates.update(daily_results.keys())
        
        common_dates = sorted(all_dates)
        
        # Filtrar datas que tenham dados para pelo menos 2 robôs
        valid_dates = []
        for date in common_dates:
            robos_with_data = sum(1 for daily_results in robos_data.values() if date in daily_results)
            if robos_with_data >= 2:
                valid_dates.append(date)
        
        if len(valid_dates) < 10:
            return {"erro": "Período comum insuficiente entre robôs"}
        
        # Calcular correlações
        correlacao_matrix = {}
        for i, robo1 in enumerate(robo_names):
            correlacao_matrix[robo1] = {}
            for j, robo2 in enumerate(robo_names):
                if i == j:
                    correlacao_matrix[robo1][robo2] = 1.0
                else:
                    # Calcular correlação de Pearson
                    returns1 = []
                    returns2 = []
                    
                    for date in valid_dates:
                        ret1 = robos_data[robo1].get(date, 0)
                        ret2 = robos_data[robo2].get(date, 0)
                        returns1.append(ret1)
                        returns2.append(ret2)
                    
                    if len(returns1) > 1 and stdev(returns1) > 0 and stdev(returns2) > 0:
                        correlation = np.corrcoef(returns1, returns2)[0, 1]
                        correlacao_matrix[robo1][robo2] = round(correlation, 3)
                    else:
                        correlacao_matrix[robo1][robo2] = 0.0
        
        # Estatísticas de diversificação
        diversificacao_stats = {}
        for robo_name, daily_results in robos_data.items():
            resultados = list(daily_results.values())
            diversificacao_stats[robo_name] = {
                "total_operacoes": len([op for robo in robos if (robo.nome or f"Robô {robo.id}") == robo_name 
                                      for op in crud.get_operacoes_by_robo(db, robo.id, schema_name=schema, skip=0, limit=10000)]),
                "dias_operando": len(resultados),
                "resultado_total": round(sum(resultados), 2),
                "resultado_medio_diario": round(mean(resultados), 2) if resultados else 0,
                "volatilidade_diaria": round(stdev(resultados), 2) if len(resultados) > 1 else 0,
                "melhor_dia": round(max(resultados), 2) if resultados else 0,
                "pior_dia": round(min(resultados), 2) if resultados else 0
            }
        
        # Portfolio combinado
        portfolio_daily = defaultdict(float)
        for date in valid_dates:
            for daily_results in robos_data.values():
                portfolio_daily[date] += daily_results.get(date, 0)
        
        portfolio_results = list(portfolio_daily.values())
        portfolio_stats = {
            "resultado_total": round(sum(portfolio_results), 2),
            "resultado_medio_diario": round(mean(portfolio_results), 2) if portfolio_results else 0,
            "volatilidade_diaria": round(stdev(portfolio_results), 2) if len(portfolio_results) > 1 else 0,
            "melhor_dia": round(max(portfolio_results), 2) if portfolio_results else 0,
            "pior_dia": round(min(portfolio_results), 2) if portfolio_results else 0,
            "sharpe_portfolio": 0  # Será calculado abaixo
        }
        
        # Calcular Sharpe do portfolio
        if len(portfolio_results) > 1 and stdev(portfolio_results) > 0:
            # Assumir taxa livre de risco diária (CDI)
            daily_rf = (1 + 0.1085) ** (1/252) - 1
            excess_returns = [r - daily_rf for r in portfolio_results]
            portfolio_stats["sharpe_portfolio"] = round(
                (mean(excess_returns) / stdev(portfolio_results)) * math.sqrt(252), 3
            )
        
        return {
            "periodo_analise": {
                "data_inicio": min(valid_dates),
                "data_fim": max(valid_dates),
                "dias_analisados": len(valid_dates)
            },
            "robos_analisados": len(robos_data),
            "matriz_correlacao": correlacao_matrix,
            "estatisticas_individuais": diversificacao_stats,
            "portfolio_combinado": portfolio_stats,
            "insights_diversificacao": {
                "correlacao_media": round(np.mean([
                    correlacao_matrix[r1][r2] for r1 in robo_names for r2 in robo_names if r1 != r2
                ]), 3),
                "pares_alta_correlacao": [
                    {"robo1": r1, "robo2": r2, "correlacao": correlacao_matrix[r1][r2]}
                    for r1 in robo_names for r2 in robo_names 
                    if r1 < r2 and correlacao_matrix[r1][r2] > 0.7
                ],
                "pares_baixa_correlacao": [
                    {"robo1": r1, "robo2": r2, "correlacao": correlacao_matrix[r1][r2]}
                    for r1 in robo_names for r2 in robo_names 
                    if r1 < r2 and correlacao_matrix[r1][r2] < 0.3
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Erro na análise de correlação: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/relatorio-completo", summary="Relatório completo de analytics avançados")
async def get_relatorio_completo(
    db: Session = Depends(get_db),
    robo_id: Optional[int] = Query(None, description="ID do robô específico"),
    schema: str = Query(settings.DEFAULT_UPLOAD_SCHEMA, description="Schema do banco de dados"),
    margem_total: Optional[float] = Query(None, description="Margem total (R$)")
):
    """
    Gera relatório consolidado com todas as métricas avançadas
    """
    try:
        # Executar todas as análises em paralelo
        import asyncio
        
        # Chamar endpoints internamente
        metricas_risco = await get_metricas_risco_avancadas(db, robo_id, schema, margem_total)
        analise_sazonal = await get_analise_sazonal(db, robo_id, schema)
        distribuicao = await get_distribuicao_retornos(db, robo_id, schema)
        
        # Análise adicional de benchmark
        benchmark = await get_comparacao_benchmarks(db, robo_id, schema, margem_total or 100000)
        
        # Resumo executivo
        resumo_executivo = {
            "tipo_analise": "Robô Específico" if robo_id else "Portfolio Completo",
            "periodo": metricas_risco.get("periodo_analise", {}),
            "performance_geral": {
                "total_operacoes": metricas_risco.get("periodo_analise", {}).get("total_operacoes", 0),
                "sharpe_ratio": metricas_risco.get("ratios_performance", {}).get("sharpe_ratio", 0),
                "max_drawdown": metricas_risco.get("metricas_drawdown", {}).get("max_drawdown_percent", 0),
                "retorno_anualizado": metricas_risco.get("retornos", {}).get("retorno_anualizado_percent", 0),
                "vs_cdi": benchmark.get("comparacao", {}).get("vs_cdi", {}).get("multiplo", 0)
            },
            "principais_insights": []
        }
        
        # Gerar insights automáticos
        if metricas_risco.get("ratios_performance", {}).get("sharpe_ratio", 0) > 1.5:
            resumo_executivo["principais_insights"].append(
                f"✅ Excelente Sharpe Ratio de {metricas_risco['ratios_performance']['sharpe_ratio']}"
            )
        
        if metricas_risco.get("metricas_drawdown", {}).get("max_drawdown_percent", 0) < 10:
            resumo_executivo["principais_insights"].append(
                f"✅ Drawdown controlado: {metricas_risco['metricas_drawdown']['max_drawdown_percent']:.1f}%"
            )
        elif metricas_risco.get("metricas_drawdown", {}).get("max_drawdown_percent", 0) > 20:
            resumo_executivo["principais_insights"].append(
                f"⚠️ Drawdown elevado: {metricas_risco['metricas_drawdown']['max_drawdown_percent']:.1f}%"
            )
        
        # Insights sazonais
        if "insights" in analise_sazonal:
            melhores_meses = analise_sazonal["insights"].get("melhores_meses", [])
            if melhores_meses:
                resumo_executivo["principais_insights"].append(
                    f"📅 Melhor sazonalidade: {melhores_meses[0]['mes']}"
                )
        
        return {
            "data_relatorio": datetime.now().isoformat(),
            "resumo_executivo": resumo_executivo,
            "metricas_risco": metricas_risco,
            "analise_sazonal": analise_sazonal,
            "distribuicao_retornos": distribuicao,
            "comparacao_benchmarks": benchmark,
            "recomendacoes": {
                "gestao_risco": [
                    "Monitore o drawdown máximo regularmente",
                    "Considere reduzir exposição em períodos de alta volatilidade",
                    "Mantenha diversificação adequada do portfolio"
                ],
                "otimizacao": [
                    "Analise padrões sazonais para timing de entrada/saída",
                    "Considere ajustar tamanho de posição baseado na volatilidade",
                    "Monitore correlações entre diferentes estratégias"
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Erro no relatório completo: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

 
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date, time
import pandas as pd
from statistics import mean, stdev
import math
from collections import defaultdict

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

 
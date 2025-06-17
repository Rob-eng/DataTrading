import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Shield, 
  Calendar,
  Clock,
  Filter,
  RefreshCw,
  PieChart,
  Activity,
  Zap,
  AlertTriangle
} from 'lucide-react'
import apiService, { Robo } from '../services/api'
import { 
  SimpleLineChart, 
  SimpleBarChart, 
  SimplePieChart, 
  EquityCurve,
  DailyBalanceChart,
  OperationsByMinuteChart,
  PerformanceHeatmap,
  OperationsScatterChart,
  DailyEvolutionChart,
  MonthlyPerformanceChart
} from '../components/Charts'
import TradingSettings from '../components/TradingSettings'
import Tooltip from '../components/Tooltip'

interface AdvancedAnalyticsData {
  metricas_financeiras?: any
  analise_dias?: any
  filtros_avancados?: any
  comparacao_benchmarks?: any
  equity_curve?: any[]
  performance_by_asset?: any[]
  monthly_performance?: any[]
  win_loss_distribution?: any[]
  daily_balance?: any[]
  operations_by_minute?: any[]
}

const Analytics: React.FC = () => {
  const [robots, setRobots] = useState<Robo[]>([])
  const [selectedRobot, setSelectedRobot] = useState<number | undefined>()
  const [selectedSchema, setSelectedSchema] = useState('uploads_usuarios')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para dados avançados
  const [analyticsData, setAnalyticsData] = useState<AdvancedAnalyticsData>({})
  
  // Estados para filtros avançados
  const [filters, setFilters] = useState({
    horario_inicio: '',
    horario_fim: '',
    dias_semana: '',
    max_stops_dia: undefined as number | undefined,
    limite_risco_diario: undefined as number | undefined,
    meta_ganho_diario: undefined as number | undefined,
    controle_por_robo: false // true = por robô individual, false = geral
  })

  const [valorInvestido, setValorInvestido] = useState(100000)
  
  // Estados para configurações de trading
  const [tradingConfig, setTradingConfig] = useState({
    contratos: 5,
    perfilRisco: 'conservador' as 'conservador' | 'moderado' | 'agressivo',
    valorGarantia: 1000,
    valorPorPonto: 1.0,
    totalRobos: 14,
    margemTotal: 70000
  })
  
  // Estados para novos gráficos
  const [scatterData, setScatterData] = useState<any[]>([])
  const [evolutionData, setEvolutionData] = useState<any[]>([])

  useEffect(() => {
    loadInitialData()
  }, [selectedSchema])

  useEffect(() => {
    if (robots.length > 0) {
      loadAnalyticsData()
    }
  }, [selectedRobot, selectedSchema, robots, tradingConfig.contratos])

  // Recarregar gráficos quando filtros básicos mudam ou configuração de trading muda
  useEffect(() => {
    if (robots.length > 0) {
      loadChartsData()
    }
  }, [selectedRobot, selectedSchema, tradingConfig.contratos, tradingConfig.valorPorPonto, tradingConfig.valorGarantia])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const robotsData = await apiService.getRobos(selectedSchema)
      setRobots(robotsData)
      
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Carregar todas as análises em paralelo
      const [
        metricasFinanceiras,
        analiseDias
      ] = await Promise.all([
        apiService.getMetricasFinanceiras(selectedRobot, selectedSchema, tradingConfig.contratos, tradingConfig.margemTotal),
        apiService.getAnaliseDias(selectedRobot, selectedSchema)
      ])

      setAnalyticsData(prev => ({
        ...prev,
        metricas_financeiras: metricasFinanceiras,
        analise_dias: analiseDias
      }))
      
      // Carregar gráficos separadamente
      await loadChartsData()
      
    } catch (err) {
      console.error('Erro ao carregar analytics:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar analytics')
    } finally {
      setLoading(false)
    }
  }

  // Função para converter pontos para reais baseado na configuração atual
  const convertPointsToReais = (points: number): number => {
    return points * tradingConfig.valorPorPonto
  }

  // Função para processar dados de gráficos com conversão para reais
  const processChartData = (data: any[], field: string = 'value') => {
    return data.map(item => ({
      ...item,
      [field]: item[field] ? convertPointsToReais(item[field]) : item[field],
      [`${field}_pontos`]: item[field] // Manter valor original em pontos
    }))
  }

  const loadChartsData = async () => {
    try {
      console.log(`📊 Carregando gráficos para robô: ${selectedRobot ? `ID ${selectedRobot}` : 'Todos'}`)
      
      // Se robô específico selecionado, usar endpoint específico
      if (selectedRobot) {
        const dadosRobo = await apiService.getDadosGraficosRobo(selectedRobot, selectedSchema)
        
        // Processar dados para incluir conversões para reais
        const processedEquityCurve = dadosRobo.equity_curve.map((item: any) => ({
          ...item,
          cumulative: convertPointsToReais(item.cumulative),
          value: convertPointsToReais(item.value),
          cumulative_pontos: item.cumulative,
          value_pontos: item.value
        }))

        const processedPerformanceByAsset = processChartData(dadosRobo.performance_by_asset)
        const processedMonthlyPerformance = processChartData(dadosRobo.monthly_performance)
        
        const processedScatterData = dadosRobo.scatter_data.map((item: any) => ({
          ...item,
          result: convertPointsToReais(item.result),
          result_pontos: item.result
        }))

        setAnalyticsData(prev => ({
          ...prev,
          equity_curve: processedEquityCurve,
          performance_by_asset: processedPerformanceByAsset,
          monthly_performance: processedMonthlyPerformance,
          win_loss_distribution: dadosRobo.win_loss_distribution,
          daily_balance: [],
          operations_by_minute: []
        }))
        
        setScatterData(processedScatterData)
        setEvolutionData([])
        
      } else {
        // Carregar dados dos gráficos para todos os robôs
        const [
          equityCurve,
          performanceByAsset,
          monthlyPerformance,
          winLossDistribution,
          dailyBalance,
          scatterPlotData,
          dailyEvolutionData
        ] = await Promise.all([
          apiService.getEquityCurveData(selectedRobot, selectedSchema),
          apiService.getPerformanceByAsset(selectedRobot, selectedSchema),
          apiService.getMonthlyPerformance(selectedRobot, selectedSchema),
          apiService.getWinLossDistribution(selectedRobot, selectedSchema),
          apiService.getDailyBalanceData(selectedRobot, selectedSchema),
          apiService.getOperationsScatterData(selectedRobot, selectedSchema),
          apiService.getDailyEvolutionData(selectedRobot, selectedSchema)
        ])

        // Processar dados para incluir conversões para reais
        const processedEquityCurve = equityCurve.map(item => ({
          ...item,
          cumulative: convertPointsToReais(item.cumulative),
          value: convertPointsToReais(item.value),
          cumulative_pontos: item.cumulative,
          value_pontos: item.value
        }))

        const processedPerformanceByAsset = processChartData(performanceByAsset)
        const processedMonthlyPerformance = processChartData(monthlyPerformance)
        
        const processedDailyBalance = dailyBalance.map(item => ({
          ...item,
          balance: convertPointsToReais(item.balance),
          balance_pontos: item.balance
        }))

        const processedScatterData = scatterPlotData.map(item => ({
          ...item,
          result: convertPointsToReais(item.result),
          result_pontos: item.result
        }))

        const processedEvolutionData = dailyEvolutionData.map(item => ({
          ...item,
          cumulativeResult: convertPointsToReais(item.cumulativeResult),
          operationResult: convertPointsToReais(item.operationResult),
          cumulativeResult_pontos: item.cumulativeResult,
          operationResult_pontos: item.operationResult
        }))

        setAnalyticsData(prev => ({
          ...prev,
          equity_curve: processedEquityCurve,
          performance_by_asset: processedPerformanceByAsset,
          monthly_performance: processedMonthlyPerformance,
          win_loss_distribution: winLossDistribution, // Este não precisa conversão
          daily_balance: processedDailyBalance,
          operations_by_minute: []
        }))
        
        setScatterData(processedScatterData)
        setEvolutionData(processedEvolutionData)
      }
      
    } catch (err) {
      console.error('Erro ao carregar dados dos gráficos:', err)
      // Não definir erro aqui para não sobrescrever erros mais importantes
    }
  }

  const applyAdvancedFilters = async () => {
    try {
      setLoading(true)
      
      console.log('🔍 Aplicando filtros avançados:', filters)
      
      const filtrosData = await apiService.getFiltrosAvancados({
        robo_id: selectedRobot,
        schema: selectedSchema,
        ...filters
      })
      
      console.log('📊 Dados dos filtros recebidos:', filtrosData)
      
      setAnalyticsData(prev => ({
        ...prev,
        filtros_avancados: filtrosData
      }))
      
      // Após aplicar filtros, recarregar dados dos gráficos com os mesmos filtros aplicados
      console.log('🔄 Recarregando gráficos com filtros aplicados...')
      await loadChartsData()
      
    } catch (err) {
      console.error('❌ Erro ao aplicar filtros:', err)
      setError(err instanceof Error ? err.message : 'Erro ao aplicar filtros')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const formatPercent = (value: number) => {
    return `${(value || 0).toFixed(2)}%`
  }

  if (loading && !analyticsData.metricas_financeiras) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando analytics avançado...</p>
        </div>
      </div>
    )
  }

  const metricas = analyticsData.metricas_financeiras?.metricas || {}
  const analiseDias = analyticsData.analise_dias || {}
  const filtrosData = analyticsData.filtros_avancados || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Avançado</h1>
        <button
          onClick={loadAnalyticsData}
          disabled={loading}
          className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Configurações de Trading */}
      <TradingSettings
        config={tradingConfig}
        onConfigChange={setTradingConfig}
        totalRobos={robots.length}
      />

      {/* Filtros */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros de Análise</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schema</label>
            <select 
              value={selectedSchema}
              onChange={(e) => setSelectedSchema(e.target.value)}
              className="input-field"
            >
              <option value="oficial">Oficial (Dados Iniciais)</option>
              <option value="uploads_usuarios">Uploads de Usuários</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Robô</label>
            <select 
              value={selectedRobot || ''}
              onChange={(e) => setSelectedRobot(e.target.value ? Number(e.target.value) : undefined)}
              className="input-field"
            >
              <option value="">Todos os robôs</option>
              {robots.map(robot => (
                <option key={robot.id} value={robot.id}>
                  {robot.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Métricas Financeiras Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-600">Total Operações</p>
                <Tooltip content="Número total de operações executadas no período selecionado, incluindo todas as compras e vendas realizadas." />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {(metricas.total_operacoes || 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-600">Resultado Total</p>
                <Tooltip content="Resultado financeiro total convertido para reais.\nCálculo: Soma de todos os pontos × valor por ponto × número de contratos configurados." />
              </div>
              <p className={`text-2xl font-bold ${(metricas.total_reais || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metricas.total_reais || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-600">Retorno %</p>
                <Tooltip content="Retorno percentual baseado na margem de garantia.\nCálculo: (Resultado Total em R$ ÷ Margem Total Necessária) × 100\nRepresenta o rendimento sobre o capital empregado." />
              </div>
              <p className={`text-2xl font-bold ${(metricas.retorno_percentual || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(metricas.retorno_percentual || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-600">Margem Necessária</p>
                <Tooltip content="Capital total de margem de garantia necessário para operar.\nCálculo: Número de contratos × Número de robôs × Valor de garantia por contrato\nEste é o valor que você precisa ter disponível na conta para todos os robôs operarem." />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metricas.margem_total_necessaria || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Análise de Dias Positivos vs Negativos */}
      {analiseDias.resumo_geral && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Análise de Performance por Tipo de Dia
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {analiseDias.resumo_geral.total_dias_analisados}
              </div>
              <p className="text-sm text-gray-600">Total de Dias</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analiseDias.resumo_geral.dias_positivos}
              </div>
              <p className="text-sm text-gray-600">Dias Positivos</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {analiseDias.resumo_geral.dias_negativos}
              </div>
              <p className="text-sm text-gray-600">Dias Negativos</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dias Positivos */}
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-3">Performance em Dias Positivos</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">Operações:</span>
                  <span className="font-medium text-green-800">
                    {analiseDias.analise_dias_positivos?.total_operacoes || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">Taxa de Acerto:</span>
                  <span className="font-medium text-green-800">
                    {formatPercent(analiseDias.analise_dias_positivos?.taxa_acerto || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">Resultado Médio:</span>
                  <span className="font-medium text-green-800">
                    {(analiseDias.analise_dias_positivos?.resultado_medio || 0).toFixed(2)} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Dias Negativos */}
            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-3">Performance em Dias Negativos</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-red-700">Operações:</span>
                  <span className="font-medium text-red-800">
                    {analiseDias.analise_dias_negativos?.total_operacoes || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-red-700">Taxa de Acerto:</span>
                  <span className="font-medium text-red-800">
                    {formatPercent(analiseDias.analise_dias_negativos?.taxa_acerto || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-red-700">Resultado Médio:</span>
                  <span className="font-medium text-red-800">
                    {(analiseDias.analise_dias_negativos?.resultado_medio || 0).toFixed(2)} pts
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos de Performance */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Visualizações Gráficas</h2>
        
        {/* Curva de Capital */}
        {analyticsData.equity_curve && analyticsData.equity_curve.length > 0 && (
          <EquityCurve
            data={analyticsData.equity_curve}
            title={`Curva de Capital - ${tradingConfig.contratos} contratos (R$ ${tradingConfig.valorPorPonto.toFixed(2)}/ponto)`}
            height={400}
            width={900}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Mensal */}
          {analyticsData.monthly_performance && analyticsData.monthly_performance.length > 0 && (
            <SimpleBarChart
              data={analyticsData.monthly_performance}
              title={`Performance Mensal (R$ ${tradingConfig.valorPorPonto.toFixed(2)}/ponto)`}
              height={350}
              width={500}
            />
          )}

          {/* Distribuição Win/Loss */}
          {analyticsData.win_loss_distribution && analyticsData.win_loss_distribution.length > 0 && (
            <SimplePieChart
              data={analyticsData.win_loss_distribution}
              title="Distribuição de Resultados"
              size={350}
            />
          )}
        </div>

        {/* Performance por Ativo */}
        {analyticsData.performance_by_asset && analyticsData.performance_by_asset.length > 0 && (
          <SimpleBarChart
            data={analyticsData.performance_by_asset}
            title={`Performance por Ativo - ${tradingConfig.contratos} contratos`}
            height={350}
            width={900}
          />
        )}

        {/* Evolução Diária do Saldo */}
        {analyticsData.daily_balance && analyticsData.daily_balance.length > 0 && (
          <DailyBalanceChart
            data={analyticsData.daily_balance}
            title={`Evolução de Resultados Diários - Margem Total: R$ ${tradingConfig.margemTotal.toLocaleString()}`}
            height={400}
            width={900}
          />
        )}

        {/* Scatter Plot - Operações por Horário */}
        {scatterData && scatterData.length > 0 && (
          <OperationsScatterChart
            data={scatterData}
            title="Distribuição de Operações por Horário (9h às 18h)"
            height={400}
            width={900}
          />
        )}

        {/* Evolução Diária de Resultados */}
        {evolutionData && evolutionData.length > 0 && (
          <DailyEvolutionChart
            data={evolutionData}
            title="Evolução Diária de Ganhos (Intraday)"
            height={400}
            width={900}
          />
        )}


      </div>

      {/* Comparação com Benchmarks - Temporariamente desabilitado */}
      {/* 
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Comparação com Benchmarks
        </h3>
        <p className="text-gray-600">
          Funcionalidade de comparação com CDI e IBOVESPA será implementada em breve.
        </p>
      </div>
      */}

      {/* Filtros Avançados */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Análise com Filtros Avançados
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário Início</label>
            <input
              type="time"
              value={filters.horario_inicio}
              onChange={(e) => setFilters(prev => ({ ...prev, horario_inicio: e.target.value }))}
              className="input-field"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário Fim</label>
            <input
              type="time"
              value={filters.horario_fim}
              onChange={(e) => setFilters(prev => ({ ...prev, horario_fim: e.target.value }))}
              className="input-field"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dias da Semana</label>
            <input
              type="text"
              value={filters.dias_semana}
              onChange={(e) => setFilters(prev => ({ ...prev, dias_semana: e.target.value }))}
              placeholder="1,2,3,4,5"
              className="input-field"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Stops/Dia</label>
            <input
              type="number"
              value={filters.max_stops_dia || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, max_stops_dia: e.target.value ? Number(e.target.value) : undefined }))}
              className="input-field"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Limite Risco (R$)</label>
            <input
              type="number"
              value={filters.limite_risco_diario || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, limite_risco_diario: e.target.value ? Number(e.target.value) : undefined }))}
              className="input-field"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Ganho (R$)</label>
            <input
              type="number"
              value={filters.meta_ganho_diario || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, meta_ganho_diario: e.target.value ? Number(e.target.value) : undefined }))}
              className="input-field"
            />
          </div>
        </div>

        {/* Controle de Aplicação de Filtros */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h4 className="font-medium text-gray-800 mb-3">Controle de Risco</h4>
          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="radio"
                name="controle_tipo"
                checked={!filters.controle_por_robo}
                onChange={() => setFilters(prev => ({ ...prev, controle_por_robo: false }))}
                className="mr-2"
              />
              <span className="text-sm">
                <strong>Geral</strong> - Aplicar controles considerando todas as operações em conjunto
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="controle_tipo"
                checked={filters.controle_por_robo}
                onChange={() => setFilters(prev => ({ ...prev, controle_por_robo: true }))}
                className="mr-2"
              />
              <span className="text-sm">
                <strong>Por Robô</strong> - Aplicar controles individualmente para cada robô
              </span>
            </label>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-800 mb-2">📚 Como Funcionam os Controles:</h5>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Exemplo prático:</strong> Limite de perda diária = R$ 500</p>
              <p>• <strong>Geral:</strong> Para quando TODOS os robôs juntos perdem R$ 500 no dia</p>
              <p>• <strong>Por Robô:</strong> Para quando QUALQUER robô individual perde R$ 500</p>
            </div>
          </div>
          
          <p className="text-xs text-gray-600 mt-2">
            {filters.controle_por_robo 
              ? "🔍 Cada robô tem seus próprios limites independentes"
              : "🔍 Todos os robôs compartilham os mesmos limites combinados"
            }
          </p>
        </div>
        
        <button
          onClick={applyAdvancedFilters}
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? 'Aplicando...' : 'Aplicar Filtros'}
        </button>

        {/* Tipo de Controle Aplicado */}
        {filtrosData.filtros_aplicados && (
          <div className="mt-4 bg-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-medium text-blue-800">
                Controle Aplicado: {filtrosData.filtros_aplicados.tipo_controle}
              </span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              {filtrosData.filtros_aplicados.controle_por_robo 
                ? "Os limites de risco e metas são aplicados individualmente para cada robô em cada dia"
                : "Os limites de risco e metas são aplicados considerando o resultado conjunto de todos os robôs"
              }
            </p>
          </div>
        )}

        {/* Resultados dos Filtros */}
        {filtrosData.resultados_originais && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Sem Filtros</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Operações:</span>
                  <span className="font-medium">{filtrosData.resultados_originais.total_operacoes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Resultado:</span>
                  <span className="font-medium">{formatCurrency(convertPointsToReais(filtrosData.resultados_originais.resultado_total))}</span>
                </div>
                <div className="text-xs text-gray-500">
                  ({filtrosData.resultados_originais.resultado_total} pts)
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Win Rate:</span>
                  <span className="font-medium">{formatPercent(filtrosData.resultados_originais.win_rate)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-3">Com Filtros de Horário</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-yellow-700">Resultado:</span>
                  <span className="font-medium text-yellow-800">
                    {formatCurrency(convertPointsToReais(filtrosData.resultados_originais.resultado_total))}
                  </span>
                </div>
                <div className="text-xs text-yellow-600">
                  ({filtrosData.resultados_originais.resultado_total} pts)
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-yellow-700">Período:</span>
                  <span className="font-medium text-yellow-800">
                    {filters.horario_inicio && filters.horario_fim 
                      ? `${filters.horario_inicio} - ${filters.horario_fim}`
                      : "Sem filtro"
                    }
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3">Com Controles de Risco</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">Resultado:</span>
                  <span className="font-medium text-blue-800">
                    {formatCurrency(convertPointsToReais(filtrosData.resultados_com_controles?.resultado_total || 0))}
                  </span>
                </div>
                <div className="text-xs text-blue-600">
                  ({filtrosData.resultados_com_controles?.resultado_total} pts)
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">Diferença:</span>
                  <span className={`font-medium ${(filtrosData.resultados_com_controles?.diferenca || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(filtrosData.resultados_com_controles?.diferenca || 0) >= 0 ? '+' : ''}
                    {formatCurrency(convertPointsToReais(filtrosData.resultados_com_controles?.diferenca || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">Dias c/ Stop:</span>
                  <span className="font-medium text-blue-800">{filtrosData.resultados_com_controles?.dias_com_stop_loss || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">Dias c/ Meta:</span>
                  <span className="font-medium text-blue-800">{filtrosData.resultados_com_controles?.dias_com_meta_atingida || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance por Dia da Semana */}
        {filtrosData.performance_por_dia_semana && (
          <div className="mt-6">
            <h4 className="font-semibold text-gray-800 mb-3">Performance por Dia da Semana</h4>
            <div className="grid grid-cols-5 gap-3">
              {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map(dia => {
                const stats = filtrosData.performance_por_dia_semana[dia] || { 
                  operacoes: 0, 
                  resultado_total: 0, 
                  win_rate: 0 
                }
                return (
                  <div key={dia} className="bg-white border rounded-lg p-4 text-center">
                    <div className="text-sm font-medium text-gray-700 mb-2">{dia}</div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{stats.operacoes}</div>
                    <div className="text-xs text-gray-500 mb-2">operações</div>
                    <div className={`text-lg font-medium mb-1 ${stats.resultado_total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.resultado_total >= 0 ? '+' : ''}{formatCurrency(convertPointsToReais(stats.resultado_total))}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">({stats.resultado_total} pts)</div>
                    <div className={`text-sm font-medium ${stats.win_rate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(stats.win_rate)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Resumo do Período - Temporariamente desabilitado */}
      {/* 
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Resumo do Período Analisado
        </h3>
        <p className="text-gray-600">
          Resumo do período será implementado em breve.
        </p>
      </div>
      */}
    </div>
  )
}

export default Analytics 
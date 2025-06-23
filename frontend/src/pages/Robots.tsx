import React, { useState, useEffect } from 'react'
import { Bot, Search, Filter, Plus, BarChart3, TrendingUp, Activity, Trophy, Medal, Award } from 'lucide-react'
import apiService, { Robo } from '../services/api'
import { OperationsScatterChart, EquityCurve, SimpleBarChart } from '../components/Charts'
import { useTradingContext, Robot, riskProfiles } from '../App'

interface RobotMetrics extends Robot {
  descricao?: string;
  created_at?: string;
  lucro_bruto?: number;
  lucro_liquido?: number;
  total_operacoes?: number;
  operacoes_vencedoras?: number;
  operacoes_perdedoras?: number;
  win_rate?: number;
  profit_factor?: number;
  drawdown?: number;
  sharpe_ratio?: number;
  max_consecutive_wins?: number;
  max_consecutive_losses?: number;
  // Métricas calculadas com base nas configurações globais
  margem_por_robo?: number;
  margem_total?: number;
  lucro_liquido_ajustado?: number;
}

const Robots: React.FC = () => {
  const { 
    availableRobots, 
    setAvailableRobots,
    contractsPerRobot,
    totalMargin,
    riskProfile
  } = useTradingContext();

  const [robots, setRobots] = useState<RobotMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [robotStats, setRobotStats] = useState<Record<string, any>>({})
  const [selectedRobot, setSelectedRobot] = useState<RobotMetrics | null>(null)
  const [robotDetailsData, setRobotDetailsData] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Configurações fixas (podem ser movidas para o contexto depois)
  const selectedSchema = 'oficial';
  const valorPorPonto = 0.20;

  useEffect(() => {
    loadRobots()
  }, [selectedSchema, contractsPerRobot, totalMargin]) // Recarregar quando configurações mudarem

  const loadRobots = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Carregando robôs do schema:', selectedSchema)
      console.log('⚙️ Configurações atuais:', { contratos: contractsPerRobot, margemTotal: totalMargin, valorPorPonto })
      
      const robotsData = await apiService.getRobos(selectedSchema)
      console.log('🤖 Robôs carregados:', robotsData.length)
      setRobots(robotsData)
      
      // Atualizar robôs disponíveis no contexto
      setAvailableRobots(robotsData)
      
      // Carregar estatísticas para cada robô usando as configurações do contexto
      const stats: Record<string, any> = {}
      for (const robot of robotsData) {
        try {
          console.log(`📊 Carregando métricas para robô ${robot.nome} (ID: ${robot.id})`)
          
          // Usar as configurações do contexto para os cálculos
          const metricas = await apiService.getMetricasFinanceirasSimples(
            robot.id.toString(),
            selectedSchema,
            contractsPerRobot, // Usar contratos do contexto
            undefined // CORREÇÃO: Não passar margem total para robôs individuais
          )
          
          console.log(`✅ Métricas carregadas para ${robot.nome}:`, metricas.metricas)
          
          stats[robot.id] = {
            operacoes: metricas.metricas.total_operacoes,
            resultado: metricas.metricas.total_reais,
            retorno: metricas.metricas.retorno_percentual,
            // Adicionar informações de configuração
            contratos_usados: metricas.metricas.contratos_considerados,
            margem_usada: metricas.metricas.margem_total_necessaria
          }
        } catch (err) {
          console.error(`❌ Erro ao carregar métricas para robô ${robot.nome}:`, err)
          stats[robot.id] = { 
            operacoes: 0, 
            resultado: 0, 
            retorno: 0,
            contratos_usados: contractsPerRobot,
            margem_usada: 0
          }
        }
      }
      
      console.log('📈 Estatísticas finais dos robôs:', stats)
      setRobotStats(stats)
      
    } catch (err) {
      console.error('❌ Erro ao carregar robôs:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar robôs')
    } finally {
      setLoading(false)
    }
  }

  const filteredRobots = robots
    .filter(robot =>
      robot.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (robot.descricao && robot.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      // Ordenar por resultado (maior para menor)
      const statsA = robotStats[a.id] || { resultado: 0 }
      const statsB = robotStats[b.id] || { resultado: 0 }
      return statsB.resultado - statsA.resultado
    })

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-orange-600" />
      default:
        return null
    }
  }

  const getPositionBadge = (position: number) => {
    if (position <= 3) {
      const colors = {
        1: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        2: 'bg-gray-100 text-gray-800 border-gray-200',
        3: 'bg-orange-100 text-orange-800 border-orange-200'
      }
      return colors[position as keyof typeof colors]
    }
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  const openRobotDetails = async (robot: RobotMetrics) => {
    setSelectedRobot(robot)
    setLoadingDetails(true)
    
    try {
      console.log(`🤖 Carregando detalhes para robô: ${robot.nome} (ID: ${robot.id})`)
      
      // Usar endpoints existentes no backend com configurações do contexto
      const [metricas, equityCurveData, performanceAssetData, monthlyPerfData, scatterData] = await Promise.all([
        // Métricas financeiras usando configurações do contexto
        apiService.getMetricasFinanceirasSimples(
          robot.id.toString(), 
          selectedSchema, 
          contractsPerRobot,
          undefined
        ),
        // Dados da curva de capital
        apiService.getEquityCurveData(robot.id, selectedSchema),
        // Performance por ativo
        apiService.getPerformanceByAsset(robot.id, selectedSchema),
        // Performance mensal
        apiService.getMonthlyPerformance(robot.id, selectedSchema),
        // Dados do scatter plot
        apiService.getOperationsScatterData(robot.id.toString())
      ])
      
      console.log(`📊 Dados carregados para ${robot.nome}:`, {
        operacoes_metricas: metricas.metricas.total_operacoes,
        equity_curve_points: equityCurveData?.length || 0,
        performance_assets: performanceAssetData?.length || 0,
        monthly_data: monthlyPerfData?.length || 0,
        scatter_points: scatterData?.length || 0,
        configuracoes_usadas: {
          contratos: metricas.metricas.contratos_considerados,
          margem: metricas.metricas.margem_total_necessaria
        }
      })
      
      setRobotDetailsData({
        metricas,
        equityCurve: equityCurveData || [],
        performanceAsset: performanceAssetData || [],
        monthlyPerf: monthlyPerfData || [],
        scatterData: scatterData || [],
        winLossDistribution: [] // Pode ser implementado depois se necessário
      })
    } catch (err) {
      console.error('❌ Erro ao carregar detalhes do robô:', err)
      setRobotDetailsData(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  const closeRobotDetails = () => {
    setSelectedRobot(null)
    setRobotDetailsData(null)
  }

  // Calcular estatísticas totais usando as configurações do contexto
  const totalStats = {
    totalRobots: robots.length,
    totalOperations: Object.values(robotStats).reduce((sum: number, stats: any) => sum + (stats.operacoes || 0), 0),
    totalResult: Object.values(robotStats).reduce((sum: number, stats: any) => sum + (stats.resultado || 0), 0),
    avgReturn: robots.length > 0 ? Object.values(robotStats).reduce((sum: number, stats: any) => sum + (stats.retorno || 0), 0) / robots.length : 0,
    // Informações das configurações atuais
    configInfo: {
      contratos: contractsPerRobot,
      margemTotal: totalMargin,
      valorPorPonto
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando robôs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Robôs</h1>
        <button className="btn-primary flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Novo Robô</span>
        </button>
      </div>

      {/* Estatísticas Gerais com informações de configuração */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Robôs</p>
              <p className="text-2xl font-bold text-gray-900">{totalStats.totalRobots}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Operações</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalStats.totalOperations.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resultado Total</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {totalStats.totalResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">
                {contractsPerRobot} contrato(s) • R$ {totalMargin.toLocaleString('pt-BR')} margem
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Retorno Médio</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalStats.avgReturn.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500">
                Base: R$ {valorPorPonto.toFixed(2)}/ponto
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Card de Configuração Atual */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Filter className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-blue-900">Configuração Atual</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-700 font-medium">Contratos:</span>
            <span className="ml-2 text-blue-900">{contractsPerRobot}</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Margem Total:</span>
            <span className="ml-2 text-blue-900">R$ {totalMargin.toLocaleString('pt-BR')}</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Valor/Ponto:</span>
            <span className="ml-2 text-blue-900">R$ {valorPorPonto.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Schema:</span>
            <span className="ml-2 text-blue-900">{selectedSchema}</span>
          </div>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          💡 Os cálculos de resultado e retorno são baseados nestas configurações. 
          Altere as configurações através do modal de configurações no menu principal.
        </p>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 flex-1">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar robôs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field flex-1"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">📊 Dados Oficiais</span>
          </div>
        </div>
      </div>

      {/* Lista de Robôs */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Ranking de Performance - Robôs ({filteredRobots.length})
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Robôs ordenados por resultado financeiro (do melhor para o pior)
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {filteredRobots.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum robô encontrado</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Faça upload de dados ou crie um novo robô.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRobots.map((robot, index) => {
              const position = index + 1
              const stats = robotStats[robot.id] || { operacoes: 0, resultado: 0, retorno: 0 }
              return (
                <div key={robot.id} className={`border-2 rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                  position <= 3 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Badge de Posição */}
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 font-bold text-lg ${getPositionBadge(position)}`}>
                        {position <= 3 ? getPositionIcon(position) : `${position}º`}
                      </div>
                      
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Bot className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-gray-900">{robot.nome}</h4>
                          {position <= 3 && (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPositionBadge(position)}`}>
                              {position === 1 ? '🥇 1º Lugar' : position === 2 ? '🥈 2º Lugar' : '🥉 3º Lugar'}
                            </span>
                          )}
                        </div>
                        {robot.descricao && (
                          <p className="text-sm text-gray-600">{robot.descricao}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Criado em: {robot.created_at ? new Date(robot.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">Operações</p>
                        <p className="text-lg font-bold text-gray-900">
                          {stats.operacoes.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">Resultado</p>
                        <p className={`text-lg font-bold ${stats.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {stats.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">Retorno</p>
                        <p className={`text-lg font-bold ${stats.retorno >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stats.retorno >= 0 ? '+' : ''}{stats.retorno.toFixed(2)}%
                        </p>
                      </div>

                      <button 
                        className="btn-secondary text-sm"
                        onClick={() => openRobotDetails(robot)}
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Botão para recarregar */}
      <div className="flex justify-center">
        <button
          onClick={loadRobots}
          disabled={loading}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Carregando...' : 'Atualizar Lista'}
        </button>
      </div>

      {/* Modal de Detalhes do Robô */}
      {selectedRobot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              {/* Header do Modal */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Bot className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedRobot.nome}</h2>
                    {selectedRobot.descricao && (
                      <p className="text-gray-600">{selectedRobot.descricao}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={closeRobotDetails}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Conteúdo do Modal */}
              {loadingDetails ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando detalhes...</p>
                  </div>
                </div>
              ) : robotDetailsData ? (
                <div className="space-y-6">
                  {/* Métricas do Robô */}
                  {robotDetailsData.metricas && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-800 mb-2">Operações</h3>
                        <p className="text-2xl font-bold text-blue-900">
                          {robotDetailsData.metricas.metricas.total_operacoes}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <h3 className="font-semibold text-green-800 mb-2">Resultado</h3>
                        <p className="text-2xl font-bold text-green-900">
                          R$ {robotDetailsData.metricas.metricas.total_reais?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-800 mb-2">Retorno</h3>
                        <p className="text-2xl font-bold text-purple-900">
                          {robotDetailsData.metricas.metricas.retorno_percentual?.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Gráficos Detalhados */}
                  <div className="space-y-6">
                    {/* Curva de Capital - Todo Período */}
                    {robotDetailsData.equityCurve && robotDetailsData.equityCurve.length > 0 && (
                      <div className="bg-white border rounded-lg">
                        <EquityCurve
                          data={robotDetailsData.equityCurve}
                          title={`Evolução de Capital - Todo Período (${robotDetailsData.equityCurve.length} operações)`}
                          height={300}
                          width={680}
                        />
                      </div>
                    )}

                    {/* Performance Mensal */}
                    {robotDetailsData.monthlyPerf && robotDetailsData.monthlyPerf.length > 0 && (
                      <div className="bg-white border rounded-lg">
                        <SimpleBarChart
                          data={robotDetailsData.monthlyPerf}
                          title="Performance Mensal"
                          height={300}
                          width={680}
                        />
                      </div>
                    )}

                    {/* Scatter Plot - Distribuição por Horário */}
                    {robotDetailsData.scatterData && robotDetailsData.scatterData.length > 0 && (
                      <div className="bg-white border rounded-lg">
                        <OperationsScatterChart
                          data={robotDetailsData.scatterData}
                          title={`Distribuição de Operações por Horário - ${selectedRobot.nome}`}
                          height={300}
                          width={680}
                        />
                      </div>
                    )}
                  </div>

                  {/* Período de Análise */}
                  {robotDetailsData?.equityCurve && robotDetailsData.equityCurve.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800 mb-3">Período de Análise</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">📅 Primeira Operação:</span>
                          <span className="ml-2 font-medium">
                            {new Date(robotDetailsData.equityCurve[0].date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">📅 Última Operação:</span>
                          <span className="ml-2 font-medium">
                            {new Date(robotDetailsData.equityCurve[robotDetailsData.equityCurve.length - 1].date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">⏱️ Duração Total:</span>
                          <span className="ml-2 font-medium">
                            {(() => {
                              const start = new Date(robotDetailsData.equityCurve[0].date)
                              const end = new Date(robotDetailsData.equityCurve[robotDetailsData.equityCurve.length - 1].date)
                              const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                              return `${diffDays} dias (${Math.round(diffDays / 30)} meses)`
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Erro ao carregar dados do robô</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Robots 
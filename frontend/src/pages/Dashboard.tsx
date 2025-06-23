import React, { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Activity, Bot, AlertCircle, RefreshCw } from 'lucide-react'
import apiService, { MetricasFinanceiras, Robo } from '../services/api'
import { useTradingContext } from '../App'

const Dashboard: React.FC = () => {
  const { availableRobots, selectedRobotIds, contractsPerRobot, riskProfile, totalMargin, setAvailableRobots } = useTradingContext()
  
  // Configuração fixa do valor por ponto (pode ser movida para o contexto depois)
  const pointValue = 0.20;
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSchema] = useState('oficial') // Fixado como oficial
  const [stats, setStats] = useState<any>({})
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [metricas, setMetricas] = useState<MetricasFinanceiras | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [selectedRobotIds, contractsPerRobot, riskProfile]) // Reagir a mudanças nas configurações

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Verificar status da API
      try {
        console.log('🔍 Verificando health check da API...')
        const healthResponse = await apiService.healthCheck()
        console.log('✅ Health check bem-sucedido:', healthResponse)
        setApiStatus('online')

        // Carregar robôs automaticamente se não estiverem carregados
        let robotsToUse: number[] = []
        if (availableRobots.length === 0) {
          console.log('📥 Carregando lista de robôs automaticamente...')
          try {
            const robotsData = await apiService.getRobos('oficial')
            console.log('🤖 Robôs carregados no Dashboard:', robotsData.length)
            
            if (robotsData.length === 0) {
              throw new Error('Nenhum robô encontrado no banco de dados. Faça upload de dados primeiro.')
            }
            
            // Atualizar o contexto com os robôs carregados
            setAvailableRobots(robotsData.map(robo => ({
              id: robo.id,
              nome: robo.nome
            })))
            
            // Usar todos os robôs disponíveis se nenhum estiver selecionado
            robotsToUse = robotsData.map(r => r.id)
            console.log('✅ Dashboard inicializado com', robotsData.length, 'robôs')
          } catch (robotError) {
            console.error('❌ Erro ao carregar robôs:', robotError)
            throw new Error('Erro ao carregar lista de robôs: ' + (robotError instanceof Error ? robotError.message : 'Erro desconhecido'))
          }
        } else {
          // Usar robôs selecionados ou todos os disponíveis
          robotsToUse = selectedRobotIds.size > 0 
            ? Array.from(selectedRobotIds)
            : availableRobots.map(r => r.id)
          console.log('🤖 Usando robôs do contexto:', robotsToUse.length, 'robô(s)')
        }

        if (robotsToUse.length === 0) {
          console.warn('⚠️ Nenhum robô encontrado')
          throw new Error('Nenhum robô encontrado. Faça upload de dados primeiro.')
        }

        // Preparar lista de IDs dos robôs para calcular métricas
        const roboIds = robotsToUse.join(',')
        console.log('🤖 Robôs para análise:', robotsToUse.length, 'IDs:', roboIds)
        console.log('⚙️ Configurações atuais:', {
          contratos: contractsPerRobot,
          perfil: riskProfile,
          margem: totalMargin,
          valorPonto: pointValue
        })

        // Chamada para as métricas financeiras simples com robôs selecionados
        const metricasData = await apiService.getMetricasFinanceirasSimples(
          roboIds, // Passar IDs dos robôs selecionados
          'oficial',
          contractsPerRobot, // Usar contratos configurados
          totalMargin // Usar margem total configurada
        )

        // Calcular taxa de acerto real baseada nas operações carregadas
        const operacoesTodas = await apiService.getOperacoes('oficial', 0, 10000, roboIds)
        const operacoesComResultado = operacoesTodas.filter(op => op.resultado !== null && op.resultado !== undefined)
        const operacoesPositivas = operacoesComResultado.filter(op => op.resultado > 0)
        const winRate = operacoesComResultado.length > 0 ? 
          (operacoesPositivas.length / operacoesComResultado.length) * 100 : 0

        console.log('📊 Taxa de acerto calculada:', winRate.toFixed(1) + '%', 
                    'Positivas:', operacoesPositivas.length, 'Total:', operacoesComResultado.length)

        // Calcular retorno percentual baseado na margem configurada atual
        const lucroTotalReais = metricasData.metricas.total_reais
        const retornoPercentualCalculado = totalMargin > 0 ? (lucroTotalReais / totalMargin) * 100 : 0

        console.log('💰 Cálculo de retorno:', {
          lucroReais: lucroTotalReais,
          margemConfigurada: totalMargin,
          retornoCalculado: retornoPercentualCalculado.toFixed(2) + '%',
          retornoBackend: metricasData.metricas.retorno_percentual.toFixed(2) + '%'
        })

        setMetricas(metricasData)
        setStats({
          totalOperations: metricasData.metricas.total_operacoes,
          totalProfit: metricasData.metricas.total_pontos,
          totalProfitReais: lucroTotalReais,
          winRate: Math.round(winRate * 100) / 100, // Arredondar para 2 casas decimais
          activeRobots: robotsToUse.length,
          returnPercentage: retornoPercentualCalculado // Usar cálculo baseado na configuração atual
        })

        console.log('✅ Dashboard carregado com sucesso:', {
          operacoes: metricasData.metricas.total_operacoes,
          pontos: metricasData.metricas.total_pontos,
          reais: lucroTotalReais,
          retornoCalculado: retornoPercentualCalculado.toFixed(2) + '%',
          taxaAcerto: winRate.toFixed(1) + '%',
          robos: robotsToUse.length,
          margemUsada: totalMargin
        })

      } catch (healthError) {
        console.error('❌ Health check ou carregamento falhou:', healthError)
        setApiStatus('offline')
        throw healthError
      }

    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err)
      setError("Falha ao carregar dados do dashboard. Verifique se o backend está rodando e se há dados no banco.")
      setApiStatus('offline')
      
      // Usar dados simulados em caso de erro
      setMetricas({
        metricas: {
          total_operacoes: 0,
          total_pontos: 0,
          total_reais: 0,
          retorno_percentual: 0,
          margem_total_necessaria: 0,
          contratos_considerados: 1
        },
        por_ativo: {},
        configuracao: { valores_ponto: {}, margens: {} }
      })
      setStats({
        totalOperations: 0,
        totalProfit: 0,
        totalProfitReais: 0,
        winRate: 0,
        activeRobots: 0,
        returnPercentage: 0
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados do dashboard...</p>
          {availableRobots.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">Inicializando robôs...</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              apiStatus === 'online' ? 'bg-green-500' : 
              apiStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              API {apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Verificando...'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Última atualização: {new Date().toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Alerta de erro */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-800">Sistema não configurado</h3>
              <p className="text-sm text-yellow-700 mt-1">{error}</p>
              <div className="mt-3 text-sm">
                <p className="font-medium text-yellow-800">Para começar:</p>
                <ol className="list-decimal list-inside mt-1 text-yellow-700 space-y-1">
                  <li>Certifique-se de que o backend está rodando</li>
                  <li>Configure o banco de dados PostgreSQL</li>
                  <li>Faça upload de dados na página "Upload"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informações de Configuração */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-800">Configuração Atual</h3>
            <div className="text-sm text-blue-700 mt-1">
              <span className="font-medium">{selectedRobotIds.size > 0 ? selectedRobotIds.size : availableRobots.length}</span> robô(s) • 
              <span className="font-medium ml-1">{contractsPerRobot}</span> contrato(s) • 
              <span className="font-medium ml-1">{riskProfile}</span> • 
              <span className="font-medium ml-1">R$ {totalMargin.toLocaleString('pt-BR')}</span> margem
            </div>
          </div>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Operações</p>
              <p className="text-2xl font-bold text-gray-900">
                {(stats.totalOperations || 0).toLocaleString('pt-BR')}
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
              <p className="text-sm font-medium text-gray-600">Lucro Total</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {(stats.totalProfitReais || 0).toLocaleString('pt-BR', { 
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2 
                })}
              </p>
              <p className="text-xs text-gray-500">
                {(stats.totalProfit || 0).toLocaleString('pt-BR', { 
                  minimumFractionDigits: 2 
                })} pontos
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
              <p className="text-sm font-medium text-gray-600">Taxa de Acerto</p>
              <p className="text-2xl font-bold text-gray-900">{stats.winRate || 0}%</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Robôs Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeRobots || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50">
              <Bot className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Card de Retorno Percentual */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Retorno Percentual</h3>
            <p className={`text-3xl font-bold mb-2 ${
              (stats.returnPercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(stats.returnPercentage || 0) >= 0 ? '+' : ''}{(stats.returnPercentage || 0).toFixed(2)}%
            </p>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Lucro Total:</span>
                <span className="font-medium">R$ {(stats.totalProfitReais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Margem Configurada:</span>
                <span className="font-medium">R$ {totalMargin.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 pt-1 border-t">
                <span>Configuração:</span>
                <span>{contractsPerRobot} contrato(s) × {selectedRobotIds.size > 0 ? selectedRobotIds.size : availableRobots.length} robô(s) × {riskProfile}</span>
              </div>
            </div>
          </div>
          <div className={`p-4 rounded-lg ${
            (stats.returnPercentage || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <TrendingUp className={`h-8 w-8 ${
              (stats.returnPercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`} />
          </div>
        </div>
      </div>

      {/* Seção de Boas-vindas */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Bem-vindo ao GPTrading Dashboard
        </h2>
        <p className="text-gray-600 mb-4">
          Sistema completo de analytics para trading algorítmico conectado ao backend FastAPI. 
          Navegue pelas seções usando o menu lateral:
        </p>
        <ul className="text-gray-600 space-y-2">
          <li>• <strong>Dashboard:</strong> Visão geral das métricas principais com dados reais</li>
          <li>• <strong>Analytics:</strong> Análises avançadas e gráficos detalhados</li>
          <li>• <strong>Robôs:</strong> Gerenciamento dos robôs de trading</li>
          <li>• <strong>Operações:</strong> Histórico completo de operações</li>
          <li>• <strong>Upload CSV:</strong> Importação de dados de operações</li>
        </ul>
        
        {apiStatus === 'online' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Conectado ao backend FastAPI - Dados em tempo real disponíveis
            </p>
          </div>
        )}
        
        {apiStatus === 'offline' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ❌ Backend não disponível - Verifique se o servidor FastAPI está rodando
            </p>
          </div>
        )}
      </div>


    </div>
  )
}

export default Dashboard 
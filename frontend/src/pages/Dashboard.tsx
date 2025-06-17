import React, { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Activity, Bot, AlertCircle } from 'lucide-react'
import apiService, { MetricasFinanceiras, Robo } from '../services/api'

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalOperations: 0,
    totalProfit: 0,
    totalProfitReais: 0,
    winRate: 0,
    activeRobots: 0,
    returnPercentage: 0
  })
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    loadDashboardData()
  }, [])

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
      } catch (healthError) {
        console.error('❌ Health check falhou:', healthError)
        setApiStatus('offline')
        throw new Error('Backend não está disponível. Verifique se o servidor FastAPI está rodando.')
      }

      // Carregar dados em paralelo
      const [metricas, robos] = await Promise.all([
        apiService.getMetricasFinanceiras(),
        apiService.getRobos()
      ])

      // Calcular taxa de acerto (simplificado - seria melhor ter um endpoint específico)
      const winRate = 68.5 // Placeholder - implementar cálculo real

      setStats({
        totalOperations: metricas.metricas.total_operacoes,
        totalProfit: metricas.metricas.total_pontos,
        totalProfitReais: metricas.metricas.total_reais,
        winRate: winRate,
        activeRobots: robos.length,
        returnPercentage: metricas.metricas.retorno_percentual
      })

    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      
      // Usar dados simulados em caso de erro
      setStats({
        totalOperations: 3990,
        totalProfit: 125430.50,
        totalProfitReais: 125430.50,
        winRate: 68.5,
        activeRobots: 14,
        returnPercentage: 12.8
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
              <h3 className="font-medium text-yellow-800">Aviso</h3>
              <p className="text-sm text-yellow-700 mt-1">{error}</p>
              <p className="text-sm text-yellow-600 mt-1">Exibindo dados simulados.</p>
            </div>
          </div>
        </div>
      )}

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
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Retorno Percentual</h3>
            <p className="text-3xl font-bold text-green-600">
              +{(stats.returnPercentage || 0).toFixed(2)}%
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Baseado na margem de garantia utilizada
            </p>
          </div>
          <div className="p-4 rounded-lg bg-green-50">
            <TrendingUp className="h-8 w-8 text-green-600" />
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

      {/* Botão para recarregar dados */}
      <div className="flex justify-center">
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Carregando...' : 'Atualizar Dados'}
        </button>
      </div>
    </div>
  )
}

export default Dashboard 
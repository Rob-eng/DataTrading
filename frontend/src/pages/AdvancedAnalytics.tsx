import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, TrendingUp, Target, Activity, Clock } from 'lucide-react';
import { api } from '../services/api';
import { Tooltip } from '../components/Tooltip';
import StatsCard from '../components/StatsCard';

interface AdvancedRiskMetrics {
  periodo_analise: {
    total_operacoes: number;
    dias_operando: number;
    primeira_operacao: string;
    ultima_operacao: string;
  };
  metricas_drawdown: {
    max_drawdown_percent: number;
    max_drawdown_duracao: number;
    drawdown_atual: number;
    interpretacao: string;
  };
  value_at_risk: {
    var_95_percent: number;
    var_99_percent: number;
    interpretacao_95: string;
    interpretacao_99: string;
  };
  ratios_performance: {
    sharpe_ratio: number;
    sortino_ratio: number;
    calmar_ratio: number;
    interpretacao_sharpe: string;
    interpretacao_sortino: string;
  };
  retornos: {
    retorno_total_percent: number;
    retorno_anualizado_percent: number;
    retorno_medio_diario: number;
    volatilidade_diaria: number;
  };
  analise_sequencias: {
    max_ganhos_consecutivos: number;
    max_perdas_consecutivas: number;
    streak_atual: number;
  };
}

interface SeasonalAnalysis {
  analise_mensal: {
    padrao_mensal: Array<{
      mes: number;
      mes_nome: string;
      operacoes: number;
      resultado_medio: number;
      taxa_acerto: number;
      volatilidade: number;
    }>;
  };
  analise_horaria: {
    por_hora: Array<{
      hora: number;
      hora_formatada: string;
      operacoes: number;
      resultado_medio: number;
      taxa_acerto: number;
      volatilidade: number;
    }>;
  };
  insights: {
    melhores_meses: Array<{ mes: string; resultado: number }>;
    melhores_horarios: Array<{ hora: string; resultado: number }>;
    melhores_dias_semana: Array<{ dia: string; resultado: number }>;
  };
}

interface DistributionAnalysis {
  distribuicao_completa: {
    estatisticas_basicas: {
      media: number;
      mediana: number;
      desvio_padrao: number;
      minimo: number;
      maximo: number;
      amplitude: number;
    };
    assimetria_curtose: {
      skewness: number;
      kurtosis: number;
      interpretacao_skew: string;
      interpretacao_kurtosis: string;
    };
    teste_normalidade: {
      eh_normal: boolean;
      interpretacao: string;
      p_value: number;
    };
    histograma: Array<{
      faixa: string;
      frequencia: number;
      percentual: number;
    }>;
    outliers: {
      quantidade: number;
      percentual: number;
    };
  };
  percentis: Record<string, number>;
  analise_clustering: {
    sequencias_ganho: {
      total: number;
      media: number;
      maxima: number;
    };
    sequencias_perda: {
      total: number;
      media: number;
      maxima: number;
    };
  };
}

const AdvancedAnalytics: React.FC = () => {
  const [riskMetrics, setRiskMetrics] = useState<AdvancedRiskMetrics | null>(null);
  const [seasonalAnalysis, setSeasonalAnalysis] = useState<SeasonalAnalysis | null>(null);
  const [distributionAnalysis, setDistributionAnalysis] = useState<DistributionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRobot, setSelectedRobot] = useState<number | null>(null);
  const [robots, setRobots] = useState<Array<{ id: number; nome: string }>>([]);
  const [activeTab, setActiveTab] = useState<'risk' | 'seasonal' | 'distribution'>('risk');

  useEffect(() => {
    loadRobots();
    loadAdvancedAnalytics();
  }, [selectedRobot]);

  const loadRobots = async () => {
    try {
      const response = await api.get('/api/v1/robos');
      setRobots(response.data);
    } catch (err) {
      console.error('Erro ao carregar robôs:', err);
    }
  };

  const loadAdvancedAnalytics = async () => {
    setLoading(true);
    try {
      const params = selectedRobot ? { robo_id: selectedRobot } : {};
      
      const [riskResponse, seasonalResponse, distributionResponse] = await Promise.all([
        api.get('/api/v1/analytics-advanced/metricas-risco-avancadas', { params }),
        api.get('/api/v1/analytics-advanced/analise-sazonal', { params }),
        api.get('/api/v1/analytics-advanced/distribuicao-retornos', { params })
      ]);

      setRiskMetrics(riskResponse.data);
      setSeasonalAnalysis(seasonalResponse.data);
      setDistributionAnalysis(distributionResponse.data);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar analytics avançados:', err);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number) => {
    return value.toFixed(2);
  };

  const getRiskColor = (ratio: number, threshold: number = 1) => {
    if (ratio >= threshold * 2) return 'text-green-600';
    if (ratio >= threshold) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-center">
          <p>{error}</p>
          <button 
            onClick={loadAdvancedAnalytics}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Analytics Avançados</h1>
        <p className="text-gray-600">Métricas profissionais de risco, sazonalidade e distribuição de retornos</p>
      </div>

      {/* Seletor de Robô */}
      <div className="mb-6 flex gap-4 items-center">
        <label className="text-sm font-medium text-gray-700">Análise:</label>
        <select
          value={selectedRobot || ''}
          onChange={(e) => setSelectedRobot(e.target.value ? Number(e.target.value) : null)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os Robôs (Portfolio)</option>
          {robots.map((robot) => (
            <option key={robot.id} value={robot.id}>
              {robot.nome || `Robô ${robot.id}`}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('risk')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'risk'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🎯 Métricas de Risco
          </button>
          <button
            onClick={() => setActiveTab('seasonal')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'seasonal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📅 Análise Sazonal
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'distribution'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Distribuição de Retornos
          </button>
        </nav>
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === 'risk' && riskMetrics && (
        <div className="space-y-6">
          {/* Resumo do Período */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Período de Análise</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Total de Operações"
                value={riskMetrics.periodo_analise.total_operacoes.toString()}
                icon={BarChart3}
                color="blue"
              />
              <StatsCard
                title="Dias Operando"
                value={riskMetrics.periodo_analise.dias_operando.toString()}
                icon={Calendar}
                color="green"
              />
              <StatsCard
                title="Primeira Operação"
                value={new Date(riskMetrics.periodo_analise.primeira_operacao).toLocaleDateString('pt-BR')}
                icon={Target}
                color="purple"
              />
              <StatsCard
                title="Última Operação"
                value={new Date(riskMetrics.periodo_analise.ultima_operacao).toLocaleDateString('pt-BR')}
                icon={Clock}
                color="orange"
              />
            </div>
          </div>

          {/* Métricas de Drawdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📉 Análise de Drawdown
              <Tooltip content="Drawdown mede a maior perda consecutiva do capital, sendo uma métrica fundamental para avaliar o risco." />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {formatPercentage(riskMetrics.metricas_drawdown.max_drawdown_percent)}
                </div>
                <div className="text-sm text-gray-600">Drawdown Máximo</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-700">
                  {riskMetrics.metricas_drawdown.max_drawdown_duracao}
                </div>
                <div className="text-sm text-gray-600">Duração (períodos)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {formatPercentage(riskMetrics.metricas_drawdown.drawdown_atual)}
                </div>
                <div className="text-sm text-gray-600">Drawdown Atual</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-700">{riskMetrics.metricas_drawdown.interpretacao}</p>
            </div>
          </div>

          {/* Value at Risk */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              ⚠️ Value at Risk (VaR)
              <Tooltip content="VaR estima a perda máxima esperada em um período com determinado nível de confiança." />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {formatPercentage(riskMetrics.value_at_risk.var_95_percent)}
                  </div>
                  <div className="text-sm text-gray-600">VaR 95%</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{riskMetrics.value_at_risk.interpretacao_95}</p>
              </div>
              <div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {formatPercentage(riskMetrics.value_at_risk.var_99_percent)}
                  </div>
                  <div className="text-sm text-gray-600">VaR 99%</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{riskMetrics.value_at_risk.interpretacao_99}</p>
              </div>
            </div>
          </div>

          {/* Ratios de Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🏆 Ratios de Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getRiskColor(riskMetrics.ratios_performance.sharpe_ratio)}`}>
                  {formatNumber(riskMetrics.ratios_performance.sharpe_ratio)}
                </div>
                <div className="text-sm text-gray-600">Sharpe Ratio</div>
                <div className="text-xs text-gray-500 mt-1">
                  {riskMetrics.ratios_performance.interpretacao_sharpe}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getRiskColor(riskMetrics.ratios_performance.sortino_ratio)}`}>
                  {formatNumber(riskMetrics.ratios_performance.sortino_ratio)}
                </div>
                <div className="text-sm text-gray-600">Sortino Ratio</div>
                <div className="text-xs text-gray-500 mt-1">
                  {riskMetrics.ratios_performance.interpretacao_sortino}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getRiskColor(riskMetrics.ratios_performance.calmar_ratio, 0.5)}`}>
                  {formatNumber(riskMetrics.ratios_performance.calmar_ratio)}
                </div>
                <div className="text-sm text-gray-600">Calmar Ratio</div>
                <div className="text-xs text-gray-500 mt-1">Retorno/Drawdown</div>
              </div>
            </div>
          </div>

          {/* Retornos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📈 Análise de Retornos</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Retorno Total"
                value={formatPercentage(riskMetrics.retornos.retorno_total_percent)}
                icon={TrendingUp}
                color="green"
              />
              <StatsCard
                title="Retorno Anualizado"
                value={formatPercentage(riskMetrics.retornos.retorno_anualizado_percent)}
                icon={Calendar}
                color="blue"
              />
              <StatsCard
                title="Retorno Médio Diário"
                value={formatPercentage(riskMetrics.retornos.retorno_medio_diario)}
                icon={BarChart3}
                color="purple"
              />
              <StatsCard
                title="Volatilidade Diária"
                value={formatPercentage(riskMetrics.retornos.volatilidade_diaria)}
                icon={Activity}
                color="orange"
              />
            </div>
          </div>

          {/* Análise de Sequências */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🔄 Análise de Sequências</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {riskMetrics.analise_sequencias.max_ganhos_consecutivos}
                </div>
                <div className="text-sm text-gray-600">Máximo Ganhos Consecutivos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {riskMetrics.analise_sequencias.max_perdas_consecutivas}
                </div>
                <div className="text-sm text-gray-600">Máximo Perdas Consecutivas</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${riskMetrics.analise_sequencias.streak_atual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {riskMetrics.analise_sequencias.streak_atual}
                </div>
                <div className="text-sm text-gray-600">Sequência Atual</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Sazonal */}
      {activeTab === 'seasonal' && seasonalAnalysis && (
        <div className="space-y-6">
          {/* Insights Rápidos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🔍 Insights Sazonais</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Melhores Meses</h3>
                {seasonalAnalysis.insights.melhores_meses.slice(0, 3).map((item, index) => (
                  <div key={index} className="text-sm">
                    {item.mes}: {formatNumber(item.resultado)} pts
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Melhores Horários</h3>
                {seasonalAnalysis.insights.melhores_horarios.slice(0, 3).map((item, index) => (
                  <div key={index} className="text-sm">
                    {item.hora}: {formatNumber(item.resultado)} pts
                  </div>
                ))}
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">Melhores Dias</h3>
                {seasonalAnalysis.insights.melhores_dias_semana.slice(0, 3).map((item, index) => (
                  <div key={index} className="text-sm">
                    {item.dia}: {formatNumber(item.resultado)} pts
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Análise Mensal */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📅 Performance por Mês</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mês</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operações</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resultado Médio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxa Acerto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volatilidade</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {seasonalAnalysis.analise_mensal.padrao_mensal.map((month) => (
                    <tr key={month.mes}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {month.mes_nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {month.operacoes}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        month.resultado_medio >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatNumber(month.resultado_medio)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPercentage(month.taxa_acerto)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatNumber(month.volatilidade)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Análise por Hora */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🕐 Performance por Horário</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {seasonalAnalysis.analise_horaria.por_hora
                .filter(hour => hour.operacoes > 0)
                .map((hour) => (
                  <div key={hour.hora} className="text-center p-2 border rounded">
                    <div className="text-xs text-gray-500">{hour.hora_formatada}</div>
                    <div className={`font-semibold ${hour.resultado_medio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatNumber(hour.resultado_medio)}
                    </div>
                    <div className="text-xs text-gray-400">{hour.operacoes} ops</div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Distribuição */}
      {activeTab === 'distribution' && distributionAnalysis && (
        <div className="space-y-6">
          {/* Estatísticas Básicas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Estatísticas Básicas</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatsCard
                title="Média"
                value={formatNumber(distributionAnalysis.distribuicao_completa.estatisticas_basicas.media)}
                icon={BarChart3}
                color="blue"
              />
              <StatsCard
                title="Mediana"
                value={formatNumber(distributionAnalysis.distribuicao_completa.estatisticas_basicas.mediana)}
                icon={Target}
                color="green"
              />
              <StatsCard
                title="Desvio Padrão"
                value={formatNumber(distributionAnalysis.distribuicao_completa.estatisticas_basicas.desvio_padrao)}
                icon={TrendingUp}
                color="purple"
              />
              <StatsCard
                title="Mínimo"
                value={formatNumber(distributionAnalysis.distribuicao_completa.estatisticas_basicas.minimo)}
                icon={Activity}
                color="orange"
              />
              <StatsCard
                title="Máximo"
                value={formatNumber(distributionAnalysis.distribuicao_completa.estatisticas_basicas.maximo)}
                icon={TrendingUp}
                color="cyan"
              />
              <StatsCard
                title="Amplitude"
                value={formatNumber(distributionAnalysis.distribuicao_completa.estatisticas_basicas.amplitude)}
                icon={Activity}
                color="emerald"
              />
            </div>
          </div>

          {/* Assimetria e Curtose */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🔍 Análise de Forma da Distribuição</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Assimetria (Skewness)</h3>
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {formatNumber(distributionAnalysis.distribuicao_completa.assimetria_curtose.skewness)}
                </div>
                <p className="text-sm text-gray-600">
                  {distributionAnalysis.distribuicao_completa.assimetria_curtose.interpretacao_skew}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Curtose (Kurtosis)</h3>
                <div className="text-2xl font-bold text-purple-600 mb-2">
                  {formatNumber(distributionAnalysis.distribuicao_completa.assimetria_curtose.kurtosis)}
                </div>
                <p className="text-sm text-gray-600">
                  {distributionAnalysis.distribuicao_completa.assimetria_curtose.interpretacao_kurtosis}
                </p>
              </div>
            </div>
          </div>

          {/* Teste de Normalidade */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🧪 Teste de Normalidade</h2>
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${
                distributionAnalysis.distribuicao_completa.teste_normalidade.eh_normal ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div>
                <div className="font-semibold">
                  {distributionAnalysis.distribuicao_completa.teste_normalidade.interpretacao}
                </div>
                <div className="text-sm text-gray-500">
                  p-value: {distributionAnalysis.distribuicao_completa.teste_normalidade.p_value.toFixed(4)}
                </div>
              </div>
            </div>
          </div>

          {/* Histograma */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Distribuição de Frequência</h2>
            <div className="space-y-2">
              {distributionAnalysis.distribuicao_completa.histograma.map((bin, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-24 text-xs text-gray-600">{bin.faixa}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                    <div 
                      className="bg-blue-500 h-4 rounded-full"
                      style={{ width: `${bin.percentual}%` }}
                    ></div>
                  </div>
                  <div className="w-12 text-xs text-gray-600">{bin.percentual}%</div>
                  <div className="w-8 text-xs text-gray-500">({bin.frequencia})</div>
                </div>
              ))}
            </div>
          </div>

          {/* Outliers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">⚠️ Análise de Outliers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard
                title="Quantidade de Outliers"
                value={distributionAnalysis.distribuicao_completa.outliers.quantidade.toString()}
                icon={Target}
                color="orange"
              />
              <StatsCard
                title="Percentual de Outliers"
                value={formatPercentage(distributionAnalysis.distribuicao_completa.outliers.percentual)}
                icon={BarChart3}
                color="orange"
              />
            </div>
          </div>

          {/* Análise de Sequências */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🔄 Análise de Clustering</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-800 mb-2">Sequências de Ganho</h3>
                <div className="space-y-2">
                  <div>Total: {distributionAnalysis.analise_clustering.sequencias_ganho.total}</div>
                  <div>Média: {formatNumber(distributionAnalysis.analise_clustering.sequencias_ganho.media)}</div>
                  <div>Máxima: {distributionAnalysis.analise_clustering.sequencias_ganho.maxima}</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-red-800 mb-2">Sequências de Perda</h3>
                <div className="space-y-2">
                  <div>Total: {distributionAnalysis.analise_clustering.sequencias_perda.total}</div>
                  <div>Média: {formatNumber(distributionAnalysis.analise_clustering.sequencias_perda.media)}</div>
                  <div>Máxima: {distributionAnalysis.analise_clustering.sequencias_perda.maxima}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalytics; 
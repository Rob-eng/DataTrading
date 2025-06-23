import React, { useMemo, useState } from 'react';
import { Operacao } from '../services/api';
import { useTradingContext } from '../App';
import { 
  EquityCurve, 
  SimpleBarChart, 
  SimplePieChart,
  OperationsScatterChart,
  DailyEvolutionChart,
  MultiEquityCurveChart
} from './Charts';
import { ChartModal } from './ChartModal';
import { Tooltip, INDICATOR_EXPLANATIONS } from './Tooltip';
import { Maximize2, TrendingUp, TrendingDown, BarChart3, Activity, Table, ChevronDown, ChevronUp } from 'lucide-react';

interface AnalyticsDisplayProps {
  operations: Operacao[];
  p80?: number;
  advancedMetrics?: any;
}

export const AnalyticsDisplay: React.FC<AnalyticsDisplayProps> = ({ operations, p80 = 0, advancedMetrics }) => {
  const { availableRobots, contractsPerRobot, totalMargin } = useTradingContext();
  
  // Configuração fixa do valor por ponto (pode ser movida para o contexto depois)
  const pointValue = 0.20;

  // Estado para modal de gráficos
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
  }>({
    isOpen: false,
    title: '',
    content: null
  });

  // Estado para controlar a visibilidade da tabela de operações
  const [showOperationsTable, setShowOperationsTable] = useState(false);

  const openModal = (title: string, content: React.ReactNode) => {
    setModalState({ isOpen: true, title, content });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, title: '', content: null });
  };

  // Função para buscar o nome do robô pelo ID
  const getRobotName = (robotId: number): string => {
    const robot = availableRobots.find(r => r.id === robotId);
    return robot ? robot.nome : `Robô ${robotId}`;
  };

  const sortedOps = useMemo(() => 
    [...operations].sort((a, b) => new Date(a.data_abertura).getTime() - new Date(b.data_abertura).getTime()),
    [operations]
  );
  
  const metricas = useMemo(() => {
    if (sortedOps.length === 0) return null;
    const total_pontos = sortedOps.reduce((acc, op) => acc + (op.resultado || 0), 0);
    const total_reais = total_pontos * pointValue * contractsPerRobot;
    const retorno_percentual = totalMargin > 0 ? (total_reais / totalMargin) * 100 : 0;
    
    console.log('📊 Métricas Analytics calculadas:', {
      total_pontos,
      total_reais,
      pointValue,
      contractsPerRobot,
      totalMargin,
      retorno_percentual: retorno_percentual.toFixed(2) + '%'
    });
    
    return {
      total_operacoes: sortedOps.length,
      total_pontos,
      total_reais,
      retorno_percentual
    };
  }, [sortedOps, contractsPerRobot, pointValue, totalMargin]);

  const equityCurveData = useMemo(() => {
    let cumulative = 0;
    return sortedOps.map(op => ({ date: op.data_abertura, value: op.resultado, cumulative: cumulative += op.resultado }));
  }, [sortedOps]);

  const monthlyPerformanceData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    sortedOps.forEach(op => {
      const monthKey = new Date(op.data_abertura).toISOString().slice(0, 7);
      byMonth[monthKey] = (byMonth[monthKey] || 0) + op.resultado;
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
  }, [sortedOps]);

  const winLossDistributionData = useMemo(() => {
    const wins = sortedOps.filter(op => op.resultado > 0).length;
    return [{ label: 'Ganhos', value: wins, color: '#10b981' }, { label: 'Perdas', value: sortedOps.length - wins, color: '#ef4444' }];
  }, [sortedOps]);

  const scatterData = useMemo(() => 
    sortedOps.map(op => ({ 
      hour: new Date(op.data_abertura).getHours(), 
      minute: new Date(op.data_abertura).getMinutes(), 
      result: op.resultado,
      time: new Date(op.data_abertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    })),
    [sortedOps]
  );

  const dailyEvolutionData = useMemo(() => {
    const dailyData: { [key: string]: { time: string; cumulativeResult: number; operationResult: number }[] } = {};
    sortedOps.forEach(op => {
      const dateKey = new Date(op.data_abertura).toISOString().split('T')[0];
      if (!dailyData[dateKey]) dailyData[dateKey] = [];
      const lastCumulative = dailyData[dateKey].length > 0 ? dailyData[dateKey][dailyData[dateKey].length - 1].cumulativeResult : 0;
      dailyData[dateKey].push({ time: op.data_abertura, cumulativeResult: lastCumulative + op.resultado, operationResult: op.resultado });
    });
    return { series: dailyData };
  }, [sortedOps]);
  
  const multiEquityData = useMemo(() => {
    const byRobot: Record<string, { date: string; cumulative: number }[]> = {};
    const robotCumulative: Record<string, number> = {};
    sortedOps.forEach(op => {
        const robotName = getRobotName(op.robo_id);
        if (!byRobot[robotName]) {
            byRobot[robotName] = [];
            robotCumulative[robotName] = 0;
        }
        robotCumulative[robotName] += op.resultado;
        byRobot[robotName].push({ date: op.data_abertura, cumulative: robotCumulative[robotName] });
    });
    return byRobot;
  }, [sortedOps, getRobotName]);
  
  if (!metricas) {
    return <div className="text-center p-8">Não há dados de operações para exibir as análises.</div>;
  }

  // Componente para containers de gráficos com botão de maximizar
  const ChartContainer: React.FC<{ 
    title: string; 
    onMaximize: () => void; 
    children: React.ReactNode 
  }> = ({ title, onMaximize, children }) => (
    <div className="bg-white p-4 rounded-lg shadow relative group">
      <button
        onClick={onMaximize}
        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Expandir gráfico"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
      {children}
    </div>
  );

  // Componente da Tabela de Operações
  const OperationsTable: React.FC = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Table className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Operações Consideradas na Simulação
            </h3>
            <span className="text-sm text-gray-500">
              ({sortedOps.length} operações)
            </span>
          </div>
          <button
            onClick={() => setShowOperationsTable(!showOperationsTable)}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <span>{showOperationsTable ? 'Ocultar' : 'Mostrar'}</span>
            {showOperationsTable ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      
      {showOperationsTable && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Robô
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ativo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resultado (Pts)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resultado (R$)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acumulado (Pts)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedOps.map((op, index) => {
                const cumulativeResult = sortedOps
                  .slice(0, index + 1)
                  .reduce((acc, operation) => acc + (operation.resultado || 0), 0);
                
                const resultadoReais = (op.resultado || 0) * pointValue * contractsPerRobot;
                
                return (
                  <tr key={op.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(op.data_abertura).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getRobotName(op.robo_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {op.ativo || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {op.tipo || '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      (op.resultado || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(op.resultado || 0) >= 0 ? '+' : ''}{(op.resultado || 0).toFixed(1)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      resultadoReais >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      R$ {resultadoReais >= 0 ? '+' : ''}{resultadoReais.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      cumulativeResult >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {cumulativeResult >= 0 ? '+' : ''}{cumulativeResult.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCardWithTooltip 
          title="Resultado Total (R$)" 
          value={`R$ ${metricas.total_reais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          tooltip={INDICATOR_EXPLANATIONS.totalReais}
        />
        <StatsCardWithTooltip 
          title="Resultado Total (Pontos)" 
          value={metricas.total_pontos.toLocaleString('pt-BR')}
          tooltip={INDICATOR_EXPLANATIONS.totalPontos}
        />
        <StatsCardWithTooltip 
          title="Retorno sobre Margem" 
          value={`${metricas.retorno_percentual.toFixed(2)}%`}
          tooltip={INDICATOR_EXPLANATIONS.retornoMargem}
        />
        <StatsCardWithTooltip 
          title="Total de Operações" 
          value={metricas.total_operacoes.toString()}
          tooltip={INDICATOR_EXPLANATIONS.totalOperacoes}
        />
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {equityCurveData.length > 0 && (
            <ChartContainer 
              title="Curva de Capital (Pontos)"
              onMaximize={() => openModal("Curva de Capital (Pontos)", <EquityCurve data={equityCurveData} title="Curva de Capital (Pontos)" />)}
            >
              <EquityCurve data={equityCurveData} title="Curva de Capital (Pontos)" />
            </ChartContainer>
          )}
          {Object.keys(multiEquityData).length > 0 && (
            <ChartContainer 
              title="Curva de Capital por Robô (Pontos)"
              onMaximize={() => openModal("Curva de Capital por Robô (Pontos)", <MultiEquityCurveChart data={multiEquityData} title="Curva de Capital por Robô (Pontos)" />)}
            >
              <MultiEquityCurveChart data={multiEquityData} title="Curva de Capital por Robô (Pontos)" />
            </ChartContainer>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {scatterData.length > 0 && (
            <ChartContainer 
              title="Dispersão de Ganhos/Perdas por Horário"
              onMaximize={() => openModal("Dispersão de Ganhos/Perdas por Horário", <OperationsScatterChart data={scatterData} title="Dispersão de Ganhos/Perdas por Horário" />)}
            >
              <OperationsScatterChart data={scatterData} title="Dispersão de Ganhos/Perdas por Horário" />
            </ChartContainer>
          )}
          {Object.keys(dailyEvolutionData.series).length > 0 && (
            <ChartContainer 
              title="Evolução Diária do Saldo"
              onMaximize={() => openModal("Evolução Diária do Saldo", <DailyEvolutionChart data={dailyEvolutionData.series} title={`Evolução Diária do Saldo`} p80={p80} />)}
            >
              <DailyEvolutionChart data={dailyEvolutionData.series} title={`Evolução Diária do Saldo`} p80={p80} />
            </ChartContainer>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {monthlyPerformanceData.length > 0 && (
            <ChartContainer 
              title="Performance Mensal (Pontos)"
              onMaximize={() => openModal("Performance Mensal (Pontos)", <SimpleBarChart data={monthlyPerformanceData} title="Performance Mensal (Pontos)" />)}
            >
              <SimpleBarChart data={monthlyPerformanceData} title="Performance Mensal (Pontos)" />
            </ChartContainer>
          )}
          {winLossDistributionData.length > 0 && (
            <ChartContainer 
              title="Distribuição de Ganhos/Perdas"
              onMaximize={() => openModal("Distribuição de Ganhos/Perdas", <SimplePieChart data={winLossDistributionData} title="Distribuição de Ganhos/Perdas" />)}
            >
              <SimplePieChart data={winLossDistributionData} title="Distribuição de Ganhos/Perdas" />
            </ChartContainer>
          )}
        </div>
      </div>

      {/* Indicadores Avançados */}
      {advancedMetrics && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2" />
            Indicadores Avançados
          </h2>
          
          {/* Cards de Métricas Avançadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {advancedMetrics.metricas_drawdown && (
              <AdvancedStatsCard 
                title="Drawdown Máximo" 
                value={`${advancedMetrics.metricas_drawdown.max_drawdown_percent?.toFixed(2) || 0}%`}
                subtitle={advancedMetrics.metricas_drawdown.interpretacao}
                icon={<TrendingDown className="w-5 h-5 text-red-500" />}
                color="red"
                tooltip={INDICATOR_EXPLANATIONS.drawdown}
              />
            )}
            
            {advancedMetrics.ratios_performance && (
              <>
                <AdvancedStatsCard 
                  title="Sharpe Ratio" 
                  value={advancedMetrics.ratios_performance.sharpe_ratio?.toFixed(3) || '0.000'}
                  subtitle={advancedMetrics.ratios_performance.interpretacao_sharpe}
                  icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
                  color="blue"
                  tooltip={INDICATOR_EXPLANATIONS.sharpe}
                />
                <AdvancedStatsCard 
                  title="Sortino Ratio" 
                  value={advancedMetrics.ratios_performance.sortino_ratio?.toFixed(3) || '0.000'}
                  subtitle={advancedMetrics.ratios_performance.interpretacao_sortino}
                  icon={<Activity className="w-5 h-5 text-green-500" />}
                  color="green"
                  tooltip={INDICATOR_EXPLANATIONS.sortino}
                />
                <AdvancedStatsCard 
                  title="Calmar Ratio" 
                  value={advancedMetrics.ratios_performance.calmar_ratio?.toFixed(3) || '0.000'}
                  subtitle="Retorno anualizado / Drawdown máximo"
                  icon={<BarChart3 className="w-5 h-5 text-purple-500" />}
                  color="purple"
                  tooltip={INDICATOR_EXPLANATIONS.calmar}
                />
              </>
            )}
          </div>

          {/* Análise de Sequências */}
          {advancedMetrics.analise_sequencias && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center space-x-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Análise de Sequências</h3>
                <Tooltip content="Análise das sequências consecutivas de ganhos e perdas para entender padrões de performance." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <p className="text-2xl font-bold text-green-600">
                      {advancedMetrics.analise_sequencias.max_ganhos_consecutivos}
                    </p>
                    <Tooltip content={INDICATOR_EXPLANATIONS.maxWins} />
                  </div>
                  <p className="text-sm text-gray-600">Máximo de Ganhos Consecutivos</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <p className="text-2xl font-bold text-red-600">
                      {advancedMetrics.analise_sequencias.max_perdas_consecutivas}
                    </p>
                    <Tooltip content={INDICATOR_EXPLANATIONS.maxLosses} />
                  </div>
                  <p className="text-sm text-gray-600">Máximo de Perdas Consecutivas</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <p className="text-2xl font-bold text-blue-600">
                      {advancedMetrics.analise_sequencias.streak_atual}
                    </p>
                    <Tooltip content={INDICATOR_EXPLANATIONS.currentStreak} />
                  </div>
                  <p className="text-sm text-gray-600">Sequência Atual</p>
                </div>
              </div>
            </div>
          )}

          {/* Value at Risk */}
          {advancedMetrics.value_at_risk && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center space-x-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Value at Risk (VaR)</h3>
                <Tooltip content="Medida estatística que estima a perda máxima esperada em um determinado período com um nível de confiança específico." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center space-x-1 mb-1">
                    <p className="text-sm text-gray-600">VaR 95%</p>
                    <Tooltip content={INDICATOR_EXPLANATIONS.var95} />
                  </div>
                  <p className="text-xl font-bold text-orange-600">
                    {advancedMetrics.value_at_risk.var_95_pontos} pontos
                  </p>
                </div>
                <div>
                  <div className="flex items-center space-x-1 mb-1">
                    <p className="text-sm text-gray-600">VaR 99%</p>
                    <Tooltip content={INDICATOR_EXPLANATIONS.var99} />
                  </div>
                  <p className="text-xl font-bold text-red-600">
                    {advancedMetrics.value_at_risk.var_99_pontos} pontos
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                {advancedMetrics.value_at_risk.interpretacao_95}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tabela de Operações */}
      <OperationsTable />

      {/* Modal para gráficos em tela cheia */}
      <ChartModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
      >
        {modalState.content}
      </ChartModal>
    </div>
  );
};

const StatsCard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <p className="text-sm font-medium text-gray-600">{title}</p>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

const StatsCardWithTooltip: React.FC<{ 
  title: string; 
  value: string; 
  tooltip: string 
}> = ({ title, value, tooltip }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="flex items-center justify-between mb-1">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <Tooltip content={tooltip} />
    </div>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

const AdvancedStatsCard: React.FC<{ 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: React.ReactNode; 
  color: string;
  tooltip?: string;
}> = ({ title, value, subtitle, icon, color, tooltip }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      {icon}
    </div>
    <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
    <p className="text-xs text-gray-500">{subtitle}</p>
  </div>
); 
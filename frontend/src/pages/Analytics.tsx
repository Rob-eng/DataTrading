import React, { useState, useEffect } from 'react';
import { AnalyticsDisplay } from '../components/AnalyticsDisplay';
import apiService, { Operacao } from '../services/api';
import { useTradingContext } from '../App';

const Analytics: React.FC = () => {
  const { availableRobots, selectedRobotIds, contractsPerRobot, riskProfile, totalMargin } = useTradingContext();
  
  // Configuração fixa do valor por ponto (pode ser movida para o contexto depois)
  const pointValue = 0.20;

  const [operations, setOperations] = useState<Operacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advancedMetrics, setAdvancedMetrics] = useState<any>(null);
  const [p80Value, setP80Value] = useState<number>(0);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedRobotIds, contractsPerRobot, riskProfile, totalMargin]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Usar robôs selecionados ou todos se nenhum estiver selecionado
      const robotsToUse = selectedRobotIds.size > 0 ? Array.from(selectedRobotIds) : availableRobots.map(r => r.id);
      
      if (robotsToUse.length === 0) {
        throw new Error('Nenhum robô disponível para análise');
      }

      const robotIds = robotsToUse.join(',');

      console.log('🔍 Buscando dados de analytics para robôs:', robotIds);
      console.log('⚙️ Configurações:', { contractsPerRobot, totalMargin, pointValue });

      // Buscar operações e dados principais
      const [ops, advancedData, p80Data] = await Promise.all([
        apiService.getOperacoes('oficial', 0, 100000, robotIds),
        apiService.getAdvancedRiskMetrics(robotIds, 'oficial'),
        apiService.getDailyPeakP80(robotIds)
      ]);

      setOperations(ops);
      setAdvancedMetrics(advancedData);
      setP80Value(p80Data || 0);

      console.log('✅ Dados de analytics carregados com sucesso');
    } catch (err) {
      console.error('❌ Erro ao carregar analytics:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={fetchAnalyticsData}
          className="mt-2 btn-primary"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Avançado</h1>
        <div className="text-sm text-gray-600">
          {selectedRobotIds.size > 0 ? selectedRobotIds.size : availableRobots.length} robô(s) • 
          {contractsPerRobot} contrato(s) • R$ {totalMargin.toLocaleString('pt-BR')} margem
        </div>
      </div>

      <AnalyticsDisplay 
        operations={operations}
        advancedMetrics={advancedMetrics}
        p80={p80Value}
      />
    </div>
  );
};

export default Analytics; 
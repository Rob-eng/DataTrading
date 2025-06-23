import React, { useState, useEffect } from 'react';
import { useTradingContext, Robot } from '../App';
import { apiService, Robo, Operacao } from '../services/api';
import { SlidersHorizontal, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { AnalyticsDisplay } from '../components/AnalyticsDisplay';

interface RobotConfig {
  stopLoss: string;
  takeProfit: string;
  startTime: string;
  endTime: string;
  weekdays: number[];
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const defaultWeekdays = [1, 2, 3, 4, 5];
const defaultRobotConfig: RobotConfig = {
  stopLoss: '',
  takeProfit: '',
  startTime: '09:00',
  endTime: '18:00',
  weekdays: defaultWeekdays,
  startDate: '',
  endDate: '',
  isActive: true,
};

const RobotConfigRow: React.FC<{
  robot: Robot;
  config: RobotConfig;
  onConfigChange: (robotId: number, field: keyof RobotConfig, value: any) => void;
  onToggleExpanded: (robotId: number) => void;
  isExpanded: boolean;
}> = ({ robot, config, onConfigChange, onToggleExpanded, isExpanded }) => {
  const weekdayOptions = [
    { label: 'Seg', value: 1 }, { label: 'Ter', value: 2 }, { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 }, { label: 'Sex', value: 5 }
  ];

  // Debug: Log quando o componente renderiza
  useEffect(() => {
    console.log(`🔍 RobotConfigRow renderizado para ${robot.nome}:`, {
      robotId: robot.id,
      config: config,
      isExpanded: isExpanded
    });
  }, [robot.id, config, isExpanded]);

  return (
    <div className={`p-4 border rounded-lg ${config.isActive ? 'bg-white' : 'bg-gray-100 opacity-70'}`}>
      <div className="flex justify-between items-center cursor-pointer" onClick={() => {
        console.log(`🔧 Alternando expansão para robô ${robot.nome} (ID: ${robot.id})`);
        onToggleExpanded(robot.id);
      }}>
        <div className="flex items-center gap-4">
            <input 
              type="checkbox" 
              checked={config.isActive} 
              onChange={(e) => onConfigChange(robot.id, 'isActive', e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="font-semibold text-lg text-gray-800">{robot.nome}</span>
        </div>
        <button>
          {isExpanded ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Financeiro (Pontos)</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input 
                  type="number" 
                  placeholder="Stop Loss" 
                  value={config.stopLoss} 
                  onChange={(e) => {
                    console.log(`Stop Loss alterado para robô ${robot.id}: ${e.target.value}`);
                    onConfigChange(robot.id, 'stopLoss', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  min="0"
                  step="1"
                />
                <label className="text-xs text-gray-500 mt-1">Stop Loss</label>
              </div>
              <div className="flex-1">
                <input 
                  type="number" 
                  placeholder="Take Profit" 
                  value={config.takeProfit} 
                  onChange={(e) => {
                    console.log(`Take Profit alterado para robô ${robot.id}: ${e.target.value}`);
                    onConfigChange(robot.id, 'takeProfit', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  min="0"
                  step="1"
                />
                <label className="text-xs text-gray-500 mt-1">Take Profit</label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Intervalo de Datas</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input 
                  type="date" 
                  value={config.startDate} 
                  onChange={(e) => {
                    console.log(`Data início alterada para robô ${robot.id}: ${e.target.value}`);
                    onConfigChange(robot.id, 'startDate', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <label className="text-xs text-gray-500 mt-1">Data Início</label>
              </div>
              <div className="flex-1">
                <input 
                  type="date" 
                  value={config.endDate} 
                  onChange={(e) => {
                    console.log(`Data fim alterada para robô ${robot.id}: ${e.target.value}`);
                    onConfigChange(robot.id, 'endDate', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <label className="text-xs text-gray-500 mt-1">Data Fim</label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Horário de Operação</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input 
                  type="time" 
                  value={config.startTime} 
                  onChange={(e) => {
                    console.log(`Horário início alterado para robô ${robot.id}: ${e.target.value}`);
                    onConfigChange(robot.id, 'startTime', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <label className="text-xs text-gray-500 mt-1">Início</label>
              </div>
              <div className="flex-1">
                <input 
                  type="time" 
                  value={config.endTime} 
                  onChange={(e) => {
                    console.log(`Horário fim alterado para robô ${robot.id}: ${e.target.value}`);
                    onConfigChange(robot.id, 'endTime', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <label className="text-xs text-gray-500 mt-1">Fim</label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Dias da Semana</label>
            <div className="flex gap-1 flex-wrap">
              {weekdayOptions.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`Dia da semana ${day.label} clicado para robô ${robot.id}`);
                    const weekdays = config.weekdays.includes(day.value)
                      ? config.weekdays.filter(d => d !== day.value)
                      : [...config.weekdays, day.value];
                    onConfigChange(robot.id, 'weekdays', weekdays.sort());
                  }}
                  className={`py-1 px-3 text-sm rounded-full border-2 transition-colors cursor-pointer ${
                    config.weekdays.includes(day.value) 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-transparent border-gray-300 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500">
              Selecionados: {config.weekdays.map(d => weekdayOptions.find(opt => opt.value === d)?.label).join(', ')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Simulation: React.FC = () => {
  const { 
    availableRobots
  } = useTradingContext();
  const [robotConfigs, setRobotConfigs] = useState<Record<string, RobotConfig>>({});
  const [simulatedOps, setSimulatedOps] = useState<Operacao[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRobots, setExpandedRobots] = useState<Set<number>>(new Set());
  const [advancedMetrics, setAdvancedMetrics] = useState<any>(null);
  const [p80Value, setP80Value] = useState<number>(0);

  // Inicializar configurações dos robôs
  useEffect(() => {
    console.log('🚀 Inicializando configurações dos robôs...');
    console.log('📊 Robôs disponíveis:', availableRobots);
    
    const initialConfigs: Record<string, RobotConfig> = {};
    availableRobots.forEach((robot) => {
      const robotKey = robot.id.toString();
      initialConfigs[robotKey] = { ...defaultRobotConfig };
      console.log(`🤖 Configuração inicial para robô ${robot.nome} (ID: ${robotKey}):`, initialConfigs[robotKey]);
    });
    
    console.log('📝 Configurações iniciais completas:', initialConfigs);
    setRobotConfigs(initialConfigs);
  }, [availableRobots]);

  // Função para buscar métricas avançadas
  const fetchAdvancedMetrics = async (robotIds: string[]) => {
    try {
      console.log('🔍 Buscando métricas avançadas para simulação...');
      
      // Buscar métricas avançadas
      const advancedData = await apiService.getAdvancedRiskMetrics(robotIds.join(','), 'oficial');
      console.log('📊 Métricas avançadas recebidas:', advancedData);
      setAdvancedMetrics(advancedData);

      // Buscar P80
      const p80Data = await apiService.getDailyPeakP80(robotIds.join(','));
      console.log('📈 P80 recebido:', p80Data);
      setP80Value(p80Data || 0);
      
    } catch (error) {
      console.error('❌ Erro ao buscar métricas avançadas:', error);
      setAdvancedMetrics(null);
      setP80Value(0);
    }
  };

  const handleConfigChange = (robotId: number, field: keyof RobotConfig, value: any) => {
    console.log(`🔧 Alterando configuração do robô ${robotId}: ${field} = ${value}`);
    setRobotConfigs(prev => {
      const currentConfig = prev[robotId.toString()] || { ...defaultRobotConfig };
      const newConfig = {
        ...currentConfig,
        [field]: value
      };
      console.log(`📝 Nova configuração para robô ${robotId}:`, newConfig);
      return {
        ...prev,
        [robotId.toString()]: newConfig
      };
    });
  };

  const toggleExpanded = (robotId: number) => {
    setExpandedRobots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(robotId)) {
        newSet.delete(robotId);
      } else {
        newSet.add(robotId);
      }
      return newSet;
    });
  };

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🎯 Iniciando simulação com configurações:', robotConfigs);
      
      // Filtrar apenas robôs ativos
      const activeConfigs = Object.entries(robotConfigs)
        .filter(([_, config]) => config.isActive)
        .reduce((acc, [robotId, config]) => {
          acc[robotId] = config;
          return acc;
        }, {} as Record<string, RobotConfig>);
      
      if (Object.keys(activeConfigs).length === 0) {
        throw new Error('Nenhum robô ativo selecionado para simulação');
      }
      
      console.log('🤖 Robôs ativos para simulação:', Object.keys(activeConfigs));
      
      // Chamar API de simulação
      const results = await apiService.simulatePerRobot(activeConfigs);
      console.log('✅ Resultados da simulação recebidos:', results);
      
      setSimulatedOps(results);
      
      // Buscar métricas avançadas para os robôs simulados
      await fetchAdvancedMetrics(Object.keys(activeConfigs));
      
    } catch (err) {
      console.error('❌ Erro na simulação:', err);
      setError(err instanceof Error ? err.message : 'Erro na simulação');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSimulatedOps(null);
    setAdvancedMetrics(null);
    setP80Value(0);
    setError(null);
  };

  const toggleAllRobots = (active: boolean) => {
    const newConfigs = { ...robotConfigs };
    Object.keys(newConfigs).forEach(robotId => {
      newConfigs[robotId].isActive = active;
    });
    setRobotConfigs(newConfigs);
  };

  const activeRobotsCount = Object.values(robotConfigs).filter(config => config.isActive).length;
  
  // Verificar se há configurações personalizadas
  const hasCustomConfigs = Object.values(robotConfigs).some(config => 
    config.stopLoss !== '' || 
    config.takeProfit !== '' || 
    config.startTime !== '09:00' || 
    config.endTime !== '18:00' || 
    config.weekdays.length !== 5
  );

  // Debug: Log do estado atual
  useEffect(() => {
    console.log('📊 Estado atual das configurações dos robôs:', robotConfigs);
    console.log('🔢 Número de robôs ativos:', activeRobotsCount);
    console.log('⚙️ Tem configurações personalizadas:', hasCustomConfigs);
    console.log('📋 Robôs expandidos:', Array.from(expandedRobots));
  }, [robotConfigs, activeRobotsCount, hasCustomConfigs, expandedRobots]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Simulação de Trading</h1>
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-gray-600">
            {activeRobotsCount} de {availableRobots.length} robôs ativos
          </span>
          {hasCustomConfigs && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
              ⚙️ Configurações personalizadas
            </span>
          )}
        </div>
      </div>

      {/* Configuração de Simulação */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Configuração de Simulação</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => toggleAllRobots(true)}
              className="btn-secondary text-sm"
            >
              Marcar Todos
            </button>
            <button
              onClick={() => toggleAllRobots(false)}
              className="btn-secondary text-sm"
            >
              Desmarcar Todos
            </button>
          </div>
        </div>
        
        {/* Configuração Global para Replicar */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 className="text-md font-semibold text-gray-800 mb-3">Configuração Global (aplicar a todos os robôs)</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Stop Loss e Take Profit */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Financeiro (Pontos)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Stop Loss"
                  id="global-stop-loss"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  min="0"
                  step="1"
                />
                <input
                  type="number"
                  placeholder="Take Profit"
                  id="global-take-profit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  min="0"
                  step="1"
                />
              </div>
            </div>
            
            {/* Intervalo de Datas */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Intervalo de Datas</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  id="global-start-date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <input
                  type="date"
                  id="global-end-date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="text-xs text-gray-500">
                Deixe vazio para usar todos os dados
              </div>
            </div>
            
            {/* Horários */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Horário de Operação</label>
              <div className="flex gap-2">
                <input
                  type="time"
                  id="global-start-time"
                  defaultValue="09:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <input
                  type="time"
                  id="global-end-time"
                  defaultValue="18:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            
            {/* Dias da Semana */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Dias da Semana</label>
              <div className="flex gap-1 flex-wrap" id="global-weekdays">
                {[
                  { label: 'Seg', value: 1 }, { label: 'Ter', value: 2 }, { label: 'Qua', value: 3 },
                  { label: 'Qui', value: 4 }, { label: 'Sex', value: 5 }
                ].map(day => (
                  <button
                    key={day.value}
                    type="button"
                    data-day={day.value}
                    onClick={(e) => {
                      const button = e.target as HTMLButtonElement;
                      button.classList.toggle('bg-blue-600');
                      button.classList.toggle('border-blue-600');
                      button.classList.toggle('text-white');
                      button.classList.toggle('bg-transparent');
                      button.classList.toggle('border-gray-300');
                      button.classList.toggle('text-gray-700');
                    }}
                    className="py-1 px-3 text-sm rounded-full border-2 transition-colors cursor-pointer bg-blue-600 border-blue-600 text-white"
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Botão Aplicar */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Aplicar Configuração</label>
              <button
                onClick={() => {
                  const stopLoss = (document.getElementById('global-stop-loss') as HTMLInputElement)?.value || '';
                  const takeProfit = (document.getElementById('global-take-profit') as HTMLInputElement)?.value || '';
                  const startDate = (document.getElementById('global-start-date') as HTMLInputElement)?.value || '';
                  const endDate = (document.getElementById('global-end-date') as HTMLInputElement)?.value || '';
                  const startTime = (document.getElementById('global-start-time') as HTMLInputElement)?.value || '09:00';
                  const endTime = (document.getElementById('global-end-time') as HTMLInputElement)?.value || '18:00';
                  
                  // Coletar dias selecionados
                  const weekdayButtons = document.querySelectorAll('#global-weekdays button');
                  const selectedWeekdays: number[] = [];
                  weekdayButtons.forEach(button => {
                    if (button.classList.contains('bg-blue-600')) {
                      selectedWeekdays.push(parseInt(button.getAttribute('data-day') || '0'));
                    }
                  });
                  
                  const globalConfig = {
                    stopLoss,
                    takeProfit,
                    startDate,
                    endDate,
                    startTime,
                    endTime,
                    weekdays: selectedWeekdays.length > 0 ? selectedWeekdays : [1, 2, 3, 4, 5],
                    isActive: true,
                  };
                  
                  console.log('🌐 Aplicando configuração global:', globalConfig);
                  
                  const newConfigs: Record<string, RobotConfig> = {};
                  availableRobots.forEach((robot) => {
                    newConfigs[robot.id.toString()] = { ...globalConfig };
                  });
                  setRobotConfigs(newConfigs);
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Aplicar a Todos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Robôs */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Configuração por Robô ({availableRobots.length} robôs)
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                console.log('🔧 Expandindo todos os robôs...');
                console.log('📊 IDs dos robôs disponíveis:', availableRobots.map(r => r.id));
                const allRobotIds = new Set(availableRobots.map(r => r.id));
                console.log('📋 Novo conjunto expandido:', allRobotIds);
                setExpandedRobots(allRobotIds);
              }}
              className="btn-secondary text-sm"
            >
              Expandir Todos
            </button>
            <button
              onClick={() => {
                console.log('🔧 Recolhendo todos os robôs...');
                setExpandedRobots(new Set());
              }}
              className="btn-secondary text-sm"
            >
              Recolher Todos
            </button>
          </div>
        </div>
        
        {availableRobots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Nenhum robô disponível para simulação</p>
          </div>
        ) : Object.keys(robotConfigs).length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando configurações dos robôs...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableRobots.map((robot) => {
              const robotConfig = robotConfigs[robot.id.toString()];
              console.log(`🔍 Renderizando robô ${robot.nome} com config:`, robotConfig);
              return (
                <RobotConfigRow
                  key={robot.id}
                  robot={robot}
                  config={robotConfig || defaultRobotConfig}
                  onConfigChange={handleConfigChange}
                  onToggleExpanded={toggleExpanded}
                  isExpanded={expandedRobots.has(robot.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={handleSimulate}
          disabled={loading || activeRobotsCount === 0}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Simulando...</span>
            </>
          ) : (
            <>
              <SlidersHorizontal className="h-4 w-4" />
              <span>Executar Simulação</span>
            </>
          )}
        </button>
        
        {simulatedOps && (
          <button
            onClick={handleReset}
            className="btn-secondary"
          >
            Limpar Resultados
          </button>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Resultados da Simulação */}
      {simulatedOps && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Resultados da Simulação</h2>
            <div className="text-sm text-gray-600">
              {simulatedOps.length} operações simuladas
            </div>
          </div>
          
          {/* Analytics Display com resultados */}
          <AnalyticsDisplay 
            operations={simulatedOps}
            advancedMetrics={advancedMetrics}
            p80={p80Value}
          />
        </div>
      )}
    </div>
  );
};

export default Simulation;
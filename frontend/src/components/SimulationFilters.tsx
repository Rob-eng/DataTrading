import React from 'react';

export interface SimulationParams {
  stopLoss: string;
  takeProfit: string;
  startTime: string;
  endTime: string;
  weekdays: number[];
}

interface SimulationFiltersProps {
  params: SimulationParams;
  setParams: (params: SimulationParams) => void;
  onSimulate: () => void;
  onReset: () => void;
  loading: boolean;
}

const weekdayOptions = [
  { label: 'S', value: 1, name: 'Segunda' },
  { label: 'T', value: 2, name: 'Terça' },
  { label: 'Q', value: 3, name: 'Quarta' },
  { label: 'Q', value: 4, name: 'Quinta' },
  { label: 'S', value: 5, name: 'Sexta' },
];

export const SimulationFilters: React.FC<SimulationFiltersProps> = ({ params, setParams, onSimulate, onReset, loading }) => {
  
  const handleValueChange = (field: keyof SimulationParams, value: string) => {
    setParams({ ...params, [field]: value });
  };

  const handleWeekdayToggle = (value: number) => {
    const newWeekdays = params.weekdays.includes(value)
      ? params.weekdays.filter(d => d !== value)
      : [...params.weekdays, value];
    setParams({ ...params, weekdays: newWeekdays.sort() });
  };

  return (
    <div className="p-6 bg-gray-50 rounded-lg border shadow-sm">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Parâmetros de Simulação</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
        
        <div className="space-y-2">
          <label htmlFor="stopLoss" className="block text-sm font-medium text-gray-700">Stop Loss (pontos)</label>
          <input 
            id="stopLoss"
            type="number"
            value={params.stopLoss}
            onChange={(e) => handleValueChange('stopLoss', e.target.value)}
            placeholder="Ex: 50"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="takeProfit" className="block text-sm font-medium text-gray-700">Take Profit (pontos)</label>
          <input 
            id="takeProfit"
            type="number"
            value={params.takeProfit}
            onChange={(e) => handleValueChange('takeProfit', e.target.value)}
            placeholder="Ex: 100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Horário de Operação</label>
          <div className="flex gap-2">
              <input 
                  id="startTime"
                  type="time"
                  value={params.startTime}
                  onChange={(e) => handleValueChange('startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                  id="endTime"
                  type="time"
                  value={params.endTime}
                  onChange={(e) => handleValueChange('endTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Dias da Semana</label>
          <div className="flex flex-wrap gap-1">
            {weekdayOptions.map(day => (
              <button
                key={day.value}
                onClick={() => handleWeekdayToggle(day.value)}
                aria-label={day.name}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-grow ${
                  params.weekdays.includes(day.value)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onReset} disabled={loading} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 transition-colors">
          Resetar
        </button>
        <button onClick={onSimulate} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
          {loading ? 'Simulando...' : 'Aplicar Simulação'}
        </button>
      </div>
    </div>
  );
}; 
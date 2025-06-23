import React from 'react';
import { Settings, Bell, UserCircle } from 'lucide-react';
import { useTradingContext } from '../App';

const Header: React.FC = () => {
  const { 
    selectedRobotIds, 
    contractsPerRobot, 
    riskProfile, 
    openConfigModal 
  } = useTradingContext();

  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Dashboard de Performance</h1>
        <p className="text-sm text-gray-500">
          Analisando {selectedRobotIds.size} robôs | {contractsPerRobot} Contratos/Robô | Perfil {riskProfile}
        </p>
      </div>
      <div className="flex items-center space-x-4">
        <button 
          onClick={openConfigModal} 
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Settings size={20} />
          <span>Configurações</span>
        </button>
        <Bell className="text-gray-500 hover:text-gray-700 cursor-pointer" size={20} />
        <UserCircle className="text-gray-500 hover:text-gray-700 cursor-pointer" size={24} />
      </div>
    </header>
  );
};

export default Header; 
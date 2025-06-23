import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Operations from './pages/Operations';
import Robots from './pages/Robots';
import Upload from './pages/Upload';
import Simulation from './pages/Simulation';

// Interfaces
export interface Robot {
  id: number;
  nome: string;
  total_operacoes?: number;
  lucro_liquido?: number;
  win_rate?: number;
  drawdown?: number;
  sharpe_ratio?: number;
  profit_factor?: number;
  max_consecutive_wins?: number;
  max_consecutive_losses?: number;
}

export interface RiskProfile {
  label: string;
  marginPerContract: number;
}

export const riskProfiles: { [key: string]: RiskProfile } = {
  conservador: { label: 'Conservador', marginPerContract: 1000 },
  moderado: { label: 'Moderado', marginPerContract: 500 },
  agressivo: { label: 'Agressivo', marginPerContract: 300 }
};

// Context
interface TradingContextType {
  availableRobots: Robot[];
  selectedRobotIds: Set<number>;
  contractsPerRobot: number;
  riskProfile: string;
  totalMargin: number;
  isConfigModalOpen: boolean;
  setAvailableRobots: (robots: Robot[]) => void;
  setSelectedRobotIds: (ids: Set<number>) => void;
  setContractsPerRobot: (contracts: number) => void;
  setRiskProfile: (profile: string) => void;
  openConfigModal: () => void;
  closeConfigModal: () => void;
  selectAllRobots: () => void;
  deselectAllRobots: () => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const useTradingContext = () => {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }
  return context;
};

// Provider
interface TradingProviderProps {
  children: ReactNode;
}

const TradingProvider: React.FC<TradingProviderProps> = ({ children }) => {
  const [availableRobots, setAvailableRobots] = useState<Robot[]>([]);
  const [selectedRobotIds, setSelectedRobotIds] = useState<Set<number>>(new Set());
  const [contractsPerRobot, setContractsPerRobot] = useState<number>(5);
  const [riskProfile, setRiskProfile] = useState<string>('conservador');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  const totalMargin = selectedRobotIds.size * contractsPerRobot * riskProfiles[riskProfile].marginPerContract;

  useEffect(() => {
    if (availableRobots.length > 0 && selectedRobotIds.size === 0) {
      console.log('🤖 Selecionando automaticamente todos os robôs:', availableRobots.map(r => r.nome));
      setSelectedRobotIds(new Set(availableRobots.map(robot => robot.id)));
    }
  }, [availableRobots, selectedRobotIds.size]);

  const openConfigModal = () => setIsConfigModalOpen(true);
  const closeConfigModal = () => setIsConfigModalOpen(false);

  const selectAllRobots = () => {
    setSelectedRobotIds(new Set(availableRobots.map(robot => robot.id)));
  };

  const deselectAllRobots = () => {
    setSelectedRobotIds(new Set());
  };

  return (
    <TradingContext.Provider value={{
      availableRobots,
      selectedRobotIds,
      contractsPerRobot,
      riskProfile,
      totalMargin,
      isConfigModalOpen,
      setAvailableRobots,
      setSelectedRobotIds,
      setContractsPerRobot,
      setRiskProfile,
      openConfigModal,
      closeConfigModal,
      selectAllRobots,
      deselectAllRobots
    }}>
      {children}
    </TradingContext.Provider>
  );
};

// App Component
const App: React.FC = () => {
  return (
    <TradingProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/robots" element={<Robots />} />
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/upload" element={<Upload />} />
          </Routes>
        </Layout>
      </Router>
    </TradingProvider>
  );
};

export default App; 
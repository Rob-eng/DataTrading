import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useTradingContext, riskProfiles, RiskProfile } from '../App';

// --- Componente do Modal de Configuração Global ---
const GlobalTradingConfigModal: React.FC = () => {
  const {
    isConfigModalOpen,
    closeConfigModal,
    availableRobots, selectedRobotIds, contractsPerRobot,
    riskProfile, totalMargin, setSelectedRobotIds, setContractsPerRobot,
    setRiskProfile, selectAllRobots, deselectAllRobots
  } = useTradingContext();

  if (!isConfigModalOpen) return null;

  const handleRobotSelection = (robotId: number) => {
    const newSelection = new Set(selectedRobotIds);
    if (newSelection.has(robotId)) newSelection.delete(robotId);
    else newSelection.add(robotId);
    setSelectedRobotIds(newSelection);
  };

  return (
    <div style={styles.overlay} onClick={closeConfigModal}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Configurações Globais de Trading</h2>
        <div style={styles.grid}>
          {/* Coluna Esquerda: Seleção de Robôs */}
          <div style={styles.column}>
            <label style={styles.label}>Robôs Disponíveis</label>
            <div style={styles.buttonGroup}>
              <button onClick={selectAllRobots} style={styles.selectButton}>Selecionar Todos</button>
              <button onClick={deselectAllRobots} style={styles.selectButton}>Desmarcar Todos</button>
            </div>
            <div style={styles.scrollArea}>
              {availableRobots.map((robot) => (
                <div key={robot.id} style={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    id={`robot-${robot.id}`}
                    checked={selectedRobotIds.has(robot.id)}
                    onChange={() => handleRobotSelection(robot.id)}
                    style={styles.checkbox}
                  />
                  <label htmlFor={`robot-${robot.id}`} style={styles.checkboxLabel}>
                    {robot.nome}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna Direita: Configurações */}
          <div style={styles.column}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Contratos por Robô</label>
              <input
                type="number"
                value={contractsPerRobot}
                onChange={(e) => setContractsPerRobot(parseInt(e.target.value) || 1)}
                min="1"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Perfil de Risco</label>
              <select
                value={riskProfile}
                onChange={(e) => setRiskProfile(e.target.value)}
                style={styles.input}
              >
                {Object.entries(riskProfiles).map(([key, profile]) => (
                  <option key={key} value={key}>
                    {profile.label} (R$ {profile.marginPerContract}/contrato)
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.summary}>
              <p><strong>Resumo:</strong></p>
              <p>Robôs Selecionados: {selectedRobotIds.size}</p>
              <p>Total de Contratos: {selectedRobotIds.size * contractsPerRobot}</p>
              <p>Margem Total: R$ {totalMargin.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button onClick={closeConfigModal} style={styles.closeButton}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Estilos para o Modal (simulando shadcn/ui)
const styles: { [key: string]: React.CSSProperties } = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modalContent: { backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', maxWidth: '700px', width: '100%' },
  modalTitle: { fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' },
  column: { display: 'flex', flexDirection: 'column' },
  label: { display: 'block', marginBottom: '8px', color: '#374151', fontSize: '0.875rem' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', marginTop: '4px', fontSize: '14px', outline: 'none', cursor: 'text' },
  scrollArea: { height: '256px', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '8px', overflowY: 'auto' },
  checkboxItem: { display: 'flex', alignItems: 'center', marginBottom: '8px' },
  checkbox: { marginRight: '8px', cursor: 'pointer', width: '16px', height: '16px' },
  checkboxLabel: { fontSize: '0.875rem', color: '#374151', cursor: 'pointer', userSelect: 'none' },
  buttonGroup: { display: 'flex', gap: '8px', marginBottom: '16px' },
  selectButton: { padding: '4px 8px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', transition: 'background-color 0.2s' },
  formGroup: { marginBottom: '16px' },
  summary: { padding: '16px', backgroundColor: '#f9fafb', borderRadius: '4px', fontSize: '0.875rem' },
  modalFooter: { marginTop: '24px', display: 'flex', justifyContent: 'flex-end' },
  closeButton: { padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background-color 0.2s' }
};

// --- Componente Layout Principal ---
interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
      <GlobalTradingConfigModal />
    </div>
  );
};

export default Layout; 
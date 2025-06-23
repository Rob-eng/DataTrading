import React, { useState, useEffect } from 'react'
import { Settings, Info, Calculator, TrendingUp, Shield, AlertTriangle } from 'lucide-react'

interface TradingConfig {
  contratos: number
  perfilRisco: 'conservador' | 'moderado' | 'agressivo'
  valorGarantia: number
  valorPorPonto: number
  totalRobos: number
  margemTotal: number
}

interface TradingSettingsProps {
  config: TradingConfig
  onConfigChange: (config: TradingConfig) => void
  totalRobos?: number
}

const TradingSettings: React.FC<TradingSettingsProps> = ({ 
  config, 
  onConfigChange,
  totalRobos = 14 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [tempConfig, setTempConfig] = useState<TradingConfig>(config)

  const perfilOptions = {
    conservador: { valor: 1000, label: 'Conservador', color: 'text-green-600', icon: Shield },
    moderado: { valor: 500, label: 'Moderado', color: 'text-yellow-600', icon: TrendingUp },
    agressivo: { valor: 300, label: 'Agressivo', color: 'text-red-600', icon: AlertTriangle }
  }

  useEffect(() => {
    // Atualizar valores calculados quando mudanças ocorrem
    const newConfig = {
      ...tempConfig,
      valorPorPonto: tempConfig.contratos * 0.20, // WIN Mini: R$ 0,20 por ponto
      totalRobos,
      margemTotal: tempConfig.contratos * totalRobos * tempConfig.valorGarantia // Margem = contratos × robôs × valor por contrato
    }
    setTempConfig(newConfig)
  }, [tempConfig.contratos, tempConfig.valorGarantia, totalRobos])

  const handlePerfilChange = (perfil: 'conservador' | 'moderado' | 'agressivo') => {
    const newConfig = {
      ...tempConfig,
      perfilRisco: perfil,
      valorGarantia: perfilOptions[perfil].valor
    }
    setTempConfig(newConfig)
  }

  const handleSave = () => {
    onConfigChange(tempConfig)
    setIsOpen(false)
  }

  // const IconComponent = perfilOptions[tempConfig.perfilRisco].icon

  return (
    <div className="mb-6">
      {/* Botão para abrir configurações */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Settings className="w-4 h-4" />
        Configurações de Trading
      </button>

      {/* Resumo das configurações atuais */}
      <div className="mt-3 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Contratos:</span>
            <span className="ml-2 font-semibold">{config.contratos}</span>
          </div>
          <div>
            <span className="text-gray-600">Valor/Ponto:</span>
            <span className="ml-2 font-semibold">R$ {config.valorPorPonto.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">Perfil:</span>
            <span className={`ml-2 font-semibold ${perfilOptions[config.perfilRisco].color}`}>
              {perfilOptions[config.perfilRisco].label}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Margem Necessária:</span>
            <span className="ml-2 font-semibold">R$ {config.margemTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Modal de configurações */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Configurações de Trading</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Quantidade de Contratos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade de Contratos por Robô
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={tempConfig.contratos}
                    onChange={(e) => setTempConfig({
                      ...tempConfig,
                      contratos: parseInt(e.target.value) || 1
                    })}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calculator className="w-4 h-4" />
                    <span>Valor por ponto: R$ {tempConfig.valorPorPonto.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  WIN Mini: R$ 0,20 por ponto × {tempConfig.contratos} contratos = R$ {tempConfig.valorPorPonto.toFixed(2)} por ponto
                </p>
              </div>

              {/* Perfil de Risco */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Perfil de Risco / Valor de Garantia
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(perfilOptions).map(([key, option]) => {
                    const Icon = option.icon
                    const isSelected = tempConfig.perfilRisco === key
                    return (
                      <button
                        key={key}
                        onClick={() => handlePerfilChange(key as any)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-5 h-5 ${option.color}`} />
                          <span className={`font-semibold ${option.color}`}>
                            {option.label}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          R$ {option.valor.toLocaleString()} por contrato
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Valor Personalizado de Garantia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Personalizado de Garantia (por contrato)
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">R$</span>
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    step="50"
                    value={tempConfig.valorGarantia}
                    onChange={(e) => setTempConfig({
                      ...tempConfig,
                      valorGarantia: parseInt(e.target.value) || 300
                    })}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">por contrato</span>
                </div>
              </div>

              {/* Resumo dos Cálculos */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Resumo dos Cálculos
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Contratos por Robô:</span>
                    <span className="ml-2 font-semibold">{tempConfig.contratos}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Robôs Selecionados:</span>
                    <span className="ml-2 font-semibold">{totalRobos}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Valor por Ponto:</span>
                    <span className="ml-2 font-semibold">R$ {tempConfig.valorPorPonto.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Garantia por Contrato:</span>
                    <span className="ml-2 font-semibold">R$ {tempConfig.valorGarantia.toLocaleString()}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t">
                    <span className="text-gray-600">Margem Total Necessária:</span>
                    <span className="ml-2 font-bold text-lg text-blue-600">
                      R$ {tempConfig.margemTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Cálculo: {tempConfig.contratos} contratos × {totalRobos} robôs selecionados × R$ {tempConfig.valorGarantia.toLocaleString()}/contrato = R$ {tempConfig.margemTotal.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  💡 Esta é a margem necessária para os robôs selecionados operarem simultaneamente
                </p>
              </div>

              {/* Botões de ação */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salvar Configurações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TradingSettings 
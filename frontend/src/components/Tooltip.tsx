import React, { useState } from 'react'
import { HelpCircle } from 'lucide-react'

interface TooltipProps {
  content: string
  children?: React.ReactNode
  className?: string
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children || <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600" />}
      </div>
      
      {isVisible && (
        <div className="absolute z-50 w-80 p-3 mt-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg -left-1/2 transform -translate-x-1/2">
          <div className="relative">
            {content}
            {/* Seta apontando para cima */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  )
}

// Explicações detalhadas dos indicadores
export const INDICATOR_EXPLANATIONS = {
  drawdown: `
    **Drawdown Máximo**: Maior queda percentual da curva de capital desde um pico anterior.
    
    **Cálculo**:
    1. Para cada ponto da curva de capital, identifica o pico máximo anterior
    2. Calcula: ((Valor Atual - Pico Anterior) / Pico Anterior) × 100
    3. O drawdown máximo é a maior queda encontrada
    
    **Interpretação**:
    • < 5%: Risco muito controlado
    • 5-10%: Risco aceitável
    • 10-20%: Atenção ao risco
    • > 20%: Risco elevado
  `,
  
  sharpe: `
    **Sharpe Ratio**: Mede o retorno ajustado ao risco total.
    
    **Cálculo**: (Retorno Médio - Taxa Livre de Risco) / Desvio Padrão dos Retornos
    
    **Interpretação**:
    • > 2.0: Excelente - retorno muito bom para o risco
    • 1.0-2.0: Bom - retorno adequado para o risco
    • 0.0-1.0: Regular - retorno positivo mas baixo para o risco
    • < 0.0: Ruim - retorno negativo
    
    **Observação**: Considera toda a volatilidade (positiva e negativa)
  `,
  
  sortino: `
    **Sortino Ratio**: Similar ao Sharpe, mas considera apenas o risco de perdas.
    
    **Cálculo**: (Retorno Médio - Taxa Livre de Risco) / Desvio Padrão dos Retornos Negativos
    
    **Interpretação**:
    • > 2.0: Excelente controle de risco de perdas
    • 1.0-2.0: Bom controle de risco de perdas
    • 0.0-1.0: Controle moderado de risco de perdas
    • < 0.0: Controle inadequado de risco de perdas
    
    **Vantagem**: Mais relevante que o Sharpe pois não penaliza volatilidade positiva
  `,
  
  calmar: `
    **Calmar Ratio**: Mede o retorno anualizado em relação ao drawdown máximo.
    
    **Cálculo**: Retorno Anualizado / Drawdown Máximo Absoluto
    
    **Interpretação**:
    • > 1.0: Bom - retorno compensa o risco de drawdown
    • 0.5-1.0: Moderado - retorno adequado para o drawdown
    • < 0.5: Baixo - drawdown muito alto para o retorno obtido
    
    **Utilidade**: Indica se o retorno justifica o maior período de perdas
  `,
  
  var95: `
    **Value at Risk 95%**: Perda máxima esperada em 95% dos casos.
    
    **Cálculo**: Percentil 5% dos resultados históricos das operações
    
    **Interpretação**:
    • Em 95% das operações, a perda será menor que este valor
    • Em 5% das operações, a perda pode ser maior que este valor
    
    **Exemplo**: VaR 95% = -10 pontos significa que em 95% dos casos você não perderá mais que 10 pontos por operação
  `,
  
  var99: `
    **Value at Risk 99%**: Perda máxima esperada em 99% dos casos.
    
    **Cálculo**: Percentil 1% dos resultados históricos das operações
    
    **Interpretação**:
    • Em 99% das operações, a perda será menor que este valor
    • Em 1% das operações, a perda pode ser maior que este valor
    
    **Uso**: Medida mais conservadora para gestão de risco extremo
  `,
  
  maxWins: `
    **Máximo de Ganhos Consecutivos**: Maior sequência de operações positivas seguidas.
    
    **Cálculo**: Conta a maior sequência ininterrupta de operações com resultado > 0
    
    **Utilidade**: 
    • Indica períodos de alta performance
    • Ajuda a entender padrões de comportamento da estratégia
    • Importante para gestão psicológica do trader
  `,
  
  maxLosses: `
    **Máximo de Perdas Consecutivas**: Maior sequência de operações negativas seguidas.
    
    **Cálculo**: Conta a maior sequência ininterrupta de operações com resultado < 0
    
    **Utilidade**:
    • Indica o pior período de performance
    • Fundamental para dimensionar capital e risco
    • Ajuda a preparar psicologicamente para sequências ruins
  `,
  
  currentStreak: `
    **Sequência Atual**: Número de operações consecutivas positivas ou negativas no final do período.
    
    **Cálculo**: 
    • Valor positivo: quantas operações positivas consecutivas no final
    • Valor negativo: quantas operações negativas consecutivas no final
    • Zero: última operação foi empate
    
    **Utilidade**: Indica o momento atual da estratégia
  `,

  retornoMargem: `
    **Retorno sobre Margem**: Percentual de retorno baseado na margem configurada.
    
    **Cálculo**: (Lucro Total em R$ / Margem Total Configurada) × 100
    
    **Componentes**:
    • Lucro Total = Pontos × Valor do Ponto × Contratos
    • Margem Total = Robôs × Contratos × Margem por Contrato
    
    **Interpretação**: Mostra a eficiência do capital investido
  `,

  totalOperacoes: `
    **Total de Operações**: Número total de operações realizadas pelos robôs selecionados.
    
    **Cálculo**: Soma simples de todas as operações
    
    **Importância**: 
    • Base estatística para outros cálculos
    • Indica atividade da estratégia
    • Quanto maior, mais confiáveis são as métricas
  `,

  totalPontos: `
    **Resultado Total (Pontos)**: Soma de todos os resultados das operações em pontos.
    
    **Cálculo**: Σ(resultado de cada operação)
    
    **Observação**: Valor bruto antes da conversão para reais e multiplicação por contratos
  `,

  totalReais: `
    **Resultado Total (R$)**: Valor em reais considerando contratos configurados.
    
    **Cálculo**: Total Pontos × Valor do Ponto × Contratos por Robô
    
    **Componentes**:
    • Valor do Ponto: Definido por ativo (ex: R$ 0,20 para mini-índice)
    • Contratos: Quantidade configurada por robô
  `
};

export default Tooltip 
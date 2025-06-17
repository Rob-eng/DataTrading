import React from 'react'

interface DataPoint {
  label: string
  value: number
  color?: string
}

interface LineChartProps {
  data: DataPoint[]
  title: string
  height?: number
  width?: number
}

interface BarChartProps {
  data: DataPoint[]
  title: string
  height?: number
  width?: number
}

interface PieChartProps {
  data: DataPoint[]
  title: string
  size?: number
}

// Componente de Gráfico de Linha Simples
export const SimpleLineChart: React.FC<LineChartProps> = ({ 
  data, 
  title, 
  height = 300, 
  width = 600 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  const padding = 40
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + ((maxValue - point.value) / range) * chartHeight
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <svg width={width} height={height} className="border rounded">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        
        {/* Data line */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          points={points}
        />
        
        {/* Data points */}
        {data.map((point, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth
          const y = padding + ((maxValue - point.value) / range) * chartHeight
          return (
            <g key={index}>
              <circle cx={x} cy={y} r="4" fill="#3b82f6" />
              <text x={x} y={height - padding + 20} textAnchor="middle" fontSize="12" fill="#666">
                {point.label}
              </text>
            </g>
          )
        })}
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const value = minValue + ratio * range
          const y = padding + (1 - ratio) * chartHeight
          return (
            <text key={index} x={padding - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#666">
              {value.toFixed(0)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// Componente de Gráfico de Barras Simples
export const SimpleBarChart: React.FC<BarChartProps> = ({ 
  data, 
  title, 
  height = 300, 
  width = 600 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const hasNegative = minValue < 0

  const padding = 40
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding
  const barWidth = chartWidth / data.length * 0.8
  const barSpacing = chartWidth / data.length * 0.2

  // Calcular posição da linha zero corretamente
  const range = maxValue - minValue || 1
  const zeroY = hasNegative ? 
    padding + ((maxValue / range) * chartHeight) :
    height - padding

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <svg width={width} height={height} className="border rounded">
        {/* Grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="#666" strokeWidth="2"/>
        
        {/* Bars */}
        {data.map((point, index) => {
          const x = padding + index * (chartWidth / data.length) + barSpacing / 2
          
          // Calcular altura da barra proporcionalmente
          const barHeight = Math.abs(point.value) / range * chartHeight
          
          // Posição Y da barra (acima ou abaixo da linha zero)
          const y = point.value >= 0 ? zeroY - barHeight : zeroY
          
          const color = point.color || (point.value >= 0 ? '#10b981' : '#ef4444')
          
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                opacity="0.8"
              />
              <text 
                x={x + barWidth / 2} 
                y={height - padding + 20} 
                textAnchor="middle" 
                fontSize="12" 
                fill="#666"
              >
                {point.label}
              </text>
              <text 
                x={x + barWidth / 2} 
                y={y - 5} 
                textAnchor="middle" 
                fontSize="11" 
                fill="#333"
                fontWeight="bold"
              >
                {point.value.toFixed(1)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Componente de Gráfico de Pizza Simples
export const SimplePieChart: React.FC<PieChartProps> = ({ 
  data, 
  title, 
  size = 300 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + Math.abs(item.value), 0)
  const radius = size / 2 - 40
  const centerX = size / 2
  const centerY = size / 2

  let currentAngle = -90 // Start from top

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
  ]

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="flex items-center justify-center">
        <div className="flex flex-col items-center">
          <svg width={size} height={size}>
            {data.map((item, index) => {
              const percentage = (Math.abs(item.value) / total) * 100
              const angle = (Math.abs(item.value) / total) * 360
              const startAngle = currentAngle
              const endAngle = currentAngle + angle
              
              const startX = centerX + radius * Math.cos((startAngle * Math.PI) / 180)
              const startY = centerY + radius * Math.sin((startAngle * Math.PI) / 180)
              const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
              const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180)
              
              const largeArcFlag = angle > 180 ? 1 : 0
              
              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${startX} ${startY}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                'Z'
              ].join(' ')
              
              currentAngle += angle
              
              const color = item.color || colors[index % colors.length]
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.8"
                />
              )
            })}
          </svg>
          
          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {data.map((item, index) => {
              const percentage = ((Math.abs(item.value) / total) * 100).toFixed(1)
              const color = item.color || colors[index % colors.length]
              
              return (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="text-sm text-gray-700">
                    {item.label}: {percentage}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de Curva de Capital (Equity Curve)
interface EquityCurveProps {
  data: { date: string; value: number; cumulative: number }[]
  title: string
  height?: number
  width?: number
}

export const EquityCurve: React.FC<EquityCurveProps> = ({ 
  data, 
  title, 
  height = 300, 
  width = 800 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.cumulative))
  const minValue = Math.min(...data.map(d => d.cumulative))
  const range = maxValue - minValue || 1

  const padding = 50
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + ((maxValue - point.cumulative) / range) * chartHeight
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <svg width={width} height={height} className="border rounded">
        {/* Grid */}
        <defs>
          <pattern id="grid" width="50" height="30" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 30" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Zero line */}
        {minValue < 0 && maxValue > 0 && (
          <line 
            x1={padding} 
            y1={padding + (maxValue / range) * chartHeight} 
            x2={width - padding} 
            y2={padding + (maxValue / range) * chartHeight} 
            stroke="#666" 
            strokeWidth="1" 
            strokeDasharray="5,5"
          />
        )}
        
        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        
        {/* Equity curve */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          points={points}
        />
        
        {/* Fill area under curve */}
        <polygon
          fill="#3b82f6"
          fillOpacity="0.1"
          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        />
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const value = minValue + ratio * range
          const y = padding + (1 - ratio) * chartHeight
          return (
            <text key={index} x={padding - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#666">
              {value.toFixed(0)}
            </text>
          )
        })}
        
        {/* X-axis labels (sample dates) */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const dataIndex = Math.floor(ratio * (data.length - 1))
          const x = padding + ratio * chartWidth
          const date = new Date(data[dataIndex]?.date || '').toLocaleDateString('pt-BR', { 
            month: 'short', 
            day: 'numeric' 
          })
          return (
            <text key={index} x={x} y={height - padding + 20} textAnchor="middle" fontSize="11" fill="#666">
              {date}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// Componente de Heatmap para Performance por Dia/Hora
interface HeatmapProps {
  data: { day: string; hour: number; value: number }[]
  title: string
  width?: number
  height?: number
}

export const PerformanceHeatmap: React.FC<HeatmapProps> = ({ 
  data, 
  title, 
  width = 800, 
  height = 400 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    )
  }

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const hours = Array.from({ length: 24 }, (_, i) => i)
  
  const maxValue = Math.max(...data.map(d => Math.abs(d.value)))
  
  const cellWidth = (width - 100) / 24
  const cellHeight = (height - 100) / 7
  
  const getColor = (value: number) => {
    if (value === 0) return '#f3f4f6'
    const intensity = Math.abs(value) / maxValue
    if (value > 0) {
      return `rgba(16, 185, 129, ${intensity * 0.8})`
    } else {
      return `rgba(239, 68, 68, ${intensity * 0.8})`
    }
  }

  const getValue = (day: number, hour: number) => {
    const dayName = days[day]
    const item = data.find(d => d.day === dayName && d.hour === hour)
    return item ? item.value : 0
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <svg width={width} height={height}>
        {/* Hour labels */}
        {hours.map(hour => (
          <text
            key={hour}
            x={50 + hour * cellWidth + cellWidth / 2}
            y={30}
            textAnchor="middle"
            fontSize="12"
            fill="#666"
          >
            {hour}h
          </text>
        ))}
        
        {/* Day labels */}
        {days.map((day, dayIndex) => (
          <text
            key={day}
            x={30}
            y={50 + dayIndex * cellHeight + cellHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#666"
          >
            {day}
          </text>
        ))}
        
        {/* Heatmap cells */}
        {days.map((day, dayIndex) =>
          hours.map(hour => {
            const value = getValue(dayIndex, hour)
            const color = getColor(value)
            
            return (
              <g key={`${day}-${hour}`}>
                <rect
                  x={50 + hour * cellWidth}
                  y={50 + dayIndex * cellHeight}
                  width={cellWidth - 1}
                  height={cellHeight - 1}
                  fill={color}
                  stroke="#fff"
                  strokeWidth="1"
                />
                {Math.abs(value) > 0 && (
                  <text
                    x={50 + hour * cellWidth + cellWidth / 2}
                    y={50 + dayIndex * cellHeight + cellHeight / 2}
                    textAnchor="middle"
                    fontSize="10"
                    fill={Math.abs(value) / maxValue > 0.5 ? '#fff' : '#333'}
                    fontWeight="bold"
                  >
                    {value.toFixed(0)}
                  </text>
                )}
              </g>
            )
          })
        )}
        
        {/* Legend */}
        <g transform={`translate(${width - 150}, 50)`}>
          <text x="0" y="0" fontSize="12" fill="#666" fontWeight="bold">Legenda:</text>
          <rect x="0" y="10" width="20" height="15" fill="rgba(239, 68, 68, 0.8)" />
          <text x="25" y="22" fontSize="11" fill="#666">Perdas</text>
          <rect x="0" y="30" width="20" height="15" fill="#f3f4f6" />
          <text x="25" y="42" fontSize="11" fill="#666">Neutro</text>
          <rect x="0" y="50" width="20" height="15" fill="rgba(16, 185, 129, 0.8)" />
          <text x="25" y="62" fontSize="11" fill="#666">Ganhos</text>
        </g>
      </svg>
    </div>
  )
}

// Componente de Evolução Diária do Saldo
interface DailyBalanceProps {
  data: { date: string; balance: number; operations: number }[]
  title: string
  height?: number
  width?: number
}

export const DailyBalanceChart: React.FC<DailyBalanceProps> = ({ 
  data, 
  title, 
  height = 350, 
  width = 900 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    )
  }

  const maxBalance = Math.max(...data.map(d => d.balance))
  const minBalance = Math.min(...data.map(d => d.balance))
  const balanceRange = maxBalance - minBalance || 1

  const maxOps = Math.max(...data.map(d => d.operations))

  const padding = 60
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding

  // Pontos para linha de saldo
  const balancePoints = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + ((maxBalance - point.balance) / balanceRange) * (chartHeight * 0.7)
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <svg width={width} height={height} className="border rounded">
        {/* Grid */}
        <defs>
          <pattern id="dailyGrid" width="50" height="30" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 30" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dailyGrid)" />
        
        {/* Eixos */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        
        {/* Barras de operações (fundo) */}
        {data.map((point, index) => {
          const x = padding + (index / data.length) * chartWidth
          const barWidth = chartWidth / data.length * 0.6
          const barHeight = (point.operations / maxOps) * (chartHeight * 0.3)
          const y = height - padding - barHeight
          
          return (
            <rect
              key={`bar-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill="#e5e7eb"
              opacity="0.7"
            />
          )
        })}
        
        {/* Linha de saldo */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          points={balancePoints}
        />
        
        {/* Pontos de saldo */}
        {data.map((point, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth
          const y = padding + ((maxBalance - point.balance) / balanceRange) * (chartHeight * 0.7)
          return (
            <circle
              key={`point-${index}`}
              cx={x}
              cy={y}
              r="4"
              fill="#3b82f6"
            />
          )
        })}
        
        {/* Labels do eixo X (datas) */}
        {data.map((point, index) => {
          if (index % Math.ceil(data.length / 8) === 0) {
            const x = padding + (index / (data.length - 1)) * chartWidth
            const date = new Date(point.date).toLocaleDateString('pt-BR', { 
              month: 'short', 
              day: 'numeric' 
            })
            return (
              <text
                key={`date-${index}`}
                x={x}
                y={height - padding + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#666"
              >
                {date}
              </text>
            )
          }
          return null
        })}
        
        {/* Labels do eixo Y (saldo) */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const value = minBalance + ratio * balanceRange
          const y = padding + (1 - ratio) * (chartHeight * 0.7)
          return (
            <text key={`balance-${index}`} x={padding - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#3b82f6">
              {value.toFixed(0)}
            </text>
          )
        })}
        
        {/* Labels do eixo Y direito (operações) */}
        {[0, 0.5, 1].map((ratio, index) => {
          const value = ratio * maxOps
          const y = height - padding - ratio * (chartHeight * 0.3)
          return (
            <text key={`ops-${index}`} x={width - padding + 10} y={y + 4} textAnchor="start" fontSize="12" fill="#6b7280">
              {value.toFixed(0)}
            </text>
          )
        })}
        
        {/* Legenda */}
        <g transform={`translate(${width - 200}, 30)`}>
          <line x1="0" y1="10" x2="20" y2="10" stroke="#3b82f6" strokeWidth="3"/>
          <text x="25" y="14" fontSize="12" fill="#666">Saldo Acumulado</text>
          <rect x="0" y="20" width="20" height="10" fill="#e5e7eb"/>
          <text x="25" y="29" fontSize="12" fill="#666">Operações/Dia</text>
        </g>
      </svg>
    </div>
  )
}

// Componente de Operações por Minuto
interface OperationsByMinuteProps {
  data: { minute: string; count: number; avgResult: number }[]
  title: string
  height?: number
  width?: number
}

export const OperationsByMinuteChart: React.FC<OperationsByMinuteProps> = ({ 
  data, 
  title, 
  height = 350, 
  width = 900 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    )
  }

  const maxCount = Math.max(...data.map(d => d.count))
  const maxResult = Math.max(...data.map(d => Math.abs(d.avgResult)))

  const padding = 60
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding
  const barWidth = chartWidth / data.length * 0.8

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <svg width={width} height={height} className="border rounded">
        {/* Grid */}
        <defs>
          <pattern id="minuteGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#minuteGrid)" />
        
        {/* Eixos */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        
        {/* Barras de contagem */}
        {data.map((point, index) => {
          const x = padding + index * (chartWidth / data.length)
          const barHeight = (point.count / maxCount) * (chartHeight * 0.6)
          const y = height - padding - barHeight
          
          // Cor baseada no resultado médio
          const color = point.avgResult >= 0 ? '#10b981' : '#ef4444'
          const opacity = Math.abs(point.avgResult) / maxResult * 0.8 + 0.2
          
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                opacity={opacity}
              />
              {/* Valor no topo da barra */}
              {point.count > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#333"
                >
                  {point.count}
                </text>
              )}
            </g>
          )
        })}
        
        {/* Labels do eixo X (minutos) */}
        {data.map((point, index) => {
          if (index % 5 === 0) { // Mostrar a cada 5 minutos
            const x = padding + index * (chartWidth / data.length) + barWidth / 2
            return (
              <text
                key={index}
                x={x}
                y={height - padding + 15}
                textAnchor="middle"
                fontSize="10"
                fill="#666"
              >
                {point.minute}
              </text>
            )
          }
          return null
        })}
        
        {/* Labels do eixo Y */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const value = ratio * maxCount
          const y = height - padding - ratio * (chartHeight * 0.6)
          return (
            <text key={index} x={padding - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#666">
              {value.toFixed(0)}
            </text>
          )
        })}
        
        {/* Título dos eixos */}
        <text x={padding - 40} y={height / 2} textAnchor="middle" fontSize="12" fill="#666" transform={`rotate(-90, ${padding - 40}, ${height / 2})`}>
          Número de Operações
        </text>
        <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="12" fill="#666">
          Minuto do Dia
        </text>
        
        {/* Legenda */}
        <g transform={`translate(${width - 250}, 30)`}>
          <rect x="0" y="0" width="15" height="10" fill="#10b981" opacity="0.8"/>
          <text x="20" y="9" fontSize="11" fill="#666">Resultado Positivo</text>
          <rect x="0" y="15" width="15" height="10" fill="#ef4444" opacity="0.8"/>
          <text x="20" y="24" fontSize="11" fill="#666">Resultado Negativo</text>
          <text x="0" y="40" fontSize="10" fill="#666">Intensidade = |Resultado Médio|</text>
        </g>
      </svg>
    </div>
  )
}

// Componente de Scatter Plot para Operações por Horário
interface OperationsScatterProps {
  data: { hour: number; minute: number; result: number; time: string }[]
  title: string
  height?: number
  width?: number
}

export const OperationsScatterChart: React.FC<OperationsScatterProps> = ({ 
  data, 
  title, 
  height = 400, 
  width = 900 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    )
  }

  // Filtrar apenas horário comercial (9h às 18h)
  const filteredData = data.filter(d => d.hour >= 9 && d.hour <= 18)
  
  const maxResult = Math.max(...filteredData.map(d => Math.abs(d.result)))
  const minResult = Math.min(...filteredData.map(d => d.result))
  const resultRange = maxResult - minResult || 1

  const padding = 60
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding

  // Escala de horários (9h às 18h = 9 horas)
  const hourRange = 9 // 18 - 9
  const zeroY = padding + ((maxResult - 0) / resultRange) * chartHeight

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <svg width={width} height={height} className="border rounded">
        {/* Grid */}
        <defs>
          <pattern id="scatterGrid" width="40" height="30" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#scatterGrid)" />
        
        {/* Linha zero */}
        <line 
          x1={padding} 
          y1={zeroY} 
          x2={width - padding} 
          y2={zeroY} 
          stroke="#666" 
          strokeWidth="1" 
          strokeDasharray="3,3"
        />
        
        {/* Eixos */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        
        {/* Pontos das operações */}
        {filteredData.map((point, index) => {
          const timeInMinutes = (point.hour - 9) * 60 + point.minute
          const x = padding + (timeInMinutes / (hourRange * 60)) * chartWidth
          const y = padding + ((maxResult - point.result) / resultRange) * chartHeight
          
          // Tamanho do ponto baseado no valor absoluto do resultado
          const pointSize = Math.max(2, Math.min(12, (Math.abs(point.result) / maxResult) * 10))
          
          // Cor baseada no resultado
          const color = point.result >= 0 ? '#10b981' : '#ef4444'
          const opacity = Math.abs(point.result) / maxResult * 0.8 + 0.2
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={pointSize}
              fill={color}
              opacity={opacity}
              stroke="#fff"
              strokeWidth="1"
            />
          )
        })}
        
        {/* Labels do eixo X (horários) */}
        {Array.from({ length: 10 }, (_, i) => i + 9).map(hour => {
          const x = padding + ((hour - 9) / hourRange) * chartWidth
          return (
            <text
              key={hour}
              x={x}
              y={height - padding + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#666"
            >
              {hour}h
            </text>
          )
        })}
        
        {/* Labels do eixo Y (resultados) */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const value = minResult + ratio * resultRange
          const y = padding + (1 - ratio) * chartHeight
          return (
            <text key={index} x={padding - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#666">
              {value.toFixed(0)}
            </text>
          )
        })}
        
        {/* Títulos dos eixos */}
        <text x={padding - 40} y={height / 2} textAnchor="middle" fontSize="12" fill="#666" transform={`rotate(-90, ${padding - 40}, ${height / 2})`}>
          Resultado (pontos)
        </text>
        <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="12" fill="#666">
          Horário do Dia
        </text>
        
        {/* Legenda */}
        <g transform={`translate(${width - 200}, 30)`}>
          <circle cx="10" cy="10" r="6" fill="#10b981" opacity="0.8"/>
          <text x="20" y="14" fontSize="11" fill="#666">Ganhos</text>
          <circle cx="10" cy="25" r="6" fill="#ef4444" opacity="0.8"/>
          <text x="20" y="29" fontSize="11" fill="#666">Perdas</text>
          <text x="0" y="45" fontSize="10" fill="#666">Tamanho = |Resultado|</text>
        </g>
      </svg>
    </div>
  )
}

// Componente de Evolução Diária de Resultados (Intraday)
interface DailyEvolutionProps {
  data: { time: string; cumulativeResult: number; operationResult: number }[]
  title: string
  height?: number
  width?: number
}

// Componente específico para Performance Mensal (linha)
interface MonthlyPerformanceProps {
  data: { label: string; value: number }[]
  title: string
  height?: number
  width?: number
}

export const MonthlyPerformanceChart: React.FC<MonthlyPerformanceProps> = ({ 
  data, 
  title, 
  height = 350, 
  width = 800 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  const padding = 60
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding

  // Linha zero
  const zeroY = minValue < 0 ? 
    padding + ((maxValue / range) * chartHeight) :
    height - padding

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + ((maxValue - point.value) / range) * chartHeight
    return `${x},${y}`
  }).join(' ')

  // Primeiro e último mês para mostrar o período
  const primeiroMes = data[0]?.label || ''
  const ultimoMes = data[data.length - 1]?.label || ''

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-600">
          📅 Período: {primeiroMes} a {ultimoMes}
        </span>
      </div>
      
      <svg width={width} height={height} className="border rounded">
        {/* Grid */}
        <defs>
          <pattern id="monthlyGrid" width="50" height="30" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 30" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#monthlyGrid)" />
        
        {/* Linha zero */}
        {minValue < 0 && maxValue > 0 && (
          <line 
            x1={padding} 
            y1={zeroY} 
            x2={width - padding} 
            y2={zeroY} 
            stroke="#666" 
            strokeWidth="2" 
            strokeDasharray="5,5"
          />
        )}
        
        {/* Eixos */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        
        {/* Linha de performance */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          points={points}
        />
        
        {/* Área preenchida */}
        <polygon
          fill="#3b82f6"
          fillOpacity="0.1"
          points={`${padding},${zeroY} ${points} ${width - padding},${zeroY}`}
        />
        
        {/* Pontos nos meses */}
        {data.map((point, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth
          const y = padding + ((maxValue - point.value) / range) * chartHeight
          const color = point.value >= 0 ? '#10b981' : '#ef4444'
          
          return (
            <g key={index}>
              <circle cx={x} cy={y} r="5" fill={color} stroke="#fff" strokeWidth="2" />
              <text 
                x={x} 
                y={height - padding + 20} 
                textAnchor="middle" 
                fontSize="11" 
                fill="#666"
                transform={data.length > 8 ? `rotate(-45 ${x} ${height - padding + 20})` : ''}
              >
                {point.label}
              </text>
              <text 
                x={x} 
                y={y - 10} 
                textAnchor="middle" 
                fontSize="11" 
                fill="#333"
                fontWeight="bold"
              >
                {point.value.toFixed(1)}
              </text>
            </g>
          )
        })}
        
        {/* Labels do eixo Y */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const value = minValue + ratio * range
          const y = padding + (1 - ratio) * chartHeight
          return (
            <text key={index} x={padding - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#666">
              {value.toFixed(0)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export const DailyEvolutionChart: React.FC<DailyEvolutionProps> = ({ 
  data, 
  title, 
  height = 350, 
  width = 900 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.cumulativeResult))
  const minValue = Math.min(...data.map(d => d.cumulativeResult))
  const range = maxValue - minValue || 1

  const padding = 60
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + ((maxValue - point.cumulativeResult) / range) * chartHeight
    return `${x},${y}`
  }).join(' ')

  const zeroY = padding + ((maxValue - 0) / range) * chartHeight

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <svg width={width} height={height} className="border rounded">
        {/* Grid */}
        <defs>
          <pattern id="evolutionGrid" width="50" height="30" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 30" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#evolutionGrid)" />
        
        {/* Linha zero */}
        <line 
          x1={padding} 
          y1={zeroY} 
          x2={width - padding} 
          y2={zeroY} 
          stroke="#666" 
          strokeWidth="1" 
          strokeDasharray="5,5"
        />
        
        {/* Eixos */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#666" strokeWidth="2"/>
        
        {/* Área preenchida */}
        <polygon
          fill="#3b82f6"
          fillOpacity="0.1"
          points={`${padding},${zeroY} ${points} ${width - padding},${zeroY}`}
        />
        
        {/* Linha de evolução */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          points={points}
        />
        
        {/* Pontos de operações */}
        {data.map((point, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth
          const y = padding + ((maxValue - point.cumulativeResult) / range) * chartHeight
          const color = point.operationResult >= 0 ? '#10b981' : '#ef4444'
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill={color}
              stroke="#fff"
              strokeWidth="2"
            />
          )
        })}
        
        {/* Labels do eixo X (horários) */}
        {data.map((point, index) => {
          if (index % Math.ceil(data.length / 8) === 0) {
            const x = padding + (index / (data.length - 1)) * chartWidth
            return (
              <text
                key={index}
                x={x}
                y={height - padding + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#666"
              >
                {point.time}
              </text>
            )
          }
          return null
        })}
        
        {/* Labels do eixo Y */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const value = minValue + ratio * range
          const y = padding + (1 - ratio) * chartHeight
          return (
            <text key={index} x={padding - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#666">
              {value.toFixed(0)}
            </text>
          )
        })}
        
        {/* Títulos dos eixos */}
        <text x={padding - 40} y={height / 2} textAnchor="middle" fontSize="12" fill="#666" transform={`rotate(-90, ${padding - 40}, ${height / 2})`}>
          Resultado Acumulado (pontos)
        </text>
        <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="12" fill="#666">
          Horário
        </text>
      </svg>
    </div>
  )
}
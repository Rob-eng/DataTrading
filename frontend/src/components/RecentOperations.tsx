import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Operation {
  id: string
  robot: string
  symbol: string
  type: 'buy' | 'sell'
  result: number
  time: string
}

const RecentOperations: React.FC = () => {
  // Dados simulados
  const operations: Operation[] = [
    {
      id: '1',
      robot: 'RobôA',
      symbol: 'PETR4',
      type: 'buy',
      result: 125.50,
      time: '14:32'
    },
    {
      id: '2',
      robot: 'RobôB',
      symbol: 'VALE3',
      type: 'sell',
      result: -45.20,
      time: '14:28'
    },
    {
      id: '3',
      robot: 'RobôC',
      symbol: 'ITUB4',
      type: 'buy',
      result: 89.75,
      time: '14:25'
    },
    {
      id: '4',
      robot: 'RobôA',
      symbol: 'BBDC4',
      type: 'sell',
      result: 156.30,
      time: '14:20'
    },
    {
      id: '5',
      robot: 'RobôD',
      symbol: 'ABEV3',
      type: 'buy',
      result: -23.10,
      time: '14:15'
    }
  ]

  return (
    <div className="space-y-3">
      {operations.map((operation) => (
        <div key={operation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${
              operation.result > 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {operation.result > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{operation.symbol}</p>
              <p className="text-sm text-gray-500">{operation.robot}</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className={`font-medium ${
              operation.result > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {operation.result > 0 ? '+' : ''}R$ {operation.result.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">{operation.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default RecentOperations 
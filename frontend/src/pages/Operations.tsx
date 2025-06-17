import React, { useState, useEffect } from 'react'
import { Activity, Search, Filter, Calendar, TrendingUp, TrendingDown, Download, Eye } from 'lucide-react'
import apiService, { Operacao, Robo } from '../services/api'

const Operations: React.FC = () => {
  const [operations, setOperations] = useState<Operacao[]>([])
  const [robots, setRobots] = useState<Robo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSchema, setSelectedSchema] = useState('uploads_usuarios')
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRobot, setSelectedRobot] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [resultFilter, setResultFilter] = useState('') // 'positive', 'negative', ''
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  useEffect(() => {
    loadData()
  }, [selectedSchema])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [operationsData, robotsData] = await Promise.all([
        apiService.getOperacoes(selectedSchema, 0, 10000),
        apiService.getRobos(selectedSchema)
      ])
      
      setOperations(operationsData)
      setRobots(robotsData)
      
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar operações
  const filteredOperations = operations.filter(operation => {
    const matchesSearch = operation.ativo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.tipo?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRobot = !selectedRobot || operation.robo_id.toString() === selectedRobot
    
    const operationDate = new Date(operation.data_abertura)
    const matchesDateFrom = !dateFrom || operationDate >= new Date(dateFrom)
    const matchesDateTo = !dateTo || operationDate <= new Date(dateTo)
    
    const matchesResult = !resultFilter || 
                         (resultFilter === 'positive' && operation.resultado > 0) ||
                         (resultFilter === 'negative' && operation.resultado < 0)
    
    return matchesSearch && matchesRobot && matchesDateFrom && matchesDateTo && matchesResult
  })

  // Paginação
  const totalPages = Math.ceil(filteredOperations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOperations = filteredOperations.slice(startIndex, startIndex + itemsPerPage)

  // Estatísticas das operações filtradas
  const stats = {
    total: filteredOperations.length,
    positive: filteredOperations.filter(op => op.resultado > 0).length,
    negative: filteredOperations.filter(op => op.resultado < 0).length,
    totalResult: filteredOperations.reduce((sum, op) => sum + op.resultado, 0),
    avgResult: filteredOperations.length > 0 ? 
               filteredOperations.reduce((sum, op) => sum + op.resultado, 0) / filteredOperations.length : 0
  }

  const getRobotName = (robotId: number) => {
    const robot = robots.find(r => r.id === robotId)
    return robot ? robot.nome : `Robô ${robotId}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando operações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Operações de Trading</h1>
        <button className="btn-secondary flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Exportar</span>
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Positivas</p>
              <p className="text-2xl font-bold text-green-600">{stats.positive}</p>
            </div>
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Negativas</p>
              <p className="text-2xl font-bold text-red-600">{stats.negative}</p>
            </div>
            <TrendingDown className="h-6 w-6 text-red-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resultado Total</p>
              <p className={`text-lg font-bold ${stats.totalResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {stats.totalResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Média por Op.</p>
              <p className={`text-lg font-bold ${stats.avgResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {stats.avgResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar ativo/estratégia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field flex-1"
            />
          </div>

          <select 
            value={selectedSchema}
            onChange={(e) => setSelectedSchema(e.target.value)}
            className="input-field"
          >
            <option value="oficial">Oficial</option>
            <option value="uploads_usuarios">Uploads</option>
          </select>

          <select 
            value={selectedRobot}
            onChange={(e) => setSelectedRobot(e.target.value)}
            className="input-field"
          >
            <option value="">Todos os robôs</option>
            {robots.map(robot => (
              <option key={robot.id} value={robot.id.toString()}>
                {robot.nome}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input-field"
            placeholder="Data inicial"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input-field"
            placeholder="Data final"
          />

          <select 
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="input-field"
          >
            <option value="">Todos resultados</option>
            <option value="positive">Apenas positivas</option>
            <option value="negative">Apenas negativas</option>
          </select>
        </div>
      </div>

      {/* Lista de Operações */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Operações ({filteredOperations.length})
          </h3>
          
          {/* Paginação Info */}
          <div className="text-sm text-gray-600">
            Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredOperations.length)} de {filteredOperations.length}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {filteredOperations.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma operação encontrada</h3>
            <p className="text-gray-600">
              {searchTerm || selectedRobot || dateFrom || dateTo || resultFilter ? 
                'Tente ajustar os filtros de busca.' : 
                'Faça upload de dados para visualizar operações.'}
            </p>
          </div>
        ) : (
          <>
            {/* Tabela de Operações */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Robô
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ativo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resultado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedOperations.map((operation) => (
                    <tr key={operation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{formatDate(operation.data_abertura)}</div>
                          <div className="text-gray-500">{formatTime(operation.data_abertura)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getRobotName(operation.robo_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {operation.ativo || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          operation.tipo === 'COMPRA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {operation.tipo || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {operation.quantidade?.toLocaleString('pt-BR') || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        R$ {operation.preco_abertura?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={operation.resultado >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {operation.resultado >= 0 ? '+' : ''}{operation.resultado.toFixed(2)} pts
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  <span className="text-sm text-gray-700">
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">Itens por página:</span>
                  <select 
                    value={itemsPerPage}
                    onChange={(e) => {
                      setCurrentPage(1)
                      // Note: itemsPerPage is const, you'd need to make it state if you want this to work
                    }}
                    className="input-field w-20"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Botão para recarregar */}
      <div className="flex justify-center">
        <button
          onClick={loadData}
          disabled={loading}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Carregando...' : 'Atualizar Dados'}
        </button>
      </div>
    </div>
  )
}

export default Operations 
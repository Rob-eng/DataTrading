import axios from 'axios'

// Configuração base da API
const API_BASE_URL = 'http://localhost'
const API_VERSION = '/api/v1'

// Criar instância do axios com configurações padrão
export const api = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para logging de requests (desenvolvimento)
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('❌ API Request Error:', error)
    return Promise.reject(error)
  }
)

// Interceptor para logging de responses (desenvolvimento)
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.status, error.response?.data)
    return Promise.reject(error)
  }
)

// Tipos para as respostas da API
export interface Robo {
  id: number
  nome: string
  descricao?: string
  created_at: string
  updated_at: string
}

export interface Operacao {
  id: number
  robo_id: number
  ativo: string
  data_abertura: string
  data_fechamento?: string
  tipo: string
  quantidade?: number
  preco_abertura?: number
  preco_fechamento?: number
  resultado: number
  lotes?: number
  created_at: string
  updated_at: string
}

export interface MetricasFinanceiras {
  metricas: {
    total_operacoes: number
    total_pontos: number
    total_reais: number
    margem_total_necessaria: number
    retorno_percentual: number
    contratos_considerados: number
  }
  por_ativo: Record<string, {
    operacoes: number
    pontos_total: number
    reais_total: number
    retorno_percentual: number
  }>
  configuracao: {
    valores_ponto: Record<string, number>
    margens: Record<string, number>
  }
}

export interface AnaliseDias {
  resumo_geral: {
    total_dias_analisados: number
    dias_positivos: number
    dias_negativos: number
  }
  analise_dias_positivos: {
    total_operacoes: number
    operacoes_ganhadoras: number
    taxa_acerto: number
    resultado_medio: number
  }
  analise_dias_negativos: {
    total_operacoes: number
    operacoes_ganhadoras: number
    taxa_acerto: number
    resultado_medio: number
  }
}

// Serviços da API
export const apiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/health')
    return response.data
  },

  // Robôs
  async getRobos(schema: string = 'uploads_usuarios', skip: number = 0, limit: number = 100) {
    const response = await api.get('/robos', {
      params: { schema, skip, limit }
    })
    return response.data as Robo[]
  },

  async getRobo(id: number, schema: string = 'uploads_usuarios') {
    const response = await api.get(`/robos/${id}`, {
      params: { schema }
    })
    return response.data as Robo
  },

  async createRobo(nome: string, descricao?: string, schema: string = 'uploads_usuarios') {
    const response = await api.post('/robos', 
      { nome, descricao },
      { params: { schema } }
    )
    return response.data as Robo
  },

  // Operações
  async getOperacoes(schema: string = 'uploads_usuarios', skip: number = 0, limit: number = 100) {
    const response = await api.get('/operacoes', {
      params: { schema, skip, limit }
    })
    return response.data as Operacao[]
  },

  async getOperacao(id: number) {
    const response = await api.get(`/operacoes/${id}`)
    return response.data as Operacao
  },

  async createOperacao(operacao: {
    ativo: string
    data_abertura: string
    tipo: string
    resultado: number
    robo_id?: number
    nome_robo_para_criacao?: string
    quantidade?: number
    preco_abertura?: number
    preco_fechamento?: number
    lotes?: number
  }) {
    const response = await api.post('/operacoes', operacao)
    return response.data as Operacao
  },

  // Analytics Avançado
  async getMetricasFinanceiras(
    robo_id?: number, 
    schema: string = 'uploads_usuarios', 
    contratos: number = 1,
    margem_total?: number
  ) {
    const params: any = { schema, contratos }
    if (robo_id) params.robo_id = robo_id
    if (margem_total) params.margem_total = margem_total

    const response = await api.get('/analytics-advanced/metricas-financeiras', {
      params
    })
    return response.data as MetricasFinanceiras
  },

  async getAnaliseDias(robo_id?: number, schema: string = 'uploads_usuarios') {
    const params: any = { schema }
    if (robo_id) params.robo_id = robo_id

    const response = await api.get('/analytics-advanced/analise-dias-ganho-perda', {
      params
    })
    return response.data as AnaliseDias
  },

  async getFiltrosAvancados(filters: {
    robo_id?: number
    schema?: string
    horario_inicio?: string
    horario_fim?: string
    dias_semana?: string
    max_stops_dia?: number
    limite_risco_diario?: number
    meta_ganho_diario?: number
    controle_por_robo?: boolean
  }) {
    const response = await api.get('/analytics-advanced/filtros-avancados', {
      params: { schema: 'uploads_usuarios', ...filters }
    })
    return response.data
  },

  // Dados para gráficos
  async getEquityCurveData(robo_id?: number, schema: string = 'uploads_usuarios') {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id

    const response = await api.get('/operacoes', { params })
    const operacoes = response.data as Operacao[]
    
    // Processar dados para curva de capital
    const sortedOps = operacoes
      .filter(op => op.data_abertura && op.resultado !== null)
      .sort((a, b) => new Date(a.data_abertura).getTime() - new Date(b.data_abertura).getTime())
    
    let cumulative = 0
    return sortedOps.map(op => {
      cumulative += op.resultado
      return {
        date: op.data_abertura,
        value: op.resultado,
        cumulative: cumulative
      }
    })
  },

  async getPerformanceByAsset(robo_id?: number, schema: string = 'uploads_usuarios') {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id

    const response = await api.get('/operacoes', { params })
    const operacoes = response.data as Operacao[]
    
    // Agrupar por ativo
    const byAsset: Record<string, number> = {}
    operacoes.forEach(op => {
      if (op.ativo && op.resultado !== null) {
        byAsset[op.ativo] = (byAsset[op.ativo] || 0) + op.resultado
      }
    })
    
    return Object.entries(byAsset).map(([ativo, resultado]) => ({
      label: ativo,
      value: resultado
    }))
  },

  async getMonthlyPerformance(robo_id?: number, schema: string = 'uploads_usuarios') {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id

    const response = await api.get('/operacoes', { params })
    const operacoes = response.data as Operacao[]
    
    // Agrupar por mês
    const byMonth: Record<string, number> = {}
    operacoes.forEach(op => {
      if (op.data_abertura && op.resultado !== null) {
        const date = new Date(op.data_abertura)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        byMonth[monthKey] = (byMonth[monthKey] || 0) + op.resultado
      }
    })
    
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, resultado]) => ({
        label: month,
        value: resultado
      }))
  },

  async getWinLossDistribution(robo_id?: number, schema: string = 'uploads_usuarios') {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id

    const response = await api.get('/operacoes', { params })
    const operacoes = response.data as Operacao[]
    
    const wins = operacoes.filter(op => op.resultado > 0).length
    const losses = operacoes.filter(op => op.resultado < 0).length
    const breakeven = operacoes.filter(op => op.resultado === 0).length
    
    return [
      { label: 'Ganhos', value: wins, color: '#10b981' },
      { label: 'Perdas', value: losses, color: '#ef4444' },
      { label: 'Empates', value: breakeven, color: '#6b7280' }
    ]
  },

  async getDailyBalanceData(robo_id?: number, schema: string = 'uploads_usuarios') {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id

    const response = await api.get('/operacoes', { params })
    const operacoes = response.data as Operacao[]
    
    // Agrupar por dia
    const byDay: Record<string, { operations: number; totalResult: number }> = {}
    operacoes.forEach(op => {
      if (op.data_abertura && op.resultado !== null) {
        const date = new Date(op.data_abertura)
        const dayKey = date.toISOString().split('T')[0]
        
        if (!byDay[dayKey]) {
          byDay[dayKey] = { operations: 0, totalResult: 0 }
        }
        
        byDay[dayKey].operations += 1
        byDay[dayKey].totalResult += op.resultado
      }
    })
    
    // Converter para array e calcular saldo acumulado
    let cumulativeBalance = 0
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        cumulativeBalance += data.totalResult
        return {
          date,
          balance: cumulativeBalance,
          operations: data.operations
        }
      })
  },

  async getOperationsByMinuteData(robo_id?: number, schema: string = 'uploads_usuarios') {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id

    const response = await api.get('/operacoes', { params })
    const operacoes = response.data as Operacao[]
    
    // Agrupar por minuto do dia
    const byMinute: Record<string, { count: number; totalResult: number }> = {}
    
    operacoes.forEach(op => {
      if (op.data_abertura && op.resultado !== null) {
        const date = new Date(op.data_abertura)
        const hour = date.getHours().toString().padStart(2, '0')
        const minute = date.getMinutes().toString().padStart(2, '0')
        const minuteKey = `${hour}:${minute}`
        
        if (!byMinute[minuteKey]) {
          byMinute[minuteKey] = { count: 0, totalResult: 0 }
        }
        
        byMinute[minuteKey].count += 1
        byMinute[minuteKey].totalResult += op.resultado
      }
    })
    
    // Converter para array com resultado médio
    return Object.entries(byMinute)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([minute, data]) => ({
        minute,
        count: data.count,
        avgResult: data.count > 0 ? data.totalResult / data.count : 0
      }))
  },

  // Upload de arquivos
  async uploadCSV(file: File, robo_id?: number, nome_robo?: string, schema: string = 'uploads_usuarios') {
    const formData = new FormData()
    formData.append('arquivo_csv', file)
    
    const params: any = { schema }
    if (robo_id) params.robo_id = robo_id
    if (nome_robo) params.nome_robo_form = nome_robo

    const response = await api.post('/uploads/csv', formData, {
      params,
      timeout: 30000, // 30 segundos para CSV
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Para mostrar progresso do upload
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        )
        console.log(`Upload progress: ${percentCompleted}%`)
      },
    })
    return response.data
  },

  async uploadExcel(file: File, robo_id?: number, nome_robo?: string, schema: string = 'uploads_usuarios', processar_multiplos_robos: boolean = true) {
    const formData = new FormData()
    formData.append('arquivo_excel', file)
    
    const params: any = { schema, processar_multiplos_robos }
    if (robo_id) params.robo_id = robo_id
    if (nome_robo) params.nome_robo_form = nome_robo

    const response = await api.post('/uploads/excel', formData, {
      params,
      timeout: 60000, // 60 segundos para Excel
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Para mostrar progresso do upload
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        )
        console.log(`Upload progress: ${percentCompleted}%`)
      },
    })
    return response.data
  },

  // Novos endpoints para gráficos avançados
  async getOperationsScatterData(robo_id?: number, schema: string = 'uploads_usuarios') {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id

    const response = await api.get('/operacoes', { params })
    const operacoes = response.data as Operacao[]
    
    // Processar dados para scatter plot
    return operacoes
      .filter(op => op.data_abertura && op.resultado !== null)
      .map(op => {
        const date = new Date(op.data_abertura)
        return {
          hour: date.getHours(),
          minute: date.getMinutes(),
          result: op.resultado,
          time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      })
  },

  async getDailyEvolutionData(robo_id?: number, schema: string = 'uploads_usuarios') {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id

    const response = await api.get('/operacoes', { params })
    const operacoes = response.data as Operacao[]
    
    // Agrupar por dia e processar evolução intraday
    const operacoesPorDia: Record<string, Operacao[]> = {}
    
    operacoes
      .filter(op => op.data_abertura && op.resultado !== null)
      .forEach(op => {
        const date = new Date(op.data_abertura)
        const dayKey = date.toISOString().split('T')[0]
        
        if (!operacoesPorDia[dayKey]) {
          operacoesPorDia[dayKey] = []
        }
        operacoesPorDia[dayKey].push(op)
      })
    
    // Pegar o dia com mais operações para exemplo
    const diasComOperacoes = Object.entries(operacoesPorDia)
    if (diasComOperacoes.length === 0) return []
    
    const [, operacoesDoDia] = diasComOperacoes.reduce((max, current) => 
      current[1].length > max[1].length ? current : max
    )
    
    // Ordenar operações do dia por horário
    const operacoesOrdenadas = operacoesDoDia.sort((a, b) => 
      new Date(a.data_abertura).getTime() - new Date(b.data_abertura).getTime()
    )
    
    // Calcular evolução cumulativa
    let cumulativeResult = 0
    return operacoesOrdenadas.map(op => {
      cumulativeResult += op.resultado
      const date = new Date(op.data_abertura)
      return {
        time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        cumulativeResult,
        operationResult: op.resultado
      }
    })
  },

  // NOVO: Endpoint específico para dados de gráficos por robô
  async getDadosGraficosRobo(robo_id: number, schema: string = 'uploads_usuarios') {
    const response = await api.get('/analytics-advanced/dados-graficos-robo', {
      params: { robo_id, schema }
    })
    return response.data
  }
}

export default apiService 
import axios from 'axios'

// Lê a URL base da API das variáveis de ambiente do Vite.
// Em um arquivo .env na raiz do frontend, você pode definir:
// VITE_API_BASE_URL=http://localhost/api/v1
const baseURL = '/api/v1';

// Criar instância do axios com configurações padrão
export const api = axios.create({
  baseURL: baseURL,
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
  async getOperacoes(schema: string = 'uploads_usuarios', skip: number = 0, limit: number = 100, robo_ids?: string) {
    const params: any = { schema, skip, limit };
    if (robo_ids) {
      params.robo_ids = robo_ids;
    }
    const response = await api.get('/operacoes', { params });
    return response.data as Operacao[];
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
    margem_total?: number,
    robo_ids?: string
  ) {
    const params: any = { schema, contratos }
    if (robo_id) params.robo_id = robo_id
    if (margem_total) params.margem_total = margem_total
    if (robo_ids) params.robo_ids = robo_ids

    const response = await api.get('/analytics-advanced/metricas-financeiras', {
      params
    })
    return response.data as MetricasFinanceiras
  },

  // NOVO: Endpoint para métricas financeiras simplificadas
  async getMetricasFinanceirasSimples(
    robo_ids?: string,
    schema: string = 'uploads_usuarios', 
    contratos: number = 1,
    margem_total?: number
  ) {
    const params: any = { schema, contratos }
    if (margem_total) params.margem_total = margem_total
    if (robo_ids) params.robo_ids = robo_ids

    const response = await api.get('/analytics-advanced/metricas-financeiras-simples', {
      params
    })
    return response.data as MetricasFinanceiras
  },

  async getAnaliseDias(
    robo_id?: number, 
    schema: string = 'uploads_usuarios',
    robo_ids?: string
  ) {
    const params: any = { schema }
    if (robo_id) params.robo_id = robo_id
    if (robo_ids) params.robo_ids = robo_ids

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
  async getEquityCurveData(robo_id?: number, schema: string = 'uploads_usuarios', robo_ids?: string) {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id
    if (robo_ids) params.robo_ids = robo_ids

    const response = await api.get('/operacoes', { params })
    let operacoes = response.data as Operacao[]
    
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

  // Função auxiliar para aplicar filtros de tempo
  applyTimeFilters(operacoes: Operacao[], filters: any): Operacao[] {
    let filtered = operacoes

    // Aplicar filtros de horário
    if (filters.horario_inicio && filters.horario_fim) {
      try {
        const startTime = filters.horario_inicio
        const endTime = filters.horario_fim
        
        filtered = filtered.filter(op => {
          if (!op.data_abertura) return false
          
          const opTime = new Date(op.data_abertura).toTimeString().substring(0, 5) // HH:MM
          return opTime >= startTime && opTime <= endTime
        })
      } catch (error) {
        console.warn('Erro ao aplicar filtro de horário:', error)
      }
    }

    // Aplicar filtros de dias da semana
    if (filters.dias_semana) {
      try {
        const weekdays = filters.dias_semana.split(',').map((d: string) => parseInt(d.trim()))
        
        filtered = filtered.filter(op => {
          if (!op.data_abertura) return false
          
          const date = new Date(op.data_abertura)
          const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay() // Converter domingo (0) para 7
          return weekdays.includes(dayOfWeek)
        })
      } catch (error) {
        console.warn('Erro ao aplicar filtro de dias da semana:', error)
      }
    }

    return filtered
  },

  async getPerformanceByAsset(robo_id?: number, schema: string = 'uploads_usuarios', robo_ids?: string) {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id
    if (robo_ids) params.robo_ids = robo_ids

    const response = await api.get('/operacoes', { params })
    let operacoes = response.data as Operacao[]
    
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

  async getMonthlyPerformance(robo_id?: number, schema: string = 'uploads_usuarios', robo_ids?: string) {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id
    if (robo_ids) params.robo_ids = robo_ids

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

  async getWinLossDistribution(robo_id?: number, schema: string = 'uploads_usuarios', robo_ids?: string) {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id
    if (robo_ids) params.robo_ids = robo_ids

    const response = await api.get('/operacoes', { params })
    let operacoes = response.data as Operacao[]
    
    const wins = operacoes.filter(op => op.resultado > 0).length
    const losses = operacoes.filter(op => op.resultado < 0).length
    const breakeven = operacoes.filter(op => op.resultado === 0).length
    
    return [
      { label: 'Ganhos', value: wins, color: '#10b981' },
      { label: 'Perdas', value: losses, color: '#ef4444' },
      { label: 'Empates', value: breakeven, color: '#6b7280' }
    ]
  },

  async getDailyBalanceData(robo_id?: number, schema: string = 'uploads_usuarios', filters?: any) {
    const params: any = { schema, skip: 0, limit: 10000 }
    if (robo_id) params.robo_id = robo_id

    const response = await api.get('/operacoes', { params })
    let operacoes = response.data as Operacao[]
    
    // Aplicar filtros se fornecidos
    if (filters) {
      operacoes = this.applyTimeFilters(operacoes, filters)
    }
    
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
  async getOperationsScatterData(robo_ids?: string) {
    const params: any = { schema: 'oficial', skip: 0, limit: 10000, robo_ids };
    const response = await api.get('/operacoes', { params });
    const operacoes = response.data as Operacao[];
    
    return operacoes
      .filter(op => op.data_abertura && op.resultado !== null)
      .map(op => {
        const date = new Date(op.data_abertura);
        return {
          hour: date.getHours(),
          minute: date.getMinutes(),
          result: op.resultado,
          time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
      });
  },

  async getDailyEvolutionDataByDay(robo_ids?: string) {
    const params: any = { schema: 'oficial', skip: 0, limit: 10000, robo_ids };
    const response = await api.get('/operacoes', { params });
    const operacoes = response.data as Operacao[];
    
    const operacoesOrdenadas = operacoes
      .filter(op => op.data_abertura && op.resultado !== null)
      .sort((a, b) => new Date(a.data_abertura).getTime() - new Date(b.data_abertura).getTime());
    
    if (operacoesOrdenadas.length === 0) return { series: {}, p80: 0 };
    
    let dailyData: { [key: string]: { time: string; cumulativeResult: number; operationResult: number }[] } = {};
    
    // Agrupa operações por dia e calcula o cumulativo diário
    operacoesOrdenadas.forEach(op => {
      const dateKey = new Date(op.data_abertura).toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = [];
      }
      
      const lastCumulative = dailyData[dateKey].length > 0 ? dailyData[dateKey][dailyData[dateKey].length - 1].cumulativeResult : 0;
      const newCumulative = lastCumulative + op.resultado;
      
      dailyData[dateKey].push({
        time: op.data_abertura,
        cumulativeResult: newCumulative,
        operationResult: op.resultado
      });
    });

    // Retorna os dados de todos os dias
    return {
      series: dailyData,
    };
  },

  async getDailyPeakP80(robo_ids?: string) {
    const params: any = { schema: 'oficial', robo_ids };
    const response = await api.get('/analytics-advanced/pico-diario-p80', { params });
    return response.data.p80 || 0;
  },

  // NOVO: Endpoint para métricas de risco avançadas com múltiplos robôs
  async getMetricasRiscoAvancadas(
    robo_id?: number, 
    schema: string = 'uploads_usuarios', 
    robo_ids?: string
  ) {
    const params: any = { schema };
    if (robo_id) params.robo_id = robo_id;
    if (robo_ids) params.robo_ids = robo_ids;

    const response = await api.get('/analytics-advanced/metricas-risco-avancadas', {
      params
    });
    return response.data;
  },

  // Alias para compatibilidade
  async getAdvancedRiskMetrics(robo_ids?: string, schema: string = 'oficial') {
    return this.getMetricasRiscoAvancadas(undefined, schema, robo_ids);
  },

  // NOVO: Endpoint para simulação de trades
  async getSimulationResults(params: {
    robo_ids?: string;
    stopLoss?: number;
    takeProfit?: number;
    startTime?: string;
    endTime?: string;
    weekdays?: number[];
  }) {
    const queryParams: any = { 
      schema: 'oficial',
      robo_ids: params.robo_ids,
      stop_loss: params.stopLoss,
      take_profit: params.takeProfit,
      start_time: params.startTime,
      end_time: params.endTime,
      weekdays: params.weekdays?.join(','),
    };
    // Remover parâmetros nulos ou indefinidos
    Object.keys(queryParams).forEach(key => queryParams[key] === undefined && delete queryParams[key]);

    const response = await api.get('/analytics-advanced/simulate-trades', {
      params: queryParams
    });
    return response.data as Operacao[];
  },

  async getEquityCurveByRobot(robo_ids: string) {
    const response = await api.get('/analytics-advanced/equity-curve-by-robot', {
      params: { 
        robo_ids,
        schema: 'oficial'
      }
    });
    return response.data as Record<string, { date: string; cumulative: number }[]>;
  },

  // NOVO: Endpoint para simulação por robô
  async simulatePerRobot(robotConfigs: Record<string, any>) {
    // Converter e validar os dados antes de enviar
    const convertedConfigs: Record<string, any> = {};
    
    for (const [robotId, config] of Object.entries(robotConfigs)) {
      if (!config.isActive) continue; // Só processar robôs ativos
      
      convertedConfigs[robotId] = {
        stop_loss: config.stopLoss && config.stopLoss !== '' ? parseFloat(config.stopLoss) : null,
        take_profit: config.takeProfit && config.takeProfit !== '' ? parseFloat(config.takeProfit) : null,
        start_time: config.startTime || null,
        end_time: config.endTime || null,
        start_date: config.startDate || null,
        end_date: config.endDate || null,
        weekdays: config.weekdays && config.weekdays.length > 0 ? config.weekdays : null
      };
    }
    
    console.log('📤 Enviando configurações convertidas para o backend:', convertedConfigs);
    
    const payload = {
      schema_name: 'oficial',
      robot_configs: convertedConfigs
    };
    
    const response = await api.post('/analytics-advanced/simulate-per-robot', payload);
    return response.data as Operacao[];
  },

  // NOVO: Endpoint específico para dados de gráficos por robô
  async getDadosGraficosRobo(robo_id: number, schema: string = 'uploads_usuarios') {
    const response = await api.get('/analytics-advanced/dados-graficos-robo', {
      params: { robo_id, schema }
    })
    return response.data
  },

  // NOVO: Funções para limpeza de dados
  async limparDadosSchema(
    schemaName: string, 
    confirmar: boolean, 
    manterRobos: boolean = false
  ) {
    const response = await api.delete(`/operacoes/limpar-dados/schema/${schemaName}`, {
      data: {
        confirmar,
        manter_robos: manterRobos,
      },
    });
    return response.data;
  },

  async getEstatisticasOperacoes(schema: string = 'oficial') {
    const response = await api.get('/operacoes/estatisticas/geral', {
      params: { schema }
    });
    return response.data;
  },

  async deleteOperacao(operacaoId: number, schema: string = 'uploads_usuarios') {
    const response = await api.delete(`/operacoes/${operacaoId}`, {
      params: { schema }
    });
    return response.data;
  }
}

export default apiService 

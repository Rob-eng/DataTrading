# Implementação de Filtros de Data na Simulação - GPTrading v3.2

## Problema Identificado

A simulação estava limitada aos dados do ano atual ou não permitia configurar intervalos de datas específicos, impedindo análises históricas completas ou testes em períodos específicos.

## Solução Implementada

### 1. Backend - Novos Campos no Modelo de Simulação

**Arquivo**: `backend/app/routers/analytics_advanced.py`

```python
class RobotSimulationParams(BaseModel):
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    weekdays: Optional[List[int]] = None
    start_date: Optional[str] = None  # YYYY-MM-DD
    end_date: Optional[str] = None    # YYYY-MM-DD
```

### 2. Backend - Nova Função de Filtro por Data

```python
@staticmethod
def filter_by_date_range(operacoes: List[models.Operacao], start_date: str, end_date: str) -> List[models.Operacao]:
    """Filtra operações por intervalo de datas (YYYY-MM-DD)"""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        return [op for op in operacoes if op.data_abertura and start <= op.data_abertura.date() <= end]
    except ValueError:
        return operacoes
```

### 3. Backend - Aplicação dos Filtros de Data

Os filtros são aplicados na seguinte ordem:
1. **Filtros de Data** (intervalo de datas)
2. **Filtros de Horário** (dentro do dia)
3. **Filtros de Dias da Semana**
4. **Stop Loss e Take Profit**

```python
# Aplicar filtros de data (intervalo de datas)
if config.start_date and config.end_date:
    logger.info(f"📅 Aplicando filtro de data: {config.start_date} - {config.end_date}")
    operacoes_antes = len(operacoes_filtradas)
    operacoes_filtradas = TemporalAnalyzer.filter_by_date_range(operacoes_filtradas, config.start_date, config.end_date)
    logger.info(f"📅 Filtro de data: {operacoes_antes} → {len(operacoes_filtradas)} operações")
```

### 4. Frontend - Interface de Configuração

**Arquivo**: `frontend/src/pages/Simulation.tsx`

#### Configuração Global
```typescript
{/* Intervalo de Datas */}
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">Intervalo de Datas</label>
  <div className="flex gap-2">
    <input type="date" id="global-start-date" />
    <input type="date" id="global-end-date" />
  </div>
  <div className="text-xs text-gray-500">
    Deixe vazio para usar todos os dados
  </div>
</div>
```

#### Configuração Individual por Robô
```typescript
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">Intervalo de Datas</label>
  <div className="flex gap-2">
    <input 
      type="date" 
      value={config.startDate} 
      onChange={(e) => onConfigChange(robot.id, 'startDate', e.target.value)}
    />
    <input 
      type="date" 
      value={config.endDate} 
      onChange={(e) => onConfigChange(robot.id, 'endDate', e.target.value)}
    />
  </div>
</div>
```

### 5. Frontend - Modelo de Dados Atualizado

```typescript
interface RobotConfig {
  stopLoss: string;
  takeProfit: string;
  startTime: string;
  endTime: string;
  weekdays: number[];
  startDate: string;  // Novo campo
  endDate: string;    // Novo campo
  isActive: boolean;
}
```

### 6. Frontend - Conversão de Dados para API

```typescript
async simulatePerRobot(robotConfigs: Record<string, any>) {
  const convertedConfigs: Record<string, any> = {};
  
  for (const [robotId, config] of Object.entries(robotConfigs)) {
    if (!config.isActive) continue;
    
    convertedConfigs[robotId] = {
      stop_loss: config.stopLoss && config.stopLoss !== '' ? parseFloat(config.stopLoss) : null,
      take_profit: config.takeProfit && config.takeProfit !== '' ? parseFloat(config.takeProfit) : null,
      start_time: config.startTime || null,
      end_time: config.endTime || null,
      start_date: config.startDate || null,  // Novo campo
      end_date: config.endDate || null,      // Novo campo
      weekdays: config.weekdays && config.weekdays.length > 0 ? config.weekdays : null
    };
  }
  // ...
}
```

## Como Usar os Novos Filtros

### 1. Configuração Global
1. Na seção "Configuração Global", preencha os campos:
   - **Data Início**: Data inicial do período (YYYY-MM-DD)
   - **Data Fim**: Data final do período (YYYY-MM-DD)
2. Clique em "Aplicar a Todos" para aplicar a todos os robôs

### 2. Configuração Individual
1. Expanda um robô específico
2. Configure datas individuais que sobrescrevem a configuração global
3. Deixe vazio para usar toda a base de dados

### 3. Exemplos de Uso

#### Testar Apenas 2023
- **Data Início**: 2023-01-01
- **Data Fim**: 2023-12-31

#### Testar Últimos 6 Meses
- **Data Início**: 2024-07-01
- **Data Fim**: 2024-12-31

#### Testar Período Específico
- **Data Início**: 2024-03-15
- **Data Fim**: 2024-06-30

## Logs de Debug

O sistema agora mostra logs detalhados no backend:

```
📅 Aplicando filtro de data: 2023-01-01 - 2023-12-31
📅 Filtro de data: 1250 → 890 operações
⏰ Aplicando filtro de horário: 10:00 - 16:00
⏰ Filtro de horário: 890 → 670 operações
📅 Aplicando filtro de dias da semana: [1, 2, 3]
📅 Filtro de dias da semana: 670 → 402 operações
💰 Aplicando stop loss: 50.0, take profit: 100.0
💰 Stop/Take profit: 402 → 350 operações
```

## Benefícios

1. **Análise Histórica Completa**: Pode usar toda a base de dados histórica
2. **Testes Específicos**: Pode testar estratégias em períodos específicos
3. **Comparação de Períodos**: Pode comparar performance em diferentes épocas
4. **Flexibilidade Total**: Configuração global ou individual por robô
5. **Transparência**: Logs mostram exatamente quantas operações cada filtro remove

## Arquivos Modificados

1. **backend/app/routers/analytics_advanced.py**: Novos campos e filtros de data
2. **frontend/src/pages/Simulation.tsx**: Interface para configuração de datas
3. **frontend/src/services/api.ts**: Conversão de dados para incluir datas
4. **IMPLEMENTACAO_FILTROS_DATA.md**: Esta documentação

## Estado Atual

✅ **Filtros de data implementados no backend**
✅ **Interface de configuração no frontend**
✅ **Conversão de dados adequada**
✅ **Logs de debug para verificação**
✅ **Configuração global e individual**
✅ **Compatibilidade com filtros existentes**

A simulação agora pode usar toda a base de dados histórica ou qualquer período específico configurado pelo usuário. 
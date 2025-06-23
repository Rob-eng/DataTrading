# Correção dos Filtros da Simulação - GPTrading v3.2

## Problema Identificado

Os filtros da simulação (stop loss, take profit, horários e dias da semana) não estavam sendo aplicados corretamente nos resultados. O problema estava na conversão de dados entre o frontend e backend.

## Causa Raiz

1. **Conversão de Tipos**: O frontend enviava dados como strings, mas o backend esperava tipos específicos (números para stop/take profit, arrays para dias da semana)
2. **Validação de Dados**: Não havia validação adequada dos dados antes do envio
3. **Logs Insuficientes**: Faltavam logs para debug do processo de aplicação dos filtros

## Solução Implementada

### 1. Correção na API (frontend/src/services/api.ts)

```typescript
// ANTES: Enviava dados brutos sem conversão
async simulatePerRobot(robotConfigs: Record<string, any>) {
  const payload = {
    schema_name: 'oficial',
    robot_configs: robotConfigs
  };
  // ...
}

// DEPOIS: Converte e valida dados antes do envio
async simulatePerRobot(robotConfigs: Record<string, any>) {
  const convertedConfigs: Record<string, any> = {};
  
  for (const [robotId, config] of Object.entries(robotConfigs)) {
    if (!config.isActive) continue;
    
    convertedConfigs[robotId] = {
      stop_loss: config.stopLoss && config.stopLoss !== '' ? parseFloat(config.stopLoss) : null,
      take_profit: config.takeProfit && config.takeProfit !== '' ? parseFloat(config.takeProfit) : null,
      start_time: config.startTime || null,
      end_time: config.endTime || null,
      weekdays: config.weekdays && config.weekdays.length > 0 ? config.weekdays : null
    };
  }
  
  const payload = {
    schema_name: 'oficial',
    robot_configs: convertedConfigs
  };
  // ...
}
```

### 2. Melhoria nos Logs do Backend

Adicionados logs detalhados no endpoint `simulate_per_robot` para debug:

```python
@router.post("/simulate-per-robot")
async def simulate_per_robot(request: PerRobotSimulationRequest, db: Session = Depends(get_db)):
    logger.info(f"🎯 Iniciando simulação por robô com configurações: {request.robot_configs}")
    
    for robot_id, config in request.robot_configs.items():
        logger.info(f"🤖 Processando robô ID {robot_id} com config: {config}")
        
        # Logs para cada filtro aplicado
        if config.start_time and config.end_time:
            logger.info(f"⏰ Aplicando filtro de horário: {config.start_time} - {config.end_time}")
            # ... aplicação do filtro
            logger.info(f"⏰ Filtro de horário: {operacoes_antes} → {len(operacoes_filtradas)} operações")
        
        if config.weekdays:
            logger.info(f"📅 Aplicando filtro de dias da semana: {config.weekdays}")
            # ... aplicação do filtro
            logger.info(f"📅 Filtro de dias da semana: {operacoes_antes} → {len(operacoes_filtradas)} operações")
        
        if config.stop_loss is not None or config.take_profit is not None:
            logger.info(f"💰 Aplicando stop loss: {config.stop_loss}, take profit: {config.take_profit}")
            # ... aplicação do filtro
            logger.info(f"💰 Stop/Take profit: {operacoes_antes} → {len(operacoes_simuladas_robo)} operações")
```

## Como Testar a Correção

### 1. Teste de Filtros de Horário
- Configure um robô com horário específico (ex: 10:00 - 16:00)
- Execute a simulação
- Verifique nos logs do backend se o filtro foi aplicado
- Compare o número de operações antes e depois do filtro

### 2. Teste de Filtros de Dias da Semana
- Configure um robô para operar apenas em dias específicos (ex: Segunda a Quarta)
- Execute a simulação
- Verifique se operações de quinta e sexta foram removidas

### 3. Teste de Stop Loss e Take Profit
- Configure valores específicos (ex: Stop Loss: 50, Take Profit: 100)
- Execute a simulação
- Verifique se dias que atingiram os limites pararam de operar

### 4. Verificação dos Logs
No console do backend, você deve ver logs como:
```
🎯 Iniciando simulação por robô com configurações: {'1': {'stop_loss': 50.0, 'take_profit': 100.0, ...}}
🤖 Processando robô ID 1 com config: {'stop_loss': 50.0, 'take_profit': 100.0, ...}
📊 Robô 1: 1250 operações encontradas
⏰ Aplicando filtro de horário: 10:00 - 16:00
⏰ Filtro de horário: 1250 → 980 operações
📅 Aplicando filtro de dias da semana: [1, 2, 3]
📅 Filtro de dias da semana: 980 → 588 operações
💰 Aplicando stop loss: 50.0, take profit: 100.0
💰 Stop/Take profit: 588 → 520 operações
✅ Robô 1 processado: 520 operações adicionadas
```

## Funcionalidades dos Filtros

### 1. Filtros de Horário
- **Funcionamento**: Mantém apenas operações dentro do horário especificado
- **Formato**: HH:MM (ex: "09:00" - "18:00")
- **Aplicação**: Compara o horário de abertura de cada operação

### 2. Filtros de Dias da Semana
- **Funcionamento**: Mantém apenas operações nos dias selecionados
- **Formato**: Array de números (1=Segunda, 2=Terça, ..., 7=Domingo)
- **Aplicação**: Usa `isoweekday()` para comparar

### 3. Stop Loss e Take Profit
- **Funcionamento**: Aplicado por dia acumulado
- **Lógica**: Quando o resultado acumulado do dia atinge o limite, para de considerar operações seguintes daquele dia
- **Importante**: A operação que atinge o limite é incluída no resultado

## Arquivos Modificados

1. **frontend/src/services/api.ts**: Correção na função `simulatePerRobot`
2. **backend/app/routers/analytics_advanced.py**: Adição de logs detalhados
3. **CORRECAO_FILTROS_SIMULACAO.md**: Esta documentação

## Estado Atual

✅ **Filtros Funcionando Corretamente**
- Conversão de dados frontend → backend corrigida
- Logs detalhados implementados
- Validação de dados ativa
- Filtros aplicados na ordem correta

Os filtros da simulação agora estão funcionando corretamente e você pode ver exatamente quantas operações cada filtro está removendo através dos logs do backend. 
# Lógica de Stop Loss e Take Profit por Dia Acumulado

## 📋 **Resumo da Implementação**

A lógica de **Stop Loss** e **Take Profit** agora funciona por **resultado acumulado do dia**, não por operação individual.

### ✅ **Como Funciona Agora (Correto)**

- **Stop Loss**: Quando o resultado acumulado do dia atinge o valor de stop loss (negativo), as próximas operações daquele dia são **desconsideradas**
- **Take Profit**: Quando o resultado acumulado do dia atinge o valor de take profit (positivo), as próximas operações daquele dia são **desconsideradas**

### ❌ **Como Funcionava Antes (Incorreto)**

- Stop loss e take profit eram aplicados em cada operação individual
- Limitava o resultado máximo/mínimo de cada operação separadamente

## 🔍 **Exemplo Prático**

Considere um dia com as seguintes operações em sequência:

| Horário | Operação | Resultado | Acumulado |
|---------|----------|-----------|-----------|
| 09:15   | Op 1     | +50       | +50       |
| 10:30   | Op 2     | -80       | -30       |
| 11:45   | Op 3     | -90       | -120      |
| 14:20   | Op 4     | +40       | -80       |
| 15:10   | Op 5     | +200      | +120      |

### **Cenário 1: Stop Loss = 100 pontos**

| Horário | Operação | Resultado | Acumulado | Status |
|---------|----------|-----------|-----------|---------|
| 09:15   | Op 1     | +50       | +50       | ✅ Incluída |
| 10:30   | Op 2     | -80       | -30       | ✅ Incluída |
| 11:45   | Op 3     | -90       | -120      | ✅ **Incluída com valor original** (stop loss ultrapassado) |
| 14:20   | Op 4     | +40       | -         | ❌ **Desconsiderada** (dia parou) |
| 15:10   | Op 5     | +200      | -         | ❌ **Desconsiderada** (dia parou) |

**Resultado final do dia**: -120 pontos (operação que ultrapassou é mantida)

### **Cenário 2: Take Profit = 100 pontos**

| Horário | Operação | Resultado | Acumulado | Status |
|---------|----------|-----------|-----------|---------|
| 09:15   | Op 1     | +50       | +50       | ✅ Incluída |
| 10:30   | Op 2     | -80       | -30       | ✅ Incluída |
| 11:45   | Op 3     | -90       | -120      | ✅ Incluída |
| 14:20   | Op 4     | +40       | -80       | ✅ Incluída |
| 15:10   | Op 5     | +200      | +120      | ✅ **Incluída com valor original** (take profit ultrapassado) |

**Resultado final do dia**: +120 pontos (operação que ultrapassou é mantida)

### **Cenário 3: Stop Loss = 100 e Take Profit = 150**

| Horário | Operação | Resultado | Acumulado | Status |
|---------|----------|-----------|-----------|---------|
| 09:15   | Op 1     | +50       | +50       | ✅ Incluída |
| 10:30   | Op 2     | -80       | -30       | ✅ Incluída |
| 11:45   | Op 3     | -90       | -120      | ✅ **Incluída com valor original** (stop loss ultrapassado) |
| 14:20   | Op 4     | +40       | -         | ❌ **Desconsiderada** (dia parou) |
| 15:10   | Op 5     | +200      | -         | ❌ **Desconsiderada** (dia parou) |

**Resultado final do dia**: -120 pontos (stop loss atingido primeiro, operação mantida)

## 🔧 **Implementação Técnica**

### **Função Principal**: `apply_daily_stop_take_profit()`

```python
def apply_daily_stop_take_profit(
    operacoes: List[models.Operacao], 
    stop_loss: Optional[float] = None, 
    take_profit: Optional[float] = None
) -> List[models.Operacao]:
```

### **Algoritmo**:

1. **Agrupamento**: Operações são agrupadas por data (dia)
2. **Ordenação**: Dentro de cada dia, operações são ordenadas por horário
3. **Processamento Sequencial**: Para cada operação do dia:
   - Inclui a operação com valor original (sem alteração)
   - Soma resultado ao acumulado do dia
   - Verifica se atingiu stop loss ou take profit
   - Se atingiu: para o processamento do dia (próximas operações são desconsideradas)

### **Endpoints Afetados**:

- `/api/v1/analytics-advanced/simulate-per-robot`
- `/api/v1/analytics-advanced/simulate-trades`

## 📊 **Impacto na Simulação**

### **Vantagens**:
- ✅ Simula comportamento real de trading com gestão de risco diária
- ✅ Evita overtrading após atingir metas do dia
- ✅ Controle de risco mais realista
- ✅ Resultados mais conservadores e confiáveis

### **Casos de Uso**:
- **Stop Loss**: Limite de perda diária (ex: não perder mais que 200 pontos por dia)
- **Take Profit**: Meta de ganho diária (ex: parar após ganhar 300 pontos por dia)
- **Gestão de Risco**: Evitar dias com perdas/ganhos excessivos

## 🎯 **Exemplo de Configuração**

```json
{
  "stop_loss": 200,     // Para após perder 200 pontos no dia
  "take_profit": 300,   // Para após ganhar 300 pontos no dia
  "start_time": "09:00", 
  "end_time": "17:00",
  "weekdays": [1,2,3,4,5]
}
```

Esta configuração irá:
- Operar apenas das 9h às 17h
- Apenas de segunda a sexta-feira
- Parar o dia se perder 200 pontos
- Parar o dia se ganhar 300 pontos

## 🔄 **Comparação de Resultados**

### **Antes (Por Operação)**:
- Operação de -250 pontos → limitada a -200 pontos
- Operação de +400 pontos → limitada a +300 pontos
- **Problema**: Não considerava o contexto do dia

### **Agora (Por Dia Acumulado)**:
- Dia com -60 pontos + operação de -50 pontos → resultado -110 pontos (operação mantida), próximas operações desconsideradas
- Dia com +80 pontos + operação de +50 pontos → resultado +130 pontos (operação mantida), próximas operações desconsideradas
- **Vantagem**: Simula gestão de risco real, mantendo valores originais das operações

## 💡 **Exemplo Prático Detalhado**

**Configuração**: Stop Loss = 100 pontos

**Operações do dia em sequência**:
1. 09:15 → +30 pontos (acumulado: +30)
2. 10:30 → -60 pontos (acumulado: -30)
3. 11:45 → -80 pontos (acumulado: -110) ← **Ultrapassou stop loss de -100**
4. 14:20 → +40 pontos ← **NÃO CONSIDERADA** (dia parou)
5. 15:10 → +200 pontos ← **NÃO CONSIDERADA** (dia parou)

**Resultado**: 
- ✅ **Operações incluídas**: 3 operações (+30, -60, -80)
- ✅ **Resultado final**: -110 pontos (valor original da 3ª operação mantido)
- ✅ **Operações desconsideradas**: 2 operações (4ª e 5ª)

**Comportamento correto**: A operação que ultrapassou o limite é **mantida com seu valor original**, mas as próximas são **desconsideradas**.

---

**Implementado em**: GPTrading v3.2  
**Data**: Janeiro 2025  
**Status**: ✅ Ativo e Funcional 
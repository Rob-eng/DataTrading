# Guia Completo de Analytics e Analytics Avançados - GPTrading

## 📊 Visão Geral

Este documento explica detalhadamente todos os cálculos realizados pelos módulos de **Analytics** e **Analytics Avançados** do sistema GPTrading, incluindo exemplos práticos baseados em um cenário real de **5 contratos de Mini Índice** operados por **14 robôs**.

---

## 🎯 Cenário de Exemplo

Para demonstrar todos os cálculos, utilizaremos o seguinte cenário:

- **Ativo:** Mini Índice Futuro (WINM25)  
- **Contratos por robô:** 5 contratos
- **Número de robôs:** 14 robôs
- **Valor do ponto:** R$ 0,20
- **Margem por contrato:** R$ 6.000
- **Margem total por robô:** 5 × R$ 6.000 = **R$ 30.000**
- **Margem total do portfolio:** 14 × R$ 30.000 = **R$ 420.000**

---

## 📈 ANALYTICS BÁSICOS (v2.4)

### 1. Métricas Financeiras

#### 1.1 Conversão Pontos → Reais
```
Fórmula: Resultado_Reais = Pontos × Valor_Ponto × Contratos

Exemplo:
- Operação: +50 pontos
- Contratos: 5  
- Resultado: 50 × 0,20 × 5 = R$ 50,00
```

#### 1.2 Retorno Percentual
```
Fórmula: Retorno% = (Resultado_Reais / Margem_Total) × 100

Exemplo:
- Resultado: R$ 50,00
- Margem: R$ 30.000
- Retorno: (50 / 30.000) × 100 = 0,167%
```

#### 1.3 Resultado Total do Portfolio
```
Cenário: 14 robôs com resultado médio de +50 pontos/dia
- Resultado individual: R$ 50,00
- Resultado total: 14 × R$ 50,00 = R$ 700,00/dia
- Retorno diário: (700 / 420.000) × 100 = 0,167%
- Retorno anualizado: 0,167% × 252 = 42% ao ano
```

### 2. Métricas de Performance

#### 2.1 Taxa de Acerto
```
Fórmula: Taxa_Acerto = (Operações_Positivas / Total_Operações) × 100

Exemplo com 1.000 operações:
- Operações positivas: 650
- Taxa de acerto: (650 / 1.000) × 100 = 65%
```

#### 2.2 Fator de Lucro (Profit Factor)
```
Fórmula: PF = Soma_Ganhos / |Soma_Perdas|

Exemplo:
- Soma de ganhos: R$ 15.000
- Soma de perdas: R$ 8.000
- Profit Factor: 15.000 / 8.000 = 1,875
```

#### 2.3 Expectativa Matemática
```
Fórmula: EM = (Prob_Ganho × Ganho_Médio) - (Prob_Perda × Perda_Média)

Exemplo:
- Taxa acerto: 65% (0,65)
- Ganho médio: R$ 23,08 (15.000/650)
- Perda média: R$ 22,86 (8.000/350)
- EM = (0,65 × 23,08) - (0,35 × 22,86) = R$ 7,00 por operação
```

---

## 🎯 ANALYTICS AVANÇADOS (v3.0)

### 1. Métricas de Risco Profissionais

#### 1.1 Drawdown Máximo
```
Fórmula: DD = (Pico - Vale) / Pico × 100

Cálculo passo a passo:
1. Criar curva de capital acumulada
2. Encontrar picos (máximos locais)
3. Calcular perda desde cada pico
4. Tomar a maior perda percentual

Exemplo:
- Capital inicial: R$ 420.000
- Pico: R$ 450.000  
- Vale subsequente: R$ 405.000
- Drawdown: (450.000 - 405.000) / 450.000 = 10%

Interpretação:
- Excelente: < 10%
- Bom: 10-15%
- Aceitável: 15-20%
- Problemático: > 20%
```

#### 1.2 Sharpe Ratio
```
Fórmula: SR = (Retorno - CDI) / Volatilidade × √252

Cálculo detalhado:
1. Retorno médio diário: 0,167%
2. CDI diário: (1.1085)^(1/252) - 1 = 0,041%
3. Excesso de retorno: 0,167% - 0,041% = 0,126%
4. Volatilidade diária: 1,2% (desvio padrão dos retornos)
5. SR = (0,126% / 1,2%) × √252 = 1,67

Interpretação:
- Excelente: > 2,0
- Bom: 1,0 - 2,0 ✓ (nosso exemplo)
- Regular: 0,5 - 1,0
- Ruim: < 0,5
```

### 2. Maximum Adverse/Favorable Excursion (MAE/MFE)

#### 2.1 Conceito
```
MAE: Maior movimento adverso durante a operação
MFE: Maior movimento favorável durante a operação

Uso prático:
- MAE → Otimizar stop loss
- MFE → Otimizar take profit
```

#### 2.2 Exemplo de Cálculo
```
Operação Long de 09:00 às 17:00:
- Entrada: 120.000 pontos
- Menor preço (12:30): 119.850 pontos → MAE = 150 pontos
- Maior preço (15:45): 120.300 pontos → MFE = 300 pontos
- Saída: 120.200 pontos → Resultado = 200 pontos

Eficiência:
- MAE: 200/150 = 1,33 (ganhou 1,33× o que "sofreu")
- MFE: 200/300 = 0,67 (capturou 67% do potencial)
```

### 3. Análise Sazonal

#### 3.1 Performance Mensal
```
Agregação por mês do ano (Janeiro a Dezembro):

Exemplo de resultado:
- Janeiro: +2,1% (67% acerto, 234 operações)
- Fevereiro: +1,8% (63% acerto, 198 operações)
- Março: +3,2% (71% acerto, 267 operações) ← Melhor mês
- ...
- Dezembro: +0,9% (58% acerto, 189 operações)

Uso: Ajustar exposição em meses historicamente melhores/piores
```

---

## 🔄 Exemplo Prático Completo

### Cenário: Um Dia de Trading (14 robôs, 5 contratos cada)

#### Dados do Dia:
```
09:00 - Início das operações
17:30 - Fim das operações

Resultados por robô (em pontos):
R1: +45,  R2: +62,  R3: -23,  R4: +78,  R5: +34
R6: +12,  R7: +89,  R8: -45,  R9: +56,  R10: +23  
R11: +67, R12: +34, R13: +45, R14: +78

Total em pontos: 555 pontos
Total em reais: 555 × 0,20 × 5 = R$ 555,00
```

#### Cálculos de Performance:

1. **Retorno Diário:**
   ```
   Retorno = 555 / 420.000 × 100 = 0,132%
   ```

2. **Atualização da Curva de Capital:**
   ```
   Capital anterior: R$ 420.000
   Capital atual: R$ 420.555
   Ganho acumulado: +0,132%
   ```

---

## 📊 Comparação com Benchmarks

### CDI vs Portfolio (Anualizado)
```
Portfolio: 42% ao ano
CDI: 10,85% ao ano
Múltiplo: 42% / 10,85% = 3,87×

Análise:
- Portfolio supera CDI em 287%
- Sharpe Ratio: 1,67 (bom)
- Vale o risco adicional? Sim, com gestão adequada
```

---

## ⚠️ Limitações e Considerações

### 1. Dados Necessários
```
Para MAE/MFE: Histórico intraday completo
Para correlações: Pelo menos 30 dias de dados simultâneos
Para VaR: Mínimo 100 observações
Para sazonalidade: Pelo menos 6 meses de histórico
```

### 2. Premissas dos Cálculos
```
- Taxa livre de risco: CDI 10,85% aa
- Dias úteis por ano: 252
- Margem constante (não considera variações)
- Custos de transação não incluídos
- Slippage não considerado
```

---

**Última atualização:** Junho 2025  
**Versão do sistema:** v3.0 
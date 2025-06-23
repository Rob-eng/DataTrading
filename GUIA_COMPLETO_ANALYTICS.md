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

### 3. Análise Temporal

#### 3.1 Performance por Período
```
Agregação por dia:
- Resultado diário = Soma(resultados_do_dia)
- Retorno % diário = Resultado / Margem_Total × 100

Exemplo de dia típico:
- 14 robôs operando
- Resultado médio por robô: +50 pontos
- Total dia: 14 × 50 × 0,20 × 5 = R$ 700
- Retorno: 0,167%
```

### 4. Gestão de Risco

#### 4.1 Controle de Perda Máxima
```
Configuração exemplo:
- Stop Loss diário: R$ 1.000 (por robô)
- Meta de ganho: R$ 2.000 (por robô)
- Max operações/dia: 10 (por robô)

Simulação de resultado:
- Sem controles: R$ 850/dia
- Com controles: R$ 780/dia
- Diferença: -R$ 70/dia (mais estável, menor risco)
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

#### 1.2 Value at Risk (VaR)
```
Método: Percentil histórico da distribuição de retornos

Cálculo:
1. Coletar todos os retornos diários (%)
2. Ordenar do menor para o maior
3. VaR 95% = percentil 5%
4. VaR 99% = percentil 1%

Exemplo com 252 dias de dados:
- Retornos ordenados: [-2.1%, -1.8%, -1.5%, ..., +2.3%]
- VaR 95% (posição 13): -1.5%
- Interpretação: "95% das vezes, a perda não excede 1.5%"
```

#### 1.3 Sharpe Ratio
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

#### 1.4 Sortino Ratio
```
Fórmula: Sortino = (Retorno - CDI) / Volatilidade_Negativa × √252

Diferença do Sharpe: usa apenas volatilidade dos retornos negativos

Cálculo:
1. Filtrar apenas dias negativos
2. Calcular desvio padrão só dos negativos: 0,8%
3. Sortino = (0,126% / 0,8%) × √252 = 2,51

Vantagem: Não penaliza volatilidade de ganhos altos
```

#### 1.5 Calmar Ratio
```
Fórmula: Calmar = Retorno_Anualizado / Drawdown_Máximo

Exemplo:
- Retorno anualizado: 42%
- Drawdown máximo: 10%
- Calmar = 42% / 10% = 4,2

Interpretação:
- Excelente: > 3,0 ✓ (nosso exemplo)
- Bom: 1,5 - 3,0
- Regular: 0,5 - 1,5
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

#### 2.3 Análise Estatística MAE/MFE
```
Com 1.000 operações:
- MAE médio: 45 pontos (R$ 45,00)
- MAE máximo: 180 pontos (R$ 180,00)
- MFE médio: 85 pontos (R$ 85,00)
- MFE máximo: 420 pontos (R$ 420,00)

Insights:
- Stop sugerido: 60 pontos (MAE médio + 1 desvio)
- Take profit sugerido: 150 pontos (baseado na eficiência MFE)
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

#### 3.2 Performance por Hora
```
Análise 0h às 23h:

Exemplo:
- 09:00-10:00: +0,15% médio (melhor horário)
- 12:00-13:00: -0,05% médio (almoço - pior)
- 17:00-18:00: +0,08% médio (fechamento US)

Insight: Concentrar operações em horários mais produtivos
```

#### 3.3 Performance por Dia da Semana
```
Segunda a Domingo:

Exemplo:
- Segunda: +0,12% (início de semana conservador)
- Terça: +0,18% (melhor dia)
- Quarta: +0,15%
- Quinta: +0,14%
- Sexta: +0,08% (mais volátil, fechamento semanal)

Insight: Terça é historicamente o melhor dia
```

### 4. Distribuição Estatística de Retornos

#### 4.1 Estatísticas Básicas
```
Com 2.500 operações:
- Média: +7,50 pontos (R$ 37,50)
- Mediana: +5,00 pontos (R$ 25,00)
- Desvio padrão: 85 pontos (R$ 425,00)
- Mínimo: -450 pontos (R$ -2.250,00)
- Máximo: +680 pontos (R$ 3.400,00)
```

#### 4.2 Quartis e Percentis
```
Distribuição:
- Q1 (25%): -15 pontos → 25% das operações perdem mais que 15 pontos
- Q2 (50%): +5 pontos → Mediana
- Q3 (75%): +45 pontos → 75% das operações ganham menos que 45 pontos

Percentis extremos:
- P5: -180 pontos (5% piores resultados)
- P95: +280 pontos (5% melhores resultados)
```

#### 4.3 Assimetria e Curtose
```
Skewness: +0,35
- Interpretação: Distribuição ligeiramente assimétrica à direita
- Significado: Mais ganhos extremos que perdas extremas (bom sinal)

Kurtosis: +1,82
- Interpretação: Leptocúrtica (mais outliers que distribuição normal)
- Significado: Maior probabilidade de resultados extremos
```

#### 4.4 Teste de Normalidade
```
Shapiro-Wilk:
- Estatística: 0,9823
- P-value: 0,0341
- Resultado: p < 0,05 → Distribuição NÃO é normal

Implicação: Usar métricas robustas (mediana, quartis) além da média
```

#### 4.5 Detecção de Outliers
```
Método IQR:
- IQR = Q3 - Q1 = 45 - (-15) = 60 pontos
- Limite inferior: Q1 - 1,5×IQR = -15 - 90 = -105 pontos
- Limite superior: Q3 + 1,5×IQR = 45 + 90 = +135 pontos

Outliers encontrados: 127 operações (5,1%)
- Negativos: [-450, -380, -290, -156, -120] pontos
- Positivos: [680, 567, 445, 389, 298] pontos
```

### 5. Correlação Entre Robôs

#### 5.1 Matriz de Correlação
```
Exemplo com 5 robôs principais:

       R1    R2    R3    R4    R5
R1   1,00  0,23 -0,15  0,67  0,41
R2   0,23  1,00  0,78  0,12  0,55
R3  -0,15  0,78  1,00 -0,22  0,89
R4   0,67  0,12 -0,22  1,00  0,33
R5   0,41  0,55  0,89  0,33  1,00

Interpretação:
- R3-R5: 0,89 (alta correlação - redundância)
- R1-R3: -0,15 (baixa correlação - boa diversificação)
```

#### 5.2 Análise de Diversificação
```
Portfolio atual (14 robôs):
- Correlação média: 0,34 (moderada)
- Pares alta correlação (>0,7): 8 pares
- Pares baixa correlação (<0,3): 23 pares

Benefício da diversificação:
- Volatilidade individual média: 1,8%
- Volatilidade do portfolio: 1,2%
- Redução de risco: 33%
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

3. **Verificação de Drawdown:**
   ```
   Pico anterior: R$ 421.200
   Capital atual: R$ 420.555
   Drawdown atual: (421.200 - 420.555) / 421.200 = 0,153%
   ```

4. **Atualização VaR:**
   ```
   Adicionar 0,132% à série de retornos diários
   Recalcular percentis 5% e 1%
   ```

5. **Análise Sazonal:**
   ```
   Data: Terça-feira, 15:30
   Adicionar à estatística:
   - Terça-feira: +0,132%
   - Horário 15:00-16:00: +0,132%
   - Mês atual: +0,132%
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

### IBOVESPA vs Portfolio
```
IBOV (hipotético): 15% ao ano
Portfolio: 42% ao ano
Múltiplo: 2,8×

Vantagem: Portfolio supera mercado acionário
Risco: Maior volatilidade (1,2% vs 0,8% diária)
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

### 3. Interpretação Correta
```
- Métricas históricas não garantem performance futura
- Drawdown pode ser maior que o histórico
- Correlações mudam com condições de mercado
- Sazonalidade pode variar entre anos
```

---

## 🚀 Próximos Desenvolvimentos

### 1. Analytics Avançados v3.1 (Planejado)
```
- Monte Carlo para projeções
- Otimização de portfolio (Markowitz)
- Análise de regime de mercado
- Stress testing
```

### 2. Machine Learning Integration
```
- Previsão de drawdowns
- Detecção de anomalias
- Otimização dinâmica de parâmetros
- Clustering de estratégias similares
```

---

## 📞 Suporte e Documentação

Para dúvidas sobre implementação ou interpretação das métricas:

1. Consulte a API `/api/v1/analytics-advanced/explicacoes-calculos`
2. Verifique logs do sistema para debug
3. Teste com dados simulados primeiro

**Última atualização:** Junho 2025  
**Versão do sistema:** v3.0  
**Próxima revisão:** Agosto 2025 
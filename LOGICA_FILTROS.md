# 📊 Lógica dos Filtros Avançados - GPTrading Analytics

## 🎯 Resumo dos Problemas Corrigidos

### 1. **Gráficos por Robô - CORRIGIDO ✅**
- **Problema**: Gráficos mostravam dados gerais para todos os robôs
- **Solução**: Criado endpoint específico `/analytics-advanced/dados-graficos-robo`
- **Resultado**: Cada robô agora mostra seus próprios dados únicos

### 2. **Lógica dos Filtros - DOCUMENTADA ✅**
- **Problema**: Não ficava claro como os filtros funcionavam
- **Solução**: Documentação completa abaixo + interface melhorada

---

## 🔍 Como Funcionam os Filtros

### **Filtros Básicos**

#### 1. **Filtro de Horário**
- **Campo**: Horário Início + Horário Fim
- **Exemplo**: 09:00 - 11:30
- **Função**: Considera apenas operações realizadas entre esses horários
- **Uso**: Identificar melhores horários para operar

#### 2. **Filtro de Dias da Semana**
- **Campo**: Dias da Semana (1,2,3,4,5)
- **Código**: 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado, 7=Domingo  
- **Exemplo**: "1,2,3,4,5" = Segunda a Sexta
- **Função**: Considera apenas operações nos dias especificados
- **Uso**: Analisar performance apenas em dias úteis

---

### **Controles de Risco - A DIFERENÇA PRINCIPAL**

#### 🌍 **CONTROLE GERAL** (Padrão)
- **Como funciona**: Aplica limites ao resultado **conjunto** de todos os robôs
- **Exemplo prático**:
  - Limite de perda diária: R$ 500
  - Robô A: -R$ 200, Robô B: -R$ 150, Robô C: -R$ 100
  - Total: -R$ 450 (ainda dentro do limite)
  - Robô D faz -R$ 100 → Total: -R$ 550 
  - **🛑 PARA TODOS OS ROBÔS** porque o limite conjunto foi atingido

#### 🤖 **CONTROLE POR ROBÔ**
- **Como funciona**: Aplica limites **individualmente** para cada robô
- **Exemplo prático**:
  - Limite de perda diária: R$ 500 **por robô**
  - Robô A: -R$ 200 (continua operando)
  - Robô B: -R$ 150 (continua operando)  
  - Robô C: -R$ 100 (continua operando)
  - Robô D: -R$ 550 → **🛑 PARA APENAS O ROBÔ D**
  - **✅ Robôs A, B, C continuam operando** até atingirem seus próprios limites

---

### **Tipos de Controles Disponíveis**

#### 1. **Limite de Risco Diário**
- **O que faz**: Para operações quando perda diária atinge o limite
- **Geral**: Para todos quando perda conjunta ≥ limite
- **Por Robô**: Para robô individual quando sua perda ≥ limite

#### 2. **Meta de Ganho Diário**
- **O que faz**: Para operações quando ganho diário atinge a meta
- **Geral**: Para todos quando ganho conjunto ≥ meta
- **Por Robô**: Para robô individual quando seu ganho ≥ meta

#### 3. **Máximo de Stops por Dia**
- **O que faz**: Limita quantidade de operações negativas por dia
- **Geral**: Conta stops de todos os robôs juntos
- **Por Robô**: Conta stops individualmente para cada robô

---

## 📈 Interpretação dos Resultados

### **3 Cards de Comparação**

#### 1. **Sem Filtros**
- Resultado original de todas as operações
- Base de comparação

#### 2. **Com Filtros de Horário** 
- Resultado aplicando apenas filtros de tempo
- Mostra impacto dos horários/dias selecionados

#### 3. **Com Controles de Risco**
- Resultado final com todos os controles aplicados
- Mostra quanto seria ganho/perdido com a disciplina

### **Performance por Dia da Semana**
- Quebra os resultados por cada dia útil
- Mostra em qual dia os robôs performam melhor
- Sempre ordenado: Segunda → Sexta

---

## 🎯 Casos de Uso Práticos

### **Cenário 1: Trader Conservador**
```
Controle: Geral
Limite de Risco: R$ 300/dia
Meta de Ganho: R$ 200/dia
Max Stops: 3/dia

Resultado: Sistema para quando TODOS os robôs juntos 
atingem qualquer um dos limites
```

### **Cenário 2: Diversificação de Risco**
```
Controle: Por Robô
Limite de Risco: R$ 150/dia por robô
Meta de Ganho: R$ 100/dia por robô  
Max Stops: 2/dia por robô

Resultado: Cada robô pode operar até seus próprios limites
```

### **Cenário 3: Análise de Horário**
```
Filtros: 09:00 - 11:00 + 14:00 - 16:00
Dias: 1,2,3,4,5 (seg-sex)
Controle: Qualquer um

Resultado: Analisa apenas operações nos horários/dias especificados
```

---

## ⚡ Resumo da Diferença Principal

| Aspecto | Controle Geral | Controle Por Robô |
|---------|---------------|-------------------|
| **Foco** | Resultado conjunto | Resultado individual |
| **Risco** | Compartilhado | Isolado |
| **Uso** | Trading unificado | Diversificação |
| **Exemplo** | "Perdi R$ 500 no total" | "Robô X perdeu R$ 500" |

---

## 🔧 Implementação Técnica

### **Backend**: 
- Endpoint: `/api/v1/analytics-advanced/filtros-avancados`
- Parâmetro chave: `controle_por_robo` (boolean)
- Processamento diferenciado por tipo de controle

### **Frontend**:
- Radio buttons para selecionar tipo de controle
- Explicação visual dos controles
- Cards de comparação dos resultados

---

**Data da documentação**: 16/06/2024  
**Versão**: v2.1 - Filtros Avançados 
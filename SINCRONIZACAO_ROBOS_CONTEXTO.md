# Sincronização da Página de Robôs com Contexto de Trading

## Implementação Concluída ✅

A página de **Robôs** agora está completamente sincronizada com o contexto de trading, permitindo que os cálculos de resultado e retorno sejam baseados nas configurações do usuário.

## Funcionalidades Implementadas

### **1. Integração com Contexto de Trading**

#### **Configurações Sincronizadas:**
- ✅ **Número de Contratos**: Afeta diretamente o valor por ponto
- ✅ **Margem Total**: Base para cálculo de retorno percentual
- ✅ **Valor por Ponto**: Calculado automaticamente (contratos × R$ 0,20)
- ✅ **Perfil de Risco**: Determina valor de garantia por contrato
- ✅ **Schema**: Fonte dos dados (oficial/uploads_usuarios)

#### **Reatividade:**
```typescript
useEffect(() => {
  loadRobots()
}, [selectedSchema, contratos, margemTotal]) // Recarrega quando configurações mudam
```

### **2. Componente de Configurações Integrado**

#### **TradingSettings na Página:**
- Modal completo para configuração de trading
- Cálculos em tempo real da margem necessária
- Perfis de risco predefinidos (Conservador/Moderado/Agressivo)
- Validação de valores e limites

#### **Configurações Disponíveis:**
| Parâmetro | Descrição | Impacto |
|---|---|---|
| **Contratos** | Quantidade por robô | Multiplica resultado em R$ |
| **Perfil de Risco** | Conservador/Moderado/Agressivo | Define valor de garantia |
| **Valor de Garantia** | Por contrato (personalizável) | Base para cálculo de margem |
| **Margem Total** | Calculada automaticamente | Base para retorno % |

### **3. Cálculos Sincronizados**

#### **API Calls com Configurações:**
```typescript
const metricas = await apiService.getMetricasFinanceirasSimples(
  robot.id.toString(),
  selectedSchema,
  contratos,        // Do contexto
  margemTotal      // Do contexto
)
```

#### **Estatísticas Calculadas:**
- **Resultado em R$**: Baseado no número de contratos configurado
- **Retorno %**: `(Total R$ / Margem Total) × 100`
- **Valor por Ponto**: `Contratos × R$ 0,20`
- **Margem Necessária**: `Contratos × Robôs × Valor Garantia`

### **4. Interface Melhorada**

#### **Cards de Estatísticas Atualizados:**
- Mostram configurações atuais (contratos, margem)
- Indicam base de cálculo (valor/ponto)
- Informações contextuais em cada métrica

#### **Card de Configuração Atual:**
```typescript
<div className="card bg-blue-50 border-blue-200">
  <h3>Configuração Atual</h3>
  <div className="grid grid-cols-4 gap-4">
    <div>Contratos: {contratos}</div>
    <div>Margem Total: R$ {margemTotal}</div>
    <div>Valor/Ponto: R$ {valorPorPonto}</div>
    <div>Schema: {selectedSchema}</div>
  </div>
</div>
```

#### **Logs de Debug Detalhados:**
- Configurações atuais a cada carregamento
- Métricas carregadas por robô
- Configurações usadas nos cálculos

## Fluxo de Funcionamento

### **1. Inicialização**
```
1. Carrega contexto de trading (localStorage)
2. Aplica configurações padrão se necessário
3. Carrega robôs do schema selecionado
4. Atualiza robôs disponíveis no contexto
```

### **2. Carregamento de Métricas**
```
Para cada robô:
1. Chama API com configurações do contexto
2. Recebe métricas calculadas com base nas configurações
3. Armazena estatísticas incluindo configurações usadas
4. Exibe resultados sincronizados
```

### **3. Mudança de Configuração**
```
1. Usuário altera configurações no modal
2. Contexto é atualizado automaticamente
3. useEffect detecta mudança
4. Recarrega todas as métricas com novas configurações
5. Interface atualiza com novos valores
```

## Perfis de Risco Implementados

| Perfil | Valor Garantia | Característica |
|---|---|---|
| **Conservador** | R$ 1.000/contrato | Maior margem, menor risco |
| **Moderado** | R$ 500/contrato | Balanceado |
| **Agressivo** | R$ 300/contrato | Menor margem, maior risco |
| **Personalizado** | Valor customizado | Flexibilidade total |

## Exemplos de Cálculo

### **Cenário: 5 contratos, 14 robôs, perfil moderado**
```
Valor por Ponto: 5 × R$ 0,20 = R$ 1,00/ponto
Margem Total: 5 × 14 × R$ 500 = R$ 35.000
Resultado: Operações × R$ 1,00 = Total em R$
Retorno: (Total R$ / R$ 35.000) × 100 = %
```

### **Cenário: 10 contratos, 14 robôs, perfil agressivo**
```
Valor por Ponto: 10 × R$ 0,20 = R$ 2,00/ponto
Margem Total: 10 × 14 × R$ 300 = R$ 42.000
Resultado: Operações × R$ 2,00 = Total em R$
Retorno: (Total R$ / R$ 42.000) × 100 = %
```

## Persistência e Estado

### **LocalStorage:**
- Configurações salvas automaticamente
- Carregadas na inicialização
- Sincronizadas entre páginas

### **Estado Reativo:**
- Mudanças propagam para toda a aplicação
- Recálculos automáticos
- Interface sempre sincronizada

## Próximos Passos Sugeridos

1. **Validação**: Testar diferentes cenários de configuração
2. **Performance**: Implementar cache para evitar recálculos desnecessários
3. **Filtros**: Adicionar filtros por período/tipo de operação
4. **Exportação**: Permitir exportar dados com configurações atuais

---

**Status**: ✅ **Implementação Completa** - Página de robôs totalmente sincronizada com configurações de trading, permitindo análise dinâmica baseada em diferentes cenários de contratos e margem. 
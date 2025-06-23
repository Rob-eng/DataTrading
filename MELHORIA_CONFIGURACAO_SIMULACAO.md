# Melhoria da Configuração de Simulação

## Alterações Implementadas

Conforme solicitado pelo usuário, foram feitas as seguintes modificações na página de simulação:

### 1. Remoção da Seção "Configurações Globais do Sistema"
- ❌ Removida seção azul com configurações de contratos, perfil de risco e margem
- ❌ Removido botão "Editar Configurações" que abria o modal global
- ✅ Foco exclusivo nas configurações específicas da simulação

### 2. Nova Seção "Configuração Global" para Simulação

Implementada uma nova seção que permite configurar e replicar configurações para todos os robôs:

#### **Campos Disponíveis:**
- **Stop Loss**: Campo numérico (pontos)
- **Take Profit**: Campo numérico (pontos)  
- **Horário Início**: Campo de tempo (HH:MM)
- **Horário Fim**: Campo de tempo (HH:MM)
- **Dias da Semana**: Botões toggle (Seg, Ter, Qua, Qui, Sex)
- **Botão "Aplicar a Todos"**: Replica configuração para todos os robôs

#### **Interface da Nova Configuração:**
```typescript
{/* Configuração Global para Replicar */}
<div className="bg-gray-50 p-4 rounded-lg mb-4">
  <h4 className="text-md font-semibold text-gray-800 mb-3">Configuração Global (aplicar a todos os robôs)</h4>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    
    {/* Stop Loss e Take Profit */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Financeiro (Pontos)</label>
      <div className="flex gap-2">
        <input type="number" placeholder="Stop Loss" id="global-stop-loss" ... />
        <input type="number" placeholder="Take Profit" id="global-take-profit" ... />
      </div>
    </div>
    
    {/* Horários */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Horário de Operação</label>
      <div className="flex gap-2">
        <input type="time" id="global-start-time" defaultValue="09:00" ... />
        <input type="time" id="global-end-time" defaultValue="18:00" ... />
      </div>
    </div>
    
    {/* Dias da Semana */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Dias da Semana</label>
      <div className="flex gap-1 flex-wrap" id="global-weekdays">
        {/* Botões toggle para cada dia */}
      </div>
    </div>
    
    {/* Botão Aplicar */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Aplicar Configuração</label>
      <button onClick={aplicarConfigGlobal} className="w-full px-4 py-2 bg-green-600 text-white ...">
        Aplicar a Todos
      </button>
    </div>
    
  </div>
</div>
```

### 3. Funcionalidade "Aplicar a Todos"

#### **Como Funciona:**
1. **Usuário preenche** os campos da configuração global
2. **Seleciona dias** clicando nos botões (azul = selecionado)
3. **Clica "Aplicar a Todos"**
4. **Sistema replica** a configuração para todos os robôs
5. **Configurações individuais** são atualizadas automaticamente

#### **Código da Função:**
```typescript
onClick={() => {
  const stopLoss = (document.getElementById('global-stop-loss') as HTMLInputElement)?.value || '';
  const takeProfit = (document.getElementById('global-take-profit') as HTMLInputElement)?.value || '';
  const startTime = (document.getElementById('global-start-time') as HTMLInputElement)?.value || '09:00';
  const endTime = (document.getElementById('global-end-time') as HTMLInputElement)?.value || '18:00';
  
  // Coletar dias selecionados
  const weekdayButtons = document.querySelectorAll('#global-weekdays button');
  const selectedWeekdays: number[] = [];
  weekdayButtons.forEach(button => {
    if (button.classList.contains('bg-blue-600')) {
      selectedWeekdays.push(parseInt(button.getAttribute('data-day') || '0'));
    }
  });
  
  const globalConfig = {
    stopLoss,
    takeProfit,
    startTime,
    endTime,
    weekdays: selectedWeekdays.length > 0 ? selectedWeekdays : [1, 2, 3, 4, 5],
    isActive: true,
  };
  
  console.log('🌐 Aplicando configuração global:', globalConfig);
  
  const newConfigs: Record<string, RobotConfig> = {};
  availableRobots.forEach((robot) => {
    newConfigs[robot.id.toString()] = { ...globalConfig };
  });
  setRobotConfigs(newConfigs);
}}
```

### 4. Botões de Dias da Semana Interativos

#### **Funcionalidade Toggle:**
```typescript
onClick={(e) => {
  const button = e.target as HTMLButtonElement;
  button.classList.toggle('bg-blue-600');
  button.classList.toggle('border-blue-600');
  button.classList.toggle('text-white');
  button.classList.toggle('bg-transparent');
  button.classList.toggle('border-gray-300');
  button.classList.toggle('text-gray-700');
}}
```

#### **Estados Visuais:**
- **Selecionado**: Fundo azul, borda azul, texto branco
- **Não Selecionado**: Fundo transparente, borda cinza, texto cinza
- **Padrão**: Todos os dias da semana (Seg-Sex) selecionados

### 5. Simplificação das Importações

#### **Removidas:**
```typescript
// Não mais necessárias
selectedRobotIds, contractsPerRobot, riskProfile, totalMargin, openConfigModal
Settings (ícone)
applyGlobalConfig (função antiga)
```

#### **Mantidas:**
```typescript
// Essenciais para simulação
availableRobots
SlidersHorizontal, ChevronDown, ChevronUp, Loader2
```

## Como Usar a Nova Interface

### 1. **Configurar Valores Globais:**
- Preencher Stop Loss (ex: 100)
- Preencher Take Profit (ex: 200)
- Ajustar horários (ex: 09:30 - 17:30)
- Selecionar dias clicando nos botões

### 2. **Aplicar a Todos os Robôs:**
- Clicar no botão verde "Aplicar a Todos"
- Verificar que todos os robôs receberam a configuração
- Expandir robôs individuais para confirmar

### 3. **Configurações Individuais:**
- Ainda é possível expandir cada robô
- Editar configurações específicas por robô
- Configurações individuais sobrescrevem as globais

### 4. **Executar Simulação:**
- Marcar/desmarcar robôs ativos
- Clicar "Executar Simulação"
- Ver resultados com as configurações aplicadas

## Benefícios da Melhoria

1. **Interface Simplificada**: Foco apenas nas configurações de simulação
2. **Facilidade de Uso**: Configuração global com um clique
3. **Flexibilidade**: Ainda permite configurações individuais
4. **Feedback Visual**: Botões interativos para dias da semana
5. **Eficiência**: Aplicar configurações para muitos robôs rapidamente

## Exemplo de Uso Típico

```bash
1. Preencher configuração global:
   - Stop Loss: 150
   - Take Profit: 300
   - Horário: 09:30 - 17:00
   - Dias: Seg, Ter, Qua, Qui, Sex

2. Clicar "Aplicar a Todos"

3. Verificar que todos os robôs receberam a configuração

4. Ajustar robôs específicos se necessário

5. Marcar robôs ativos

6. Executar simulação
```

---

**Status**: ✅ **Melhoria Completa** - Interface de configuração de simulação simplificada e otimizada, com capacidade de replicar configurações para todos os robôs de forma eficiente. 
# Debug das Configurações de Simulação

## Problema Persistente

O usuário ainda não consegue editar as configurações de simulação mesmo após as correções implementadas.

## Sistema de Debug Implementado

Para identificar a causa raiz, implementei um sistema completo de logs e debugging:

### 1. Logs de Inicialização

```typescript
// Inicializar configurações dos robôs
useEffect(() => {
  console.log('🚀 Inicializando configurações dos robôs...');
  console.log('📊 Robôs disponíveis:', availableRobots);
  
  const initialConfigs: Record<string, RobotConfig> = {};
  availableRobots.forEach((robot) => {
    const robotKey = robot.id.toString();
    initialConfigs[robotKey] = { ...defaultRobotConfig };
    console.log(`🤖 Configuração inicial para robô ${robot.nome} (ID: ${robotKey}):`, initialConfigs[robotKey]);
  });
  
  console.log('📝 Configurações iniciais completas:', initialConfigs);
  setRobotConfigs(initialConfigs);
}, [availableRobots]);
```

### 2. Logs do Componente RobotConfigRow

```typescript
// Debug: Log quando o componente renderiza
useEffect(() => {
  console.log(`🔍 RobotConfigRow renderizado para ${robot.nome}:`, {
    robotId: robot.id,
    config: config,
    isOpen: isOpen
  });
}, [robot.id, config, isOpen]);
```

### 3. Logs do Estado Global

```typescript
// Debug: Log do estado atual
useEffect(() => {
  console.log('📊 Estado atual das configurações dos robôs:', robotConfigs);
  console.log('🔢 Número de robôs ativos:', activeRobotsCount);
  console.log('⚙️ Tem configurações personalizadas:', hasCustomConfigs);
}, [robotConfigs, activeRobotsCount, hasCustomConfigs]);
```

### 4. Logs de Renderização Individual

```typescript
{availableRobots.map((robot) => {
  const robotConfig = robotConfigs[robot.id.toString()];
  console.log(`🔍 Renderizando robô ${robot.nome} com config:`, robotConfig);
  return (
    <RobotConfigRow
      key={robot.id}
      robot={robot}
      config={robotConfig || defaultRobotConfig}
      onConfigChange={handleConfigChange}
      onToggleExpanded={toggleExpanded}
      isExpanded={expandedRobots.has(robot.id)}
    />
  );
})}
```

### 5. Botão de Teste

```typescript
<button
  onClick={() => {
    console.log('🧪 Teste: Alterando configuração do primeiro robô');
    if (availableRobots.length > 0) {
      const firstRobot = availableRobots[0];
      handleConfigChange(firstRobot.id, 'stopLoss', '999');
      console.log('🧪 Teste executado para robô:', firstRobot.nome);
    }
  }}
  className="btn-secondary text-sm bg-red-100 hover:bg-red-200"
>
  🧪 Teste
</button>
```

### 6. Estado de Carregamento Visual

```typescript
{Object.keys(robotConfigs).length === 0 ? (
  <div className="text-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
    <p className="text-gray-600">Carregando configurações dos robôs...</p>
  </div>
) : (
  // Renderizar robôs...
)}
```

## Como Usar o Debug

### 1. Abrir Console do Navegador
- Pressionar F12
- Ir para aba "Console"

### 2. Acessar Página de Simulação
- Verificar logs de inicialização:
  ```
  🚀 Inicializando configurações dos robôs...
  📊 Robôs disponíveis: [...]
  🤖 Configuração inicial para robô X (ID: Y): {...}
  📝 Configurações iniciais completas: {...}
  ```

### 3. Expandir um Robô
- Verificar logs de renderização:
  ```
  🔍 RobotConfigRow renderizado para RobôX: {...}
  🔍 Renderizando robô RobôX com config: {...}
  ```

### 4. Tentar Editar um Campo
- Verificar se aparecem logs:
  ```
  Stop Loss alterado para robô X: 150
  🔧 Alterando configuração do robô X: stopLoss = 150
  📝 Nova configuração para robô X: {...}
  ```

### 5. Usar Botão de Teste
- Clicar no botão "🧪 Teste"
- Verificar se os logs aparecem e se o campo é atualizado

## Possíveis Problemas a Investigar

### 1. Robôs Não Carregados
Se aparecer:
```
📊 Robôs disponíveis: []
```
**Problema**: availableRobots está vazio
**Solução**: Verificar se o Dashboard carregou os robôs corretamente

### 2. Configurações Não Inicializadas
Se aparecer:
```
🔍 Renderizando robô X com config: undefined
```
**Problema**: robotConfigs não foi inicializado
**Solução**: Verificar se o useEffect de inicialização executou

### 3. Inputs Não Respondem
Se não aparecerem logs de onChange:
```
Stop Loss alterado para robô X: Y
```
**Problema**: Eventos não estão sendo capturados
**Solução**: Verificar se há conflitos de CSS ou JavaScript

### 4. Estado Não Atualiza
Se aparecer o log mas o visual não muda:
```
🔧 Alterando configuração do robô X: stopLoss = 150
📝 Nova configuração para robô X: {stopLoss: "150", ...}
```
Mas o campo continua vazio
**Problema**: Re-renderização não está funcionando
**Solução**: Verificar keys dos componentes

## Próximos Passos

1. **Executar o debug** com os logs implementados
2. **Identificar onde o fluxo quebra** usando os logs do console
3. **Reportar os logs específicos** que aparecem (ou não aparecem)
4. **Implementar correção direcionada** baseada nos resultados

## Logs Esperados (Fluxo Normal)

```bash
# Ao carregar a página
🚀 Inicializando configurações dos robôs...
📊 Robôs disponíveis: [Array com robôs]
🤖 Configuração inicial para robô X (ID: Y): {stopLoss: "", takeProfit: "", ...}
📝 Configurações iniciais completas: {1: {...}, 2: {...}}

# Ao renderizar
🔍 Renderizando robô X com config: {stopLoss: "", ...}
🔍 RobotConfigRow renderizado para X: {robotId: 1, config: {...}}

# Ao editar
Stop Loss alterado para robô 1: 150
🔧 Alterando configuração do robô 1: stopLoss = 150
📝 Nova configuração para robô 1: {stopLoss: "150", ...}
📊 Estado atual das configurações dos robôs: {1: {stopLoss: "150", ...}}
⚙️ Tem configurações personalizadas: true
```

---

**Status**: 🔍 **Sistema de Debug Implementado** - Aguardando execução dos testes para identificar onde o problema está ocorrendo no fluxo de edição das configurações. 
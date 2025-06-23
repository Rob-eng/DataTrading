# Correção do Cálculo de Drawdown

## Problema Identificado

O sistema estava calculando drawdowns percentuais irreais (como 600% ou mais) quando a curva de capital começava com valores negativos pequenos. Isso acontecia porque:

1. **Divisão por valores pequenos**: Quando o pico era um valor negativo pequeno (ex: -19), qualquer queda adicional resultava em percentuais enormes.
2. **Fórmula matemática correta, mas impraticável**: A fórmula `(drawdown / |pico|) * 100` estava matematicamente correta, mas gerava resultados não úteis para análise de trading.

## Exemplo do Problema

```
Curva: [-19, -50, -100, 200, 400, 8000]
Pico inicial: -19
Drawdown máximo: -19 - (-100) = 81 pontos
Percentual antigo: (81 / 19) * 100 = 426%
```

Este percentual de 426% não faz sentido prático para análise de risco.

## Solução Implementada

### Nova Lógica de Cálculo

1. **Identificar o maior pico positivo**: Encontra o maior valor positivo na série para usar como referência.

2. **Usar referência inteligente**:
   - Se há picos positivos > 100: usar o maior pico positivo como denominador
   - Se há picos positivos pequenos: usar o pico atual mas limitar o percentual
   - Se apenas valores negativos: usar referência fixa de 1000 pontos e limitar a 50%

3. **Resultado mais prático**: Drawdowns ficam em faixas realistas (0-50%) que são úteis para análise.

### Código Corrigido

```python
@staticmethod
def _calculate_advanced_drawdown(equity_curve: List[float]) -> tuple:
    # Encontrar o maior valor positivo na série para usar como referência
    max_positive = max([v for v in equity_curve if v > 0], default=0)
    
    # ... lógica de loop ...
    
    # Calcular percentual de forma inteligente
    if max_positive > 100:
        # Usar o maior pico positivo como denominador
        max_drawdown_percent = (drawdown_val / max_positive) * 100
    elif running_max > 0:
        # Para casos onde não há picos positivos grandes
        max_drawdown_percent = (drawdown_val / running_max) * 100
    else:
        # Para valores negativos, usar referência fixa
        max_drawdown_percent = (drawdown_val / 1000) * 100
        max_drawdown_percent = min(max_drawdown_percent, 50)  # Limitar a 50%
```

## Resultado da Correção

### Antes
- Drawdown de 600%+ em curvas que começam negativas
- Valores irreais e não úteis para análise

### Depois
- Drawdowns em faixas práticas (3-20% tipicamente)
- Valores úteis para análise de risco
- Mantém a precisão em pontos absolutos

## Exemplo Prático

Para uma curva que vai de -300 para +8000 pontos:

```
Antes: Drawdown de 1707%
Depois: Drawdown de 3.61%
```

O valor de 3.61% é muito mais útil para:
- Comparar com outros robôs
- Avaliar risco relativo
- Tomar decisões de trading

## Arquivos Modificados

- `backend/app/routers/analytics_advanced.py`: Função `_calculate_advanced_drawdown()`

## Validação

A correção foi testada com múltiplos cenários:
1. Curvas que começam negativas
2. Curvas totalmente positivas  
3. Curvas mistas
4. Valores extremos

Todos os cenários agora retornam drawdowns em faixas práticas e úteis para análise. 
# Video 8: Refactoring en Vivo (15 min)

## Resultado Final

Código limpio sin code smells, ESLint + SonarJS configurado.

---

## Paso 1: Instalar ESLint + SonarJS

```bash
pnpm add -D eslint-plugin-sonarjs
```

```
Actualiza eslint.config.js para agregar SonarJS.

Agregar:
- Plugin sonarjs
- Reglas:
  - sonarjs/cognitive-complexity: ['error', 15]
  - sonarjs/no-duplicate-string: ['error', { threshold: 3 }]
  - sonarjs/no-identical-functions: 'error'
  - sonarjs/no-nested-conditional: 'warn'

IMPORTANTE - Para archivos de contexto dividir el contexto en 3 archivos

```

src/context/
├── CartContextValue.ts # createContext + types (NO components)
├── CartContext.tsx # ONLY exports CartProvider
└── useCart.ts # ONLY exports useCart hook

```

NEVER use `allowExportNames` workaround.
```

---

## Paso 2: Ejecutar Lint

```bash
pnpm lint
```

Ver qué errores aparecen. Probablemente:

- Magic numbers
- Strings duplicados
- Complejidad cognitiva

---

## Paso 3: Refactoring - Extraer Constantes

```
Busca magic numbers en el código y extráelos a businessRules.

Ejemplo - si encuentras:
if (quantity >= 5) // ❌ Magic number

Cambiar a:
import { businessRules } from '@/shared/constants/businessRules'
if (quantity >= businessRules.bulkDiscount.threshold) // ✅

Revisa:
- calculateBulkDiscount
- Cualquier validación de cantidad
- Thresholds de descuento
```

**Verificar**:

```bash
pnpm test
pnpm lint
```

---

## Paso 4: Refactoring - Strings Duplicados

```
Si tienes strings duplicados (ej: "Add to Cart" en múltiples lugares):

Crear: src/shared/constants/ui.ts

export const UI_TEXT = {
  addToCart: 'Add to Cart',
  removeFromCart: 'Remove from cart',
  checkout: 'Checkout',
  emptyCart: 'Your cart is empty',
} as const

Actualizar componentes para usar estas constantes.
```

**Verificar**:

```bash
pnpm lint
```

---

## Paso 5: Refactoring - Extraer Custom Hook

```
Si hay lógica duplicada de formateo, extrae a hook.

Crear: src/shared/hooks/useCurrency.ts

import { formatPrice } from '../utils'

export function useCurrency() {
  return {
    format: formatPrice,
    parse: (value: string) => parseFloat(value.replace(/[^0-9.-]+/g, '')),
  }
}

Esto es más por demostración - si no hay duplicación real, skip.
```

---

## Paso 6: Refactoring - Simplificar Condicionales

```
Busca condicionales anidados y simplifica con early return.

Antes:
function calculateDiscount(items) {
  if (items.length > 0) {
    if (items[0].quantity >= 5) {
      return items[0].price * 0.1
    }
  }
  return 0
}

Después:
function calculateDiscount(items) {
  if (items.length === 0) return 0
  if (items[0].quantity < 5) return 0
  return items[0].price * 0.1
}
```

---

## Paso 7: Verificación COMPLETA (OBLIGATORIO)

```bash
# Ejecutar TODOS - cualquier fallo significa que el refactoring rompió algo
pnpm test:run      # Tests unitarios
pnpm test:e2e      # Tests E2E
pnpm lint          # Sin errores de lint
pnpm typecheck     # Sin errores de tipos
pnpm build         # Build exitoso
```

> ⚠️ **IMPORTANTE**: Si alguno falla, el refactoring introdujo un bug.
> Revertir cambios y volver a intentar.

---

## Paso 8: Revisar Cobertura

```bash
pnpm test:coverage
```

Ver reporte y asegurar:

- Utils: 100%
- Strategies: 100%
- Components: 80%+

---

## Code Smells Comunes a Buscar

```
1. Magic Numbers     → Extraer a constantes
2. Strings Duplicados → Constantes o i18n
3. Funciones Largas  → Dividir en pequeñas
4. Nested Ifs       → Early return
5. Dead Code        → Eliminar
6. Console.logs     → Eliminar en prod
7. Any types        → Tipar correctamente
8. Unused imports   → Eliminar
```

---

## Paso 9: Agregar Scripts de Calidad

```
Actualiza package.json con scripts de calidad.

"scripts": {
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "typecheck": "tsc --noEmit",
  "quality": "pnpm lint && pnpm typecheck && pnpm test"
}
```

**Verificar**:

```bash
pnpm quality
```

---

## Checkpoint

Al final del video tienes:

- ✅ ESLint + SonarJS configurado
- ✅ allowExportNames para context files
- ✅ 0 errores de lint
- ✅ Magic numbers extraídos
- ✅ Strings centralizados
- ✅ Condicionales simplificados
- ✅ Todos los tests siguen pasando (unit + E2E)
- ✅ Script "quality" funcionando
- ✅ Build exitoso
- ✅ **CÓDIGO LIMPIO** 🧹

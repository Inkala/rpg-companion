# Video 12: Quality Gates + Build Final (15 min)

## Resultado Final
Husky hooks configurados, build de producción listo.

---

## Paso 1: Instalar Husky

```bash
# IMPORTANTE: Husky requiere un repositorio Git inicializado
# Si el proyecto no tiene git, inicializarlo primero:
git init

pnpm add -D husky
pnpm exec husky init
```

> ⚠️ **NOTA**: Si ejecutas `husky init` sin tener git inicializado, fallará.
> Asegúrate de que existe `.git/` en el proyecto antes de continuar.

Esto crea `.husky/` con un hook `pre-commit` de ejemplo.

---

## Paso 2: Pre-commit Hook

```
Configura pre-commit para lint + typecheck.

Editar .husky/pre-commit:

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Lint
echo "📝 Checking lint..."
pnpm lint || exit 1

# Typecheck
echo "🔷 Checking types..."
pnpm typecheck || exit 1

echo "✅ Pre-commit checks passed!"
```

---

## Paso 3: Pre-push Hook

```
Crea pre-push para tests + build.

Crear .husky/pre-push:

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🚀 Running pre-push checks..."

# Unit tests
echo "🧪 Running tests..."
pnpm test -- --run || exit 1

# Build
echo "📦 Building..."
pnpm build || exit 1

echo "✅ Pre-push checks passed!"
```

Hacer ejecutable:
```bash
chmod +x .husky/pre-push
```

---

## Paso 4: Scripts de Quality

```
Actualiza package.json con scripts completos:

"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "typecheck": "tsc --noEmit",
  "test": "vitest",
  "test:run": "vitest --run",
  "test:coverage": "vitest --coverage",
  "test:e2e": "playwright test",
  "quality": "pnpm lint && pnpm typecheck && pnpm test:run",
  "verify": "pnpm quality && pnpm test:e2e && pnpm build",
  "prepare": "husky"
}

NOTA: El script "verify" es el comando maestro que ejecuta TODO:
- lint
- typecheck  
- unit tests
- e2e tests
- build

Usar `pnpm verify` al final de cada video para asegurar calidad.
```

---

## Paso 5: Verificar Hooks

```bash
# Probar pre-commit
git add .
git commit -m "test: verify hooks"

# Si hay errores de lint/types, el commit falla ✅

# Probar pre-push (si tienes remote)
git push

# Si tests fallan, el push falla ✅
```

---

## Paso 6: Coverage Thresholds

```
Configura thresholds de coverage en vitest.config.ts:

export default defineConfig({
  // ... otras configs
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
      ],
    },
  },
})
```

```bash
pnpm test:coverage
```

---

## Paso 7: Configurar tsconfig para Build

```
IMPORTANTE: El build puede fallar si TSC intenta compilar archivos de test.

Actualizar tsconfig.app.json para excluir tests:

{
  "compilerOptions": {
    // ... opciones existentes
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test"]
}

NOTA sobre verbatimModuleSyntax:
Si tsconfig tiene "verbatimModuleSyntax": true, los imports de tipos
deben usar la keyword `type`:

// ❌ Error con verbatimModuleSyntax
import { ReactNode } from 'react'

// ✅ Correcto
import type { ReactNode } from 'react'
// o
import { type ReactNode } from 'react'
```

---

## Paso 8: Build de Producción

```bash
# Build
pnpm build

# Preview local
pnpm preview
```

Verificar en http://localhost:4173 que todo funciona.

---

## Paso 9: Revisar Bundle Size

```
Agrega análisis de bundle (opcional).

pnpm add -D rollup-plugin-visualizer

En vite.config.ts:
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, gzipSize: true }),
  ],
})

pnpm build
# Abre stats.html con visualización del bundle
```

---

## Paso 10: Resumen de Métricas

```bash
# Ver métricas del proyecto
echo "📊 Project Metrics"
echo "=================="

# Tests
echo "🧪 Tests:"
pnpm test:run 2>&1 | tail -5

# Coverage
echo "\n📈 Coverage:"
pnpm test:coverage 2>&1 | grep -E "All files|Statements|Branches|Functions|Lines"

# Lint
echo "\n📝 Lint issues:"
pnpm lint 2>&1 | grep -c "problem" || echo "0 problems"

# Bundle size
echo "\n📦 Bundle size:"
ls -lh dist/assets/*.js | awk '{print $5, $9}'
```

---

## Paso 11: Verificación FINAL del Proyecto Completo

```bash
# Ejecutar verificación completa con UN comando:
pnpm verify
```

Este comando ejecuta:
1. `pnpm lint` - 0 errores de lint
2. `pnpm typecheck` - 0 errores de tipos
3. `pnpm test:run` - Todos los tests unitarios pasan
4. `pnpm test:e2e` - Todos los E2E tests pasan
5. `pnpm build` - Build de producción exitoso

```
Verificación manual adicional:

✅ pnpm dev         → App funciona en desarrollo
✅ pnpm preview     → App funciona en producción (después del build)

✅ Pre-commit hook  → Bloquea commits con errores
✅ Pre-push hook    → Bloquea push si tests fallan

✅ Sentry           → Errores se reportan
✅ Accesibilidad    → Score 90+ en Lighthouse
✅ Coverage         → 80%+ en todas las métricas
```

---

## Resumen del Proyecto Completo

```
📁 simple-product-shop/
├── src/
│   ├── features/
│   │   ├── product-catalog/    # ProductCard, ProductCatalog
│   │   ├── shopping-cart/      # CartItem, CartSummary, ShoppingCart
│   │   └── auth/               # LoginDemo, PasswordInput
│   ├── shared/
│   │   ├── types/              # Product, CartItem
│   │   ├── utils/              # formatPrice, calculateSubtotal, validatePassword
│   │   ├── strategies/         # DiscountStrategy, BulkDiscount, OrderDiscount
│   │   ├── constants/          # businessRules
│   │   └── components/         # Skeleton, Toast
│   ├── context/                # CartContext
│   ├── infrastructure/         # sentry, env, ErrorBoundary
│   └── test/                   # setup
├── e2e/
│   ├── pages/                  # Page Objects
│   └── *.spec.ts               # E2E tests
├── .husky/                     # Git hooks
└── vitest.config.ts            # Test config

📊 Métricas:
- ~60 unit/integration tests
- ~7 E2E tests
- 80%+ coverage
- 0 lint errors
- Build < 200KB gzipped
- Lighthouse A11y 90+
```

---

## Checkpoint Final

Al final del video tienes:
- ✅ Husky con pre-commit y pre-push
- ✅ Quality gates bloqueando código malo
- ✅ Coverage thresholds configurados
- ✅ Build de producción funcionando
- ✅ Bundle size optimizado
- ✅ Checklist completo verificado
- ✅ **PROYECTO LISTO PARA PRODUCCIÓN** 🚀

---

## ¡Felicitaciones! 🎉

Has construido una aplicación completa aplicando:
- ✅ TDD (Test-Driven Development)
- ✅ Testing (Unit, Integration, E2E)
- ✅ Clean Code (Refactoring, no smells)
- ✅ Design Patterns (Strategy, Factory)
- ✅ Security (Password validation, Env)
- ✅ Accessibility (WCAG AA)
- ✅ UX (Skeletons, Optimistic UI)
- ✅ Observability (Sentry)
- ✅ Quality Gates (Husky)

**Todo con asistencia de IA.** 🤖

# Video 11: Observabilidad con Sentry (15 min)

## Resultado Final
Error tracking y performance monitoring funcionando.

---

## Paso 1: Crear Cuenta y Proyecto en Sentry

```
1. Ir a https://sentry.io
2. Crear cuenta gratuita (o usar existente)
3. Crear nuevo proyecto: React
4. Copiar el DSN
```

---

## Paso 2: Instalar Sentry

```bash
pnpm add @sentry/react
```

---

## Paso 3: Configurar Sentry

```
Crea la configuración de Sentry.

Ubicación: src/infrastructure/sentry.ts

import * as Sentry from '@sentry/react'

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!dsn) {
    console.warn('Sentry DSN not configured')
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_ENV || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}
```

---

## Paso 4: Variables de Entorno

```
Crear .env.local:

VITE_SENTRY_DSN=tu-dsn-aqui
VITE_ENV=development

Agregar a .gitignore:
.env.local

Crear .env.example:
VITE_SENTRY_DSN=
VITE_ENV=development
```

---

## Paso 5: Inicializar en main.tsx

```
Actualiza main.tsx para inicializar Sentry PRIMERO.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initSentry } from './infrastructure/sentry'
import App from './App'
import './index.css'

// Inicializar Sentry ANTES de todo
initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

## Paso 6: Error Boundary

```
Crea Error Boundary con Sentry.

Ubicación: src/infrastructure/SentryErrorBoundary.tsx

import * as Sentry from '@sentry/react'
import type { ReactNode } from 'react'

// IMPORTANTE: Sentry pasa error como `unknown`, no como `Error`
// Usar render function pattern en vez de pasar componente directo

function ErrorFallback({ error, resetError }: { error: unknown; resetError: () => void }) {
  // Type guard para obtener mensaje seguro
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">{errorMessage}</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={resetError}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Try again
          </button>
          <button
            onClick={() => Sentry.showReportDialog()}
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            Report feedback
          </button>
        </div>
      </div>
    </div>
  )
}

export function SentryErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => <ErrorFallback error={error} resetError={resetError} />}
      showDialog
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
```

---

## Paso 7: Envolver App con Error Boundary

```
Actualiza main.tsx:

import { SentryErrorBoundary } from './infrastructure/SentryErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SentryErrorBoundary>
      <CartProvider>
        <App />
      </CartProvider>
    </SentryErrorBoundary>
  </StrictMode>,
)
```

---

## Paso 8: Breadcrumbs para Cart Actions

```
Agrega breadcrumbs a las acciones del carrito.

En CartContext, después de cada acción:

import * as Sentry from '@sentry/react'

// En addItem:
Sentry.addBreadcrumb({
  category: 'cart',
  message: `Added ${product.name} to cart`,
  level: 'info',
  data: { productId: product.id, productName: product.name }
})

// En removeItem:
Sentry.addBreadcrumb({
  category: 'cart',
  message: `Removed item ${productId} from cart`,
  level: 'info',
})

// En clearCart:
Sentry.addBreadcrumb({
  category: 'cart',
  message: 'Cleared cart',
  level: 'info',
})
```

---

## Paso 9: User Context

```
Agrega contexto de usuario cuando hace login.

En LoginDemo, después de login exitoso:

import * as Sentry from '@sentry/react'

// Después de login exitoso:
Sentry.setUser({
  email: email,
  id: 'demo-user-123',
})

// En logout:
Sentry.setUser(null)
```

---

## Paso 10: Botón de Test (Solo Dev)

```
Crea botón para probar que Sentry funciona.

En App o Header (solo en development):

{import.meta.env.DEV && (
  <button
    onClick={() => {
      throw new Error('Test error from React')
    }}
    className="bg-red-500 text-white px-2 py-1 text-sm rounded"
  >
    Test Error
  </button>
)}
```

---

## Paso 11: Verificar en Dashboard

```
1. pnpm dev
2. Click en "Test Error"
3. Ir a Sentry dashboard
4. Ver el error con:
   - Stack trace
   - Breadcrumbs de acciones previas
   - User context (si logueado)
   - Session replay
```

---

## Paso 12: Performance Monitoring (Bonus)

```
Ver métricas de performance en Sentry:

1. Dashboard → Performance
2. Ver Core Web Vitals:
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)

Ya está configurado con browserTracingIntegration().
```

---

## Paso 13: Verificación COMPLETA (OBLIGATORIO)

```bash
pnpm test:run      # Tests unitarios
pnpm test:e2e      # Tests E2E
pnpm lint          # Sin errores de lint
pnpm typecheck     # Sin errores de tipos
pnpm build         # Build exitoso
```

> ⚠️ Sentry es infraestructura, pero igual debemos verificar que no rompimos nada.

---

## Checkpoint

Al final del video tienes:
- ✅ Sentry SDK instalado
- ✅ Error boundary funcionando
- ✅ Breadcrumbs en cart actions
- ✅ User context en login
- ✅ Session replay habilitado
- ✅ Error de prueba enviado
- ✅ Performance monitoring activo
- ✅ Verificación completa pasando
- ✅ **OBSERVABILIDAD** 👁️

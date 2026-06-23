# Curso de IA: Desarrollo de Calidad con React

Este repositorio contiene dos cursos complementarios para aprender desarrollo profesional con asistencia de IA.

---

## Ruta de Aprendizaje Recomendada

### 1. Master: Fundamentos de Calidad (29 lecciones)

**Primero**, completa el master que enseña los conceptos teóricos y prácticos de calidad de software:

- [Ver Master Completo](./ai-course/README.md)

El master cubre:
- Testing (Unit, Integration, E2E)
- TDD (Test-Driven Development)
- Refactoring y Code Smells
- Métricas y Cobertura Estratégica
- Seguridad (OWASP Top 10)
- Observabilidad (Sentry)
- Accesibilidad (WCAG 2.1 AA)
- UX Excellence

**Resultado**: 167 tests unitarios + 21 E2E, OWASP implementado, accesibilidad completa.

---

### 2. Video Course: Construcción Práctica (12 capítulos)

**Después**, aplica todo lo aprendido construyendo una app desde cero con prompts de IA:

Este curso te guiará paso a paso para construir una aplicación e-commerce completa llamada **Simple Product Shop** utilizando un agente de IA como asistente de programación.

**Duración total**: ~3 horas (12 capítulos × ~15 minutos cada uno)

**Resultado final**: Una tienda online funcional con carrito de compras, sistema de descuentos, testing completo, accesibilidad y observabilidad.

---

## Stack Tecnológico

- **Frontend**: React 19 + TypeScript + Vite
- **Estilos**: Tailwind CSS v4
- **Testing**: Vitest + Testing Library + Playwright
- **Calidad**: ESLint + SonarJS + jsx-a11y
- **Observabilidad**: Sentry
- **Git Hooks**: Husky

---

## Cómo Usar este Curso

### 1. Inicia tu Sesión con el Contexto

Al comenzar cada sesión de trabajo, copia y pega el siguiente prompt en tu agente de IA:

```
Vamos a construir juntos una aplicación e-commerce llamada "Simple Product Shop".

SOBRE EL PROYECTO:
- Tienda online simple con catálogo de productos y carrito de compras
- Stack: React + TypeScript + Vite + Tailwind CSS v4
- Testing: Vitest + Testing Library + Playwright (E2E)

METODOLOGÍA DE TRABAJO:

1. TDD (Test-Driven Development):
   - Siempre escribir el test PRIMERO
   - Verificar que FALLA (Red)
   - Implementar código MÍNIMO para pasar (Green)
   - Refactorizar si es necesario

2. Scope Rule para organización de carpetas:
   - GLOBAL SCOPE (src/shared/): Código usado en múltiples features
     → types/, utils/, constants/, components/, strategies/, hooks/
   - LOCAL SCOPE (src/features/X/): Código específico de una feature
     → product-catalog/, shopping-cart/, auth/
   - Context global: src/context/
   - Infraestructura: src/infrastructure/

3. Verificación continua:
   - Después de cada feature: pnpm test:run && pnpm build
   - Después de E2E (video 7+): agregar pnpm test:e2e
   - Al final: pnpm verify (lint + typecheck + tests + e2e + build)

MI ROL COMO ESTUDIANTE:
- Te daré los REQUISITOS de lo que necesito
- Tú generas el código basándote en esos requisitos
- Yo ejecuto, verifico que funciona, y continuamos

TU ROL COMO ASISTENTE:
- NO me des código que no te pida
- Cuando pida un TEST, genera SOLO el test
- Cuando pida la IMPLEMENTACIÓN, genera SOLO la implementación
- Sigue las convenciones del proyecto (Scope Rule, TDD, etc.)
- Si algo no está claro, pregunta antes de generar

REGLAS DE CÓDIGO:
- TypeScript estricto
- Tailwind CSS para estilos
- Testing Library con queries accesibles (getByRole > getByTestId)
- Componentes funcionales con hooks
- Nombres descriptivos en inglés

¿Entendido? Cuando confirmes, comenzamos con el primer paso.
```

### 2. Navega a Cada Video

Cada video tiene su propio archivo con prompts específicos:

| Capítulo | Archivo                                                                                       | Contenido                                |
| -------- | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 01       | [video-01-setup.md](./Prompts%20Práctico%20Live/video-01-setup.md)                            | Setup del proyecto + ProductCard con TDD |
| 02       | [video-02-catalog.md](./Prompts%20Práctico%20Live/video-02-catalog.md)                        | Tipos TypeScript + ProductCatalog        |
| 03       | [video-03-business-logic.md](./Prompts%20Práctico%20Live/video-03-business-logic.md)          | TDD para lógica de negocio (utils)       |
| 04       | [video-04-cart-components.md](./Prompts%20Práctico%20Live/video-04-cart-components.md)        | CartItem + CartSummary con TDD           |
| 05       | [video-05-cart-context.md](./Prompts%20Práctico%20Live/video-05-cart-context.md)              | CartContext + Carrito funcional          |
| 06       | [video-06-discounts.md](./Prompts%20Práctico%20Live/video-06-discounts.md)                    | Strategy Pattern para descuentos         |
| 07       | [video-07-e2e.md](./Prompts%20Práctico%20Live/video-07-e2e.md)                                | Playwright + Page Objects                |
| 08       | [video-08-refactoring.md](./Prompts%20Práctico%20Live/video-08-refactoring.md)                | ESLint + SonarJS + Refactoring           |
| 09       | [video-09-auth-security.md](./Prompts%20Práctico%20Live/video-09-auth-security.md)            | Validación de password + Login           |
| 10       | [video-10-a11y-ux.md](./Prompts%20Práctico%20Live/video-10-a11y-ux.md)                        | Accesibilidad + Skeleton + Toast         |
| 11       | [video-11-sentry.md](./Prompts%20Práctico%20Live/video-11-sentry.md)                          | Error tracking con Sentry                |
| 12       | [video-12-quality-gates.md](./Prompts%20Práctico%20Live/video-12-quality-gates.md)            | Husky + Build de producción              |

### 3. Flujo de Trabajo por Capítulo

Para cada capítulo:

1. **Abre el archivo** del capítulo correspondiente
2. **Ejecuta los prompts** uno por uno en orden
3. **Verifica** que cada paso funciona antes de continuar
4. **Al final** del capítulo, ejecuta la verificación:

```bash
# Capítulos 1-6:
pnpm test:run && pnpm build

# Capítulos 7-12:
pnpm verify
```

---

## Reglas de Negocio del Proyecto

```
DESCUENTO POR CANTIDAD (Bulk Discount):
├── Umbral: 5+ unidades del mismo producto
└── Descuento: 10% en ese producto

DESCUENTO POR ORDEN (Order Discount):
├── Umbral: Subtotal $100+
└── Descuento: 15% adicional en el total
```

---

## Metodología TDD

A partir del Capítulo 3, aplicamos TDD en toda la lógica de negocio:

```
1. RED:    Escribir test PRIMERO → ejecutar → DEBE FALLAR
2. GREEN:  Implementar código MÍNIMO para pasar el test
3. REFACTOR: Mejorar el código manteniendo tests verdes
```

**Capítulos que aplican TDD**: 01, 03, 04, 05, 06, 09, 10

---

## Estructura Final del Proyecto

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
│   ├── context/                # CartContext (3 archivos)
│   ├── infrastructure/         # sentry, ErrorBoundary
│   └── test/                   # setup
├── e2e/
│   ├── pages/                  # Page Objects
│   └── *.spec.ts               # E2E tests
├── .husky/                     # Git hooks
└── configs...                  # vite, vitest, playwright, etc.
```

---

## Métricas Objetivo

Al finalizar los 12 capítulos tendrás:

- ~100 tests unitarios/integración
- ~7 tests E2E
- 80%+ cobertura de código
- 0 errores de lint

---

## Comandos Principales

```bash
# Desarrollo
pnpm dev                    # Servidor de desarrollo

# Testing
pnpm test                   # Tests unitarios (watch)
pnpm test:run               # Tests sin watch
pnpm test:coverage          # Con cobertura
pnpm test:e2e               # Tests E2E con Playwright

# Calidad
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript
pnpm quality                # lint + typecheck + test:run
pnpm verify                 # quality + e2e + build

# Build
pnpm build                  # Build de producción
pnpm preview                # Preview del build
```

---

## Para Retomar una Sesión

Si pausaste y quieres continuar después, usa este prompt:

```
Continuamos con el proyecto "Simple Product Shop".

Estado actual:
- Capítulo [X] completado
- Tests pasando: [N] unit + [M] e2e
- Último componente creado: [nombre]

Vamos a continuar con [siguiente paso del capítulo].

Recuerda:
- TDD: test primero, implementación después
- Scope Rule: shared/ = global, features/X/ = local
- Solo genera lo que te pido
```

---

## Prácticas que Aprenderás

- TDD (Test-Driven Development)
- Testing (Unit, Integration, E2E)
- Clean Code (Refactoring, code smells)
- Design Patterns (Strategy Pattern)
- Security (Password validation)
- Accessibility (WCAG AA)
- UX (Skeletons, Optimistic UI, Toast)
- Observability (Sentry)
- Quality Gates (Husky hooks)

---

## Checklist Final

Antes de considerar el proyecto completo, verifica:

```
✅ pnpm dev         → App funciona en desarrollo
✅ pnpm lint        → 0 errores
✅ pnpm typecheck   → 0 errores
✅ pnpm test:run    → Todos los tests pasan
✅ pnpm test:e2e    → E2E tests pasan
✅ pnpm build       → Build exitoso
✅ pnpm preview     → App funciona en producción

✅ Pre-commit hook  → Bloquea commits con errores
✅ Pre-push hook    → Bloquea push si tests fallan

✅ Sentry           → Errores se reportan
✅ Accesibilidad    → Score 90+ en Lighthouse
✅ Coverage         → 80%+ en todas las métricas
```

---

## Referencia: Proyecto Resuelto en Live

La carpeta `Práctico Resuelto en Live/simple-product-shop/` contiene el proyecto terminado como referencia. Fue creado en vivo siguiendo exactamente estos mismos pasos con asistencia de IA.

Puedes consultarlo si tienes dudas, pero el objetivo es que construyas tu propia versión paso a paso.

---

## Recursos Adicionales

- [00-context-prompt.md](./Prompts%20Práctico%20Live/00-context-prompt.md) - Prompt de contexto completo
- [00-overview.md](./Prompts%20Práctico%20Live/00-overview.md) - Visión general del curso
- [00-validation-questions.md](./Prompts%20Práctico%20Live/00-validation-questions.md) - Preguntas para validar tu aprendizaje

---

## Estructura del Repositorio

```
📁 ai-course-Big-School/
├── ai-course/                      # Master de 29 lecciones (teoría + práctica)
│   ├── README.md                   # Documentación completa del master
│   ├── docs/slides/                # Slides de cada lección
│   └── src/                        # Código de referencia
│
├── Prompts Práctico Live/          # Prompts del práctico (12 capítulos)
│   ├── video-01-setup.md           # Prompts para cada capítulo
│   ├── video-02-catalog.md
│   └── ...
│
└── Práctico Resuelto en Live/      # Proyecto resultante del live
    └── simple-product-shop/        # App construida durante el live
```

---

## Links Rápidos

| Recurso | Descripción |
|---------|-------------|
| [Master (29 lecciones)](./ai-course/README.md) | Curso completo de fundamentos |
| [Prompts del Práctico (12 capítulos)](./Prompts%20Práctico%20Live/) | Prompts para construcción con IA |
| [Proyecto Resuelto en Live](./Práctico%20Resuelto%20en%20Live/simple-product-shop/) | App terminada como referencia |

# Prompt de Contexto del Proyecto

> **Usa este prompt al inicio de cada sesión para dar contexto a la IA**

---

## El Prompt

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

---

## Versión Corta (para recordar en medio de la sesión)

```
Recuerda:
- TDD: test primero, implementación después
- Scope Rule: shared/ = global, features/X/ = local
- Solo genera lo que te pido (test O implementación, no ambos)
- Verificar con: pnpm test:run && pnpm build
```

---

## Para Retomar una Sesión

```
Continuamos con el proyecto "Simple Product Shop".

Estado actual:
- Video [X] completado
- Tests pasando: [N] unit + [M] e2e
- Último componente creado: [nombre]

Vamos a continuar con [siguiente paso].

Recuerda:
- TDD: test primero, implementación después  
- Scope Rule: shared/ = global, features/X/ = local
- Solo genera lo que te pido
```

---

## Notas para el Instructor

Este prompt establece:

1. **Contexto del proyecto** - Qué estamos construyendo y con qué tecnologías
2. **Metodología TDD** - El estudiante entiende el ciclo Red-Green-Refactor
3. **Scope Rule** - Organización clara de carpetas
4. **Roles definidos** - El estudiante da requisitos, la IA genera código
5. **Límites claros** - La IA no genera más de lo pedido
6. **Verificación** - Siempre correr tests después de cada paso

El estudiante aprende a:
- Comunicar requisitos claramente
- Trabajar en pasos pequeños e incrementales
- Verificar antes de continuar
- Usar la IA como herramienta, no como muleta

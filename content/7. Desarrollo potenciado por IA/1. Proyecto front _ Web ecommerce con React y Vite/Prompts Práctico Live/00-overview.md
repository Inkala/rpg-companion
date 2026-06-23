# Curso de Video: E-Commerce con IA (100% Construcción)

## Resumen

**Duración total**: 3 horas (12 videos × 15 minutos)
**Proyecto final**: Simple Product Shop - Carrito de compras completo
**Stack**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Vitest + Playwright
**Metodología**: Construcción práctica con TDD donde corresponde

---

## Estructura de Videos

| #   | Video                                              | Resultado                                    | TDD |
| --- | -------------------------------------------------- | -------------------------------------------- | --- |
| 1   | [Setup + First Component](./video-01-setup.md)     | Proyecto corriendo + ProductCard testeado    | ✅  |
| 2   | [Types + Product Catalog](./video-02-catalog.md)   | Catálogo de productos renderizando           | -   |
| 3   | [TDD Business Logic](./video-03-business-logic.md) | formatPrice, calculateSubtotal, bulkDiscount | ✅  |
| 4   | [Cart Components](./video-04-cart-components.md)   | CartItem + CartSummary testeados             | ✅  |
| 5   | [Cart Context](./video-05-cart-context.md)         | **CARRITO FUNCIONAL** 🎉                     | ✅  |
| 6   | [Strategy Discounts](./video-06-discounts.md)      | Sistema de descuentos con Strategy Pattern   | ✅  |
| 7   | [E2E Playwright](./video-07-e2e.md)                | 7 tests E2E + Page Objects                   | -   |
| 8   | [Refactoring Live](./video-08-refactoring.md)      | 0 errores de lint, código limpio             | -   |
| 9   | [Auth + Security](./video-09-auth-security.md)     | validatePassword + LoginDemo                 | ✅  |
| 10  | [A11y + UX](./video-10-a11y-ux.md)                 | WCAG AA + Skeletons + Optimistic UI          | -   |
| 11  | [Sentry](./video-11-sentry.md)                     | Error tracking + Session replay              | -   |
| 12  | [Quality Gates](./video-12-quality-gates.md)       | **PRODUCCIÓN READY** 🚀                      | -   |

**TDD se aplica en 6 de 12 videos** - donde hay lógica de negocio

---

## Reglas de Negocio

```
DESCUENTO POR CANTIDAD (Bulk Discount):
├── Threshold: 5+ unidades del mismo producto
└── Descuento: 10% en ese producto

DESCUENTO POR ORDEN (Order Discount):
├── Threshold: Subtotal $100+
└── Descuento: 15% adicional en el total
```

---

## Comandos Frecuentes

```bash
# Desarrollo
pnpm dev                    # Servidor de desarrollo
pnpm build                  # Build de producción

# Testing
pnpm test                   # Tests unitarios (watch)
pnpm test -- --run          # Tests sin watch
pnpm test:coverage          # Con cobertura
pnpm test:e2e               # Tests E2E

# Calidad
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript
pnpm quality                # lint + typecheck + test
```

---

## Resultado Final del Proyecto

### Estructura

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
```

### Métricas

- ~60 unit/integration tests
- ~7 E2E tests
- 80%+ coverage
- 0 lint errors
- Build < 200KB gzipped
- Lighthouse A11y 90+

---

## Checklist Final

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

## Prácticas Aplicadas

Todo lo aprendido en el master:

- ✅ TDD (Test-Driven Development)
- ✅ Testing (Unit, Integration, E2E)
- ✅ Clean Code (Refactoring, no smells)
- ✅ Design Patterns (Strategy, Factory)
- ✅ Security (Password validation, Env)
- ✅ Accessibility (WCAG AA)
- ✅ UX (Skeletons, Optimistic UI)
- ✅ Observability (Sentry)
- ✅ Quality Gates (Husky)

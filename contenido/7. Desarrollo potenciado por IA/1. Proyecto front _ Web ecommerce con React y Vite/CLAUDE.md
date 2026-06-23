# Simple Product Shop - LLM Instructions

## Stack

React + TypeScript + Vite + Tailwind CSS v4 + Vitest + Playwright

## TDD - MANDATORY

1. Write test FIRST → run → MUST FAIL
2. Implement MINIMUM code to pass
3. Refactor keeping tests green

## File Organization (Scope Rule)

- `src/shared/` → used by multiple features
- `src/features/X/` → specific to one feature

## Project Structure

```
src/
├── shared/{types,utils,constants,components,strategies,hooks}/
├── features/{product-catalog,shopping-cart,auth}/
├── context/  # 3 files: CartContextValue.ts, CartContext.tsx, useCart.ts
├── infrastructure/  # sentry.ts, SentryErrorBoundary.tsx
└── test/setup.ts
e2e/pages/*.ts, e2e/*.spec.ts
.husky/{pre-commit,pre-push}
```

## Critical Configurations

### tsconfig.app.json

```json
{ "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"] }
```

### react-refresh: Split Context into 3 files

```
src/context/
├── CartContextValue.ts  # createContext + types (NO components)
├── CartContext.tsx      # ONLY exports CartProvider
└── useCart.ts           # ONLY exports useCart hook
```

NEVER use `allowExportNames` workaround.

### Husky: git init BEFORE husky init

## Scripts

- `pnpm test:run` - unit tests
- `pnpm test:e2e` - playwright
- `pnpm quality` - lint + typecheck + test:run
- `pnpm verify` - quality + test:e2e + build

## Video Deliverables

| Video | Key Items                                                                   |
| ----- | --------------------------------------------------------------------------- |
| 01    | Tailwind v4, Vitest setup, tsconfig excludes tests, ProductCard TDD         |
| 02    | Types in shared/types/, ProductCatalog TDD                                  |
| 03    | formatPrice, calculateSubtotal, calculateBulkDiscount TDD, businessRules.ts |
| 04    | CartItem, CartSummary TDD                                                   |
| 05    | CartContext TDD (useReducer), localStorage, ShoppingCart                    |
| 06    | BulkDiscountStrategy, OrderDiscountStrategy, DiscountCalculator TDD         |
| 07    | Playwright, Page Objects, 7 E2E tests                                       |
| 08    | ESLint + SonarJS, Split Context 3 files, "quality" script                   |
| 09    | validatePassword, PasswordInput, LoginDemo TDD                              |
| 10    | jsx-a11y, Skeleton, Toast TDD                                               |
| 11    | Sentry, ErrorBoundary, .env.example                                         |
| 12    | git init → husky init, pre-commit: lint+typecheck, pre-push: test+build     |

## Expected Test Counts

- Unit/Integration: ~89
- E2E: 7

## Validation

`pnpm verify` must pass: 0 lint errors, 0 type errors, all tests green, build success.

# Preguntas de Validación del Curso

> **Usa estas preguntas para verificar que la implementación siguió todas las pautas del curso.**
>
> Hazle estas preguntas a la IA después de completar el proyecto para corroborar que todo está correcto.

---

## 1. Estructura y Organización (Scope Rule)

### Preguntas

```
1. ¿Dónde está ubicado el archivo de tipos Product y CartItem?

2. ¿Dónde está ubicado el componente ProductCard?

3. ¿Dónde están las funciones formatPrice y calculateSubtotal?

4. ¿Dónde están los componentes Skeleton y Toast?

5. ¿Dónde está el componente LoginDemo?

6. ¿Dónde está validatePassword?
```

### Respuestas Esperadas

| #   | Respuesta Correcta                                        | Justificación                                |
| --- | --------------------------------------------------------- | -------------------------------------------- |
| 1   | `src/shared/types/index.ts`                               | Global Scope - se usa en toda la app         |
| 2   | `src/features/product-catalog/components/ProductCard.tsx` | Local Scope - específico de product-catalog  |
| 3   | `src/shared/utils/`                                       | Global Scope - se usa en múltiples features  |
| 4   | `src/shared/components/`                                  | Global Scope - componentes UI reutilizables  |
| 5   | `src/features/auth/LoginDemo.tsx`                         | Local Scope - específico de auth             |
| 6   | `src/shared/utils/validatePassword.ts`                    | Global Scope - puede reusarse en otros forms |

---

## 2. TDD (Test-Driven Development)

### Preguntas

```
7. ¿Qué archivo creaste primero para ProductCard, el test o el componente?

8. ¿Qué archivo creaste primero para formatPrice, el test o la función?

9. ¿Qué archivo creaste primero para CartContext, el test o el context?

10. ¿Skeleton y Toast tienen tests?

11. ¿PasswordInput y LoginDemo tienen tests?
```

### Respuestas Esperadas

| #   | Respuesta Correcta               | Justificación                    |
| --- | -------------------------------- | -------------------------------- |
| 7   | El test (`ProductCard.test.tsx`) | TDD: Red → Green → Refactor      |
| 8   | El test (`formatPrice.test.ts`)  | TDD: Red → Green → Refactor      |
| 9   | El test (`CartContext.test.tsx`) | TDD: Red → Green → Refactor      |
| 10  | Sí, se crearon con TDD           | Todos los componentes siguen TDD |
| 11  | Sí, se crearon con TDD           | Todos los componentes siguen TDD |

---

## 3. Configuración del Proyecto

### Preguntas

```
12. ¿tsconfig.app.json excluye los archivos de test del build?

13. ¿Qué hace el script "verify" en package.json?

14. ¿Qué ejecuta el hook pre-commit de Husky?

15. ¿Qué ejecuta el hook pre-push de Husky?

16. ¿Se inicializó git antes de Husky?

17. ¿vitest está configurado para excluir la carpeta e2e?
```

### Respuestas Esperadas

| #   | Respuesta Correcta                                                                    |
| --- | ------------------------------------------------------------------------------------- |
| 12  | Sí, tiene `"exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"]`       |
| 13  | Ejecuta `pnpm lint && pnpm typecheck && pnpm test:run && pnpm test:e2e && pnpm build` |
| 14  | `pnpm lint && pnpm typecheck`                                                         |
| 15  | `pnpm test:run && pnpm build`                                                         |
| 16  | Sí, `git init` antes de `husky init`                                                  |
| 17  | Sí, en vitest.config.ts tiene `exclude: ['e2e/**', 'node_modules/**']`                |

---

## 4. Patterns y Buenas Prácticas

### Preguntas

```
18. ¿Qué patrón se usa para los descuentos?

19. ¿CartContext usa useState o useReducer?

20. ¿Cómo se persiste el carrito?

21. ¿Qué patrón se usa en los tests E2E?

22. ¿Las constantes de negocio están hardcodeadas o centralizadas?

23. ¿Dónde están las estrategias de descuento?
```

### Respuestas Esperadas

| #   | Respuesta Correcta                                       | Justificación                                     |
| --- | -------------------------------------------------------- | ------------------------------------------------- |
| 18  | Strategy Pattern                                         | Interface `DiscountStrategy` + implementaciones   |
| 19  | `useReducer`                                             | Mejor para estado complejo con múltiples acciones |
| 20  | localStorage con lazy initializer en useReducer          | Evita race conditions                             |
| 21  | Page Object Model                                        | `ProductCatalogPage`, `ShoppingCartPage`          |
| 22  | Centralizadas en `src/shared/constants/businessRules.ts` | No magic numbers                                  |
| 23  | `src/shared/strategies/`                                 | Global Scope - se usan desde CartContext          |

---

## 5. Tests

### Preguntas

```
24. ¿Cuántos tests unitarios/integración hay aproximadamente?

25. ¿Cuántos tests E2E hay?

26. ¿Qué comando ejecuta todos los tests unitarios?

27. ¿Qué comando ejecuta los tests E2E?

28. ¿Qué comando ejecuta la verificación completa?
```

### Respuestas Esperadas

| #   | Respuesta Correcta |
| --- | ------------------ |
| 24  | ~69 tests          |
| 25  | 7 tests            |
| 26  | `pnpm test:run`    |
| 27  | `pnpm test:e2e`    |
| 28  | `pnpm verify`      |

---

## 6. Accesibilidad y Calidad

### Preguntas

```
29. ¿Qué plugin de ESLint se usa para accesibilidad?

30. ¿Por qué LoginDemo usa <span> en vez de <label> para "Password"?

31. ¿Por qué CartContext está separado en 3 archivos?

32. ¿Toast y Skeleton tienen atributos de accesibilidad?
```

### Respuestas Esperadas

| #   | Respuesta Correcta                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 29  | `eslint-plugin-jsx-a11y`                                                                                                                                                                                             |
| 30  | Porque `PasswordInput` ya tiene `aria-label` interno. Usar `<label>` causaría error de `jsx-a11y/label-has-associated-control`                                                                                       |
| 31  | Para cumplir con `react-refresh/only-export-components`. Cada archivo debe exportar SOLO componentes o SOLO no-componentes: `CartContextValue.ts` (context+tipos), `CartContext.tsx` (Provider), `useCart.ts` (hook) |
| 32  | Sí. Toast: `role="alert"`, `aria-live="polite"`. Skeleton: `role="status"`, `aria-hidden="true"`                                                                                                                     |

---

## 7. Verificación Final

### Pregunta

```
33. Ejecuta "pnpm verify" y dime el resultado.
```

### Respuesta Esperada

```
✓ lint          (0 errores, 0 warnings)
✓ typecheck     (0 errores)
✓ test:run      (~69 tests passing)
✓ test:e2e      (7 tests passing)
✓ build         (exitoso)
```

---

## 8. Estructura de Carpetas Final

### Pregunta

```
34. Muéstrame la estructura de carpetas del proyecto.
```

### Respuesta Esperada

```
src/
├── shared/                    # 🌍 GLOBAL SCOPE
│   ├── types/
│   │   └── index.ts          # Product, CartItem
│   ├── utils/
│   │   ├── formatPrice.ts
│   │   ├── formatPrice.test.ts
│   │   ├── calculateSubtotal.ts
│   │   ├── calculateSubtotal.test.ts
│   │   ├── calculateBulkDiscount.ts
│   │   ├── calculateBulkDiscount.test.ts
│   │   ├── validatePassword.ts
│   │   ├── validatePassword.test.ts
│   │   └── index.ts
│   ├── constants/
│   │   └── businessRules.ts
│   ├── components/
│   │   ├── Skeleton.tsx
│   │   ├── Skeleton.test.tsx
│   │   ├── Toast.tsx
│   │   ├── Toast.test.tsx
│   │   └── index.ts
│   └── strategies/
│       ├── DiscountStrategy.ts
│       ├── BulkDiscountStrategy.ts
│       ├── BulkDiscountStrategy.test.ts
│       ├── OrderDiscountStrategy.ts
│       ├── OrderDiscountStrategy.test.ts
│       ├── DiscountCalculator.ts
│       ├── DiscountCalculator.test.ts
│       └── index.ts
│
├── features/                  # 📦 LOCAL SCOPE
│   ├── product-catalog/
│   │   ├── components/
│   │   │   ├── ProductCard.tsx
│   │   │   └── ProductCard.test.tsx
│   │   ├── ProductCatalog.tsx
│   │   └── ProductCatalog.test.tsx
│   │
│   ├── shopping-cart/
│   │   ├── components/
│   │   │   ├── CartItem.tsx
│   │   │   ├── CartItem.test.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   ├── CartSummary.test.tsx
│   │   │   └── index.ts
│   │   └── ShoppingCart.tsx
│   │
│   └── auth/
│       ├── components/
│       │   ├── PasswordInput.tsx
│       │   └── PasswordInput.test.tsx
│       ├── LoginDemo.tsx
│       └── LoginDemo.test.tsx
│
├── context/                   # 🔄 ESTADO GLOBAL (3 archivos para react-refresh)
│   ├── CartContextValue.ts   # Context + tipos
│   ├── CartContext.tsx       # Solo CartProvider
│   ├── CartContext.test.tsx
│   └── useCart.ts            # Solo useCart hook
│
├── infrastructure/            # 🔧 SERVICIOS EXTERNOS
│   ├── sentry.ts
│   └── SentryErrorBoundary.tsx
│
├── test/                      # 🧪 CONFIG DE TESTS
│   └── setup.ts
│
├── App.tsx
├── main.tsx
└── index.css

e2e/                           # 🎭 TESTS E2E
├── pages/
│   ├── ProductCatalogPage.ts
│   └── ShoppingCartPage.ts
└── shopping-journey.spec.ts

.husky/                        # 🪝 GIT HOOKS
├── pre-commit
└── pre-push
```

---

## Resumen de Validación

| Categoría     | Preguntas | Qué Valida                        |
| ------------- | --------- | --------------------------------- |
| Scope Rule    | 1-6       | Organización correcta de carpetas |
| TDD           | 7-11      | Metodología test-first            |
| Configuración | 12-17     | Setup técnico correcto            |
| Patterns      | 18-23     | Buenas prácticas de código        |
| Tests         | 24-28     | Cobertura y comandos              |
| A11y          | 29-32     | Accesibilidad y linting           |
| Final         | 33-34     | Verificación completa             |

---

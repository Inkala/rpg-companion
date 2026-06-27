# Video 7: E2E Testing con Playwright (15 min)

## Resultado Final
Tests E2E cubriendo el flujo completo de compra.

---

## Paso 1: Instalar Playwright

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

---

## Paso 2: Configurar Playwright

**Prompt para la IA:**
```
Configura Playwright para testing E2E del proyecto.

Requisitos:
- Directorio de tests: e2e/
- Usar solo Chromium (no necesitamos todos los browsers)
- Configurar web server para que levante la app automáticamente (pnpm dev en puerto 5173)
- Screenshots solo en fallos
- Reporter HTML

También necesito:
- Agregar script "test:e2e" en package.json
- Actualizar vitest.config.ts para EXCLUIR el directorio e2e/ de los tests unitarios

Ubicación: playwright.config.ts
```

---

## Paso 3: Page Object - ProductCatalogPage

**Prompt para la IA:**
```
Crea un Page Object para interactuar con el catálogo de productos en tests E2E.

El Page Object debe encapsular:
- Navegación a la página principal
- Locators para: heading de productos, cards de productos
- Método para agregar un producto al carrito por nombre
- Método para obtener un producto específico por nombre

Convenciones:
- Usar getByRole cuando sea posible
- Usar data-testid para elementos que no tienen role semántico
- Métodos descriptivos (addToCart, getProduct, etc.)

NOTA: Si los componentes no tienen data-testid, indícame cuáles necesitan 
y los agregaré al código.

Ubicación: e2e/pages/ProductCatalogPage.ts
```

---

## Paso 4: Page Object - ShoppingCartPage

**Prompt para la IA:**
```
Crea un Page Object para interactuar con el carrito en tests E2E.

El Page Object debe encapsular:
- Locators para: heading, mensaje de vacío, botón checkout, subtotal, total
- Método para obtener un item del carrito por nombre de producto
- Métodos para: incrementar cantidad, decrementar cantidad, eliminar item
- Método para obtener la cantidad actual de un item

Usa selectores accesibles (getByRole, getByText) y data-testid cuando sea necesario.

Ubicación: e2e/pages/ShoppingCartPage.ts
```

---

## Paso 5: Agregar data-testid a Componentes

**Prompt para la IA:**
```
Basándome en los Page Objects creados, necesito agregar data-testid 
a algunos componentes para facilitar el testing E2E.

Revisa los Page Objects y dime qué data-testid necesito agregar a:
- ProductCard
- CartItem  
- CartSummary

Solo agrega los estrictamente necesarios para los selectores que no 
pueden usar getByRole o getByText.
```

---

## Paso 6: Test E2E - Flujo de Compra

**Prompt para la IA:**
```
Crea los tests E2E para el flujo completo de compra.

Escenarios a cubrir:
1. El carrito está vacío inicialmente
2. Agregar un producto lo muestra en el carrito
3. Agregar el mismo producto incrementa la cantidad
4. Los botones +/- modifican la cantidad correctamente
5. El botón remove elimina el item
6. El descuento bulk aparece cuando hay 5+ items
7. El carrito persiste después de refresh (localStorage)

Consideraciones técnicas:
- Limpiar localStorage antes de cada test (pero DESPUÉS de navegar a la página)
- Usar los Page Objects creados
- Assertions claras y descriptivas

Ubicación: e2e/shopping-journey.spec.ts
```

---

## Paso 7: Ejecutar Tests E2E

```bash
# Ejecutar tests
pnpm test:e2e

# Ver reporte HTML
pnpm exec playwright show-report

# Ejecutar con UI (útil para debug)
pnpm exec playwright test --ui
```

---

## Paso 8: Visual Regression (Opcional)

**Prompt para la IA:**
```
Agrega tests de regresión visual básicos.

Escenarios:
- Screenshot de la homepage con catálogo
- Screenshot del carrito con items

Usa toHaveScreenshot() de Playwright.
Configura un threshold de diferencia aceptable (5%).

Ubicación: e2e/visual.spec.ts
```

**Generar snapshots base**:
```bash
pnpm test:e2e -- --update-snapshots
```

---

## Paso 9: Verificación Final COMPLETA

```bash
# A partir de ahora, SIEMPRE ejecutar verificación completa
pnpm test:run      # Tests unitarios
pnpm test:e2e      # Tests E2E
pnpm lint          # Sin errores de lint
pnpm typecheck     # Sin errores de tipos
pnpm build         # Build exitoso
```

> ⚠️ **IMPORTANTE - VERIFICACIÓN COMPLETA**
> 
> A partir de este video, SIEMPRE ejecutar verificación completa antes de dar por terminado cualquier video:
> ```
> ✅ VERIFICACIÓN FINAL (OBLIGATORIO):
> pnpm test:run      # ¿Todos los unit tests pasan?
> pnpm test:e2e      # ¿E2E tests pasan?
> pnpm lint          # ¿Sin errores de lint?
> pnpm typecheck     # ¿Sin errores de tipos?
> pnpm build         # ¿Build exitoso?
> 
> ❌ NO CONTINUAR AL SIGUIENTE VIDEO si alguno falla.
> ```

---

## Checkpoint

Al final del video tienes:
- ✅ Playwright configurado
- ✅ Page Objects para Catalog y Cart
- ✅ 7 tests E2E del flujo de compra
- ✅ Test de persistencia
- ✅ (Opcional) Visual regression
- ✅ ~54 unit/integration + 7 E2E tests
- ✅ Verificación completa pasando
- ✅ **FLUJO COMPLETO TESTEADO** 🎉

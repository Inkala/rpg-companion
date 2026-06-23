# Video 5: TDD - CartContext + Carrito Completo (15 min)

## Resultado Final
Carrito de compras completamente funcional con estado global.

---

> ⚠️ **RECORDATORIO TDD** (aplicar en todo este video):
> 1. Escribir tests PRIMERO → ejecutar → DEBE FALLAR (Red)
> 2. Implementar código MÍNIMO para pasar
> 3. Ejecutar tests → DEBEN PASAR (Green)
> 4. Refactorizar si es necesario

---

## Paso 1: TDD - CartContext

### 1.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear un CartContext con useReducer usando TDD.
El context NO existe todavía.

Requisitos del context:
- Provee estado global del carrito
- Acciones: addItem, removeItem, updateQuantity, clearCart
- Valores computados: items, itemCount, subtotal
- Persistir en localStorage (debe cargar al iniciar)

Comportamientos a testear:
- Inicia con carrito vacío (itemCount 0, subtotal 0)
- addItem agrega producto nuevo con quantity 1
- addItem incrementa quantity si el producto ya existe
- updateQuantity cambia la cantidad de un item
- updateQuantity con 0 elimina el item
- removeItem elimina un item del carrito
- clearCart vacía todo el carrito
- itemCount suma todas las cantidades
- subtotal calcula correctamente (precio × cantidad de cada item)

Para testear hooks usa renderHook de @testing-library/react.
Limpia localStorage en beforeEach.

Ubicación: src/context/CartContext.test.tsx

Genera SOLO el test.
```

**Ejecutar (RED)**:
```bash
pnpm test CartContext
```

### 1.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para CartContext:

[Pegar el test]

Implementa el CartContext para pasar todos los tests.

Requisitos técnicos:
- Usar useReducer para el estado
- Exportar: CartProvider (wrapper) y useCart (hook)
- Acciones del reducer: ADD_ITEM, REMOVE_ITEM, UPDATE_QUANTITY, CLEAR_CART
- Persistir en localStorage
- IMPORTANTE: Usar lazy initializer en useReducer para cargar de localStorage
- IMPORTANTE: Usar useRef isInitialMount para evitar guardar en el primer render

Ubicación: src/context/CartContext.tsx
```

**Ejecutar (GREEN)**:
```bash
pnpm test CartContext
```

---

## Paso 2: ShoppingCart Component

**Prompt para la IA:**
```
Crea un componente ShoppingCart que integre CartItem y CartSummary.

Requisitos:
- Título "Shopping Cart" con badge mostrando itemCount
- Si el carrito está vacío: mensaje "Your cart is empty" con icono
- Si tiene items: lista de CartItem para cada item
- CartSummary al final con los totales
- Usa el hook useCart para obtener datos y funciones
- Por ahora, discount es 0 y total = subtotal (descuentos vienen en video 6)

Este componente NO necesita tests propios - es integración de componentes ya testeados.

Ubicación: src/features/shopping-cart/ShoppingCart.tsx
```

---

## Paso 3: Integrar en App

**Prompt para la IA:**
```
Actualiza App.tsx para el layout final de la aplicación.

Requisitos:
- Envolver todo con CartProvider
- Header con logo "Simple Product Shop" e icono de carrito con badge
- Layout de 2 columnas en desktop:
  - Izquierda (más ancha): ProductCatalog
  - Derecha: ShoppingCart (sticky para que siga al scroll)
- En mobile: stack vertical (catálogo arriba, carrito abajo)
- ProductCatalog debe usar addItem del context cuando se hace click en "Add to Cart"

Quita el preview temporal que agregamos en el video anterior.
```

---

## Paso 4: Feedback Visual al Agregar

**Prompt para la IA:**
```
Mejora ProductCard para dar feedback visual cuando se agrega un producto.

Requisitos:
- Estado local para el botón: 'idle' | 'added'
- Al hacer click: cambiar a 'added' por 1.5 segundos
- Cuando está en 'added': mostrar "Added!" en verde
- Después vuelve a "Add to Cart" normal
- El botón debe seguir funcionando durante la transición

Actualiza el test si es necesario para este nuevo comportamiento.
```

**Verificar**:
```bash
pnpm test ProductCard
pnpm dev
```

---

## Paso 5: Probar Flujo Completo

```bash
pnpm dev
```

Probar manualmente:
1. ✅ Agregar producto → aparece en carrito
2. ✅ Agregar mismo producto → incrementa cantidad
3. ✅ Botones +/- funcionan
4. ✅ Botón remove elimina
5. ✅ Subtotal se actualiza
6. ✅ Mensaje promo aparece/desaparece
7. ✅ Refresh mantiene carrito (localStorage)

---

## Paso 6: Verificación Final

```bash
# Ejecutar TODOS estos comandos - todos deben pasar
pnpm test:run      # Tests unitarios
pnpm build         # Build exitoso
```

---

## Checkpoint

Al final del video tienes:
- ✅ CartContext con 9 tests pasando (TDD)
- ✅ ShoppingCart integrado
- ✅ Layout completo 2 columnas
- ✅ Flujo agregar → carrito funcionando
- ✅ Persistencia en localStorage
- ✅ Feedback visual al agregar
- ✅ ~39 tests totales pasando
- ✅ Build exitoso
- ✅ **CARRITO FUNCIONAL** 🎉

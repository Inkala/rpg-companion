# Video 4: TDD - Componentes del Carrito (15 min)

## Resultado Final
CartItem y CartSummary testeados y funcionando.

---

> ⚠️ **RECORDATORIO TDD** (aplicar en todo este video):
> 1. Escribir tests PRIMERO → ejecutar → DEBE FALLAR (Red)
> 2. Implementar código MÍNIMO para pasar
> 3. Ejecutar tests → DEBEN PASAR (Green)
> 4. Refactorizar si es necesario

---

## Paso 1: TDD - CartItem

### 1.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear un componente CartItem usando TDD.
El componente NO existe todavía.

Requisitos del componente:
- Muestra un item del carrito (producto + cantidad)
- Muestra: imagen thumbnail, nombre, precio unitario, cantidad, subtotal (precio × cantidad)
- Botones +/- para modificar cantidad
- Botón para eliminar del carrito
- El botón - debe estar deshabilitado cuando quantity es 1

Props que debe recibir:
- item: CartItem (del tipo que definimos)
- onUpdateQuantity: callback que recibe la nueva cantidad
- onRemove: callback para eliminar

Casos a testear:
- Renderiza nombre y precio
- Renderiza cantidad actual
- Renderiza subtotal calculado
- Click en + llama onUpdateQuantity con cantidad incrementada
- Click en - llama onUpdateQuantity con cantidad decrementada
- Botón - deshabilitado cuando quantity es 1
- Click en remove llama onRemove

Ubicación: src/features/shopping-cart/components/CartItem.test.tsx

Genera SOLO el test. Usa aria-labels descriptivos para los botones.
```

**Ejecutar (RED)**:
```bash
pnpm test CartItem
```

### 1.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para CartItem:

[Pegar el test]

Implementa el componente para pasar todos los tests.

Requisitos adicionales de UI:
- Layout horizontal (flex row)
- Imagen pequeña a la izquierda
- Información del producto en el centro
- Controles de cantidad a la derecha
- Estilos con Tailwind

Ubicación: src/features/shopping-cart/components/CartItem.tsx
```

**Ejecutar (GREEN)**:
```bash
pnpm test CartItem
```

---

## Paso 2: TDD - CartSummary

### 2.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear un componente CartSummary usando TDD.
El componente NO existe todavía.

Requisitos del componente:
- Muestra resumen del carrito: subtotal, descuento (si hay), total
- Si el descuento es 0, no mostrar la línea de descuento
- Mensaje promocional si subtotal < $100: "Add $XX.XX more for 15% off!"
- Si subtotal >= $100, no mostrar mensaje promocional
- Botón de Checkout

Props:
- subtotal: number
- discount: number
- total: number
- itemCount: number

Casos a testear:
- Renderiza subtotal formateado
- Renderiza descuento cuando es > 0 (con signo negativo)
- NO renderiza descuento cuando es 0
- Renderiza total formateado
- Muestra mensaje promo cuando subtotal < 100
- NO muestra mensaje promo cuando subtotal >= 100
- Renderiza botón checkout

Ubicación: src/features/shopping-cart/components/CartSummary.test.tsx

Genera SOLO el test.
```

**Ejecutar (RED)**:
```bash
pnpm test CartSummary
```

### 2.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para CartSummary:

[Pegar el test]

Implementa el componente para pasar todos los tests.

Requisitos de UI:
- Fondo gris claro para destacar
- Separación visual entre subtotal/discount/total
- Total en negrita/más grande
- Mensaje promo en color destacado
- Botón checkout con estilo primario

Ubicación: src/features/shopping-cart/components/CartSummary.tsx
```

**Ejecutar (GREEN)**:
```bash
pnpm test CartSummary
```

---

## Paso 3: Index de Componentes

**Prompt para la IA:**
```
Crea un archivo index.ts para exportar los componentes del carrito.

Ubicación: src/features/shopping-cart/components/index.ts

Componentes a exportar: CartItem, CartSummary
```

---

## Paso 4: Preview en App (Temporal)

**Prompt para la IA:**
```
Agrega un preview temporal de CartItem y CartSummary en App.tsx 
para verificar visualmente que se ven bien.

Requisitos:
- Mostrar un CartItem con datos hardcodeados
- Mostrar un CartSummary con valores de ejemplo
- Los callbacks pueden ser console.log por ahora

Esto es solo para verificación visual, lo quitaremos en el siguiente video.
```

**Verificar**:
```bash
pnpm dev
```

---

## Paso 5: Verificación Final

```bash
# Ejecutar TODOS estos comandos - todos deben pasar
pnpm test:run      # Tests unitarios
pnpm build         # Build exitoso
```

---

## Checkpoint

Al final del video tienes:
- ✅ CartItem con 7 tests pasando (TDD)
- ✅ CartSummary con 7 tests pasando (TDD)
- ✅ Componentes exportados
- ✅ Preview visual funcionando
- ✅ ~30 tests totales pasando
- ✅ Build exitoso

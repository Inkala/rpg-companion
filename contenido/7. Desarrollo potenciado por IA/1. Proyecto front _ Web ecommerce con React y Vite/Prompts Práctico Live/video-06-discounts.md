# Video 6: TDD - Sistema de Descuentos con Strategy Pattern (15 min)

## Resultado Final
Descuentos bulk y order funcionando con Strategy Pattern.

---

> ⚠️ **RECORDATORIO TDD** (aplicar en todo este video):
> 1. Escribir tests PRIMERO → ejecutar → DEBE FALLAR (Red)
> 2. Implementar código MÍNIMO para pasar
> 3. Ejecutar tests → DEBEN PASAR (Green)
> 4. Refactorizar si es necesario

---

## Paso 1: Interface DiscountStrategy (Global Scope)

**Prompt para la IA:**
```
Voy a implementar el Strategy Pattern para los descuentos.
Primero necesito definir la interface base.

Las estrategias son GLOBAL SCOPE porque se usan desde CartContext 
y potencialmente desde otros lugares (checkout, reports, etc.)

Requisitos de la interface DiscountStrategy:
- name: string (nombre del descuento para mostrar)
- description: string (descripción para el usuario)
- isApplicable(items, subtotal): boolean (determina si aplica)
- calculate(items, subtotal): number (calcula el monto del descuento)

Ubicación: src/shared/strategies/DiscountStrategy.ts
```

---

## Paso 2: TDD - BulkDiscountStrategy

### 2.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear BulkDiscountStrategy usando TDD.
La clase NO existe todavía.

Regla de negocio:
- Se aplica cuando hay items con 5+ unidades
- Descuento: 10% del subtotal de los items que califican
- Solo afecta items con quantity >= 5

Casos a testear:
- Tiene el nombre correcto "Bulk Discount"
- NO es aplicable si ningún item tiene 5+ unidades
- ES aplicable si algún item tiene 5+ unidades
- Calcula 10% correctamente para items que califican
- Si hay múltiples items, solo descuenta los que califican (no todos)

Usa las constantes de businessRules.

Ubicación: src/shared/strategies/BulkDiscountStrategy.test.ts

Genera SOLO el test.
```

**Ejecutar (RED)**:
```bash
pnpm test BulkDiscountStrategy
```

### 2.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para BulkDiscountStrategy:

[Pegar el test]

Implementa la clase que implemente DiscountStrategy y pase los tests.

Ubicación: src/shared/strategies/BulkDiscountStrategy.ts
```

**Ejecutar (GREEN)**:
```bash
pnpm test BulkDiscountStrategy
```

---

## Paso 3: TDD - OrderDiscountStrategy

### 3.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear OrderDiscountStrategy usando TDD.
La clase NO existe todavía.

Regla de negocio:
- Se aplica cuando el subtotal es >= $100
- Descuento: 15% del subtotal (o del monto después de otros descuentos)

Casos a testear:
- Tiene el nombre correcto "Order Discount"
- NO es aplicable si subtotal < $100
- ES aplicable si subtotal >= $100
- Calcula 15% correctamente

Ubicación: src/shared/strategies/OrderDiscountStrategy.test.ts

Genera SOLO el test.
```

**Ejecutar (RED)**:
```bash
pnpm test OrderDiscountStrategy
```

### 3.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para OrderDiscountStrategy:

[Pegar el test]

Implementa la clase para pasar los tests.

Ubicación: src/shared/strategies/OrderDiscountStrategy.ts
```

**Ejecutar (GREEN)**:
```bash
pnpm test OrderDiscountStrategy
```

---

## Paso 4: TDD - DiscountCalculator

### 4.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear DiscountCalculator usando TDD.
Esta clase coordina la aplicación de múltiples estrategias de descuento.

Requisitos:
- Registra las estrategias de descuento (Bulk y Order)
- calculate(): aplica estrategias en secuencia, cada una sobre el monto restante
- getBreakdown(): retorna detalles de cada descuento aplicado

Comportamiento de aplicación secuencial:
1. Subtotal original: $125
2. Bulk discount (10%): -$12.50 → nuevo subtotal: $112.50
3. Order discount (15% de $112.50): -$16.875 → total descuento: $29.375

Casos a testear:
- Retorna 0 para carrito vacío
- Aplica solo bulk cuando corresponde (subtotal < $100)
- Aplica solo order cuando corresponde (items con qty < 5)
- Aplica ambos secuencialmente cuando ambos aplican
- getBreakdown retorna array con nombre y monto de cada descuento

Ubicación: src/shared/strategies/DiscountCalculator.test.ts

Genera SOLO el test.
```

**Ejecutar (RED)**:
```bash
pnpm test DiscountCalculator
```

### 4.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para DiscountCalculator:

[Pegar el test]

Implementa la clase para pasar los tests.

Ubicación: src/shared/strategies/DiscountCalculator.ts
```

**Ejecutar (GREEN)**:
```bash
pnpm test DiscountCalculator
```

---

## Paso 5: Integrar en CartContext

**Prompt para la IA:**
```
Actualiza CartContext para calcular descuentos automáticamente.

Cambios necesarios:
- Importar y usar DiscountCalculator
- Agregar valores computados al context:
  - discount: el descuento total calculado
  - total: subtotal - discount
  - discountBreakdown: array con detalles de cada descuento
- Estos valores deben recalcularse cuando cambian los items

Actualiza los tests de CartContext si es necesario para verificar los nuevos valores.
```

**Verificar**:
```bash
pnpm test CartContext
```

---

## Paso 6: Mostrar Descuentos en CartSummary

**Prompt para la IA:**
```
Actualiza CartSummary para mostrar el breakdown de descuentos.

Cambios:
- Recibir discountBreakdown como prop adicional
- Si hay descuentos, mostrar cada uno en línea separada con su monto
- Actualizar el mensaje promocional dinámicamente según lo que falte

Actualiza los tests de CartSummary para los nuevos props y comportamientos.
```

**Verificar**:
```bash
pnpm test CartSummary
pnpm dev
```

Probar manualmente:
1. Agregar 5+ de un producto → ver "Bulk Discount: -$X.XX"
2. Llegar a $100+ de subtotal → ver "Order Discount: -$X.XX"
3. Ambos a la vez → ver ambos descuentos listados

---

## Paso 7: Verificación Final

```bash
# Ejecutar TODOS estos comandos - todos deben pasar
pnpm test:run      # Tests unitarios
pnpm build         # Build exitoso
```

---

## Checkpoint

Al final del video tienes:
- ✅ BulkDiscountStrategy con 5 tests (TDD)
- ✅ OrderDiscountStrategy con 4 tests (TDD)
- ✅ DiscountCalculator con 5 tests (TDD)
- ✅ CartContext calculando descuentos
- ✅ CartSummary mostrando breakdown
- ✅ ~54 tests totales pasando
- ✅ Build exitoso
- ✅ **DESCUENTOS FUNCIONANDO** 🎉

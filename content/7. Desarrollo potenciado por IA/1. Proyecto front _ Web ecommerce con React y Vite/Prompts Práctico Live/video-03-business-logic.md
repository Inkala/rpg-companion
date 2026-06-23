# Video 3: TDD - Lógica de Negocio (15 min)

## Resultado Final
Funciones de utilidad testeadas: formatPrice, calculateSubtotal, calculateBulkDiscount.

---

> ## 🎯 METODOLOGÍA TDD - APLICAR EN TODO EL RESTO DEL CURSO
> 
> A partir de este video, SIEMPRE seguir el ciclo Red-Green-Refactor:
> 
> ```
> 1. RED:    Escribir test PRIMERO → ejecutar → DEBE FALLAR
> 2. GREEN:  Implementar código MÍNIMO para pasar el test
> 3. REFACTOR: Mejorar el código manteniendo tests verdes
> ```
> 
> **Esta metodología se aplica a TODAS las funciones y componentes de aquí en adelante.**

---

## Reglas de Negocio

```
DESCUENTO POR CANTIDAD (Bulk):  5+ unidades del mismo producto = 10% off en ese producto
DESCUENTO POR ORDEN (Order):    Subtotal $100+ = 15% off adicional
```

---

## Paso 1: TDD - formatPrice (Global Scope)

### 1.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear una función formatPrice usando TDD.
La función NO existe todavía - necesito el test primero.

Esta función es GLOBAL SCOPE - se usará en múltiples features 
(ProductCard, CartItem, CartSummary).

Requisitos de la función:
- Recibe un número (precio)
- Retorna string formateado como moneda USD ($XX.XX)
- Debe manejar: enteros, decimales, cero, números grandes con separador de miles

Ubicación del test: src/shared/utils/formatPrice.test.ts

Genera SOLO el archivo de test con casos para los escenarios mencionados.
```

**Ejecutar (RED)**:
```bash
pnpm test formatPrice
```

### 1.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para formatPrice:

[Pegar el test]

Implementa la función formatPrice para pasar todos los tests.

Ubicación: src/shared/utils/formatPrice.ts

Sugerencia: Usa Intl.NumberFormat para el formateo.
```

**Ejecutar (GREEN)**:
```bash
pnpm test formatPrice
```

---

## Paso 2: TDD - calculateSubtotal

### 2.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear una función calculateSubtotal usando TDD.
La función NO existe todavía.

Requisitos:
- Recibe un array de CartItem (cada item tiene product.price y quantity)
- Retorna el subtotal: suma de (precio × cantidad) de cada item
- Array vacío retorna 0

Ubicación: src/shared/utils/calculateSubtotal.test.ts

Genera SOLO el test con casos para: array vacío, un item, múltiples items.
```

**Ejecutar (RED)**:
```bash
pnpm test calculateSubtotal
```

### 2.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para calculateSubtotal:

[Pegar el test]

Implementa la función para pasar los tests.

Ubicación: src/shared/utils/calculateSubtotal.ts
```

**Ejecutar (GREEN)**:
```bash
pnpm test calculateSubtotal
```

---

## Paso 3: Constantes de Negocio (Global Scope)

**Prompt para la IA:**
```
Crea un archivo de constantes para las reglas de negocio del e-commerce.

Estas constantes son GLOBAL SCOPE - se usan en utils, strategies, y componentes.

Reglas:
- Descuento bulk: se activa con 5+ items, da 10% de descuento
- Descuento por orden: se activa con $100+ de subtotal, da 15% de descuento
- Cantidad mínima: 1, máxima: 99

Ubicación: src/shared/constants/businessRules.ts

Organiza las constantes de forma que sean fáciles de usar y mantener.
Usa "as const" para type safety.
```

---

## Paso 4: TDD - calculateBulkDiscount

### 4.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear una función calculateBulkDiscount usando TDD.

Regla de negocio:
- Si un item tiene 5+ unidades, aplica 10% de descuento a ESE item
- Solo se descuenta el subtotal de items que califican
- Items con menos de 5 unidades no reciben descuento

Casos a testear:
- Menos de 5 items → retorna 0
- Exactamente 5 items → calcula 10% del subtotal de ese item
- Más de 5 items → calcula 10%
- Múltiples items, solo algunos califican → solo descuenta los que califican

Ubicación: src/shared/utils/calculateBulkDiscount.test.ts

Usa las constantes de businessRules en el test.
Genera SOLO el test.
```

**Ejecutar (RED)**:
```bash
pnpm test calculateBulkDiscount
```

### 4.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para calculateBulkDiscount:

[Pegar el test]

Implementa la función usando las constantes de businessRules.

Ubicación: src/shared/utils/calculateBulkDiscount.ts
```

**Ejecutar (GREEN)**:
```bash
pnpm test calculateBulkDiscount
```

---

## Paso 5: Index de Utils

**Prompt para la IA:**
```
Crea un archivo index.ts que exporte todas las funciones de utils.

Ubicación: src/shared/utils/index.ts

Funciones a exportar: formatPrice, calculateSubtotal, calculateBulkDiscount
```

---

## Paso 6: Actualizar ProductCard con formatPrice

**Prompt para la IA:**
```
Actualiza ProductCard para usar formatPrice en vez de formatear el precio manualmente.

El componente ya muestra el precio, pero probablemente usa template literal.
Cambia a usar la función formatPrice que creamos.

Verifica que los tests sigan pasando después del cambio.
```

**Verificar**:
```bash
pnpm test
```

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
- ✅ formatPrice con tests pasando (TDD)
- ✅ calculateSubtotal con tests pasando (TDD)
- ✅ businessRules centralizadas
- ✅ calculateBulkDiscount con tests pasando (TDD)
- ✅ ProductCard usando formatPrice
- ✅ ~16 tests totales pasando
- ✅ Build exitoso

---

## 📌 Recordatorio para Videos Siguientes

A partir de ahora, SIEMPRE aplicar TDD:
```
⚠️ RECORDATORIO TDD:
- Escribir tests PRIMERO
- Verificar que FALLAN (Red)
- Implementar código mínimo
- Verificar que PASAN (Green)
- Refactorizar si es necesario
```

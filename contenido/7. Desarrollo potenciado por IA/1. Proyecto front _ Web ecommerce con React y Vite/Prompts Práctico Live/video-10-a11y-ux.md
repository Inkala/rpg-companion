# Video 10: Accesibilidad + UX (15 min)

## Resultado Final
App accesible WCAG AA con skeleton screens y optimistic UI.

---

> ⚠️ **RECORDATORIO TDD** (aplicar a los nuevos componentes):
> 1. Escribir tests PRIMERO → ejecutar → DEBE FALLAR (Red)
> 2. Implementar código MÍNIMO para pasar
> 3. Ejecutar tests → DEBEN PASAR (Green)
>
> **Esto aplica a: Skeleton y Toast**

---

## Paso 1: Instalar Plugin de A11y

```bash
pnpm add -D eslint-plugin-jsx-a11y
```

**Prompt para la IA:**
```
Configura eslint-plugin-jsx-a11y en el proyecto.

Requisitos:
- Agregar el plugin a eslint.config.js
- Usar las reglas recomendadas de jsx-a11y
- El proyecto usa el nuevo formato flat config de ESLint
```

```bash
pnpm lint
```

Ver errores de accesibilidad y listarlos para corregir.

---

## Paso 2: Corregir Errores de Accesibilidad

**Prompt para la IA:**
```
Tengo estos errores de accesibilidad de eslint-plugin-jsx-a11y:

[Pegar los errores de pnpm lint]

Corrígelos siguiendo las mejores prácticas de accesibilidad.

Para botones con solo íconos, usa aria-label descriptivos.
Para elementos custom que parecen labels pero no están asociados 
a inputs nativos, considera usar <span> en vez de <label>.
```

---

## Paso 3: ARIA Labels Descriptivos

**Prompt para la IA:**
```
Revisa los componentes y mejora los aria-labels para que sean más descriptivos.

Ejemplos de mejoras:
- Botones +/- del carrito: incluir nombre del producto
- Botón de eliminar: incluir qué se está eliminando
- Badge del carrito: describir cuántos items hay

Los aria-labels deben dar contexto a usuarios de screen readers.
```

---

## Paso 4: Focus Visible

**Prompt para la IA:**
```
Configura estilos de focus visible para todos los elementos interactivos.

Requisitos:
- Outline visible cuando se navega con teclado (focus-visible)
- NO mostrar outline en click de mouse (focus sin focus-visible)
- Color de outline que contraste con el fondo
- Offset para que no se solape con el contenido

Agregar los estilos en index.css o donde corresponda.
```

---

## Paso 5: TDD - Skeleton Screens

### 5.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear un componente Skeleton reutilizable usando TDD.
El componente NO existe todavía.

Skeleton es GLOBAL SCOPE - se usará en múltiples features 
(ProductCardSkeleton, CartSkeleton, etc.)

Requisitos:
- Muestra un placeholder animado (pulse) mientras carga contenido
- Variantes: text, rectangular, circular
- Props opcionales para width y height
- Debe tener role="status" para accesibilidad (aunque esté hidden)

Casos a testear:
- Renderiza con animación pulse
- Aplica la variante correcta (clases diferentes para cada una)
- Acepta width y height custom
- Variante circular tiene border-radius completo

Ubicación: src/shared/components/Skeleton.test.tsx

Genera SOLO el test.
```

**Ejecutar (RED)**:
```bash
pnpm test Skeleton
```

### 5.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para Skeleton:

[Pegar el test]

Implementa el componente para pasar los tests.

Ubicación: src/shared/components/Skeleton.tsx
```

**Ejecutar (GREEN)**:
```bash
pnpm test Skeleton
```

---

## Paso 6: ProductCardSkeleton

**Prompt para la IA:**
```
Crea un componente ProductCardSkeleton que use el Skeleton base 
para mostrar un placeholder de ProductCard mientras carga.

Requisitos:
- Misma estructura visual que ProductCard
- Skeleton para: imagen, título, descripción, precio, botón
- Puede usarse en ProductCatalog durante estados de carga

Ubicación: src/features/product-catalog/components/ProductCardSkeleton.tsx

Este componente no necesita tests propios (usa Skeleton que ya está testeado).
```

---

## Paso 7: Optimistic UI en Add to Cart

**Prompt para la IA:**
```
Mejora el feedback visual de ProductCard cuando se agrega al carrito.

Estados del botón:
- idle: "Add to Cart" (color primario)
- loading: "Adding..." (gris, quizás un spinner)
- success: "Added!" (verde, checkmark)
- error: "Failed" (rojo, opción de retry)

El estado debe:
- Cambiar a loading inmediatamente al hacer click
- Cambiar a success/error según resultado
- Volver a idle después de 1.5-3 segundos

Actualiza los tests de ProductCard si es necesario.
```

---

## Paso 8: TDD - Toast Notifications

### 8.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear un componente Toast para notificaciones usando TDD.
El componente NO existe todavía.

Toast es GLOBAL SCOPE - se usará para notificaciones en toda la app
(add to cart, errores, confirmaciones, etc.)

Requisitos:
- Muestra mensaje de notificación
- Variantes: success, error, info (con colores diferentes)
- Se auto-cierra después de 3 segundos
- Botón para cerrar manualmente
- role="alert" y aria-live para accesibilidad

Casos a testear:
- Renderiza el mensaje con role="alert"
- Aplica color correcto según variante (success=verde, error=rojo, info=azul)
- Llama onClose cuando se hace click en cerrar
- Se auto-cierra después de 3 segundos (usar fake timers)

Ubicación: src/shared/components/Toast.test.tsx

Genera SOLO el test.
```

**Ejecutar (RED)**:
```bash
pnpm test Toast
```

### 8.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para Toast:

[Pegar el test]

Implementa el componente para pasar los tests.

Ubicación: src/shared/components/Toast.tsx
```

**Ejecutar (GREEN)**:
```bash
pnpm test Toast
```

---

## Paso 9: aria-live para Updates Dinámicos

**Prompt para la IA:**
```
Agrega regiones aria-live para anunciar cambios del carrito a screen readers.

Requisitos:
- Anunciar cuando se actualiza el carrito (items, total)
- Usar aria-live="polite" para no interrumpir
- La región puede estar visualmente oculta (clase sr-only)

También necesito la clase CSS sr-only para ocultar contenido 
visualmente pero mantenerlo accesible.

NOTA: Si LoginDemo usa <label> con PasswordInput, puede causar 
error de jsx-a11y porque PasswordInput ya tiene aria-label interno.
Solución: usar <span> en vez de <label> para el texto "Password".
```

---

## Paso 10: Verificar Accesibilidad

```bash
# Verificar que no hay errores de lint de a11y
pnpm lint
```

También verificar manualmente:
- Lighthouse Accessibility audit (objetivo: 90+)
- Navegación completa con solo teclado
- Probar con screen reader si es posible

---

## Paso 11: Verificación COMPLETA (OBLIGATORIO)

```bash
pnpm test:run      # Tests unitarios (incluyendo Skeleton y Toast)
pnpm test:e2e      # Tests E2E
pnpm lint          # Sin errores de lint (jsx-a11y)
pnpm typecheck     # Sin errores de tipos
pnpm build         # Build exitoso
```

> ⚠️ Si alguno falla, corregir antes de continuar.

---

## Checkpoint

Al final del video tienes:
- ✅ jsx-a11y configurado y sin errores
- ✅ ARIA labels descriptivos
- ✅ Focus visible configurado
- ✅ Skeleton con tests (TDD)
- ✅ Toast con tests (TDD)
- ✅ Optimistic UI en Add to Cart
- ✅ aria-live para screen readers
- ✅ Score de accesibilidad 90+
- ✅ Verificación completa pasando
- ✅ **APP ACCESIBLE** ♿

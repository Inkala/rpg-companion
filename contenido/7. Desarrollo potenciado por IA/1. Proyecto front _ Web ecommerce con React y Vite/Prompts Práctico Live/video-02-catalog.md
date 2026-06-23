# Video 2: Tipos + Catálogo de Productos (15 min)

## Resultado Final
Catálogo mostrando 6 productos en grid responsive.

---

## Paso 1: Definir Tipos (Global Scope)

**Prompt para la IA:**
```
Necesito definir los tipos TypeScript para una aplicación de e-commerce.

Estos tipos son GLOBAL SCOPE - se usarán en toda la app.

Tipos requeridos:
- Product: debe tener id, name, price, image, y description
- CartItem: representa un producto en el carrito con su cantidad

Ubicación: src/shared/types/index.ts

Exporta todos los tipos para poder importarlos desde otros archivos.
```

---

## Paso 2: Datos de Productos (Global Scope)

**Prompt para la IA:**
```
Crea datos mock de 6 productos para una tienda de tecnología.

Estos datos son GLOBAL SCOPE - disponibles en toda la app.

Requisitos:
- Productos variados (headphones, smartwatch, laptop stand, keyboard, usb hub, webcam)
- Precios realistas entre $30 y $200
- Usar https://picsum.photos/seed/[nombre]/200 para las imágenes
- Descripciones cortas pero descriptivas
- Usar el tipo Product que definimos

Ubicación: src/shared/data/products.ts
```

---

## Paso 3: Actualizar ProductCard con Tipos

**Prompt para la IA:**
```
Actualiza el componente ProductCard para usar los tipos TypeScript que definimos.

ProductCard está en LOCAL SCOPE (features/product-catalog/).
Los tipos están en GLOBAL SCOPE (shared/types/).

Cambios necesarios:
- Importar el tipo Product desde shared/types (usar ruta relativa)
- Tipar las props correctamente
- Agregar la descripción del producto (texto truncado si es muy largo)
- Actualizar el test si es necesario para incluir description en el mock

Archivos:
- src/features/product-catalog/components/ProductCard.tsx
- src/features/product-catalog/components/ProductCard.test.tsx (si necesita cambios)
```

**Verificar**:
```bash
pnpm test ProductCard
```

---

## Paso 4: TDD - ProductCatalog

### 4.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear un componente ProductCatalog usando TDD.
El componente NO existe todavía.

Requisitos del componente:
- Importa y muestra todos los productos del archivo de datos
- Muestra un heading "Products"
- Renderiza un ProductCard por cada producto
- Recibe onAddToCart como prop y lo pasa a cada ProductCard

Para el test:
- Mockea el módulo de datos para usar productos de prueba (2 productos simples)
- Verifica que se renderizan los productos
- Verifica que existe el heading

Ubicación: src/features/product-catalog/ProductCatalog.test.tsx

Genera SOLO el test. Luego implementaré el componente.
```

**Ejecutar (debe fallar)**:
```bash
pnpm test ProductCatalog
```

### 4.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para ProductCatalog:

[Pegar el test generado]

Implementa ProductCatalog.tsx para pasar los tests.

Requisitos adicionales:
- Grid responsive: 1 columna en mobile, 2 en tablet, 3 en desktop
- Usar Tailwind para los estilos
- Importar productos con ruta relativa

Ubicación: src/features/product-catalog/ProductCatalog.tsx
```

**Ejecutar (debe pasar)**:
```bash
pnpm test ProductCatalog
```

---

## Paso 5: Integrar en App

**Prompt para la IA:**
```
Actualiza App.tsx para mostrar el catálogo completo.

Requisitos:
- Header con título "Simple Product Shop"
- ProductCatalog como contenido principal
- onAddToCart que haga console.log del producto (temporal)
- Container centrado con max-width y padding
- Fondo gris claro para la página
```

**Verificar**:
```bash
pnpm dev
```

---

## Paso 6: Configurar Path Aliases (Opcional)

**Prompt para la IA:**
```
Quiero configurar path aliases para imports más limpios.

Objetivo: poder usar "@/" para importar desde "src/"
Ejemplo: import { Product } from '@/shared/types'

Archivos a modificar:
- tsconfig.json (o tsconfig.app.json)
- vite.config.ts

Nota: Este paso es opcional. Si prefieres rutas relativas, puedes saltarlo.
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
- ✅ Tipos TypeScript definidos (Product, CartItem)
- ✅ 6 productos mock con imágenes
- ✅ ProductCatalog con tests pasando
- ✅ Grid responsive funcionando
- ✅ App mostrando el catálogo completo
- ✅ Build exitoso

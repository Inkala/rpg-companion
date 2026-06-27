---
theme: default
---

# Lección 28: Microcopy con IA

## Textos que Guían y Convierten

---

## Agenda

- ¿Qué es Microcopy?
- Por qué Importa
- Microcopy vs Copy
- Tipos de Microcopy
- IA como Asistente de Writing
- Prompting para Microcopy
- A/B Testing de Copy
- Mejores Prácticas

---

## ¿Qué es Microcopy?

**Microcopy**: Pequeños textos en la UI que guían al usuario

**Ejemplos**:

```
- Botones: "Add to Cart" vs "Buy Now"
- Placeholders: "you@example.com"
- Error messages: "Email required"
- Success messages: "✓ Saved!"
- Empty states: "Your cart is empty"
- Tooltips: "Promo code from email"
- CTAs: "Start Free Trial"
- Helper text: "(We'll never share your email)"
```

**Invisible cuando está bien**

**Muy visible cuando está mal**

---

## Por qué Importa

**Caso de estudio real: Booking.com**

```
Cambio de botón:
"Reserve" → "Reserve Now"
Resultado: +3.5% conversiones

Texto de ayuda:
Agregado: "(Cancelación gratis)"
Resultado: +7% conversiones

Mensaje de error:
"Inválido" → "Email debe incluir @"
Resultado: 12% menos abandono
```

**ROI de Microcopy**:

- Costo: 0 euros (solo cambiar texto)
- Tiempo: Minutos
- Impacto: Millones en ingresos

**Mejor ROI en diseño UX**

---

## Microcopy vs Copy Regular

**Copy regular** (Marketing):

```
Propósito: Persuadir, informar, branding
Longitud: Párrafos, páginas
Tono: Creativo, storytelling
Ejemplos: Blog posts, landing pages, emails

"Descubre la experiencia de compra revolucionaria
que está transformando el e-commerce. Únete a miles
de clientes satisfechos..."
```

**Microcopy** (UX):

```
Propósito: Guiar, clarificar, reducir fricción
Longitud: 1-10 palabras
Tono: Claro, conciso, útil
Ejemplos: Botones, errores, labels

"Agregar al Carrito"
"Email es requerido"
"2 artículos en carrito"
```

---

## Button Microcopy

**❌ Genérico**:

```tsx {*}{maxHeight:'300px'}
<button>Submit</button>
<button>Click Here</button>
<button>OK</button>
<button>Continue</button>
```

**✅ Específico y Orientado a la Acción**:

```tsx {*}{maxHeight:'300px'}
<button>Agregar al Carrito</button>
<button>Comenzar Prueba Gratuita</button>
<button>Descargar Recibo</button>
<button>Continuar al Pago</button>
```

**Patrón**: Verbo + Sustantivo (qué sucede al hacer click)

---

## Estados de Carga y Procesamiento (1/2)

**❌ Genérico**:

```tsx {*}{maxHeight:'300px'}
{
  isLoading && <p>Loading...</p>
}
{
  isProcessing && <p>Processing...</p>
}
```

---

## Estados de Carga y Procesamiento (2/2)

**✅ Contextual**:

```tsx {*}{maxHeight:'300px'}
// Agregando al carrito
{
  isAdding && (
    <button disabled>
      <Spinner /> Agregando al Carrito...
    </button>
  )
}

// Aplicando descuento
{
  isApplying && <p>Aplicando código promo...</p>
}

// Procesando pago
{
  isProcessing && (
    <p>
      <Spinner /> Procesando pago...
      <span className="text-sm">Esto puede tomar unos segundos</span>
    </p>
  )
}

// Quitando artículo
{
  isRemoving && <p>Quitando artículo...</p>
}
```

**Los usuarios saben exactamente qué está sucediendo**

---

## Mensajes de Error

**❌ Técnico**:

```
"Error 422: Unprocessable Entity"
"Validación falló"
"NULL pointer exception"
"Entrada inválida"
```

**✅ Humano y Útil**:

```
"Email debe incluir @"
"Password debe tener al menos 8 caracteres"
"Este código promo ha expirado"
"No pudimos procesar tu tarjeta. Intenta otro método de pago."
"Este artículo está agotado. Te notificaremos cuando esté disponible."
```

**Patrón**:

```
1. Qué está mal
2. Cómo solucionarlo (si es posible)
3. Alternativa (si aplica)
```

---

## Mensajes de Éxito

**❌ Genérico**:

```
<Alert>Éxito</Alert>
<Alert>Guardado</Alert>
<Alert>Hecho</Alert>
```

**✅ Específico y Tranquilizador**:

```tsx {*}{maxHeight:'300px'}
<Alert variant="success">
  ✓ ¡Agregado al carrito!
</Alert>

<Alert variant="success">
  ✓ ¡Pedido realizado! Confirmación enviada a {email}
</Alert>

<Alert variant="success">
  ✓ Código promo aplicado. ¡Ahorraste ${discount}!
</Alert>

<Alert variant="success">
  ✓ Cantidad actualizada
</Alert>
```

**Incluir**:

- Checkmark (✓) para escaneo rápido
- Acción específica completada
- Siguiente paso (si aplica)

---

## Estados Vacíos (1/2)

**❌ No útil**:

```tsx {*}{maxHeight:'300px'}
{
  cart.length === 0 && <p>No items</p>
}
```

---

## Estados Vacíos (2/2)

**✅ Útil y Accionable**:

```tsx {*}{maxHeight:'350px'}
{
  cart.length === 0 && (
    <div className="empty-state">
      <ShoppingBag size={64} />
      <h3>Tu carrito está vacío</h3>
      <p>Navega nuestro catálogo para encontrar productos geniales</p>
      <button onClick={() => navigate('/products')}>Comenzar a Comprar</button>
    </div>
  )
}

// Sin resultados de búsqueda
{
  results.length === 0 && (
    <div className="empty-state">
      <p>No hay productos que coincidan con "{searchQuery}"</p>
      <p>Intenta:</p>
      <ul>
        <li>Palabras clave diferentes</li>
        <li>Términos de búsqueda más amplios</li>
        <li>Verificar ortografía</li>
      </ul>
    </div>
  )
}
```

---

## Placeholders (1/2)

**❌ Repetir label**:

```tsx {*}{maxHeight:'300px'}
<label>Email</label>
<input placeholder="Email" />
```

**❌ Sin ejemplo**:

```tsx {*}{maxHeight:'300px'}
<label>Teléfono</label>
<input placeholder="Número de teléfono" />
```

---

## Placeholders (2/2)

**✅ Mostrar formato**:

```tsx {*}{maxHeight:'300px'}
<label>Email</label>
<input
  type="email"
  placeholder="tu@ejemplo.com"
/>

<label>Teléfono</label>
<input
  type="tel"
  placeholder="(011) 1234-5678"
/>

<label>Código Promo</label>
<input
  type="text"
  placeholder="SUMMER20"
/>
```

**Placeholders muestran formato esperado, no repiten label**

---

## Texto de Ayuda

**Cuándo usar**:

```
- Requerimientos complejos
- Preocupaciones de privacidad
- Clarificación de formato
- Reglas de negocio
```

**Ejemplos**:

```tsx {*}{maxHeight:'250px'}
<label>Password</label>
<input type="password" />
<span className="help-text">
  Must be at least 8 characters with 1 uppercase and 1 number
</span>

<label>Email</label>
<input type="email" />
<span className="help-text">
  We'll never share your email with anyone
</span>

<label>Promo Code</label>
<input type="text" />
<span className="help-text">
  Find codes in promotional emails
</span>

<label>Quantity</label>
<input type="number" min={1} max={99} />
<span className="help-text">
  Maximum 99 per order. Buying in bulk? Contact sales
</span>
```

---

## Tono y Voz (1/2)

**Principios**:

```
1. Ser humano (no robótico)
2. Ser útil (no juzgar)
3. Ser claro (no ingenioso)
4. Ser conciso (no verboso)
```

**Ejemplos**:

**❌ Robótico**:

```
"El sistema ha encontrado un error procesando tu solicitud.
Por favor reintenta la operación más tarde."
```

**✅ Humano**:

```
"No pudimos procesar tu pedido. Por favor intenta de nuevo en unos minutos."
```

---

## Tono y Voz (2/2)

**❌ Acusatorio**:

```
"Ingresaste un email inválido"
```

**✅ Útil**:

```
"Email debe incluir @"
```

---

## Ejemplos de Tono

**Formal** (Bancos, Salud):

```
"Tu pago ha sido procesado"
"Cuenta creada exitosamente"
"Transacción completada"
```

**Amigable** (E-commerce, Social):

```
"✓ ¡Todo listo!"
"¡Buena elección! Agregado al carrito"
"¡Gracias! Tu pedido está en camino"
```

**Juguetón** (Juegos, Creativo):

```
"¡Boom! Artículo agregado 🎉"
"¡Subiste de nivel! Envío gratis desbloqueado"
"¡Excelente elección! Carrito actualizado"
```

**Ajusta tono a la marca, pero siempre prioriza claridad**

---

## IA para Microcopy

**Fortalezas de IA**:

```
✅ Genera variaciones rápidamente
✅ Sugiere alternativas
✅ Mejora claridad
✅ Acorta texto verboso
✅ Ajusta tono
✅ Traduce a otros idiomas
```

**Limitaciones de IA**:

```
❌ No conoce la voz de tu marca
❌ No conoce contexto de negocio
❌ Puede ser muy formal o informal
❌ Necesita revisión humana
❌ No puede hacer A/B testing (eso lo haces tú)
```

**Mejor uso**: IA genera opciones, humano selecciona y refina

---

## Prompting para Microcopy (1/2)

**❌ Mal prompt**:

```
"Escribe texto de botón"
```

**✅ Buen prompt**:

```
Escribe microcopy para un botón de "agregar al carrito" en un
carrito de compras e-commerce.

Contexto:
- Usuarios navegando páginas de productos
- Acción: Agregar artículo al carrito de compras
- Voz de marca: Amigable pero profesional
- Audiencia objetivo: Compradores online 25-45

Genera 5 variaciones:
1. Estándar/clara
2. Orientada a la acción
3. Enfocada en beneficio
4. Urgente
5. Juguetona

Máximo 4 palabras cada una.
```

---

## Prompting para Microcopy (2/2)

**Resultado**:

```
1. Agregar al Carrito
2. Agregar a la Bolsa
3. Comprar Ahora
4. Aprovechar Oferta
5. ¡Llevátelo!
```

---

## Template de Prompt

```
Escribe [TIPO DE MICROCOPY] para [CONTEXTO]

Contexto:
- Situación del usuario: [Dónde/cuándo usuario ve esto]
- Acción/propósito: [Qué hace]
- Voz de marca: [Tono]
- Restricciones: [Límite de palabras, requerimientos]

Genera [NÚMERO] variaciones:
[Lista de tipos de variación]

Requerimientos:
- [Requerimiento 1]
- [Requerimiento 2]
```

---

## Ejemplos de IA para Microcopy

**Prompt**: Mensaje de error para artículo agotado

**Output de IA**:

```
1. "Este artículo está actualmente agotado"
2. "Agotado. Te notificaremos cuando esté disponible"
3. "Temporalmente no disponible. ¡Vuelve pronto!"
4. "¡Agotado! ¿Quieres que te enviemos email cuando vuelva?"
```

**Humano selecciona**: #4 (más útil + accionable)

**Prompt**: Estado de carrito vacío

**Output de IA**:

```
1. "Tu carrito está vacío. ¡Comienza a comprar!"
2. "Nada aquí todavía. Navega nuestros productos"
3. "¡Hora de llenar este carrito! Explora ofertas"
4. "¿Carrito vacío? Arreglemos eso."
```

**Humano selecciona**: #1 (claro + amigable)

---

## A/B Testing de Microcopy (1/2)

**Testing basado en hipótesis**:

```
Test: Texto de botón
Hipótesis: CTA orientado a acción aumenta conversiones

A: "Continuar"
B: "Continuar al Pago"

Medir: Click-through rate

Resultado: B gana (+12% CTR)
Razón: Usuarios saben qué sucede después
```

---

## A/B Testing de Microcopy (2/2)

**Ejemplos de carrito para testear**:

```
CTA de estado vacío:
A: "Comprar Ahora"
B: "Navegar Productos"
C: "Comenzar a Comprar"

Botón agregar al carrito:
A: "Agregar al Carrito"
B: "Agregar a la Bolsa"
C: "Comprar Ahora"

Placeholder código promo:
A: "Código promo"
B: "SUMMER20"
C: "Ingresar código"
```

---

## Proceso de Iteración (1/2)

**1. Escribir baseline**:

```
"Agregar al Carrito"
```

**2. IA genera variaciones**:

```
1. Agregar al Carrito
2. Agregar a la Bolsa
3. Agregar al Cesto
4. Comprar Ahora
5. Adquirir
```

---

## Proceso de Iteración (2/2)

**3. Humano revisa**:

```
1. ✅ Claro, familiar
2. ✅ Alternativa, mismo significado
3. ❌ No común en Latinoamérica
4. ⚠️ Muy agresivo (no está agregando, está comprando)
5. ❌ Muy formal
```

**4. Seleccionar finalistas**:

```
A: Agregar al Carrito
B: Agregar a la Bolsa
```

**5. A/B test**:

```
Resultado: A gana (más familiar)
```

---

## Herramientas (1/2)

**Asistentes de IA para Writing**:

- **ChatGPT**: Generación general de microcopy
- **Claude**: Ajuste de tono matizado
- **Copy.ai**: Marketing copy + microcopy
- **Jasper**: Ajuste a voz de marca

**Testing**:

- **Google Optimize**: A/B testing
- **Optimizely**: Experimentación avanzada
- **VWO**: Optimización de conversión

---

## Herramientas (2/2)

**Legibilidad**:

- **Hemingway Editor**: Simplificar texto complejo
- **Grammarly**: Gramática + claridad

```bash {*}{maxHeight:'300px'}
# Ejemplo: Testear con ChatGPT
"Genera 5 variaciones de texto para botón 'Agregar al Carrito'
para un sitio e-commerce. Máximo 4 palabras. Tono: amigable."
```

---

## Errores Comunes (1/2)

**❌ Muy ingenioso**:

```
"Adquirir Producto"  (Solo di "Agregar al Carrito")
"Iniciar Secuencia de Checkout"  (Di "Continuar al Pago")
```

**❌ Muy vago**:

```
"Click Aquí"  (¿Click aquí para qué?)
"Enviar"  (¿Enviar qué?)
"OK"  (¿OK para qué?)
```

**❌ Muy apologético**:

```
"Disculpa, pero necesitas ingresar email"
→ "Email es requerido"

"Disculpa, esto falló"
→ "No pudimos procesar pago. Intenta otra tarjeta"
```

---

## Errores Comunes (2/2)

**❌ Muy largo**:

```
"Haz click en este botón para agregar el artículo seleccionado a tu carrito de compras"
→ "Agregar al Carrito"
```

---

## Checklist de Microcopy (1/2)

**Claridad**:

- [x] Usuario entiende qué pasará
- [x] Sin jerga o términos técnicos
- [x] Específico (no genérico)

**Utilidad**:

- [x] Errores explican qué está mal + cómo arreglarlo
- [x] Estados vacíos sugieren siguiente acción
- [x] Mensajes de éxito confirman qué sucedió

---

## Checklist de Microcopy (2/2)

**Tono**:

- [x] Coincide con voz de marca
- [x] Apropiado para contexto
- [x] Útil, no acusatorio

**Brevedad**:

- [x] Tan corto como sea posible
- [x] Pero no a costa de claridad

**Acción**:

- [x] Botones usan verbo + sustantivo
- [x] CTAs son específicos

---

## Ejercicio 1: Mejorar Button Copy (Action-Oriented Microcopy)

**Prompt**:

```bash {*}{maxHeight:'300px'}
Actúa como un UX writer transformando button copy genérico a action-oriented + specific.

CONTEXTO: Generic button copy = confusion + lower conversion. "Submit" tells nothing
about what happens (submit what?). Best button pattern: Verb + Noun (action + object).
Case study real: Booking.com cambió "Reserve" → "Reserve Now" = +3.5% conversions (costo:
$0, tiempo: 5 minutos). Button copy debe responder: "Qué pasa cuando click?". Context
matters: mismo button puede ser "Submit" en 10 lugares, cada uno necesita specific copy.
User certainty: button copy específico reduce cognitive load (usuario NO adivina outcome).
Mobile UX: specific button text critical en mobile (users scan fast, specific = clarity).

TAREA: Transforma button copy genérico a específico usando Verb + Noun pattern.

GENERIC BUTTONS TO TRANSFORM:
- "Submit" (en contexto: agregar producto al cart)
- "OK" (en contexto: confirmar removal de item)
- "Click here" (en contexto: CTA en empty cart)
- "Continue" (en contexto: proceder a payment)

TRANSFORMATION PATTERN:

// ❌ Generic (confusing)
<button>Submit</button>
→ User thinks: "Submit what? Form? Order? Review?"

// ✅ Specific (clear)
<button>Add to Cart</button>
→ User knows: "This adds product to my cart"

// Pattern: Verb + Noun
// Verb: Add, Apply, Confirm, Continue, Remove, View
// Noun: Cart, Item, Code, Order, Products

TRANSFORMATION EXAMPLES:

Context: Agregar producto
"Submit" → "Add to Cart"

Context: Promo code form
"Submit" → "Apply Promo Code"

Context: Eliminar item del cart
"OK" → "Confirm Removal" o "Remove Item"

Context: Empty cart CTA
"Click here" → "Browse Products" o "Start Shopping"

Context: Checkout flow
"Continue" → "Continue to Payment"
"Submit" → "Place Order"

ELEMENTOS CRÍTICOS:

- Action verb: tells QUÉ hace (Add, Apply, Remove, Continue)
- Object noun: tells SOBRE QUÉ (Cart, Code, Item, Payment)
- Context-specific: mismo action, different context = different copy
- User certainty: after reading, user knows exact outcome

TESTING UX:

1. Show button to usuario: "Add to Cart"
2. Ask: "¿Qué pasa si haces click?"
3. Usuario responde: "Agrega producto a mi carrito"
4. = Success (clear + specific)

Contrast con generic:

1. Show: "Submit"
2. Ask: "¿Qué pasa si haces click?"
3. Usuario: "¿Submit qué? ¿Formulario? ¿Orden?"
4. = Failure (confusing)

VALIDACIÓN: Button text debe responder "¿Qué pasa cuando click?" sin ambigüedad

```

**Aprende**: Specific button copy (Verb + Noun)

elimina confusion y aumenta conversion +3-5%

---

## Ejercicio 2: Empty State Útil (Positive Framing + CTA)

**Prompt**:

```bash {*}{maxHeight:'300px'}

Actúa como un UX writer transformando empty state negativo a helpful + action-oriented.

CONTEXTO: Empty states = missed opportunity para engagement. "No items" = negativo (enfoca
en ausencia, NO en posibilidad). Positive framing: "Your cart is ready!" mejor que "Empty
cart" (psychologically inviting vs depressing). Empty state components: 1) Visual (friendly
icon), 2) Heading (positive message), 3) Body (guide next step), 4) CTA button (specific
action). UX research: empty states con CTA button → 40% más engagement que solo texto. Zero
state design: momento PERFECT para guide user hacia value. Conversion opportunity: empty
state → engaged browsing → purchase.

TAREA: Transforma empty cart state de negativo a helpful + actionable.

ESTADO ACTUAL (NEGATIVO):

<div>No items</div>

Problems:

- Negativo: "No items" enfoca en ausencia
- Sin guidance: NO dice qué hacer
- Sin visual: texto solo = boring
- Sin CTA: usuario stuck, no next step

EMPTY STATE TRANSFORMATION:

<div className="empty-cart-state">
  {/* 1. Friendly visual */}
  <CartIcon className="icon-large text-gray-400" />

  {/* 2. Positive heading */}
  <h3 className="text-lg font-medium">
    Your cart is ready for items!
  </h3>

  {/* 3. Helpful guidance */}
  <p className="text-gray-600">
    Browse our products and discover great deals
  </p>

  {/* 4. Clear CTA */}
  <button
    onClick={navigateToProducts}
    className="btn-primary mt-4"
  >
    Browse Products
  </button>
</div>

ELEMENTOS CRÍTICOS:

1. Visual: Friendly cart icon (NO error icon, NO empty feeling)
2. Heading: Positive framing ("ready for" vs "no items")
3. Body text: Guide action ("Browse our products")
4. CTA button: Specific action ("Browse Products" NOT "Click here")
5. Tone: Inviting (NOT blaming user for empty state)

POSITIVE FRAMING ALTERNATIVES:

- "Your cart is ready for items!" (inviting)
- "Start filling your cart" (action-oriented)
- "Let's find something great!" (enthusiastic)

vs NEGATIVE FRAMING (avoid):

- "No items" (depressing)
- "Empty cart" (obvious, unhelpful)
- "Cart is empty" (stating problem, no solution)

TESTING UX:

1. User lands en empty cart
2. Sees: "Your cart is ready for items!" + "Browse Products" button
3. Feels: Invited to action (NOT frustrated by emptiness)
4. Clicks: "Browse Products" → engagement (40% higher with CTA)

VALIDACIÓN: Empty state debe convertir passive moment → active engagement

```

**Aprende**: Positive empty states con clear CTA

transform dead-ends en engagement opportunities

---

## Puntos Clave

1. **Microcopy**: Textos pequeños con enorme impacto en UX
2. **ROI**: Mejor retorno en UX (costo cero, impacto enorme)
3. **Botones**: Verbo + Sustantivo ("Agregar al Carrito" no "Enviar")
4. **Errores**: Específicos, útiles, sin culpar
5. **Éxito**: Tranquilizar + confirmar acción
6. **Estados Vacíos**: Sugerir siguiente acción
7. **Tono**: Claro > Ingenioso
8. **IA**: Genera variaciones, humanos seleccionan
9. **Prompting**: Proveer contexto, restricciones, variaciones
10. **A/B Test**: Testear variaciones, los datos deciden

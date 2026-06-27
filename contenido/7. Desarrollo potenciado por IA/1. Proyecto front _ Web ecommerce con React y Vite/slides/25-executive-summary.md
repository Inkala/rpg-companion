---
theme: default
---

# Lección 25: Executive Summaries with AI

## Comunicar Complejidad Técnica a Stakeholders

---

## Agenda

- El Problema de Comunicación
- ¿Qué es un Executive Summary?
- Estructura de un Buen Summary
- AI como Asistente
- Ejemplos Prácticos
- Prompting Efectivo
- Best Practices

---

## El Problema (1/2)

**El desarrollador escribe update**:

```
Refactorizamos la gestión de estado del carrito de Context API a
Zustand, implementando un middleware personalizado para persistencia con
fallback a localStorage y storage primario en IndexedDB. La nueva
arquitectura usa actualizaciones atómicas con patrones de UI optimista
e implementa una estrategia de merge tipo CRDT para resolución de conflictos.
Logramos 80% de cobertura de tests con Vitest y agregamos tests E2E
usando Playwright. Tamaño de bundle reducido de 245KB a 230KB gzipped.
```

---

## El Problema (2/2)

**El ejecutivo lee**:

```
"¿Qué significa esto para el negocio?"
"¿Esto resolvió el problema de checkout?"
"¿Cuánto tiempo tomó esto?"
"¿Qué sigue?"

❌ Sin respuestas
❌ Perdido en jerga técnica
❌ No puede tomar decisiones
```

---

## Comunicación Técnica vs Ejecutiva (1/2)

**Técnica (Desarrollador)**:

```
Audiencia: Desarrolladores
Enfoque: Cómo funciona
Lenguaje: Código, arquitectura, patrones
Métricas: Coverage, tamaño de bundle, performance en ms

Preguntas respondidas:
- ¿Qué enfoque técnico?
- ¿Qué patrones usados?
- ¿Qué trade-offs?
```

---

## Comunicación Técnica vs Ejecutiva (2/2)

**Ejecutiva (Stakeholder)**:

```
Audiencia: Product, Business, Ejecutivos
Enfoque: Impacto en el negocio
Lenguaje: Usuarios, ingresos, objetivos
Métricas: Impacto en usuario, tiempo ahorrado, riesgo reducido

Preguntas respondidas:
- ¿Qué problema de negocio se resolvió?
- ¿Cuál es el impacto en usuario?
- ¿Cuál es el costo/beneficio?
- ¿Qué sigue?
```

---

## ¿Qué es un Executive Summary?

**Propósito**:

```
Traducir trabajo técnico a valor de negocio

Elementos clave:
1. Qué se hizo (1 oración)
2. Por qué importa (impacto en negocio)
3. Resultados clave (métricas que importan)
4. Qué sigue (items de acción)

Longitud: 3-5 párrafos máximo
Tiempo de lectura: 2 minutos
Tono: Claro, sin jerga
```

**Regla**: Si tu CEO no puede entenderlo, reescríbelo.

---

## Plantilla de Executive Summary

```markdown
## Resumen Ejecutivo: [Nombre del Proyecto]

### Qué Hicimos

[1 oración describiendo el trabajo sin jerga]

### Por Qué Importa

[Impacto en negocio: usuarios, ingresos, riesgo, objetivos]

### Resultados Clave

- [Métrica 1: Mejora de cara al usuario]
- [Métrica 2: Impacto en negocio]
- [Métrica 3: Reducción de riesgo]

### Desafíos Superados

[Opcional: Obstáculos principales, mantiene expectativas realistas]

### Qué Sigue

- [Siguiente paso 1]
- [Siguiente paso 2]

### Cronología

Completado: [Fecha]
Siguiente hito: [Fecha]
```

---

## Ejemplo: Proyecto de Performance del Carrito (1/3)

**❌ Versión técnica**:

```
Sprint de Optimización de Performance del Carrito

Implementamos React.memo en componentes CartItem y
migramos de Context API a Zustand para gestión de estado.
Agregamos virtualización con react-window para carritos largos.
Implementamos code splitting con React.lazy para el flujo
de checkout. Reducimos bundle principal de 245KB a 230KB gzipped.
Re-renders del carrito disminuyeron de 50ms a 5ms en actualizaciones.
Cobertura de tests aumentó a 85% con Vitest. Cobertura E2E
en 75% con Playwright.

Detalles técnicos:
- Middleware de Zustand para persistencia
- Sincronización LocalStorage + IndexedDB
- Actualizaciones optimistas
- Resolución de conflictos CRDT
```

---

## Ejemplo: Proyecto de Performance del Carrito (2/3)

**✅ Versión ejecutiva (Parte 1)**:

```
Mejoras de Performance del Carrito - Q1 2024

Qué Hicimos
Mejoramos la velocidad y confiabilidad del carrito de compras, resolviendo
la experiencia lenta de checkout reportada por 15% de usuarios móviles.

Por Qué Importa
Checkout rápido = mayor conversión. Cada 100ms de delay nos cuesta
1% en ventas. Removimos 450ms del flujo carrito → checkout,
proyectado para aumentar conversiones móviles en 4.5%.

Resultados Clave
✓ Actualizaciones del carrito 10x más rápidas (500ms → 50ms)
✓ Clics en botón de checkout responden instantáneamente
✓ Carrito persiste entre dispositivos para usuarios autenticados
✓ Cero pérdida de datos del carrito (era 2% mensual)
✓ Usuarios móviles pueden completar checkout en 3.4 segundos (era 5.1s)
```

---

## Ejemplo: Proyecto de Performance del Carrito (3/3)

**✅ Versión ejecutiva (Parte 2)**:

```
Impacto en Negocio
- Estimado +$120K/mes en ingresos (4.5% aumento de conversión)
- Reducción de tickets de soporte sobre "carrito desapareció" en 95%
- Score de satisfacción móvil mejoró de 3.2 → 4.1 estrellas

Qué Sigue
- Monitorear tasas de conversión durante próximas 2 semanas
- Planear optimización de pagos (siguiente cuello de botella)
- Desplegar a mercados internacionales

Completado: 15 Feb 2024
Siguiente hito: Optimización de pagos para 15 Mar
```

---

## IA como Asistente de Escritura (1/2)

**Problema**:

```
Los desarrolladores son excelentes en escritura técnica
Los desarrolladores tienen dificultades con resúmenes ejecutivos
Escribir resúmenes toma horas
La IA puede ayudar
```

**La IA puede**:

```
✅ Traducir técnico → lenguaje de negocio
✅ Sugerir métricas que importan
✅ Identificar impacto en usuario
✅ Hacer el texto más conciso
✅ Remover jerga
✅ Estructurar contenido
```

---

## IA como Asistente de Escritura (2/2)

**La IA no puede**:

```
❌ Conocer tu contexto de negocio
❌ Inventar métricas que no existen
❌ Reemplazar juicio humano
❌ Escribir resumen perfecto (necesita revisión humana)
```

---

## Prompting: Malo vs Bueno (1/2)

**❌ Prompt malo**:

```
Escribe un resumen ejecutivo para esto:

[Pega 500 líneas de documentación técnica]
```

**Resultado**: Resumen genérico, sin contexto de negocio, enfoque incorrecto

---

## Prompting: Malo vs Bueno (2/2)

**✅ Prompt bueno**:

```{*}{maxHeight:'350px'}
Necesito un resumen ejecutivo para stakeholders no técnicos.

Proyecto: Mejoras de performance del carrito de compras
Duración: 2 semanas
Equipo: 3 desarrolladores

Detalles técnicos:
- Migración de Context API a Zustand
- Agregado code splitting
- Reducción de bundle 245KB → 230KB
- Mejora de tiempo de render del carrito 500ms → 50ms

Contexto de negocio:
- Compañía: Startup de e-commerce
- Usuarios: Compradores mobile-first (70% móvil)
- Problema: 15% de usuarios se quejaron de checkout lento
- Objetivo: Aumentar tasa de conversión móvil

Audiencia objetivo: CEO, VP de Producto, Head of Engineering

Por favor crea un resumen ejecutivo que:
1. Explique impacto en negocio (no detalles técnicos)
2. Incluya proyección de tasa de conversión
3. Resalte mejoras en experiencia de usuario
4. Sugiera próximos pasos
5. Mantenga bajo 300 palabras
6. Evite jerga
```

**Resultado**: Resumen enfocado con tono y métricas correctas

---

## Plantilla de Prompt

```{*}{maxHeight:'350px'}
Necesito un resumen ejecutivo para [NOMBRE DEL PROYECTO]

Detalles del proyecto:
- Objetivo: [Qué problema estábamos resolviendo]
- Duración: [Timeline]
- Tamaño del equipo: [Número de personas]

Trabajo técnico completado:
- [Detalle técnico 1]
- [Detalle técnico 2]
- [Detalle técnico 3]

Contexto de negocio:
- Compañía: [Tipo de compañía]
- Usuarios: [Quiénes son los usuarios]
- Problema: [Qué pain point]
- Objetivo: [Objetivo de negocio]

Métricas:
- Antes: [Métricas baseline]
- Después: [Métricas mejoradas]

Audiencia objetivo: [Quién leerá esto]

Por favor crea un resumen ejecutivo que:
1. [Requerimiento 1]
2. [Requerimiento 2]
3. Mantenga bajo [X] palabras
4. Evite jerga técnica
5. Enfoque en impacto de negocio
```

---

## Iterando con IA (1/2)

**Primer borrador (IA)**:

```
Mejoramos la performance del carrito migrando a gestión de estado
moderna y optimizando el rendering, resultando en experiencia de
usuario más rápida y mejores tasas de conversión.
```

**Feedback a la IA**:

```
Buen inicio, pero:
1. Sé más específico sobre métricas (10x más rápido, 450ms removidos)
2. Agrega proyección de ingresos ($120K/mes)
3. Incluye qué sigue (optimización de pagos)
4. Menciona el pain point del usuario (quejas de checkout lento)

Regenera con estos detalles.
```

---

## Iterando con IA (1/2)

**Segundo borrador (IA)**:

```
Después de que 15% de usuarios móviles reportaron checkout lento,
optimizamos la experiencia del carrito de compras. Las actualizaciones
del carrito ahora son 10x más rápidas (500ms → 50ms), y el checkout
se completa en 3.4 segundos en lugar de 5.1. Esto proyecta un aumento
de 4.5% en conversiones móviles, estimado en +$120K/mes. Próximamente
abordaremos la optimización de pagos para mejorar aún más el flujo.
```

**✅ ¡Mucho mejor!**

---

## Ejemplo: Resumen de Auditoría de Seguridad

**Reporte técnico**:

```markdown {*}{maxHeight:'350px'}
Auditoría de Seguridad - Q1 2024

Hallazgos:

- Vulnerabilidad SQL injection en endpoint /api/cart
- Vulnerabilidad XSS en búsqueda de productos
- Tokens CSRF faltantes en operaciones que cambian estado
- Contraseñas hasheadas con MD5 (algoritmo débil)
- Sin rate limiting en /api/login
- Secretos commiteados en repositorio Git
- HTTPS no forzado
- Headers de seguridad faltantes (CSP, HSTS, X-Frame-Options)

Remediación:

- Queries parametrizadas implementadas
- Sanitización de input con DOMPurify
- Middleware CSRF agregado
- Migrado a bcrypt con salt rounds = 12
- Rate limiting: 5 intentos/15min
- Secretos movidos a variables de entorno
- Middleware de redirección HTTPS
- Headers de seguridad Helmet.js

Resultados de tests:

- OWASP Top 10: 0 vulnerabilidades críticas restantes
- Test de penetración: Pasado
- npm audit: 0 issues high/critical
```

---

## Ejemplo: Resumen de Seguridad

**Resumen ejecutivo (asistido por IA)**:

```markdown {*}{maxHeight:'350px'}
Auditoría y Remediación de Seguridad - Q1 2024

Qué Hicimos
Completamos una auditoría de seguridad comprensiva y corregimos todas
las vulnerabilidades críticas en la aplicación de carrito de compras.

Por Qué Importa
Las brechas de seguridad cuestan a las compañías un promedio de $4.35M y
destruyen la confianza del cliente. Nuestra auditoría encontró 8 issues críticos
que podrían exponer datos de clientes, información de pagos, y
permitir acceso no autorizado. Todos los issues están ahora resueltos.

Resultados Clave
✓ 8 vulnerabilidades críticas corregidas (estaba en alto riesgo)
✓ Pasó testing de penetración externo
✓ Contraseñas de clientes ahora encriptadas de forma segura
✓ Datos de pago protegidos con estándares de la industria
✓ Checks de seguridad automatizados en CI/CD (previene issues futuros)

Riesgo Reducido

- Antes: Alto riesgo de brecha de datos
- Después: Postura de seguridad estándar de la industria
- Cumplimiento: Ahora cumple requerimientos PCI-DSS para pagos

Impacto en Cliente

- Cuentas de usuario seguras de acceso no autorizado
- Información de pago protegida
- Sin interrupciones de servicio durante correcciones

Qué Sigue

- Auditorías de seguridad trimestrales programadas
- Capacitación de seguridad del equipo el 20 Feb
- Lanzamiento de programa bug bounty en Marzo

Completado: 1 Feb 2024
Auditoría externa: Pasada 10 Feb 2024
```

---

## Métricas que Importan (1/2)

**Métricas técnicas (para desarrolladores)**:

```
- Cobertura de tests: 85%
- Tamaño de bundle: 230KB gzipped
- Tiempo de render: 50ms
- Tiempo de build: 45s
- Líneas de código: -1,500
```

---

## Métricas que Importan (2/2)

**Métricas de negocio (para ejecutivos)**:

```
✓ Carga de página: 3.4s (era 5.1s) → Impacto en conversión
✓ Usuarios móviles: 70% → Engagement
✓ Tickets de soporte: -95% → Ahorro de costos
✓ Satisfacción de usuario: 4.1★ (era 3.2★) → Retención
✓ Impacto en ingresos: +$120K/mes → ROI
```

**Regla**: Traducir técnico → impacto en negocio

---

## Errores Comunes (1/2)

**❌ Muy técnico**:

```
"Implementamos un binary search tree con tiempo de búsqueda O(log n)
para acceso a items del carrito en lugar de búsqueda lineal O(n)."
```

**✅ Enfocado en negocio**:

```
"Las operaciones del carrito ahora son 10x más rápidas, mejorando
la velocidad de checkout para clientes."
```

**❌ Sin métricas**:

```
"Hicimos el carrito más rápido y confiable."
```

---

## Errores Comunes (2/2)

**✅ Métricas específicas**:

```
"Las actualizaciones del carrito se completan en 50ms en lugar de 500ms,
reduciendo tiempo de checkout de 5.1s a 3.4s."
```

**❌ Sin "por qué"**:

```
"Migramos de Context API a Zustand."
```

**✅ Razón de negocio**:

```
"Corregimos performance lenta del carrito que causaba que 15% de usuarios
abandonaran el checkout."
```

---

## Diferentes Audiencias (1/2)

**Para CEO**:

```
Enfoque: Ingresos, riesgo, ventaja competitiva
Métricas: $$$, satisfacción de cliente, cuota de mercado
Longitud: 2-3 párrafos

"Las mejoras del carrito proyectan aumentar ingresos Q2 en $480K
(4.5% aumento de conversión móvil). Despliegue sin downtime.
Nos posiciona competitivamente contra velocidad de checkout de Amazon."
```

**Para VP de Producto**:

```
Enfoque: Experiencia de usuario, métricas, roadmap
Métricas: Satisfacción de usuario, engagement, uso de features
Longitud: 3-4 párrafos

"Satisfacción de checkout móvil mejoró de 3.2 a 4.1 estrellas.
Abandono del carrito reducido 12%. Los usuarios ahora pueden completar
la compra en menos de 4 segundos. Siguiente: optimización de pagos para
lograr sub-3s."
```

---

## Diferentes Audiencias (1/2)

**Para Director de Ingeniería**:

```
Enfoque: Decisiones técnicas, equipo, velocidad
Métricas: Cobertura de tests, calidad de código, velocity
Longitud: 4-5 párrafos + apéndice técnico

"El equipo entregó sprint de performance del carrito a tiempo con 85%
de cobertura. Decisión arquitectónica (Zustand) documentada en
ADR-001. Deuda técnica reducida al remover complejidad de Context API.
Velocity del equipo mantenida en 21 puntos/sprint."
```

---

## Herramientas de IA para Resúmenes

**ChatGPT**:

```
Mejor para: Resúmenes generales, múltiples iteraciones
Prompt: "Traduce este reporte técnico a resumen ejecutivo"
```

**Claude**:

```
Mejor para: Documentos largos, escritura matizada
Prompt: "Resume para stakeholders no técnicos"
```

**GitHub Copilot**:

```
Mejor para: Resúmenes rápidos en descripciones de PR
Comentario: // Resumen ejecutivo:
[Copilot sugiere resumen]
```

**Notion AI**:

```
Mejor para: Resúmenes de notas de reuniones
Seleccionar texto → "Resumir para ejecutivos"
```

---

## Mejores Prácticas (1/2)

**1. Empezar con impacto en negocio**:

```
✅ "Checkout más rápido aumenta conversiones en 4.5%"
❌ "Refactorizamos la capa de gestión de estado"
```

**2. Usar números**:

```
✅ "10x más rápido, +$120K/mes, 95% menos tickets"
❌ "Mucho más rápido, más ingresos, menos quejas"
```

**3. Explicar "por qué"**:

```
✅ "Corregimos checkout lento reportado por 15% de usuarios móviles"
❌ "Mejoramos performance del carrito"
```

---

## Mejores Prácticas (2/2)

**4. Mantenerlo corto**:

```
Objetivo: 250-300 palabras
Máximo: 500 palabras
Si es más largo → dividir en resumen + apéndice
```

---

## Mejores Prácticas (cont.)

**5. Incluir "qué sigue"**:

```
✅ "Siguiente: Optimización de pagos para 15 Marzo"
❌ Termina solo con resultados
```

**6. Revisión humana siempre**:

```
IA genera borrador
Humano:
- Verifica hechos
- Agrega contexto que IA no conoce
- Ajusta tono
- Confirma métricas
- Finaliza

¡Nunca publicar output de IA sin revisión!
```

**7. Probar con persona no técnica**:

```
Pide a amigo/pareja que lo lea
Si entienden → Bien
Si están confundidos → Reescribir
```

---

## Biblioteca de Plantillas

**Crear plantillas para escenarios comunes**:

```
/templates/
├── executive-summary-template.md
├── sprint-summary-template.md
├── incident-report-template.md
├── quarterly-update-template.md
├── security-audit-template.md
└── feature-launch-template.md
```

**Cada plantilla incluye**:

- Estructura
- Prompts de ejemplo para IA
- Métricas a incluir
- Guías de audiencia
- Objetivo de cantidad de palabras

---

## Ejercicio 1: Traducir Técnico a Ejecutivo

**Prompt**:

```bash {*}{maxHeight:'300px'}
Actúa como un technical communicator traduciendo update técnico a executive summary.

CONTEXTO: Executives (CEO, VP Product) NO entienden jargon técnico (Context API,
Zustand, re-renders). Executives SÍ entienden business metrics (revenue, conversion,
user satisfaction, time saved). Translation process: technical achievement → user
impact → business outcome. ROI calculation: mostrar return on investment en $$$ si
posible. Conversion baseline: industry average = 100ms delay = 1% conversión perdida.
User-facing metrics: tiempo de respuesta, satisfacción, tasa de éxito. Avoid jargon:
NO mencionar frameworks/libraries, SÍ mencionar "speed", "reliability", "user experience".
Rule: si tu CEO no entiende, rewrite completamente.

TAREA: Traduce update técnico a lenguaje ejecutivo enfocado en business impact.

INPUT TÉCNICO:
"Migrated cart state from Context API to Zustand, reducing re-renders by 80%"

TRANSLATION REQUIREMENTS:
- Audiencia: CEO (primary concern: revenue impact)
- Remove: Context API, Zustand, re-renders (meaningless jargon para CEO)
- Replace con: user-facing metrics (tiempo, satisfacción, conversión)
- Include: business impact en $$$ (proyección de revenue)
- Length: 2-3 sentences max (CEO time = precious)

TRANSLATION PATTERN:
1. Qué mejoramos: "carrito de compras" (NO "cart state")
2. Impacto usuario: "tiempo de checkout" (NO "re-renders")
3. Business outcome: "conversión" + revenue projection

METRICS CONVERSION:
- 80% fewer re-renders → "checkout time 4.2s → 1.5s" (user-facing)
- Faster checkout → "15% higher conversion" (business research)
- Conversion lift → "$45K additional monthly revenue" ($$$ ROI)

EJEMPLO OUTPUT:
"Optimizamos el carrito de compras, reduciendo tiempo de checkout de 4.2s a 1.5s.
Investigación muestra que esta mejora aumenta conversión en ~15%, proyectando
$45K revenue mensual adicional."

VALIDACIÓN: Summary debe responder "¿Cuánto dinero ganamos con esto?" claramente
```

**Aprende**: Technical achievements sin business

context = invisible para executives

---

## Ejercicio 2: IA para Executive Summary de PR

**Prompt**:

```bash {*}{maxHeight:'300px'}
Actúa como un technical PM usando AI para generar executive summary de PR.

CONTEXTO: Pull Request descriptions = típicamente técnicos (para code reviewers). Executives
necesitan saber business impact (NO implementation details). AI (ChatGPT, Claude) = asistente
que traduce jargon a business language. AI limitations: NO conoce tu business context (traffic,
revenue baseline, company goals) → human debe proveer. Effective prompting: proveer contexto
completo (audiencia, business metrics, company info). Iteration: primera draft → feedback →
refinement (AI needs 2-3 iterations). Human review CRITICAL: AI puede inventar métricas falsas,
human valida facts. ROI calculation: mostrar return on investment si posible. Word limit:
executives leen max 200-300 words (2 minutos).

TAREA: Usa AI para generar executive summary de PR técnico.

INPUT PR (TÉCNICO):
"Implemented React.memo on ProductCard component and useMemo for expensive calculations.
This reduced renders from 150/second to 20/second during product browsing. Bundle size
decreased 12%."

PROMPT STRUCTURE PARA AI:

I need an executive summary for this PR for CEO/CTO.

Technical changes:

- Optimized ProductCard component rendering
- Reduced renders 150/sec → 20/sec (7x faster)
- Bundle size reduced 12%

Business context:

- E-commerce app with 50K monthly active users
- 70% mobile traffic
- Current page load time: 3.5s
- Industry conversion baseline: 100ms delay = 1% conversion lost

Please create summary that:

1. Translates technical → business impact
2. Focus on revenue/conversion impact
3. Include specific metrics (time, $$$)
4. Remove technical jargon (React.memo, useMemo)
5. Maximum 200 words
6. Include "what's next" section


EXPECTED AI OUTPUT:

We optimized the product browsing experience, making page loads 7x faster
(3.5s → 1.2s). Research shows this speed improvement increases mobile
conversion by 20-25%.

For our 50K monthly users (70% mobile), this projects to $30K additional
monthly revenue. Additionally, the 12% code efficiency improvement reduces
hosting costs by ~$500/month.

Next steps: Monitor conversion metrics over next 2 weeks to validate impact.


HUMAN REVIEW CHECKLIST:
- [ ] Facts accurate (rendering speed, bundle size)
- [ ] Revenue projection reasonable ($30K believable?)
- [ ] Metrics specific (NO "much faster", SÍ "7x faster")
- [ ] Jargon removed (React.memo → "optimized")
- [ ] Next steps included

VALIDACIÓN: Summary debe ser comprensible por CEO sin contexto técnico
```

**Aprende**: AI genera drafts rápidamente,

human review ensures accuracy y business relevance

---

## Puntos Clave

1. **El Problema**: Reportes técnicos no comunican valor de negocio
2. **Executive Summary**: Traduce técnico → lenguaje de negocio
3. **Estructura**: Qué, Por qué, Resultados, Siguiente (3-5 párrafos)
4. **IA como Asistente**: Genera borradores, remueve jerga, sugiere métricas
5. **Prompting**: Proveer contexto, audiencia, requerimientos
6. **Iterar**: Primer borrador → feedback → refinamiento
7. **Métricas**: Impacto en negocio, no números técnicos
8. **Audiencia**: CEO ($$$), Producto (UX), Ingeniería (tech + velocity)
9. **Mantener Corto**: 250-300 palabras, 2 minutos de lectura
10. **Revisión Humana**: IA hace borradores, humanos finalizan

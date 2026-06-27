# Video 9: TDD - Validación de Password + Login Demo (15 min)

## Resultado Final
Validador de contraseñas OWASP + componente de login funcionando.

---

> ⚠️ **RECORDATORIO TDD** (aplicar a TODOS los componentes de este video):
> 1. Escribir tests PRIMERO → ejecutar → DEBE FALLAR (Red)
> 2. Implementar código MÍNIMO para pasar
> 3. Ejecutar tests → DEBEN PASAR (Green)
> 4. Refactorizar si es necesario
>
> **Esto aplica a: validatePassword, PasswordInput, Y LoginDemo**

---

## Paso 1: TDD - validatePassword

### 1.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear una función validatePassword usando TDD.
La función NO existe todavía.

Requisitos de seguridad (basados en OWASP):
- Mínimo 12 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un caracter especial (!@#$%^&*...)

La función debe retornar:
- isValid: boolean
- errors: string[] (lista de reglas que fallan)
- strength: 'weak' | 'medium' | 'strong'
  - weak: no pasa validaciones
  - medium: pasa todo, 12-15 caracteres
  - strong: pasa todo, 16+ caracteres

Casos a testear:
- Falla con < 12 caracteres (error específico)
- Falla sin mayúscula (error específico)
- Falla sin minúscula (error específico)
- Falla sin número (error específico)
- Falla sin caracter especial (error específico)
- Strength weak para passwords inválidos
- Strength medium para válidos de 12-15 chars
- Strength strong para válidos de 16+ chars
- Password válido retorna isValid true y errors vacío

Ubicación: src/shared/utils/validatePassword.test.ts

Genera SOLO el test.
```

**Ejecutar (RED)**:
```bash
pnpm test validatePassword
```

### 1.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para validatePassword:

[Pegar el test]

Implementa la función para pasar todos los tests.

Ubicación: src/shared/utils/validatePassword.ts
```

**Ejecutar (GREEN)**:
```bash
pnpm test validatePassword
```

---

## Paso 2: TDD - PasswordInput

### 2.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear un componente PasswordInput usando TDD.
El componente NO existe todavía.

Requisitos del componente:
- Input de tipo password
- Toggle para mostrar/ocultar password
- Opción de mostrar lista de requisitos en tiempo real
- Barra de fortaleza visual (weak/medium/strong con colores)

Props:
- value: string
- onChange: callback
- showRequirements: boolean

Casos a testear:
- Renderiza el input de password
- Llama onChange cuando el usuario escribe
- Muestra los requisitos cuando showRequirements es true
- Muestra el indicador de fortaleza

IMPORTANTE para accesibilidad:
- El input debe tener aria-label="Password"
- El botón de toggle NO debe incluir "password" en su aria-label
  (para evitar conflictos con getByLabelText)

Ubicación: src/features/auth/components/PasswordInput.test.tsx

Genera SOLO el test.
```

**Ejecutar (RED)**:
```bash
pnpm test PasswordInput
```

### 2.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para PasswordInput:

[Pegar el test]

Implementa el componente para pasar los tests.

Requisitos de UI:
- Requisitos con ✓ verde cuando se cumple, ✗ rojo cuando no
- Barra de fortaleza con colores: rojo (weak) → amarillo (medium) → verde (strong)
- Botón de toggle con icono de ojo

Ubicación: src/features/auth/components/PasswordInput.tsx
```

**Ejecutar (GREEN)**:
```bash
pnpm test PasswordInput
```

---

## Paso 3: TDD - LoginDemo

### 3.1 Test Primero (RED)

**Prompt para la IA:**
```
Voy a crear un componente LoginDemo usando TDD.
El componente NO existe todavía.

Requisitos:
- Formulario con email y password
- Validación de email (formato básico)
- Validación de password (usa validatePassword)
- Botón submit deshabilitado si el form es inválido
- Simular login:
  - demo@example.com = login exitoso
  - Cualquier otro email = credenciales inválidas
- Rate limiting: después de 3 intentos fallidos, bloquear el form
- Mensaje de éxito cuando login es exitoso

Casos a testear:
- Renderiza inputs de email y password
- Botón deshabilitado cuando el form es inválido
- Botón habilitado cuando el form es válido
- Muestra mensaje de éxito con email de demo
- Muestra mensaje de bloqueo después de 3 intentos fallidos

IMPORTANTE para el test de 3 intentos:
- Los campos se deshabilitan después del 3er intento
- NO intentar limpiar campos después de que se bloqueen
- Limpiar campos solo entre intentos 1→2 y 2→3

Ubicación: src/features/auth/LoginDemo.test.tsx

Genera SOLO el test.
```

**Ejecutar (RED)**:
```bash
pnpm test LoginDemo
```

### 3.2 Implementar (GREEN)

**Prompt para la IA:**
```
Tengo este test fallando para LoginDemo:

[Pegar el test]

Implementa el componente para pasar los tests.

Requisitos adicionales:
- Usar PasswordInput para el campo de password
- Estados del form: idle, success, error, locked
- Mostrar intentos restantes cuando hay errores
- UI limpia con Tailwind

IMPORTANTE para accesibilidad:
- El label de password debe usar <span> en vez de <label>
  porque PasswordInput ya tiene aria-label interno
- Esto evita errores de jsx-a11y/label-has-associated-control

Ubicación: src/features/auth/LoginDemo.tsx
```

**Ejecutar (GREEN)**:
```bash
pnpm test LoginDemo
```

---

## Paso 4: Agregar a la App

**Prompt para la IA:**
```
Integra LoginDemo en la aplicación.

Sugerencia: agregarlo como una sección colapsable o un área separada 
en el header/sidebar.

El objetivo es poder probar el flujo de login sin interrumpir 
la funcionalidad del carrito.
```

---

## Paso 5: Verificación COMPLETA (OBLIGATORIO)

```bash
pnpm test:run      # Tests unitarios
pnpm test:e2e      # Tests E2E
pnpm lint          # Sin errores de lint
pnpm typecheck     # Sin errores de tipos
pnpm build         # Build exitoso
```

> ⚠️ Si alguno falla, corregir antes de continuar.

---

## Checkpoint

Al final del video tienes:
- ✅ validatePassword con 10 tests (TDD)
- ✅ PasswordInput con tests (TDD)
- ✅ LoginDemo con 5 tests (TDD)
- ✅ Rate limiting funcionando
- ✅ ~69 tests totales
- ✅ Verificación completa pasando
- ✅ **SEGURIDAD BÁSICA** 🔒

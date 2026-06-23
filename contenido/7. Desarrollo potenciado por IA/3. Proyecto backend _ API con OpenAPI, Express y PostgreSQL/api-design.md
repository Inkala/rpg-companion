# Diseño API REST - Gestión de Facturas

## Requisitos Funcionales

### 1. Gestión de Facturas
- Guardar facturas con CIF del cliente e importe (base + IVA)
- Numeración correlativa con prefijo configurable (ej: BT001, BT002...)
- Estados de factura: `borrador` y `definitivo`

### 2. Reglas de Negocio
- Solo se pueden eliminar facturas en estado `borrador`
- Al cambiar a estado `definitivo`, se asigna número correlativo automáticamente
- Las facturas en estado `definitivo` son inmutables

## Modelo de Datos

### Factura
```json
{
  "id": "string",
  "numero": "string | null",     // Solo asignado en estado definitivo
  "cifCliente": "string",
  "denominacionSocial": "string",
  "direccionFiscal": "string",
  "importeBase": "number",
  "iva": "number",
  "importeTotal": "number",       // Calculado: base + iva
  "estado": "borrador | definitivo",
  "fechaCreacion": "datetime",
  "fechaDefinitivo": "datetime | null"
}
```

## Endpoints API

### 1. Crear Factura
**POST** `/api/facturas`

Request:
```json
{
  "cifCliente": "B12345678",
  "denominacionSocial": "Empresa Ejemplo S.L.",
  "direccionFiscal": "Calle Mayor 123, 28001 Madrid",
  "importeBase": 1000.00,
  "iva": 210.00
}
```

Response: `201 Created`
```json
{
  "id": "uuid",
  "numero": null,
  "cifCliente": "B12345678",
  "denominacionSocial": "Empresa Ejemplo S.L.",
  "direccionFiscal": "Calle Mayor 123, 28001 Madrid",
  "importeBase": 1000.00,
  "iva": 210.00,
  "importeTotal": 1210.00,
  "estado": "borrador",
  "fechaCreacion": "2024-01-10T10:00:00Z",
  "fechaDefinitivo": null
}
```

### 2. Obtener Factura
**GET** `/api/facturas/{id}`

Response: `200 OK`
```json
{
  "id": "uuid",
  "numero": "BT001",
  "cifCliente": "B12345678",
  "denominacionSocial": "Empresa Ejemplo S.L.",
  "direccionFiscal": "Calle Mayor 123, 28001 Madrid",
  "importeBase": 1000.00,
  "iva": 210.00,
  "importeTotal": 1210.00,
  "estado": "definitivo",
  "fechaCreacion": "2024-01-10T10:00:00Z",
  "fechaDefinitivo": "2024-01-10T11:00:00Z"
}
```

### 3. Listar Facturas
**GET** `/api/facturas`

Query Parameters:
- `estado`: filtrar por estado (borrador/definitivo)
- `cifCliente`: filtrar por CIF del cliente

Response: `200 OK`
```json
{
  "facturas": [
    {
      "id": "uuid",
      "numero": "BT001",
      "cifCliente": "B12345678",
      "denominacionSocial": "Empresa Ejemplo S.L.",
      "direccionFiscal": "Calle Mayor 123, 28001 Madrid",
      "importeBase": 1000.00,
      "iva": 210.00,
      "importeTotal": 1210.00,
      "estado": "definitivo",
      "fechaCreacion": "2024-01-10T10:00:00Z",
      "fechaDefinitivo": "2024-01-10T11:00:00Z"
    }
  ],
  "total": 1
}
```

### 4. Actualizar Estado Factura
**PATCH** `/api/facturas/{id}/estado`

Request:
```json
{
  "estado": "definitivo"
}
```

Response: `200 OK`
```json
{
  "id": "uuid",
  "numero": "BT002",  // Asignado automáticamente
  "cifCliente": "B12345678",
  "denominacionSocial": "Empresa Ejemplo S.L.",
  "direccionFiscal": "Calle Mayor 123, 28001 Madrid",
  "importeBase": 1000.00,
  "iva": 210.00,
  "importeTotal": 1210.00,
  "estado": "definitivo",
  "fechaCreacion": "2024-01-10T10:00:00Z",
  "fechaDefinitivo": "2024-01-10T12:00:00Z"
}
```

### 5. Eliminar Factura
**DELETE** `/api/facturas/{id}`

- Solo permite eliminar facturas en estado `borrador`
- Response: `204 No Content` (éxito)
- Response: `400 Bad Request` (si estado es definitivo)

## Códigos de Error

- `400 Bad Request`: Datos de entrada inválidos o operación no permitida
- `404 Not Found`: Factura no encontrada
- `409 Conflict`: Conflicto de estado (ej: intentar eliminar factura definitiva)

## Configuración

### Prefijo de Numeración
El prefijo de numeración (ej: "BT") debe ser configurable a nivel de aplicación mediante variables de entorno:

```
INVOICE_PREFIX=BT
INVOICE_NUMBER_LENGTH=3  # Genera BT001, BT002...
```
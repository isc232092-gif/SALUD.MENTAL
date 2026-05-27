# Guía rápida: Antigravity + SQL Server en la nube

## Objetivo
Esta versión mantiene el frontend HTML/CSS/JS, pero agrega una API Node.js para que el sistema pueda sincronizar información con SQL Server en la nube. El navegador no se conecta directamente a la base de datos.

## Arquitectura

```text
Navegador / sistema web
↓
API Node.js ejecutada en Antigravity
↓
SQL Server en la nube
↓
SSMS 21 para administración y revisión
```

## 1. Crear la base en la nube
Crea una base SQL Server en tu proveedor. El nombre recomendado es:

```text
SaludMentalDB
```

Después abre SSMS 21 o el editor SQL del proveedor y ejecuta:

```text
sql/SaludMentalDB_cloud.sql
```

Ese script crea tablas, funciones, restricciones, procedimientos, vistas y datos demo.

## 2. Configurar variables de entorno
Copia `.env.example` como `.env` y ajusta tus datos reales:

```env
PORT=3000
DB_SERVER=tu-servidor.database.windows.net
DB_PORT=1433
DB_NAME=SaludMentalDB
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
```

No subas `.env` a repositorios públicos.

## 3. Instalar dependencias
Desde la terminal de Antigravity:

```bash
npm install
```

## 4. Ejecutar

```bash
npm run dev
```

Abre:

```text
http://localhost:3000/login.html
```

## 5. Verificar API
Abre en el navegador:

```text
http://localhost:3000/api/health
```

Debe responder algo similar a:

```json
{"ok":true,"database":"SaludMentalDB"}
```

## Usuarios demo

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@salud.local | Admin2026@ |
| Psicólogo | psicologo@salud.local | Psico2026@ |
| Paciente | isc232092@itsatlixco.edu.mx | Paciente2026@ |

## Validaciones agregadas

- Las citas ya no aceptan fechas pasadas ni horas anteriores a la hora actual.
- Las contraseñas nuevas requieren mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.
- El correo institucional del paciente se valida con matrícula + dominio institucional.
- El dashboard muestra citas próximas, no solo las primeras citas del arreglo.

## Nota importante
El frontend conserva localStorage como respaldo. Cuando la API está disponible, carga datos desde SQL Server y sincroniza cambios. Si la API falla, el sistema no truena; trabaja temporalmente con datos locales.

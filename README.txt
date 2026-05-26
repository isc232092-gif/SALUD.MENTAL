# Sistema Integral de Atención Psicológica

Sistema web institucional para la gestión de usuarios, citas, expedientes, tests, pláticas, actividad y códigos QR.

## Accesos de prueba

- Administrador: admin@salud.local / admin123
- Psicólogo: psicologo@salud.local / psico123
- Paciente: paciente@salud.local / paciente123

## Cambios aplicados

- El estudiante/paciente vuelve a generar un código QR de tipo `usuario`, con sus datos generales.
- El lector QR del psicólogo registra asistencia leyendo el QR del estudiante y tomando la plática desde el campo manual.
- En el lector QR solo se dejaron los botones: `Leer otro código` y `Limpiar lecturas`.
- Se corrigió `registro.html` para usar los archivos principales de `assets/` y evitar rutas locales tipo `file:///`.

## Uso recomendado del lector QR

Para que la cámara funcione correctamente, abre el sistema desde un servidor local, no directamente como archivo.

Desde la carpeta del sistema ejecuta:

```bash
python -m http.server 5500
```

Luego abre en el navegador:

```text
http://localhost:5500/login.html
```

## Identidad visual

La interfaz integra los logotipos del Tecnológico Nacional de México, Instituto Tecnológico Superior de Atlixco y Psicología.

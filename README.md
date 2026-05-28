# Sistema de Gestión Escolar Técnica

Sistema diseñado específicamente para escuelas técnicas, con soporte para grupos de taller, valoración TEA/TEP/TED, acumulación de bonos (+1) y registro de clases.

## Arquitectura
- **Frontend**: HTML, CSS y JavaScript Vanilla (Hosteable en GitHub Pages).
- **Backend**: Google Apps Script (Code.gs).
- **Base de Datos**: Google Sheets.

## Instrucciones de Instalación PASO A PASO

### A) Configurar la Base de Datos (Google Sheets)
1. Crea un nuevo Google Sheets.
2. Crea exactamente estas hojas (pestañas) respetando mayúsculas y minúsculas:
   `alumnos`, `profesores`, `materias`, `horarios`, `asistencia`, `calificaciones`, `rubricas`, `evaluacion_rubrica`, `observaciones`, `seguimiento_academico`, `registro_clases`, `periodos`, `configuracion`.
3. En cada hoja, la Fila 1 debe contener exactamente los nombres de las columnas indicadas en los requerimientos (ej. id, nombre_completo, etc.).

### B) Crear la API en Google Apps Script
1. En tu Google Sheets, ve a `Extensiones` > `Apps Script`.
2. Borra el código existente y pega el contenido del archivo `[ARCHIVO 1] - Code.gs`.
3. Haz clic en `Implementar` (Deploy) > `Nueva implementación`.
4. Tipo: `Aplicación Web` (Web App).
5. Ejecutar como: `Mí` (tu cuenta de Google).
6. Quién tiene acceso: `Cualquier persona` (Cualquier persona, incluso anónimos - *Crítico para que el Fetch desde JS funcione sin CORS*).
7. Autoriza los permisos solicitados.
8. Copia la URL de la aplicación web que se genera.

### C) Configurar el Frontend
1. Abre el archivo `config.js`.
2. Pega la URL obtenida en el paso anterior dentro de la variable `API_URL`:
   `const API_URL = "https://script.google.com/macros/s/.../exec";`
3. Sube los archivos (`index.html`, `style.css`, `script.js`, `config.js`) a tu repositorio de GitHub.
4. Activa **GitHub Pages** en la configuración de tu repositorio apuntando a la rama principal (main/master).

### D) Datos de Ejemplo (CSV - Copiar y pegar en Sheets)

**Hoja "alumnos"**
```csv
id,nombre_completo,grado,division,grupo_taller,email_tutor,telefono_tutor
1,Pérez Juan,5°,5°,Grupo A,tutor1@mail.com,123456
2,Gómez Ana,5°,5°,Grupo B,tutor2@mail.com,123456
3,López Carlos,7°,2°,Grupo A,tutor3@mail.com,123456
4,Díaz María,7°,2°,Grupo B,tutor4@mail.com,123456
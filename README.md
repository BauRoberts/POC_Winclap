# Cotejador de Datos entre Plataformas

Esta herramienta permite identificar coincidencias entre datos de diferentes plataformas (Brkaway y Xtract), comparando montos financieros y usuarios para facilitar la reconciliación de datos.

![Vista previa de la aplicación](ruta-a-una-captura-de-pantalla.png)

## Problema

Frecuentemente necesitamos cotejar información financiera entre dos plataformas diferentes, identificando qué registros en una plataforma corresponden a registros en la otra. Es crucial encontrar estas coincidencias para asegurar la integridad de los datos y facilitar la reconciliación financiera.

## Características

- **Búsqueda bidireccional**: Permite buscar coincidencias comenzando por montos o por usuarios
- **Coincidencia flexible**: Incluye tolerancias para montos y coincidencias parciales para usuarios
- **Visualización clara**: Muestra los resultados en un formato fácil de entender
- **Exportación**: Permite exportar los resultados a CSV para análisis posterior

## Enfoque Metodológico

1. **Análisis inicial**: Exploración manual de datos para identificar patrones
2. **Detección de patrones**: Descubrimiento de que los identificadores de usuario suelen compartir sufijos numéricos
3. **Desarrollo de criterios flexibles**: Implementación de tolerancias para montos y coincidencia parcial para usuarios
4. **Solución programática**: Desarrollo de una interfaz que permite configurar y visualizar las coincidencias

## Tecnologías utilizadas

- React
- PapaParse (para procesamiento de CSV)
- Tailwind CSS

## Cómo usar

1. Coloca tus archivos CSV en la carpeta `public/` con los nombres `Fake_Brkaway_Data.csv` y `Fake_Xtract_Data.csv`
2. Ejecuta la aplicación con `npm start`
3. Configura los parámetros de búsqueda:
   - Selecciona la estrategia (montos primero o usuarios primero)
   - Elige los campos a comparar en cada tabla
   - Configura la tolerancia de montos y las opciones de coincidencia de usuarios
4. Revisa los resultados y exporta si es necesario

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/cotejo-datos-plataformas.git

# Navegar al directorio del proyecto
cd cotejo-datos-plataformas

# Instalar dependencias
npm install

# Ejecutar la aplicación
npm start
```

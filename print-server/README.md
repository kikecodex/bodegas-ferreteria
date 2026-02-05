# Servidor de Impresión Directa - OROPEZA'S

Este servidor permite imprimir tickets/boletas **directamente** a la impresora térmica POS-80 **sin abrir el diálogo de impresión** del navegador.

## Requisitos

1. **Node.js** instalado en la PC de la cliente
2. **SumatraPDF** (gratuito) para impresión silenciosa de PDFs

### Instalar SumatraPDF

1. Descargar de: https://www.sumatrapdfreader.org/download-free-pdf-viewer
2. Instalar en la ubicación predeterminada
3. Agregar al PATH del sistema o copiar `SumatraPDF.exe` a esta carpeta

## Configuración

1. Abrir `print-server.js` y verificar el nombre de la impresora:
   ```javascript
   const PRINTER_NAME = 'POS-80';  // Cambiar si tiene otro nombre
   ```

2. Para ver el nombre exacto de tu impresora en Windows:
   - Panel de Control → Dispositivos e Impresoras
   - El nombre que aparece debajo del ícono es el que debes usar

## Uso

### Iniciar el servidor

**Opción 1:** Doble clic en `iniciar-servidor.bat`

**Opción 2:** Desde terminal:
```bash
cd print-server
node print-server.js
```

### Inicio automático con Windows

1. Crear acceso directo de `iniciar-servidor.bat`
2. Presionar `Win + R` y escribir `shell:startup`
3. Pegar el acceso directo en esa carpeta

## Cómo funciona

1. El servidor escucha en `http://localhost:9100`
2. Cuando haces clic en "Imprimir" en el sistema:
   - El navegador envía el PDF al servidor local
   - El servidor lo guarda temporalmente
   - SumatraPDF imprime silenciosamente
   - El archivo temporal se elimina

## Verificar funcionamiento

Abrir en el navegador: `http://localhost:9100/ping`

Debería mostrar:
```json
{"status":"ok","printer":"POS-80"}
```

## Solución de problemas

| Problema | Solución |
|----------|----------|
| "SumatraPDF no encontrado" | Instalar SumatraPDF o agregarlo al PATH |
| "Impresora no encontrada" | Verificar nombre de impresora en Panel de Control |
| "Error de conexión" | El servidor no está ejecutándose |

// Servidor Local de Impresión Directa para POS-80
// Ejecutar con: node print-server.js

const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 9100;
const PRINTER_NAME = 'POS-80'; // Nombre de la impresora térmica

// Directorio temporal para PDFs
const TEMP_DIR = path.join(os.tmpdir(), 'oropeza-print');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Servidor HTTP
const server = http.createServer((req, res) => {
    // CORS headers para permitir requests desde el navegador
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight request
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Health check
    if (req.method === 'GET' && req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', printer: PRINTER_NAME }));
        return;
    }

    // Imprimir PDF
    if (req.method === 'POST' && req.url === '/print') {
        let body = [];

        req.on('data', chunk => {
            body.push(chunk);
        });

        req.on('end', () => {
            const buffer = Buffer.concat(body);
            const tempFile = path.join(TEMP_DIR, `ticket-${Date.now()}.pdf`);

            // Guardar PDF temporalmente
            fs.writeFileSync(tempFile, buffer);

            // Comando de impresión según el sistema operativo
            let printCommand;
            if (process.platform === 'win32') {
                // Windows: usar SumatraPDF o PDFtoPrinter para impresión silenciosa
                // Opción 1: Con SumatraPDF (recomendado)
                printCommand = `SumatraPDF.exe -print-to "${PRINTER_NAME}" -silent "${tempFile}"`;

                // Opción 2: Con PDFtoPrinter
                // printCommand = `PDFtoPrinter.exe "${tempFile}" "${PRINTER_NAME}"`;

                // Opción 3: Con Adobe Reader (si está instalado)
                // printCommand = `"C:\\Program Files\\Adobe\\Acrobat Reader DC\\Reader\\AcroRd32.exe" /t "${tempFile}" "${PRINTER_NAME}"`;
            } else if (process.platform === 'darwin') {
                // macOS
                printCommand = `lpr -P "${PRINTER_NAME}" "${tempFile}"`;
            } else {
                // Linux
                printCommand = `lp -d "${PRINTER_NAME}" "${tempFile}"`;
            }

            console.log(`Imprimiendo: ${tempFile}`);
            console.log(`Comando: ${printCommand}`);

            exec(printCommand, (error, stdout, stderr) => {
                // Eliminar archivo temporal después de 5 segundos
                setTimeout(() => {
                    try {
                        fs.unlinkSync(tempFile);
                    } catch (e) { }
                }, 5000);

                if (error) {
                    console.error('Error de impresión:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'Error al imprimir',
                        details: error.message,
                        command: printCommand
                    }));
                    return;
                }

                console.log('Impresión exitosa');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Ticket enviado a impresora' }));
            });
        });

        return;
    }

    // Ruta no encontrada
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('   SERVIDOR DE IMPRESIÓN OROPEZA');
    console.log('='.repeat(50));
    console.log(`Puerto: ${PORT}`);
    console.log(`Impresora: ${PRINTER_NAME}`);
    console.log(`Directorio temporal: ${TEMP_DIR}`);
    console.log('');
    console.log('Estado: ACTIVO - Esperando trabajos de impresión...');
    console.log('');
    console.log('Para detener, presione Ctrl+C');
    console.log('='.repeat(50));
});

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('\nServidor detenido.');
    process.exit(0);
});

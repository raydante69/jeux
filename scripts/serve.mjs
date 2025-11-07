import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const DEFAULT_PORT = 4173;
const port = Number(process.env.PORT) || DEFAULT_PORT;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer(async (req, res) => {
  try {
    const sanitizedPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname)
      .replace(/\\+/g, '/');
    let filePath = path.join(rootDir, sanitizedPath);

    const isDirectory = (await safeStat(filePath))?.isDirectory();
    if (isDirectory) {
      filePath = path.join(filePath, 'index.html');
    }

    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': mimeType, 'Cache-Control': 'no-cache' });
    res.end(fileBuffer);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`[serve] ${error.message}`);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.listen(port, () => {
  console.log(`Valpré - PC Edition disponible sur http://localhost:${port}`);
  console.log('Appuyez sur Ctrl+C pour arrêter le serveur local.');
});

async function safeStat(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    return null;
  }
}

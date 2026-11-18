'use strict';

/* Server HTTP stdlib saja (tanpa dependensi):
   - Melayani klien statis dari client/
   - API JSON: POST /api/<namaAction>
   Env: PORT (default 3000), HOST (default 127.0.0.1),
   DB_PATH / DATA_DIR (lihat server/db.js). */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { closeDb, ensureDefaultWallet, openDb } = require('./db');
const { ACTIONS } = require('./actions/index');
const { ApiError } = require('./validation');

const CLIENT_DIR = path.join(__dirname, '..', 'client');
const MAX_BODY_BYTES = 1024 * 1024;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendError(res, err) {
  if (err instanceof ApiError) {
    sendJson(res, err.status, { ok: false, error: err.message });
    return;
  }
  console.error(err);
  sendJson(res, 500, { ok: false, error: 'Terjadi kesalahan di server.' });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new ApiError(413, 'Badan permintaan terlalu besar.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (text === '') {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(text);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new ApiError(400, 'Badan permintaan harus berupa objek JSON.'));
          return;
        }
        resolve(parsed);
      } catch (err) {
        reject(new ApiError(400, 'Badan permintaan bukan JSON yang valid.'));
      }
    });
    req.on('error', () => {
      reject(new ApiError(400, 'Gagal membaca badan permintaan.'));
    });
  });
}

function serveStatic(req, res, pathname) {
  if (pathname === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  let relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  // Cegah path traversal: hasil resolve harus tetap di dalam client/.
  const resolved = path.resolve(CLIENT_DIR, relative);
  if (resolved !== CLIENT_DIR && !resolved.startsWith(CLIENT_DIR + path.sep)) {
    sendJson(res, 404, { ok: false, error: 'Tidak ditemukan.' });
    return;
  }
  fs.stat(resolved, (err, stats) => {
    if (err || !stats.isFile()) {
      sendJson(res, 404, { ok: false, error: 'Tidak ditemukan.' });
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(resolved).pipe(res);
  });
}

async function handleRequest(req, res) {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Metode tidak didukung. Gunakan POST.' });
      return;
    }
    const actionName = pathname.slice('/api/'.length);
    const handler = ACTIONS[actionName];
    if (!handler) {
      sendJson(res, 404, { ok: false, error: 'Action tidak dikenal: ' + actionName });
      return;
    }
    try {
      const body = await readJsonBody(req);
      const db = openDb();
      const result = handler(db, body);
      sendJson(res, 200, { ok: true, data: result });
    } catch (err) {
      sendError(res, err);
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { ok: false, error: 'Metode tidak didukung.' });
    return;
  }
  serveStatic(req, res, pathname);
}

function main() {
  const db = openDb();
  ensureDefaultWallet(db);
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      sendError(res, err);
    });
  });
  server.listen(port, host, () => {
    console.log('Tracker Pengeluaran Bulanan berjalan di http://' + host + ':' + port);
  });
  const shutdown = () => {
    server.close(() => {
      closeDb();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  main();
}

module.exports = { handleRequest };

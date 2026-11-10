// ============================================================================
// SERVIDOR HTTP + API REST + BANCO DE DADOS SQLITE NATIVO (node:sqlite)
// ============================================================================

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'porquinhos.db');

// Garante que a pasta de dados exista (no Coolify será montada em /app/data ou /data)
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

// Otimizações do SQLite para servidor web
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS porquinhos (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pesagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    porquinho_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    g REAL NOT NULL,
    nota TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (porquinho_id) REFERENCES porquinhos(id) ON DELETE CASCADE,
    UNIQUE(porquinho_id, data)
  );

  CREATE INDEX IF NOT EXISTS idx_pesagens_porquinho_data
    ON pesagens(porquinho_id, data);
`);

// Garante os 3 porquinhos iniciais no banco
const stmtInitPorquinho = db.prepare(`
  INSERT OR IGNORE INTO porquinhos (id, nome) VALUES (?, ?)
`);
for (let i = 0; i < 3; i++) {
  stmtInitPorquinho.run(i, `Porquinho ${i + 1}`);
}

// Prepared Statements para consultas rápidas
const stmtListarPorquinhos = db.prepare(`SELECT id, nome FROM porquinhos ORDER BY id ASC`);
const stmtListarPesagens = db.prepare(
  `SELECT data, g, nota FROM pesagens WHERE porquinho_id = ? ORDER BY data ASC`
);
const stmtAtualizarNome = db.prepare(
  `UPDATE porquinhos SET nome = ?, updated_at = datetime('now') WHERE id = ?`
);
const stmtUpsertPesagem = db.prepare(`
  INSERT INTO pesagens (porquinho_id, data, g, nota)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(porquinho_id, data) DO UPDATE SET
    g = excluded.g,
    nota = excluded.nota
`);
const stmtDeletarPesagem = db.prepare(`
  DELETE FROM pesagens WHERE porquinho_id = ? AND data = ?
`);
const stmtLimparPesagensPorquinho = db.prepare(`
  DELETE FROM pesagens WHERE porquinho_id = ?
`);

/**
 * Retorna a estrutura completa [{ nome, pesos: [{ data, g, nota }] }]
 */
function obterTodosDados() {
  const porquinhos = stmtListarPorquinhos.all();
  return porquinhos.map((p) => {
    const pesos = stmtListarPesagens.all(p.id).map((r) => {
      const item = { data: r.data, g: Number(r.g) };
      if (r.nota) item.nota = r.nota;
      return item;
    });
    return { nome: p.nome, pesos };
  });
}

/**
 * Substitui todos os dados em uma única transação atômica
 * (usado em importação de backup, dados demo ou sincronização inicial)
 */
function substituirTodosDados(lista) {
  if (!Array.isArray(lista)) throw new Error('Formato inválido: esperado array');
  db.exec('BEGIN IMMEDIATE');
  try {
    for (let i = 0; i < 3; i++) {
      const item = lista[i] || {};
      const nome = String(item.nome || `Porquinho ${i + 1}`).trim().slice(0, 60);
      stmtAtualizarNome.run(nome || `Porquinho ${i + 1}`, i);
      stmtLimparPesagensPorquinho.run(i);

      if (Array.isArray(item.pesos)) {
        for (const reg of item.pesos) {
          const data = String(reg.data || '').slice(0, 10);
          const g = Math.round(Number(reg.g) * 10) / 10;
          const nota = String(reg.nota || '').trim().slice(0, 100);
          if (/^\d{4}-\d{2}-\d{2}$/.test(data) && g > 0 && g <= 3500) {
            stmtUpsertPesagem.run(i, data, g, nota);
          }
        }
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Helpers HTTP
function enviarJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function lerCorpoJSON(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        req.destroy();
        reject(new Error('Payload muito grande'));
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // 1. Healthcheck para o Coolify
    if (req.method === 'GET' && pathname === '/api/health') {
      return enviarJSON(res, 200, { status: 'ok', db: 'sqlite', timestamp: new Date().toISOString() });
    }

    // 2. GET /api/dados — busca todos os porquinhos e pesagens
    if (req.method === 'GET' && pathname === '/api/dados') {
      return enviarJSON(res, 200, obterTodosDados());
    }

    // 3. PUT /api/dados — sincronização em lote (backup/demo/migração local)
    if (req.method === 'PUT' && pathname === '/api/dados') {
      const body = await lerCorpoJSON(req);
      substituirTodosDados(body);
      return enviarJSON(res, 200, obterTodosDados());
    }

    // 4. PATCH /api/porquinhos/:id — renomear um porquinho
    const matchPorquinho = pathname.match(/^\/api\/porquinhos\/([0-2])$/);
    if (req.method === 'PATCH' && matchPorquinho) {
      const id = Number(matchPorquinho[1]);
      const body = await lerCorpoJSON(req);
      const nome = String(body.nome || '').trim().slice(0, 60);
      if (!nome) return enviarJSON(res, 400, { erro: 'Nome inválido' });
      stmtAtualizarNome.run(nome, id);
      return enviarJSON(res, 200, obterTodosDados());
    }

    // 5. POST /api/porquinhos/:id/pesos — adicionar ou atualizar pesagem
    const matchPesos = pathname.match(/^\/api\/porquinhos\/([0-2])\/pesos$/);
    if (req.method === 'POST' && matchPesos) {
      const id = Number(matchPesos[1]);
      const body = await lerCorpoJSON(req);
      const data = String(body.data || '').slice(0, 10);
      const g = Math.round(Number(body.g) * 10) / 10;
      const nota = String(body.nota || '').trim().slice(0, 100);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !g || g <= 0 || g > 3500) {
        return enviarJSON(res, 400, { erro: 'Dados de pesagem inválidos' });
      }
      stmtUpsertPesagem.run(id, data, g, nota);
      return enviarJSON(res, 200, obterTodosDados());
    }

    // 6. DELETE /api/porquinhos/:id/pesos/:data — apagar uma pesagem
    const matchDelPeso = pathname.match(/^\/api\/porquinhos\/([0-2])\/pesos\/(\d{4}-\d{2}-\d{2})$/);
    if (req.method === 'DELETE' && matchDelPeso) {
      const id = Number(matchDelPeso[1]);
      const data = matchDelPeso[2];
      stmtDeletarPesagem.run(id, data);
      return enviarJSON(res, 200, obterTodosDados());
    }

    // 7. Arquivos Estáticos (Frontend)
    if (req.method === 'GET' || req.method === 'HEAD') {
      let relPath = pathname === '/' ? '/index.html' : pathname;
      // Previne Path Traversal e bloqueia acesso direto ao banco .db
      const safePath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
      if (safePath.startsWith('/data') || safePath.startsWith('\\data') || safePath.endsWith('.db')) {
        res.writeHead(403);
        return res.end('Forbidden');
      }

      const filePath = path.join(__dirname, safePath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado');
  } catch (err) {
    console.error('[Erro no Servidor]:', err);
    enviarJSON(res, 500, { erro: err.message || 'Erro interno no servidor' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🐹 Servidor Pesagem dos Porquinhos rodando em http://localhost:${PORT}`);
  console.log(`🗄️  Banco SQLite ativo em: ${DB_PATH}`);
});

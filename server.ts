import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'links.db');
console.log(`Initializing database at: ${dbPath}`);
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    slug TEXT PRIMARY KEY,
    desktopPayload TEXT,
    mobilePayload TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    }
    next();
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      environment: process.env.NODE_ENV || 'development',
      dbPath: dbPath
    });
  });

  app.post('/api/links', (req, res) => {
    try {
      const { clientName, desktopPayload, mobilePayload } = req.body;
      
      if (!clientName || !desktopPayload || !mobilePayload) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      const generateShortSlug = () => Math.random().toString(36).substring(2, 7);
      let finalSlug = generateShortSlug();
      
      let attempts = 0;
      while (attempts < 10) {
        const existing = db.prepare('SELECT slug FROM links WHERE slug = ?').get(finalSlug);
        if (!existing) break;
        finalSlug = generateShortSlug();
        attempts++;
      }

      db.prepare('INSERT INTO links (slug, desktopPayload, mobilePayload) VALUES (?, ?, ?)').run(
        finalSlug,
        desktopPayload,
        mobilePayload
      );
      
      console.log(`Link created: ${finalSlug} for ${clientName}`);
      res.json({ slug: finalSlug });
    } catch (error) {
      console.error('Error creating link:', error);
      res.status(500).json({ error: 'Error interno al guardar en la base de datos' });
    }
  });

  app.get('/api/links/:slug', (req, res) => {
    try {
      const row = db.prepare('SELECT desktopPayload, mobilePayload FROM links WHERE slug = ?').get(req.params.slug);
      if (row) {
        res.json(row);
      } else {
        res.status(404).json({ error: 'Enlace no encontrado o expirado' });
      }
    } catch (error) {
      console.error('Error fetching link:', error);
      res.status(500).json({ error: 'Error al recuperar el enlace' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    
    // API routes should NOT be handled by the SPA fallback
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Error crítico en el servidor' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

startServer();

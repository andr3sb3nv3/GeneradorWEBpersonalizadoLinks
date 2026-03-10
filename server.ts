import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = process.env.POSTGRES_URL ? new Pool({
  connectionString: process.env.POSTGRES_URL.replace('sslmode=require', ''),
  ssl: {
    rejectUnauthorized: false,
  },
}) : null;

console.log('POSTGRES_URL is defined:', !!process.env.POSTGRES_URL);
if (process.env.POSTGRES_URL) {
  console.log('POSTGRES_URL starts with:', process.env.POSTGRES_URL.substring(0, 15));
} else {
  console.error('POSTGRES_URL is NOT defined in environment variables!');
}

// Initialize database table (async)
async function initDb() {
  if (!pool) {
    console.log('Skipping database initialization because POSTGRES_URL is not defined.');
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS links (
        slug TEXT PRIMARY KEY,
        desktopPayload TEXT,
        mobilePayload TEXT,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}
initDb();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

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
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.post('/api/links', async (req, res) => {
    try {
      if (!pool) {
        return res.status(500).json({ error: 'La base de datos no está configurada. Por favor, configura la variable de entorno POSTGRES_URL.' });
      }

      const { clientName, desktopPayload, mobilePayload } = req.body;
      
      if (!clientName || !desktopPayload || !mobilePayload) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      const generateShortSlug = () => Math.random().toString(36).substring(2, 7);
      let finalSlug = generateShortSlug();
      
      let attempts = 0;
      while (attempts < 10) {
        const { rows } = await pool.query('SELECT slug FROM links WHERE slug = $1', [finalSlug]);
        if (rows.length === 0) break;
        finalSlug = generateShortSlug();
        attempts++;
      }

      await pool.query(
        'INSERT INTO links (slug, desktopPayload, mobilePayload) VALUES ($1, $2, $3)',
        [finalSlug, desktopPayload, mobilePayload]
      );
      
      console.log(`Link created: ${finalSlug} for ${clientName}`);
      res.json({ slug: finalSlug });
    } catch (error) {
      console.error('Error creating link:', error);
      // Log the full error object to Render logs
      console.error('Full error details:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: `Error interno al guardar en la base de datos: ${errorMessage}` });
    }
  });

  app.get('/api/links/:slug', async (req, res) => {
    try {
      if (!pool) {
        return res.status(500).json({ error: 'La base de datos no está configurada. Por favor, configura la variable de entorno POSTGRES_URL.' });
      }

      const { rows } = await pool.query('SELECT desktoppayload, mobilepayload FROM links WHERE slug = $1', [req.params.slug]);
      if (rows.length > 0) {
        res.json({
          desktopPayload: rows[0].desktoppayload,
          mobilePayload: rows[0].mobilepayload
        });
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
    
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Error crítico en el servidor' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

startServer();

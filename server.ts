import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';

const db = new Database('links.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    slug TEXT PRIMARY KEY,
    desktopPayload TEXT,
    mobilePayload TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/links', (req, res) => {
    try {
      const { clientName, desktopPayload, mobilePayload } = req.body;
      
      if (!clientName || !desktopPayload || !mobilePayload) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Generate a very short random string (e.g., 5 characters)
      const generateShortSlug = () => Math.random().toString(36).substring(2, 7);
      
      let finalSlug = generateShortSlug();
      
      // Handle collisions
      while (true) {
        const existing = db.prepare('SELECT slug FROM links WHERE slug = ?').get(finalSlug);
        if (!existing) break;
        finalSlug = generateShortSlug();
      }

      db.prepare('INSERT INTO links (slug, desktopPayload, mobilePayload) VALUES (?, ?, ?)').run(
        finalSlug,
        desktopPayload,
        mobilePayload
      );
      
      res.json({ slug: finalSlug });
    } catch (error) {
      console.error('Error creating link:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/links/:slug', (req, res) => {
    try {
      const row = db.prepare('SELECT desktopPayload, mobilePayload FROM links WHERE slug = ?').get(req.params.slug);
      if (row) {
        res.json(row);
      } else {
        res.status(404).json({ error: 'Link not found' });
      }
    } catch (error) {
      console.error('Error fetching link:', error);
      res.status(500).json({ error: 'Internal server error' });
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
    // Production static file serving
    app.use(express.static('dist'));
    app.use('*', (req, res) => {
      res.sendFile('/dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

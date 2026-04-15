import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password são obrigatórios' });
    }
    res.json({ message: 'Login will work when DB is connected' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password e name são obrigatórios' });
    }
    res.json({ message: 'Register will work when DB is connected' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.options('/api/*', (_req, res) => {
  res.status(200).end();
});

export default app;
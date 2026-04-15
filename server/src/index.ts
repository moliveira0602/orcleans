import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password são obrigatórios' });
  }
  res.json({ message: 'Login endpoint - configure auth later' });
});

app.post('/api/auth/register', (req, res) => {
  res.json({ message: 'Register endpoint - configure auth later' });
});

app.options('/api/*', (_req, res) => {
  res.status(200).end();
});

export default app;
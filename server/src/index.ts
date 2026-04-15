import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/login', (_req, res) => {
  res.json({ error: 'Login endpoint placeholder' });
});

app.options('/api/*', (_req, res) => {
  res.status(200).end();
});

const port = process.env.PORT || 3333;

app.listen(port, () => {
  console.log(`Server on ${port}`);
});

export default app;
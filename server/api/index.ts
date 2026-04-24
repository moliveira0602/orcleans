import { app } from '../src/index';

(app as any).get('/ping-direct', (req: any, res: any) => {
  res.send('ping direct v4 - ' + new Date().toISOString());
});

export default app;

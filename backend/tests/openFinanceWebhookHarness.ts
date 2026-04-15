import 'dotenv/config';
import express from 'express';
import { OpenFinanceWebhookController } from '../src/controllers/OpenFinanceWebhookController';

const app = express();
const controller = new OpenFinanceWebhookController();
const port = Number(process.env.OPEN_FINANCE_BENCHMARK_PORT || 3334);

app.use(express.json({ limit: '5mb' }));

app.post('/api/webhooks/open-finance', (req, res) => {
  return controller.ingest(req, res);
});

app.get('/health', (_req, res) => {
  return res.status(200).json({ ok: true });
});

app.listen(port, () => {
  console.log(`Open Finance benchmark harness listening on http://localhost:${port}`);
});

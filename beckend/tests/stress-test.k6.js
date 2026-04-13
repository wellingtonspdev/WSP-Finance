import http from 'k6/http';
import { check } from 'k6';

const batchSize = Number(__ENV.BATCH_SIZE || 1);
const iterations = Number(__ENV.ITERATIONS || 12);
const vus = Number(__ENV.VUS || Math.min(Math.max(batchSize, 1), 24));
const baseUrl = __ENV.BASE_URL || 'http://localhost:3333';
const workspaceId = Number(__ENV.WORKSPACE_ID || 1);
const accountId = Number(__ENV.ACCOUNT_ID || 1);
const webhookToken = __ENV.OPEN_FINANCE_WEBHOOK_KEY || 'webhook-auth-key-mock';

export const options = {
  scenarios: {
    webhook_burst: {
      executor: 'shared-iterations',
      vus,
      iterations,
      maxDuration: __ENV.MAX_DURATION || '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
  summaryTrendStats: ['min', 'med', 'avg', 'p(50)', 'p(95)', 'max'],
};

function buildMovements() {
  return Array.from({ length: batchSize }, (_, index) => ({
    transactionId: `tx-stress-${batchSize}-${__VU}-${__ITER}-${index}`,
    date: '2026-04-12T15:00:00Z',
    description: `STRESS TEST TRANSACAO ${batchSize}-${__ITER}-${index}`,
    amount: '50.00',
  }));
}

export function handleSummary(data) {
  const httpReqDuration = data.metrics.http_req_duration
    ? data.metrics.http_req_duration.values
    : {};
  const httpReqFailed = data.metrics.http_req_failed
    ? data.metrics.http_req_failed.values
    : {};

  const summary = {
    batchSize,
    vus,
    iterations,
    httpReqDuration,
    httpReqFailed,
  };

  return {
    [`./k6-summary-batch-${batchSize}.json`]: JSON.stringify(summary, null, 2),
  };
}

export default function () {
  const url = `${baseUrl}/api/webhooks/open-finance`;
  const payload = JSON.stringify({
    source: 'OPEN_FINANCE',
    workspaceId,
    accountId,
    movements: buildMovements(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${webhookToken}`,
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200 or 202': (response) => response.status === 200 || response.status === 202,
  });
}

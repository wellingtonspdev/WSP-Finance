import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    webhook_burst: {
      executor: 'shared-iterations',
      vus: 50, // 50 virtual users at once
      iterations: 200, // exact 200 webhooks to test DB pooling
      maxDuration: '30s',
    },
  },
};

export default function () {
  const url = 'http://localhost:3333/api/webhooks/open-finance';
  
  // Array payload com 1 movimento, simulando picos de webhooks pequenos e muito frequentes
  const payload = JSON.stringify({
    source: "OPEN_FINANCE",
    workspaceId: 1,
    accountId: 10,
    movements: [
      {
        transactionId: `tx-stress-${__VU}-${__ITER}`,
        date: "2026-04-12T15:00:00Z",
        description: `STRESS TEST TRANSACAO ${__ITER}`,
        amount: "50.00"
      }
    ]
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer webhook-auth-key-mock', 
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });
}

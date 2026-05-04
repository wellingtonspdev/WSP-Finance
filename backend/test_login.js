const http = require('http');

const data = JSON.stringify({
  email: 'admin@wsp.finance',
  password: '123'
});

const options = {
  hostname: 'localhost',
  port: 3333,
  path: '/auth/session',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { once } = require('node:events');
const { test } = require('node:test');

async function findAvailablePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(server) {
  let output = '';
  await new Promise((resolve, reject) => {
    server.stdout.setEncoding('utf8');
    server.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('Static server listening')) resolve();
    });
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Static server exited before listening (${code})`)));
    setTimeout(() => reject(new Error('Timed out waiting for static server')), 5000).unref();
  });
}

function getStatus(port, requestPath) {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port, path: requestPath }, response => {
      response.resume();
      response.once('end', () => resolve(response.statusCode));
    });
    request.once('error', reject);
  });
}

test('static server rejects encoded paths outside the repository root', async t => {
  const port = await findAvailablePort();
  const server = spawn(process.execPath, [path.resolve(__dirname, '../support/static-server.js')], {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      server.kill();
      await once(server, 'exit');
    }
  });

  await waitForServer(server);
  assert.equal(await getStatus(port, '/%2e%2e/%2e%2e/Windows/win.ini'), 403);
});

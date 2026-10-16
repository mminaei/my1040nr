const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..', '..');
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.pdf', 'application/pdf']
]);
const port = Number(process.env.PORT || 4173);

function isWithinRoot(filePath) {
  const relativePath = path.relative(repositoryRoot, filePath);
  return relativePath === '' || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath));
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }

    let pathname;
    try {
      const rawPathname = request.url.split(/[?#]/, 1)[0];
      pathname = decodeURIComponent(rawPathname);
    } catch {
      response.writeHead(400);
      response.end();
      return;
    }

    const requestedPath = path.resolve(repositoryRoot, `.${pathname}`);
    if (!isWithinRoot(requestedPath)) {
      response.writeHead(403);
      response.end();
      return;
    }

    let realPath;
    try {
      realPath = await fs.realpath(requestedPath);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        response.writeHead(404);
        response.end();
        return;
      }
      throw error;
    }

    if (!isWithinRoot(realPath)) {
      response.writeHead(403);
      response.end();
      return;
    }

    const stats = await fs.stat(realPath);
    if (!stats.isFile()) {
      response.writeHead(404);
      response.end();
      return;
    }

    response.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': mimeTypes.get(path.extname(realPath).toLowerCase()) || 'application/octet-stream'
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    response.end(await fs.readFile(realPath));
  } catch (error) {
    console.error('Static server request error:', error.code || error.name);
    if (!response.headersSent) response.writeHead(500);
    response.end();
  }
});

server.on('error', error => {
  console.error('Static server startup error:', error.code || error.name);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Static server listening on http://127.0.0.1:${port}`);
});

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let filePath = req.url;
  
  // URL-Rewrite: /pdf/YYYY/document_XXX.pdf -> /pdf/document_XXX.pdf
  if (filePath.match(/^\/pdf\/\d{4}\//)) {
    filePath = filePath.replace(/^\/pdf\/\d{4}\//, '/pdf/');
    console.log(`🔄 Rewrite: ${req.url} -> ${filePath}`);
  }
  
  // Root -> index.html
  if (filePath === '/') {
    filePath = '/index.html';
  }
  
  const fullPath = path.join(ROOT, filePath);
  const ext = path.extname(fullPath);
  const contentType = mimeTypes[ext] || 'text/plain';
  
  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
      console.log(`✓ ${req.url} (${contentType})`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Test server running at http://localhost:${PORT}/`);
  console.log(`📁 Serving files from: ${ROOT}`);
});

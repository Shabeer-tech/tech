const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{let p=req.url.split('?')[0]; if(p==='/')p='/index.html'; const fp=path.normalize(path.join(PUBLIC,p)); if(!fp.startsWith(PUBLIC)){res.writeHead(403);return res.end('Forbidden');} fs.readFile(fp,(e,data)=>{if(e){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':types[path.extname(fp)]||'application/octet-stream'});res.end(data);});});
server.listen(PORT,()=>console.log(`Attendance System running at http://localhost:${PORT}`));

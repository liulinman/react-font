// Local acceptance server for production builds and the isolated Nest test API.
import http from 'node:http';
import {createReadStream,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{
 if(req.url.startsWith('/api/')){
  const upstream=http.request({hostname:'127.0.0.1',port:13317,path:req.url.slice(4),method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end('Local test API unavailable');});req.pipe(upstream);return;
 }
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const admin=pathname.startsWith('/admin/');const base=resolve(root,admin?'apps/admin/dist':'apps/english-world/dist');
 let path=resolve(base,'.'+(admin?pathname.slice('/admin'.length):pathname));
 if(path!==base&&!path.startsWith(base+sep)){res.writeHead(400);res.end();return;}
 if(!existsSync(path)||statSync(path).isDirectory())path=resolve(base,'index.html');
 if(!existsSync(path)){res.writeHead(503);res.end('Run both frontend builds first');return;}
 res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store'});createReadStream(path).pipe(res);
}).listen(13318,'127.0.0.1',()=>console.log('Reading acceptance: http://127.0.0.1:13318'));

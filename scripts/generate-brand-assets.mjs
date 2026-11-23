import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {brand} from '../branding/freewing/brand.mjs';
const require=createRequire(new URL('../apps/english-world/package.json',import.meta.url));
const sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url));
const appFlag=process.argv.indexOf('--app');
const brandApps=['english-world','admin','docs','browser-reading-extension'];
const apps=appFlag<0?brandApps:[process.argv[appFlag+1]];
if(apps.some(app=>!brandApps.includes(app)))throw Error('Unknown --app');
const source=await readFile(resolve(root,'branding/freewing/symbol-source.png'));
const artwork=await readFile(resolve(root,'branding/freewing/approved-logo.png'));
// Normalize the generated alpha padding for each use without modifying the approved source.
const trimmed=await sharp(source).trim().png().toBuffer();
const mark=await sharp(trimmed).resize(448,448,{fit:'inside'}).png().toBuffer();
const symbol=await sharp({create:{width:512,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:mark,gravity:'center'}]).png().toBuffer();
const logo=await sharp(artwork).resize(960,960,{fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();
function background(size){return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#a3dcf5"/><stop offset="1" stop-color="#ffd3b0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#sky)"/></svg>`);}
async function icon(size,safe=false){
 const width=Math.round(size*(safe?.625:.82));
 const foreground=await sharp(trimmed).resize(width,width,{fit:'inside'}).png().toBuffer();
 return sharp(background(size)).composite([{input:foreground,gravity:'center'}]).flatten({background:'#b7ddf0'}).removeAlpha().png().toBuffer();
}
for(const app of apps){
 if(app==='browser-reading-extension'){
  const icons=resolve(root,'apps/browser-reading-extension/icons');
  await mkdir(icons,{recursive:true});
  await Promise.all([16,24,32,48,128].map(size=>sharp(symbol)
    .resize(size,size).png().toFile(resolve(icons,`freewing-${size}.png`))));
  continue;
 }
 const pub=resolve(root,`apps/${app}/public/brand`);await mkdir(pub,{recursive:true});
 await Promise.all([
  writeFile(resolve(pub,'freewing-symbol.png'),symbol),
  writeFile(resolve(pub,'freewing-logo.webp'),logo),
  writeFile(resolve(pub,'freewing-favicon.png'),await icon(64)),
 ]);
 if(app==='english-world'){
  const icons=resolve(root,'apps/english-world/public/icons');await mkdir(icons,{recursive:true});
  for(const [name,size,safe] of [['freewing-apple-touch-icon-180x180.png',180,false],['freewing-192x192.png',192,false],['freewing-512x512.png',512,false],['freewing-512x512-maskable.png',512,true]])await writeFile(resolve(icons,name),await icon(size,safe));
  await writeFile(resolve(pub,'freewing-icon-background.png'),await sharp(background(512)).removeAlpha().png().toBuffer());
  await writeFile(resolve(root,'apps/english-world/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'),await icon(1024));
  const nativeConfig=resolve(root,'apps/english-world/ios/App/App/capacitor.config.json');
  try { const config=JSON.parse(await readFile(nativeConfig,'utf8')); config.appName=brand.name; await writeFile(nativeConfig,JSON.stringify(config,null,2)+'\n'); } catch(error) { if(error.code!=='ENOENT')throw error; }
 }
 if(app!=='docs'){
  const htmlFile=resolve(root,`apps/${app}/index.html`);let html=await readFile(htmlFile,'utf8');
  html=html.replace(/<title>.*?<\/title>/,`<title>${brand.name}${app==='admin'?' · 管理控制台':' · Learn freely'}</title>`);
  html=html.replace(/\s*<link rel="icon"[^>]*>/g,'');
  const base=app==='admin'?'/admin':'';
  html=html.replace('</head>',`  <link rel="icon" type="image/png" href="${base}${brand.favicon}" />\n  </head>`);
  if(app==='english-world')html=html.replace(/href="\/icons\/[^" ]+180x180\.png"/, 'href="/icons/freewing-apple-touch-icon-180x180.png"');
  await writeFile(htmlFile,html);
 }
}
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
await writeFile(resolve(root,'branding/freewing/asset-manifest.json'),JSON.stringify({name:brand.name,sources:{'approved-logo.png':sha(artwork),'symbol-source.png':sha(source)},derived:{'freewing-symbol.png':sha(symbol),'freewing-logo.webp':sha(logo)},iconSafeZone:{maskableMaxWidthRatio:.625,circularSafeRadiusRatio:.4}},null,2)+'\n');
console.log(`Generated ${brand.name} assets for ${apps.join(', ')}`);

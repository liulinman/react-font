import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../apps/english-world/package.json',import.meta.url));
const sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url));

test('all entry points use identical transparent brand symbols',async()=>{
 const files=['english-world','admin','docs'].map(app=>`${root}apps/${app}/public/brand/freewing-symbol.png`);
 const buffers=await Promise.all(files.map(file=>readFile(file)));
 for(const buffer of buffers)assert.deepEqual(buffer,buffers[0]);
 const {data,info}=await sharp(buffers[0]).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,512);assert.equal(info.height,512);
 assert.equal(data[3],0,'outer padding remains transparent');
 assert.ok(data.some((value,index)=>index%4===3&&value>240),'symbol is not empty');
});

test('maskable symbol stays within circular safe-zone and has an opaque background',async()=>{
 const bg=await sharp(`${root}apps/english-world/public/brand/freewing-icon-background.png`).ensureAlpha().raw().toBuffer();
 const {data,info}=await sharp(`${root}apps/english-world/public/icons/freewing-512x512-maskable.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,512);assert.equal(info.height,512);
 let symbolPixels=0;
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const i=(y*512+x)*4;assert.equal(data[i+3],255,'installed icon must not have transparent holes');
  const differs=[0,1,2].some(c=>Math.abs(data[i+c]-bg[i+c])>3);
  if(differs){symbolPixels++;assert.ok(Math.hypot(x-255.5,y-255.5)<204.8,'mark outside maskable circular safe-zone');}
 }
 assert.ok(symbolPixels>10000,'maskable asset must contain actual artwork');
});

test('native icon remains square and opaque at its declared 1024 size',async()=>{
 const file=`${root}apps/english-world/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`;
 const m=await sharp(file).metadata();assert.equal(m.width,1024);assert.equal(m.height,1024);assert.equal(m.hasAlpha,false);
});

import {loginTestAccount} from '../integration/login-test-account';
const root='/api/intensive-reading/materials';
const text='The town sprawls across the valley.';
const uid=()=>crypto.randomUUID();
function create(){return cy.request('POST',root,{requestId:uid(),sourceType:'text',title:'Contextual vocabulary',text}).then(r=>cy.request('POST',`${root}/${r.body.data.id}/versions`,{requestId:uid(),expectedVersion:r.body.data.version,title:r.body.data.title,paragraphs:r.body.data.paragraphs})).then(r=>r.body.data);}
function open(){return create().then(m=>{cy.visit(`/englishWorld/intensive-reading/${m.id}`);cy.get('[aria-label="查看词库：sprawls"]').click();cy.get('.ir-word-card').should('contain','还没有收集这个词');return cy.wrap(m,{log:false});});}
function preview(){cy.get('.ir-word-card').should('contain','这里指城镇向山谷四周扩展。');}
describe('Reading missing word collection',()=>{
 beforeEach(()=>{cy.task('resetDatabase');loginTestAccount({username:'automation_learner',password:'Automation123!'});cy.request('POST','/api/admin/login',{username:'automation_admin',password:'AutomationAdmin123!'});cy.request('PUT','/api/admin/ai-services/deepseek',{enabled:true,apiKey:'fixture-secret'});cy.request('PUT','/api/admin/ai-services/doubao',{enabled:true,apiKey:'fixture-tts-key'});});
 it('previews contextual meaning without writing and explicitly saves the lemma with its context note',()=>{
  open().then(m=>{
   preview();cy.request('POST','/api/english/lookupCollectedWord',{englishWord:'sprawl'}).its('body.data').should('eq',null);
   cy.get('.ir-word-card').should('contain','sprawls → 原型：sprawl').and('contain','蔓延，延伸').and('contain','AI释义，仅供参考');
   cy.get('.ir-word-card summary').click();cy.get('.ir-word-card details').should('contain',text);
   for(const [width,height]of [[1280,800],[1440,900],[1920,1080]]){cy.viewport(width,height);cy.contains('.ir-word-card button','添加到词库').should('be.visible');cy.screenshot(`reading-collect-preview-${width}`);}
   cy.intercept('POST','**/english/collectReadingWord').as('collect');cy.contains('.ir-word-card button','添加到词库').click();
   cy.wait('@collect').then(interception=>{expect(Object.keys(interception.request.body)).to.deep.eq(['previewToken']);expect(interception.response!.body.data.created).to.eq(true);});
   cy.get('.ir-word-card').should('contain','已添加到词库').and('contain','原文词：sprawls → sprawl').and('contain',text);
   cy.get('[aria-label="播放 sprawl 的发音"]').should('be.visible');cy.request('POST','/api/english/lookupCollectedWord',{englishWord:'sprawls'}).its('body.data').should('eq',null);
   cy.request('POST','/api/english/lookupCollectedWord',{englishWord:'sprawl'}).its('body.data').should(word=>{expect(word.englishChinese).to.eq('伸展；蔓延；杂乱地展开');expect(word.englishPhonetic).to.eq('/sprɔːl/');expect(word.englishNote).to.contain(text);});
   cy.request(`${root}/${m.id}`).its('body.data').should(next=>{expect(next.paragraphs).to.deep.eq(m.paragraphs);expect(next.annotations).to.deep.eq([]);});
  });
 });
 it('recovers generation failure and safely retries an add whose committed response was lost',()=>{
  let failed=false;cy.intercept('POST','**/english/explainReadingWord',req=>{if(!failed){failed=true;req.reply({statusCode:503,body:{code:503,message:'释义服务暂不可用'}});}else req.continue();});
  open();cy.get('.ir-word-card [role="alert"]').should('contain','释义服务暂不可用');cy.contains('.ir-word-card button','重试查询含义').click();cy.contains('.ir-word-card button','添加到词库').should('be.visible');
  cy.intercept({method:'POST',url:'**/english/collectReadingWord',times:1},req=>req.continue(res=>res.send({statusCode:503,body:{code:503,message:'保存响应丢失'}}))).as('lost');
  cy.contains('.ir-word-card button','添加到词库').click();cy.wait('@lost');cy.get('.ir-word-card [role="alert"]').should('contain','保存响应丢失');
  cy.request('POST','/api/english/lookupCollectedWord',{englishWord:'sprawl'}).then(res=>{const first=res.body.data;expect(first).not.to.eq(null);cy.contains('.ir-word-card button','重试添加').click();cy.get('.ir-word-card').should('contain','已在词库中');cy.request('POST','/api/english/lookupCollectedWord',{englishWord:'sprawl'}).its('body.data').should('deep.eq',first);});
 });
 it('keeps an existing entry and its notes when another window collects before confirmation',()=>{
  open();preview();cy.request('POST','/api/english/addEnglishWord',{englishWord:'sprawl',englishChinese:'Original meaning',englishNote:'Keep existing learning notes',englishLevel:3});
  cy.contains('.ir-word-card button','添加到词库').click();cy.get('.ir-word-card').should('contain','已在词库中').and('contain','Original meaning').and('contain','Keep existing learning notes');
  cy.request('POST','/api/english/lookupCollectedWord',{englishWord:'sprawl'}).its('body.data.englishNote').should('eq','Keep existing learning notes');
 });
 it('ignores late meaning and add responses after switching words or closing',()=>{
  cy.intercept('POST','**/english/explainReadingWord',req=>req.continue(res=>res.setDelay(1100))).as('explain');open();cy.get('[aria-label="查看词库：valley"]').click();cy.wait('@explain');cy.get('.ir-word-card h2').should('have.text','valley');cy.get('.ir-word-card').should('not.contain','原文词：sprawls → 原型：sprawl');
  cy.get('[aria-label="查看词库：sprawls"]').click();preview();cy.wait('@explain');cy.intercept('POST','**/english/collectReadingWord',req=>req.continue(res=>res.setDelay(1000))).as('add');cy.contains('.ir-word-card button','添加到词库').click();cy.get('[aria-label="查看词库：valley"]').click();cy.wait('@add');cy.get('.ir-word-card h2').should('have.text','valley');cy.get('.ir-word-card').should('not.contain','原文词：sprawls → sprawl');
  cy.get('[aria-label="查看词库：across"]').click();cy.get('[aria-label="关闭词库卡片"]').click();cy.wait('@explain');cy.get('.ir-word-card').should('not.exist');
  cy.request('POST','/api/english/lookupCollectedWord',{englishWord:'sprawl'}).its('body.data.englishWord').should('eq','sprawl');
 });
});

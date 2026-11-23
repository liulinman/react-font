import { loginTestAccount } from '../integration/login-test-account';
const root = '/api/intensive-reading/materials';
const uid = () => crypto.randomUUID();
function login(name = 'automation_learner') { return loginTestAccount({username:name,password:'Automation123!'}); }
function create() {
 return cy.request('POST',root,{requestId:uid(),sourceType:'text',title:'Word card review',text:'Urban gardens provide quiet places to rest.'})
 .then(r=>cy.request('POST',`${root}/${r.body.data.id}/versions`,{requestId:uid(),expectedVersion:r.body.data.version,title:r.body.data.title,paragraphs:r.body.data.paragraphs})).then(r=>r.body.data);
}
function saveWord(word='Urban',note='My saved vocabulary note') {return cy.request('POST','/api/english/addEnglishWord',{englishWord:word,englishChinese:'城市的',englishNote:note,englishPhonetic:'/ˈɜːbən/'});}
describe('Reading collected word card',()=>{
 beforeEach(()=>{cy.task('resetDatabase');login();cy.request('POST','/api/admin/login',{username:'automation_admin',password:'AutomationAdmin123!'});cy.request('PUT','/api/admin/ai-services/deepseek',{enabled:true,apiKey:'fixture-secret'});cy.request('PUT','/api/admin/ai-services/doubao',{enabled:true,apiKey:'fixture-tts-key'});});
 it('shows collected data, preserves source and distinguishes missing words',()=>{
  saveWord();create().then(m=>{
   cy.visit(`/englishWorld/intensive-reading/${m.id}`);
   cy.get('[aria-label="查看词库：Urban"]').click();
   cy.get('.ir-word-card').should('contain','城市的').and('contain','My saved vocabulary note');
   cy.get('.ir-paragraph').should('have.text','Urban gardens provide quiet places to rest.');
   cy.get('[aria-label="关闭词库卡片"]').click();cy.get('.ir-word-card').should('not.exist');
   cy.focused().should('have.attr','aria-label','查看词库：Urban');
   cy.get('[aria-label="查看词库：gardens"]').focus().trigger('keydown',{key:' '});cy.get('.ir-word-card').should('contain','还没有收集这个词');
   cy.request(`${root}/${m.id}`).its('body.data').should(n=>{expect(n.paragraphs).to.deep.eq(m.paragraphs);expect(n.annotations).to.deep.eq([]);});
  });
 });
 it('drags and keeps its position while switching and scrolling, supports keyboard and resize',()=>{
  saveWord();create().then(m=>cy.visit(`/englishWorld/intensive-reading/${m.id}`));
  cy.get('[aria-label="查看词库：Urban"]').click();cy.get('.ir-word-card').should('contain','城市的');
  let startX=0;cy.get('.ir-word-card').then($c=>{startX=parseFloat($c[0].style.left);});
  cy.get('.ir-word-card-handle').then($h=>{
   const el=$h[0],r=el.getBoundingClientRect();
   // Real pointer dispatch lets pointer capture route move/up outside the handle.
   cy.window().then(win=>{
    const event=(type:string,x:number,y:number)=>new win.PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y});
    // Cypress synthetic pointers have no active native pointer; capture is irrelevant to this focused drag assertion.
    cy.stub(el,'setPointerCapture');cy.stub(el,'releasePointerCapture');
    el.dispatchEvent(event('pointerdown',r.x+20,r.y+20));el.dispatchEvent(event('pointermove',r.x-180,r.y-100));el.dispatchEvent(event('pointerup',r.x-180,r.y-100));
   });
  });
  cy.get('.ir-word-card').should($c=>expect(parseFloat($c[0].style.left)).to.be.lessThan(startX-100)).then($card=>{
   const x=$card[0].style.left,y=$card[0].style.top;
   cy.get('[aria-label="查看词库：gardens"]').click();cy.get('.ir-word-card').should('contain','还没有收集这个词').and('have.css','left',x).and('have.css','top',y);
   cy.get('.ir-reader').trigger('scroll');cy.get('.ir-word-card').should('be.visible');
  });
  for(const [w,h] of [[1280,800],[1440,900],[1920,1080],[1024,650]]){
   cy.viewport(w,h);cy.get('.ir-word-card').should($c=>{const r=$c[0].getBoundingClientRect();expect(r.left).to.be.gte(0);expect(r.top).to.be.gte(0);expect(r.right).to.be.lte(w);expect(r.bottom).to.be.lte(h);});
  }
  cy.get('.ir-word-card-handle').focus().trigger('keydown',{key:'ArrowLeft'});cy.screenshot('reading-word-card-desktop');
  cy.get('.ir-word-card-handle').trigger('keydown',{key:'Escape'});cy.get('.ir-word-card').should('not.exist');
 });
 it('rejects partial matches and isolates users without updating vocabulary',()=>{
  saveWord();cy.request('POST','/api/english/lookupCollectedWord',{englishWord:'urban'}).its('body.data.englishNote').should('eq','My saved vocabulary note');
  for(const word of ['urb','%','_'])cy.request('POST','/api/english/lookupCollectedWord',{englishWord:word}).its('body.data').should('eq',null);
  saveWord('résumé','Accent spelling');cy.request('POST','/api/english/lookupCollectedWord',{englishWord:'resume'}).its('body.data').should('eq',null);
  login('automation_other');cy.request('POST','/api/english/lookupCollectedWord',{englishWord:'Urban'}).its('body.data').should('eq',null);
  saveWord('Urban','Other user note');cy.request('POST','/api/english/lookupCollectedWord',{englishWord:'Urban'}).its('body.data.englishNote').should('eq','Other user note');
  login();cy.request('POST','/api/english/lookupCollectedWord',{englishWord:'Urban'}).its('body.data.englishNote').should('eq','My saved vocabulary note');
  cy.request({method:'POST',url:'/api/english/lookupCollectedWord',body:{englishWord:'x'.repeat(201)},failOnStatusCode:false}).its('status').should('eq',400);
 });
 it('recovers errors and discards late results after switching or closing',()=>{
  saveWord();create().then(m=>cy.visit(`/englishWorld/intensive-reading/${m.id}`));
  let fail=true;
  cy.intercept('POST','**/english/lookupReadingWord',req=>{if(fail){req.reply({statusCode:503,body:{code:503,message:'AI服务繁忙，请稍后重试'}});}else req.continue();});
  cy.get('[aria-label="查看词库：Urban"]').click();cy.get('.ir-word-card').should('contain','AI服务繁忙，请稍后重试');
  cy.then(()=>{fail=false;});cy.contains('button','重试查询').click();cy.get('.ir-word-card').should('contain','My saved vocabulary note');
  cy.intercept('POST','**/english/lookupReadingWord',req=>{if(req.body.englishWord==='Urban')req.continue(res=>res.setDelay(700));}).as('lookup');
  cy.get('[aria-label="查看词库：gardens"]').click();cy.get('.ir-word-card').should('contain','还没有收集这个词');
  cy.get('[aria-label="查看词库：Urban"]').click();cy.get('[aria-label="查看词库：quiet"]').click();cy.wait(900);cy.get('.ir-word-card h2').should('have.text','quiet');cy.get('.ir-word-card').should('not.contain','My saved vocabulary note');
  cy.get('[aria-label="查看词库：Urban"]').click();cy.get('[aria-label="关闭词库卡片"]').click();cy.wait(900);cy.get('.ir-word-card').should('not.exist');
 });
 it('keeps highlighted editing and long notes usable and returns selection focus',()=>{
  saveWord('Urban', 'Long saved note. '.repeat(300));create().then(m=>{
   cy.request('POST',`${root}/${m.id}/annotations`,{requestId:uid(),expectedVersion:m.version,bodyVersionId:m.activeBodyVersionId,paragraphId:m.paragraphs[0].id,start:0,end:5,quote:'Urban',color:'yellow',category:'词汇',note:'Reading note',isQuestion:false,resolved:false});
   cy.visit(`/englishWorld/intensive-reading/${m.id}`);
  });
  cy.get('mark').focus().trigger('keydown',{key:'Enter'});cy.get('[aria-label="笔记内容"]').should('have.value','Reading note');
  cy.get('.ir-word-card-handle').focus();for(let i=0;i<30;i++)cy.get('.ir-word-card-handle').trigger('keydown',{key:'ArrowLeft'});
  cy.get('[aria-label="笔记内容"]').clear().type('Updated reading note');cy.contains('button','保存笔记').click();cy.get('.ir-note').should('contain','Updated reading note');
  cy.get('.ir-word-card').should('contain','Long saved note.');cy.get('.ir-word-card-content').should($c=>expect($c[0].scrollHeight).to.be.greaterThan($c[0].clientHeight));
  cy.get('[aria-label="关闭词库卡片"]').click();
  cy.intercept('POST','**/english/lookupReadingWord').as('phraseLookup');
  cy.get('.ir-paragraph').then($p=>{
   const p=$p[0];const range=p.ownerDocument.createRange();range.selectNodeContents(p);
   const selection=p.ownerDocument.defaultView!.getSelection()!;selection.removeAllRanges();selection.addRange(range);
   p.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
  });
  cy.contains('button','查看词库').click();cy.wait('@phraseLookup').its('request.body.englishWord').should('eq','Urban gardens provide quiet places to rest.');cy.get('.ir-word-card').should('contain','还没有收集这个词');
  cy.get('[aria-label="关闭词库卡片"]').click();cy.focused().should('have.class','ir-paragraph');
 });

 it('uses the AI lemma before reading a collected entry and preserves occurrence context',()=>{
  saveWord('sprawl','Base entry already collected');
  cy.request('POST',root,{requestId:uid(),sourceType:'text',title:'AI lemma lookup',text:'The park sprawls across four districts.'}).then(r=>cy.request('POST',`${root}/${r.body.data.id}/versions`,{requestId:uid(),expectedVersion:r.body.data.version,title:r.body.data.title,paragraphs:r.body.data.paragraphs})).then(r=>cy.visit(`/englishWorld/intensive-reading/${r.body.data.id}`));
  cy.intercept('POST','**/english/lookupReadingWord').as('lemma');cy.get('[aria-label="查看词库：sprawls"]').click();
  cy.wait('@lemma').then(({request,response})=>{expect(request.body.context).to.contain('<target>sprawls</target> across');expect(response!.body.data.lemma).to.eq('sprawl');expect(response!.body.data.word.englishWord).to.eq('sprawl');cy.wrap(response!.body.data.word.id).as('baseWordId');});
  cy.get('.ir-word-card').should('contain','原文词：sprawls → 原型：sprawl').and('contain','Base entry already collected');cy.get('.ir-word-card h2').should('have.text','sprawl');
  cy.window().then(win=>{cy.spy(win.HTMLMediaElement.prototype,'play').as('cardAudioPlay');});cy.intercept('POST','**/speech/word').as('wordAudio');cy.get('[aria-label="播放 sprawl 的发音"]').click();
  cy.wait('@wordAudio').then(({request,response})=>{cy.get('@baseWordId').then(id=>expect(request.body.wordId).to.eq(id));expect(response!.statusCode).to.eq(201);expect(response!.headers['content-type']).to.contain('audio/');});
  cy.get('@cardAudioPlay').should('have.been.called');cy.get('.ir-word-card').should('be.visible');cy.screenshot('reading-word-ai-lemma-speech');
 });

});

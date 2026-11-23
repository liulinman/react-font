import { loginTestAccount } from './login-test-account';

const path = '/api/browser-reading';
const redirect = 'https://ibpanaiimdbfnndkcfepjfdaopgfcdnn.chromiumapp.org/english-world';
const verifier = 'a'.repeat(43);
const challenge = 'ZtNPunH49FD35FWYhT5Tv8I7vRKQJ8uxMaL0_9eHjNA';

function openBankSources() {
  // The working tree has a dictionary view. The production baseline opens the
  // same sources from the Edit dialog on the bank table row.
  cy.contains('button[aria-label="查看 bank"], tr', /\bbank\b/).then((entry) => {
    if (entry.is('tr')) cy.wrap(entry).contains('button', '编辑').click();
    else cy.wrap(entry).click();
  });
}

describe('Browser reading citations', () => {
  let learner: { username: string; password: string };

  beforeEach(() => {
    cy.task('resetDatabase', null, { timeout: 60000 }).then((fixture) => {
      learner = (fixture as { account: typeof learner }).account;
      cy.request({
        method: 'POST', url: '/api/admin/login', log: false,
        body: { username: 'automation_admin', password: 'AutomationAdmin123!' },
      });
      cy.request({
        method: 'PUT', url: '/api/admin/ai-services/deepseek', log: false,
        body: { enabled: true, apiKey: 'fixture-only-ai-key' },
      }).its('body.data.enabled').should('eq', true);
      return loginTestAccount(learner);
    });
  });

  it('saves editable notes and translated source from the actual extension card', () => {
    cy.request({method:'POST',url:`${path}/authorize`,body:{redirect,challenge,state:'d'.repeat(43)},log:false}).then(({body})=>{
      const code=new URL(body.data.redirect).searchParams.get('code');
      cy.request({method:'POST',url:`${path}/exchange`,body:{code,verifier},log:false}).then(({body:exchange})=>{
        const authorization=`Bearer ${exchange.data.accessToken}`;
        cy.visit('/englishWorld/words');
        cy.readFile('../browser-reading-extension/content.js').then(source=>cy.window().then(win=>{
          const attach=win.Element.prototype.attachShadow;
          cy.stub(win.Element.prototype,'attachShadow').callsFake(function(this:HTMLElement,options:ShadowRootInit){this.dataset.testid='extension-card-host';return attach.call(this,{...options,mode:'open'});});
          let listener:(message:object,sender:object,reply:()=>void)=>void;
          Object.defineProperty(win,'chrome',{configurable:true,value:{runtime:{
            onMessage:{addListener:(fn:typeof listener)=>{listener=fn;}},
            sendMessage:async(message:{kind:string;payload:object})=>{
              const response=await win.fetch(`${path}/${message.kind}`,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify(message.payload)});
              const value=await response.json();return response.ok?{data:value.data}:{error:value.message};
            },
          }}});
          const article=win.document.createElement('p');article.textContent='We walked along the river bank.';win.document.body.append(article);
          win.eval(source as string);
          const bankOffset = article.textContent.indexOf('bank');
          const range=win.document.createRange();range.setStart(article.firstChild!,bankOffset);range.setEnd(article.firstChild!,bankOffset + 'bank'.length);win.getSelection()!.removeAllRanges();win.getSelection()!.addRange(range);
          listener!({kind:'read-selection',selected:'bank'},{},()=>{});
        }));
        cy.get('[data-testid="extension-card-host"]').shadow().find('section[role="dialog"]').within(()=>{
          cy.contains('/bæŋk/');
          cy.contains('整句译文');
          cy.contains('我们沿着河岸行走。');
          cy.contains('button','播放发音');
          cy.contains('原文来源');
          cy.get('a').should('have.attr','href').and('include','http://127.0.0.1:13318/englishWorld/words');
          cy.get('textarea[aria-label="单词笔记"]').clear().type('卡片中填写的学习笔记。');
          cy.contains('button','加入词库').click();
          cy.contains('本句已保存');
        });
        cy.request('POST','/api/english/filterWordList',{page:1,pageSize:20}).then(({body})=>{
          const bank=body.data.list.find((word:{englishWord:string})=>word.englishWord==='bank');
          expect(bank.englishNote).to.equal('卡片中填写的学习笔记。');
          cy.request(`${path}/words/${bank.id}/sources`).then(({body:citations})=>{
            expect(citations.data).to.have.length(1);expect(citations.data[0].sentenceTranslation).to.equal('我们沿着河岸行走。');
          });
        });
      });
    });
  });

  it('persists two article citations under one word and renders links after reload', () => {
    let savedWordId: number;
    cy.viewport(1440, 900);
    cy.visit('/englishWorld/words');
    cy.request({
      method: 'POST', url: `${path}/authorize`, log: false,
      body: { redirect, challenge, state: 'b'.repeat(43) },
    }).then(({ body }) => {
      const code = new URL(body.data.redirect).searchParams.get('code');
      cy.request({ method: 'POST', url: `${path}/exchange`, body: { code, verifier }, log: false })
        .then(({ body: tokenBody }) => {
          const headers = { Authorization: `Bearer ${tokenBody.data.accessToken}` };
          const post = (action: string, data: object) => cy.request({
            method: 'POST', url: `${path}/${action}`, headers, body: data, log: false,
          });
          post('explain', {
            englishWord: 'bank', context: 'I went to the <target>bank</target> to deposit money.',
            url: 'https://news.example/article?id=42&utm_source=sample#finance', title: 'Money news',
          }).then(({ body: first }) => {
            expect(first.data).to.include({ meaning: '银行', phonetic:'/bæŋk/', sentenceTranslation:'我去银行存钱。', wordExists: false, saved: false });
            cy.request('POST', '/api/english/filterWordList', { page: 1, pageSize: 20 }).then(({ body }) => {
              expect(body.data.list.map((word: { englishWord: string }) => word.englishWord)).not.to.include('bank');
            });
            const data = { previewToken: first.data.previewToken, note:'这是我的第一条笔记。' };
            post('save', data).then(({ body: saved }) => {
              savedWordId = saved.data.wordId;
              post('save', data).its('body.data.wordId').should('eq', saved.data.wordId);
              post('explain', {
                englishWord: 'bank', context: 'We walked along the river <target>bank</target>.',
                url: 'https://travel.example/river', title: 'River walk',
              }).then(({ body: second }) => {
                expect(second.data).to.include({ meaning: '河岸', wordExists: true, saved: false });
                const secondData={ previewToken: second.data.previewToken, note:'河岸用法，保留上一条。' };
                cy.window().then(async (win) => {
                  const submit = () => win.fetch(`${path}/save`, {
                    method: 'POST', credentials: 'omit',
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    body: JSON.stringify(secondData),
                  });
                  const responses = await Promise.all([submit(), submit()]);
                  for (const response of responses) {
                    expect(response.ok).to.equal(true);
                    expect((await response.json()).data.wordId).to.equal(saved.data.wordId);
                  }
                });
                post('save', secondData).its('body.data.wordId').should('eq', saved.data.wordId);
                cy.request(`${path}/words/${saved.data.wordId}/sources`).its('body.data').should('have.length', 2).then(sources=>{
                  expect(sources.map((s:{sentenceTranslation:string})=>s.sentenceTranslation)).to.include('我们沿着河岸行走。');
                });
                cy.request('POST','/api/english/filterWordList',{page:1,pageSize:20}).then(({body})=>{
                  const word=body.data.list.find((w:{id:number})=>w.id===saved.data.wordId);
                  expect(word.sourceUrl).to.equal('https://travel.example/river');
                  expect(word.englishReference).to.be.oneOf([null, '']);
                  expect(word.englishNote).to.equal('这是我的第一条笔记。\n\n河岸用法，保留上一条。');
                  expect(word.englishLevel).to.equal(0);
                });
              });
            });
          });
          post('revoke', {});
          cy.request({
            method: 'POST', url: `${path}/save`, headers, body: { previewToken: '00000000-0000-4000-8000-000000000000' },
            failOnStatusCode: false, log: false,
          }).its('status').should('eq', 401);
        });
    });
    cy.reload();
    openBankSources();
    cy.contains('a', '打开原文').should('have.attr', 'href', 'https://travel.example/river');
    cy.get('[aria-label="原文出处"]').within(() => {
      cy.contains('河岸');
      cy.contains('银行');
      cy.contains('整句译文：我们沿着河岸行走。');
      cy.contains('a', 'Money news').should('have.attr', 'href', 'https://news.example/article?id=42#finance');
    });
    cy.reload();
    openBankSources();
    cy.get('[aria-label="原文出处"]').contains('a', 'River walk').should('have.attr', 'href', 'https://travel.example/river');
    cy.clearCookie('token');
    cy.then(() => loginTestAccount({ ...learner, username: 'automation_other' }));
    cy.then(() => cy.request(`${path}/words/${savedWordId}/sources`).its('body.data').should('deep.eq', []));
  });
});

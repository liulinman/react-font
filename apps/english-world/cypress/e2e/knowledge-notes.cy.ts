describe('Knowledge notes and long word notes', () => {
  const longBody = Array.from({length:24},(_,i)=>`第 ${i+1} 行：I find it difficult to get up early. 形式宾语不等于前文动作。`).join('\n');
  let notes:any[];
  let nextId:number;
  const word = {id:9,englishWord:'find',englishChinese:'发现',englishLevel:1,englishType:0,englishNote:longBody,englishReference:'阅读课程 · 第1课'};
  beforeEach(()=>{
    notes=[];nextId=1;
    cy.intercept({pathname:'/api/**'},req=>{
      const url = new URL(req.url);const path=url.pathname;
      let data:any={};
      if(path.endsWith('/user/getCurrentUser')) data={id:901,username:'Learner'};
      else if(path.endsWith('/notifications')) data={list:[],nextCursor:null};
      else if(path.endsWith('/notifications/unread-count')) data={count:0};
      else if(path.includes('/knowledge-notes')) {
        const suffix=path.split('/knowledge-notes')[1];const id=Number(suffix.slice(1));
        if(suffix==='/copy-source/9') data=word;
        else if(suffix==='/words') data=[word];
        else if(req.method==='POST') {
          const existing=notes.find(n=>n.requestId===req.body.requestId);
          data=existing??{...req.body,id:nextId++,version:1,words:req.body.wordIds.map(()=>({id:9,englishWord:'find'})),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
          if(!existing) notes.push(data);
        } else if(req.method==='PUT') {
          const index=notes.findIndex(n=>n.id===id);notes[index]={...notes[index],...req.body,version:notes[index].version+1};data=notes[index];
        } else if(req.method==='DELETE') { notes=notes.filter(n=>n.id!==id); data={deleted:true}; }
        else if(suffix) data=notes.find(n=>n.id===id);
        else {const q=url.searchParams.get('q')??'';const category=url.searchParams.get('category');const list=notes.filter(n=>(!category||n.category===category)&&JSON.stringify(n).includes(q));data={list,total:list.length,page:1,pageSize:20};}
      } else if(path.endsWith('/english/filterWordList')) data={list:[word],total:1,totalPages:1};
      else if(path.endsWith('/english/findWordList')) data=[word];
      else if(path.endsWith('/english/updateEnglishWord')) data=true;
      req.reply({code:200,data});
    });
  });
  function visit(path:string) {cy.visit(path,{onBeforeLoad(win){win.localStorage.clear();win.localStorage.setItem('english-world-sidebar-collapsed','false');}});}
  it('creates, reloads, edits, searches and deletes a standalone desktop note',()=>{
    cy.viewport(1440,900);visit('/englishWorld/knowledge-notes');
    cy.get('.english-world-header').should('have.css','position','fixed');
    cy.contains('a','＋ 新建笔记').click();
    cy.get('#knowledge-title').type('形式宾语的正确理解');
    cy.get('#knowledge-body').type(longBody,{delay:0});
    cy.get('#knowledge-category').select('句型');
    cy.get('.english-world-main').scrollTo('top');
    cy.screenshot('knowledge-desktop-editor',{capture:'viewport'});
    cy.contains('button','保存').click();
    cy.contains('h1','形式宾语的正确理解').should('be.visible');
    cy.contains('.knowledge-body','第 24 行').should('exist');
    cy.reload();cy.contains('h1','形式宾语的正确理解').should('be.visible');
    cy.contains('a','编辑').click();
    cy.get('#knowledge-title').clear().type('形式宾语·修订');
    cy.contains('button','保存').click();cy.contains('h1','形式宾语·修订').should('be.visible');
    cy.contains('a','返回列表').click();cy.get('[aria-label="搜索知识笔记"]').type('形式宾语');cy.contains('button','搜索').click();
    cy.contains('h2','形式宾语·修订').click();
    cy.contains('summary','更多').click();cy.contains('button','删除笔记').click();cy.contains('button','确认删除').click();
    cy.contains('没有找到相关笔记').should('be.visible');
  });
  it('copies on mobile, protects drafts and displays long text without horizontal overflow',()=>{
    cy.viewport(390,844);visit('/mobile/tools');
    cy.contains('a','知识笔记').should('be.visible');
    visit('/mobile/tools/knowledge-notes/new?copyWord=9');
    cy.get('#knowledge-body').should('have.value',longBody);
    cy.get('#knowledge-title').type('find it 句型');
    cy.contains('a','返回列表').click();cy.get('[role="alertdialog"]').should('be.visible');cy.contains('button','继续编辑').click();
    cy.get('#knowledge-body').should('have.value',longBody);
    cy.get('#knowledge-body').then($el=>expect($el[0].scrollHeight).to.be.at.most($el[0].clientHeight+2));
    cy.document().then(doc=>expect(doc.documentElement.scrollWidth).to.be.at.most(390));
    cy.screenshot('knowledge-mobile-editor');
    cy.contains('button','保存').click();cy.contains('h1','find it 句型').should('be.visible');
    cy.contains('.knowledge-body','第 24 行').should('exist');
    cy.get('.knowledge-article').scrollIntoView();cy.screenshot('knowledge-mobile-detail');
    cy.contains('a','返回列表').click();cy.contains('h2','find it 句型').should('be.visible');
  });
  it('keeps desktop word fields when focusing a long note',()=>{
    cy.viewport(1440,900);visit('/englishWorld/words');
    cy.get('[aria-label="展开 find 的笔记"]').click();
    cy.get('[aria-label="编辑 find 的笔记"]').click();
    cy.get('#full-word-note').should('have.value',longBody);
    cy.get('#full-word-note').then($el=>expect($el[0].scrollHeight).to.be.at.most($el[0].clientHeight+2));
    cy.get('.word-note-focus-modal').should('be.visible');
    cy.get('.word-note-focus-modal').should('not.have.class','ant-zoom-appear').screenshot('knowledge-word-focus');
    cy.contains('button','返回表单').click();
    cy.get('.ant-modal #englishChinese').should('have.value','发现');
    cy.get('#englishNote').should('have.value',longBody);
  });
  it('preserves mobile word drafts through focus editing and supports a dark narrow viewport',()=>{
    cy.viewport(320,700);visit('/mobile/tools/knowledge-notes/new');
    cy.get('.knowledge-notes').should('be.visible');
    cy.get('html').invoke('attr','data-theme','dark');
    cy.get('.knowledge-notes').should('have.css','color','rgb(255, 255, 255)');
    cy.document().then(doc=>expect(doc.documentElement.scrollWidth).to.be.at.most(320));
    visit('/mobile/words/9/edit');
    cy.get('[aria-label="中文释义"]').should('have.value','发现').clear().type('新的释义');
    cy.contains('button','展开编辑笔记').click();
    cy.get('[aria-label="完整笔记"]').should('have.value',longBody).scrollIntoView({offset:{top:-140,left:0}}).click(10,10).type('{moveToEnd}\n补充理解',{delay:0});
    cy.contains('button','返回表单').click();
    cy.get('[aria-label="中文释义"]').should('have.value','新的释义');
    cy.get('[aria-label="笔记"]').should('have.value',longBody+'\n补充理解');
  });

  it('keeps mobile note cards stacked and readable at phone widths',()=>{
    notes.push({id:1,title:'形式宾语与真实宾语的区别',body:longBody,category:'句型',source:'阅读课程 · 第1课',words:[],version:1,updatedAt:new Date().toISOString()});
    for (const width of [390,320]) {
      cy.viewport(width,844);visit('/mobile/tools/knowledge-notes');
      cy.get('.knowledge-list > li > a').should('be.visible');
      cy.screenshot(`knowledge-mobile-list-${width}`,{capture:'viewport'});
      cy.get('.knowledge-list > li > a').then($card=>{
        const card=$card[0]; const heading=card.querySelector('.knowledge-list-heading')!.getBoundingClientRect();
        const summary=card.querySelector('.knowledge-summary')!.getBoundingClientRect();
        const meta=card.querySelector('.knowledge-meta')!.getBoundingClientRect();
        expect(summary.top,'summary below title').to.be.at.least(heading.bottom);
        expect(meta.top,'metadata below summary').to.be.at.least(summary.bottom);
        expect(card.getBoundingClientRect().right,'card fits screen').to.be.at.most(width);
      });
    }
  });

});

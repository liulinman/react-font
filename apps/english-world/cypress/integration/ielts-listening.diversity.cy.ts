import {loginTestAccount} from './login-test-account';

// Real local HTTP/MySQL and browser, external AI/voice double: no language-quality claim.
describe('IELTS original material diversity',()=>{
  beforeEach(()=>{
    cy.task('resetDatabase').then((f:any)=>loginTestAccount(f.account));
    cy.request('POST','/api/admin/login',{username:'automation_admin',password:'AutomationAdmin123!'});
    // Explicit bulk-test throughput for the isolated supplier double, never real-provider acceptance.
    for(const provider of ['deepseek','doubao']){
      cy.request('PUT',`/api/admin/ai-services/${provider}`,{enabled:true,apiKey:'fixture-only-ai-key'});
      cy.request('PUT',`/api/admin/ai-services/limits/${provider}`,{charactersPerDay:1000000,requestsPerMinute:100});
    }
    cy.viewport(1440,900);
  });
  it('AC17/18 creates eight distinct real map geometries and keeps idempotent materials private',()=>{
    const shapes:string[]=[];let firstId:string;
    for(let i=0;i<8;i++){
      const requestId=crypto.randomUUID();
      cy.request('POST','/api/ielts-listening/materials',{requestId,part:2,kind:'map'})
        .then(({body})=>{
          const id=body.data.id;if(i===0)firstId=id;
          expect(JSON.stringify(body.data)).not.to.match(/sectionPlans|planningOrder|transcript|answers|evidence/);
          return cy.request('POST',`/api/ielts-listening/materials/${id}/prepare`,{});
        }).then(({body})=>{
          expect(body.data.status).to.eq('ready');
          const map=body.data.sections[0].groups[0];
          expect(map.questions).to.have.length(10);expect(map.map.nodes).to.have.length(12);
          shapes.push(JSON.stringify(map.map.paths));
          return cy.request('POST','/api/ielts-listening/materials',{requestId,part:2,kind:'map',topic:'Do not replace saved material'});
        }).then(({body})=>{if(i===0)expect(body.data.id).to.eq(firstId);expect(body.data.status).to.eq('ready');});
    }
    cy.then(()=>expect(new Set(shapes).size).to.eq(8));
    cy.visit('/englishWorld/ielts-listening');
    cy.contains('.ielts-records li','Riverside Park').first().contains('button','开始作答').click();
    cy.contains('button','开始听力').click();
    for(const [width,height] of [[1280,800],[1440,900]]){
      cy.viewport(width,height);cy.get('.ielts-map-scroll svg').should('be.visible');
      cy.screenshot(`diverse-map-${width}`,{capture:'viewport'});
    }
    cy.get('select[aria-label^="第"]').first().select('B').should('have.value','B');
    cy.contains('button','放大地图').click();cy.contains('button','复位').click();
    cy.get('select[aria-label^="第"]').first().should('have.value','B');
  });
  it('AC15 renders classified tables and ordered stages with persistent usable answer fields',()=>{
    const makeQuestion=(id:number,field:string,value:string)=>({id,prompt:`Detail ${id}`,before:`Item ${id}:`,after:'.',[field]:value,answers:['Monday'],evidence:`Item ${id} is on Monday.`});
    const questions=Array.from({length:10},(_,i)=>i<6?makeQuestion(i+1,'category',i<3?'Morning programme':'Evening programme'):makeQuestion(i+1,'stage',i<8?'Preparation':'Follow-up'));
    const section={part:1,title:'Programme arrangements',transcript:questions.map(q=>q.evidence).join(' '),groups:[
      {kind:'completion',format:'table',title:'Programme table',instruction:'ONE WORD ONLY',maxWords:1,allowNumber:false,questions:questions.slice(0,6)},
      {kind:'completion',format:'flow',title:'Registration process',instruction:'ONE WORD ONLY',maxWords:1,allowNumber:false,questions:questions.slice(6)},
    ]};
    cy.request('POST','/api/admin/ielts-listening/materials',{requestId:crypto.randomUUID(),title:'Structured programme',sections:[section]})
      .then(({body})=>cy.request('POST',`/api/admin/ielts-listening/materials/${body.data.id}/prepare`,{}))
      .then(({body})=>cy.request('POST',`/api/admin/ielts-listening/materials/${body.data.id}/publish`,{published:true}));
    cy.visit('/englishWorld/ielts-listening');cy.contains('.ielts-records li','Structured programme').contains('button','开始作答').click();
    cy.contains('button','开始听力').click();
    cy.get('table').contains('Morning programme').should('be.visible');
    cy.get('table input').should('have.length',6);
    cy.contains('.ielts-group','Registration process').find('ol').should('contain.text','Preparation').and('contain.text','Follow-up');
    cy.get('#ielts-answer-1').type('Monday');cy.get('#ielts-answer-7').type('Monday');
    cy.contains('已保存',{timeout:10000}).should('exist');
    for(const [width,height] of [[1280,800],[1440,900]]){
      cy.viewport(width,height);
      cy.get('table').scrollIntoView({offset:{top:-150,left:0}});cy.screenshot(`structured-table-${width}`,{capture:'viewport'});
      cy.contains('.ielts-group','Registration process').scrollIntoView({offset:{top:-100,left:0}});cy.screenshot(`structured-flow-${width}`,{capture:'viewport'});
      cy.document().then(doc=>expect(doc.documentElement.scrollWidth).to.be.at.most(width));
    }
    cy.reload();cy.get('#ielts-answer-1').should('have.value','Monday');cy.get('#ielts-answer-7').should('have.value','Monday');
    cy.get('input[aria-label^="第"]').should('have.length',10);
  });
});

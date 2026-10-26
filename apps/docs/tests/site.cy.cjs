const visit = (...args) => { cy.visit(...args); cy.get('#app', {timeout:15000}).should($el => expect($el[0].__vue_app__, 'Vue hydration completed').to.exist); };
describe('Published documentation build', () => {
  it('serves deep links, navigation, code and theme', () => {
    visit('/docs/mcp/query-words');
    cy.get('h1').should('contain', 'query_words');
    cy.get('.vp-doc pre').should('have.length.at.least', 2);
    cy.get('button.copy').first().should('exist');
    cy.get('.VPDocAsideOutline').should('contain', '从授权到数据库');
    cy.reload();cy.get('h1').should('contain', 'query_words');
    cy.get('.VPSwitchAppearance').first().click();cy.get('html').should('have.class','dark');
    cy.screenshot('docs-desktop', {capture:'viewport'});
  });
  for (const term of ['权限','query_words']) {
    it('searches actual content: '+term, () => {
      visit('/docs/');cy.get('button.DocSearch-Button').click();
      cy.get('input[type=search]').type(term);
      cy.get('.results .result').should('have.length.at.least',1);
      cy.get('.results .result').first().click();
      cy.location('pathname').should('not.equal','/docs/');
    });
  }
  it('works at 390px with a usable chapter menu',()=>{
    cy.viewport(390,844);visit('/docs/start/overview');
    cy.get('button.menu').click();
    cy.get('.VPSidebar').should('be.visible').and('contain','AI 与 MCP');
    cy.contains('.VPSidebar a','实现 query_words').click();
    cy.get('h1').should('contain','query_words');
    cy.document().then(doc=>expect(doc.documentElement.scrollWidth).at.most(390));
    cy.screenshot('docs-mobile', {capture:'viewport'});
  });
  it('has a real platform link and branded not-found page',()=>{
    visit('/docs/');cy.contains('a','返回学习平台').should('have.attr','href','https://124.223.157.129/englishWorld/ai-listening');
    visit('/docs/404.html', {failOnStatusCode:false});cy.get('.NotFound').should('contain','404');
  });
});

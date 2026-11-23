import { loginTestAccount } from './login-test-account';

const endpoint = '/api/english/word-review';
const columns = ['单词', '这次要记的词义', '记忆线索'];
type Account = { username: string; password: string };

function addWord(englishWord: string, englishChinese: string, extra = {}) {
  return cy.request('POST', '/api/english/addEnglishWord', {
    englishWord, englishChinese, englishType: 0, ...extra,
  });
}

function openDownload() {
  cy.contains('button', '下载单词').click();
  return cy.get('[role="dialog"]').should('be.visible');
}

function selectOption(label: string) {
  return cy.get('[role="dialog"]').contains('label', label).click();
}

describe('Vocabulary review downloads', () => {
  let learner: Account;
  beforeEach(() => {
    cy.viewport(1440, 960);
    cy.task('resetDatabase', null, { timeout: 60000 }).then((fixture) => {
      learner = (fixture as { account: Account }).account;
      return loginTestAccount(learner);
    });
  });

  it('previews selected words and exports the entire applied filter across pages', () => {
    const words = 'abcdefghijkl'.split('').map((letter) => ({
      englishWord: 'review' + letter, englishChinese: '示例', englishType: 0,
    }));
    cy.request('POST', '/api/english/importMissingWords', {
      words: [...words, { englishWord: 'review plan', englishChinese: '复习计划', englishType: 1 }],
    }).its('body.data.inserted').should('eq', 13);

    cy.visit('/englishWorld/words');
    cy.get('input[placeholder="搜索单词或短语"]').type('review');
    cy.get('.english-world-filter-form button[type=submit]').click();
    cy.contains('.ant-pagination-total-text', '共 13 条数据');
    cy.contains('.ant-segmented-item', '卡片').click();
    cy.contains('button', '批量管理').click();
    cy.get('input[aria-label="选择 reviewl"]').check();
    cy.get('input[aria-label="选择 reviewk"]').check();
    openDownload().within(() => {
      cy.contains('label', '已勾选').find('input').should('be.checked');
      cy.contains('label', 'PDF').find('input').should('be.checked');
      cy.contains('2 个词');
      cy.get('tbody th').should(($cells) => {
        expect($cells.toArray().map((cell) => cell.textContent)).to.deep.equal(['reviewl', 'reviewk']);
      });
    });
    selectOption('当前筛选');
    cy.get('[role="dialog"]').within(() => {
      cy.contains('12 个词');
      cy.get('tbody tr').should('have.length', 3);
    });
    selectOption('全部单词');
    cy.get('[role="dialog"]').within(() => {
      cy.contains('13 个词');
      cy.contains('label', 'Excel').find('input').should('be.checked');
    });
  });

  it('downloads three real files and previews only the review fields', () => {
    addWord('asset', '资产；优点', { englishNote: '搭配：fixed assets\n测试私密笔记', englishReference: 'https://example.test/hidden' });
    addWord('chip', '芯片', { englishNote: '测试私密笔记' });
    cy.visit('/englishWorld/words');
    openDownload().within(() => {
      cy.contains('3 个词');
      cy.get('thead th').should(($cells) => {
        expect($cells.toArray().map((cell) => cell.textContent)).to.deep.equal(columns);
      });
      cy.contains('tbody tr', 'asset').find('td').should(($cells) => {
        expect($cells.toArray().map((cell) => cell.textContent)).to.deep.equal(['资产', 'fixed assets']);
      });
      cy.contains('tbody tr', 'chip').find('td').last().should('have.text', '');
      cy.get('table').should('not.contain.text', '测试私密笔记').and('not.contain.text', 'hidden');
    });

    cy.get('[role="dialog"]').screenshot('word-review-download-preview');
    cy.intercept('POST', '**/english/word-review/download').as('downloadReview');
    for (const [label, format, magic] of [
      ['PDF', 'pdf', '%PDF'],
      ['Word', 'docx', 'PK'],
      ['Excel', 'xlsx', 'PK'],
    ]) {
      selectOption(label);
      cy.get('[role="dialog"]').contains('button', /^下载$/).click();
      cy.wait('@downloadReview', { responseTimeout: 60000 }).then(({ request, response }) => {
        expect(request.body.format).to.eq(format);
        expect(response?.statusCode).to.eq(200);
        expect(response?.headers['content-disposition']).to.include('freewing-word-review.' + format);
      });
      const file = Cypress.config('downloadsFolder') + '/freewing-word-review.' + format;
      cy.readFile(file, null, { timeout: 20000 }).should((buffer) => {
        expect(buffer.subarray(0, magic.length).toString()).to.eq(magic);
      });
    }
  });

  it('refreshes a stale preview and prevents downloads for an empty filter', () => {
    cy.visit('/englishWorld/words');
    openDownload().contains('1 个词');
    addWord('steady', '稳定的');
    cy.get('[role="dialog"]').contains('button', /^下载$/).click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('复习内容有变化，请刷新预览后再下载。');
      cy.contains('button', /^下载$/).should('be.disabled');
      cy.contains('button', '刷新预览').click();
      cy.contains('2 个词');
      cy.contains('button', /取\s*消/).click();
    });
    cy.get('input[placeholder="搜索单词或短语"]').type('noexportmatches');
    cy.intercept('POST', '**/english/filterWordList').as('wordList');
    cy.get('.english-world-filter-form button[type=submit]').click();
    cy.wait('@wordList').its('response.body.data.total').should('eq', 0);
    openDownload().within(() => {
      cy.contains('此范围没有可下载的单词。');
      cy.contains('button', /^下载$/).should('be.disabled');
    });
  });

  it('keeps another account’s words out and leaves the vocabulary unchanged', () => {
    cy.request('POST', '/api/english/filterWordList', { page: 1, pageSize: 10 }).its('body.data.list').then((list) => {
      const privateId = list[0].id;
      cy.clearCookies();
      loginTestAccount({ ...learner, username: 'automation_other' });
      addWord('privateword', '另一账号的单词');
      cy.request('POST', endpoint + '/preview', { scope: 'selected', ids: [privateId] })
        .its('body.data.count').should('eq', 0);
      cy.request('POST', endpoint + '/preview', { scope: 'all' }).its('body.data').then((preview) => {
        expect(preview.rows).to.deep.equal([['privateword', '另一账号的单词', '']]);
        cy.request('POST', endpoint + '/download', { scope: 'all', format: 'xlsx', revision: preview.revision });
        cy.request('POST', '/api/english/filterWordList', { page: 1, pageSize: 10 })
          .its('body.data.list').should('have.length', 1).its('0.englishWord').should('eq', 'privateword');
      });
    });
  });
});

import { loginTestAccount } from './login-test-account';

type GoldenPaper = {
  id: string;
  alternateId: string;
  textMapId: string;
  expectedTextMapAnswers: Record<string, string>;
  expectedAnswers: Record<string, string>;
  durationSeconds: number;
  audioSegments: number;
  parts: 4;
  total: 40;
};
type AudioEvent = { kind: string; src: string; at: number; time: number; rate: number };

// The seed assembles previously generated real DeepSeek/Doubao originals.
// It never calls generation/TTS and does not certify a currently failing supplier
// request. Audio is played in real time: no clock, seeking, rate changes or ended
// injection. All HTTP observers below pass responses through unchanged.
describe('IELTS listening real golden paper playback', () => {
  let paper: GoldenPaper;
  let account: { username: string; password: string };
  beforeEach(() => {
    cy.task('resetDatabase', null, { timeout: 60000 }).then(value => {
      account = (value as { account: { username: string; password: string } }).account;
    });
    cy.task('seedIeltsRealPaper', null, { timeout: 120000 }).then(value => {
      paper = value as GoldenPaper;
      expect(paper.parts).to.eq(4); expect(paper.total).to.eq(40);
      expect(Object.keys(paper.expectedAnswers)).to.have.length(40);
      expect(paper.durationSeconds).to.be.greaterThan(300);
      expect(paper.audioSegments).to.be.greaterThan(3);
      cy.then(() => loginTestAccount(account));
    });
    cy.viewport(1440, 900);
  });

  it('trains with real pause resume slow replay and stops the old audio when changing material', {requestTimeout: 120000, responseTimeout: 120000, defaultCommandTimeout: 15000}, () => {
    const events: AudioEvent[] = [];
    let originalSrc: string, pausedAt: number, originalAttempt: string, switchAt: number;
    cy.then(() => cy.request('/api/ielts-listening/materials')).then(({body}) => {
      const first = body.data.find((material: {id: string}) => material.id === paper.id);
      expect(first).to.exist;
      cy.visit('/englishWorld/ielts-listening');
      cy.get('.ielts-setup-fields select').eq(1).select('training');
      cy.contains('.ielts-records li', first.title).contains('button', '开始作答').click();
    });
    cy.location('search').then(search => {originalAttempt = new URLSearchParams(search).get('attempt')!;});
    cy.contains('button', '开始听力', {timeout: 120000}).should('be.enabled');
    cy.get('audio').then(elements => {
      const media = elements[0] as HTMLAudioElement;
      ['play', 'pause', 'ratechange'].forEach(kind => media.addEventListener(kind, () => events.push({kind, src: media.currentSrc || media.src, at: Date.now(), time: media.currentTime, rate: media.playbackRate})));
    });
    cy.contains('button', '开始听力').click();
    cy.get('audio').should(elements => expect((elements[0] as HTMLAudioElement).currentTime).to.be.greaterThan(0.3)).then(elements => {originalSrc = (elements[0] as HTMLAudioElement).currentSrc;});
    cy.contains('button', /^暂停$/).click();
    cy.get('audio').should(elements => expect((elements[0] as HTMLAudioElement).paused).to.eq(true)).then(elements => {pausedAt = (elements[0] as HTMLAudioElement).currentTime;});
    cy.wait(500); // Observe a genuine paused clock, not a synthetic playback event.
    cy.get('audio').then(elements => expect((elements[0] as HTMLAudioElement).currentTime).to.eq(pausedAt));
    cy.contains('button', '0.8× 慢速').click();
    cy.get('audio').should(elements => expect((elements[0] as HTMLAudioElement).playbackRate).to.eq(0.8));
    cy.contains('button', '继续播放').click();
    cy.get('audio').should(elements => expect((elements[0] as HTMLAudioElement).currentTime).to.be.greaterThan(pausedAt + 0.3));
    cy.get('audio').should(elements => expect((elements[0] as HTMLAudioElement).currentTime).to.be.greaterThan(2));
    cy.contains('button', /^暂停$/).click(); cy.contains('button', '重听当前段').click();
    cy.contains('音频正在播放').should('be.visible');
    cy.get('audio').then(elements => {const media = elements[0] as HTMLAudioElement; expect(media.currentTime, 'replay starts at beginning').to.be.lessThan(1);expect(media.currentSrc).to.eq(originalSrc);});
    cy.then(() => cy.request(`/api/ielts-listening/attempts/${originalAttempt}`)).then(({body}) => {expect(body.data.assists.replays).to.be.at.least(1);expect(body.data.assists.slow).to.eq(true);});
    cy.contains('button', '返回材料与记录').click();
    cy.get('audio').should(elements => expect((elements[0] as HTMLAudioElement).paused, 'return stops the old audio').to.eq(true));
    cy.then(() => {switchAt = Date.now(); return cy.request('/api/ielts-listening/materials');}).then(({body}) => {
      const alternate = body.data.find((material: {id: string}) => material.id === paper.alternateId);
      expect(alternate, 'a distinct existing-audio material').to.exist;expect(alternate.id).not.to.eq(paper.id);
      cy.contains('.ielts-records li', alternate.title).contains('button', '开始作答').click();
    });
    cy.contains('button', '开始听力', {timeout: 120000}).should('be.enabled');
    cy.get('audio').should('have.length', 1).then(elements => expect((elements[0] as HTMLAudioElement).paused, 'loading a new material does not autoplay').to.eq(true));
    cy.contains('button', '开始听力').click(); cy.contains('音频正在播放').should('be.visible');
    cy.get('audio').then(elements => expect((elements[0] as HTMLAudioElement).currentSrc).not.to.eq(originalSrc));
    cy.document().then(doc => expect([...doc.querySelectorAll('audio')].filter(media => !media.paused && !media.ended), 'at most one active audio element').to.have.length(1));
    cy.then(() => expect(events.filter(event => event.kind === 'play' && event.at >= switchAt && event.src === originalSrc), 'old recording never restarts after switching').to.have.length(0));
    cy.contains('button', /^暂停$/).click();
    cy.then(() => cy.writeFile('cypress/reports/ielts-real-paper-training.json', {materialId: paper.id, alternateId: paper.alternateId, originalAttempt, events, source: 'previously generated real audio; no new generation or TTS'}));
  });

  it('AC06 restores saved simulation answers after a real media error and refresh while keeping the result non-strict', {requestTimeout: 120000, responseTimeout: 120000, defaultCommandTimeout: 15000}, () => {
    let id: string, firstSrc: string;
    const mediaEvents: string[] = [];
    cy.then(() => cy.request('/api/ielts-listening/materials')).then(({body}) => {
      const material = body.data.find((m: {id: string}) => m.id === paper.id);
      cy.visit('/englishWorld/ielts-listening');cy.get('.ielts-setup-fields select').eq(1).select('simulation');cy.contains('.ielts-records li', material.title).contains('button', '开始作答').click();
    });
    cy.contains('button', '开始听力', {timeout: 120000}).should('be.enabled');
    cy.location('search').then(search => {id = new URLSearchParams(search).get('attempt')!;});
    cy.get('audio').then(elements => {const media = elements[0] as HTMLAudioElement;['play','error'].forEach(kind => media.addEventListener(kind, () => mediaEvents.push(kind)));});
    cy.contains('button', '开始听力').click();cy.contains('音频正在播放').should('be.visible');
    cy.then(() => cy.get('#ielts-answer-1').type(paper.expectedAnswers['1'], {parseSpecialCharSequences: false}));
    cy.contains('已保存', {timeout: 15000}).should('exist');
    cy.get('audio').then(elements => {const media = elements[0] as HTMLAudioElement;firstSrc = media.currentSrc; media.src = '/__acceptance_missing_recording__.mp3'; media.load();});
    cy.contains('音频播放中断，答案保留。可恢复播放，本次标记为中断。').should('be.visible');
    cy.contains('button', '继续播放（标记中断）').click();cy.contains('音频正在播放').should('be.visible');
    cy.get('audio').then(elements => expect((elements[0] as HTMLAudioElement).currentSrc).to.eq(firstSrc));
    cy.then(() => {expect(mediaEvents).to.include('error');expect(mediaEvents.filter(event => event === 'play').length).to.be.at.least(2);});
    cy.reload();
    cy.then(() => cy.get('#ielts-answer-1').should('have.value', paper.expectedAnswers['1']));
    cy.contains('已中断 · 可继续练习').should('be.visible');
    cy.contains('button', '继续播放（标记中断）').should('be.enabled').click();cy.contains('音频正在播放').should('be.visible');
    cy.contains('button', '检查并交卷').click();cy.contains('button', '确认交卷').click();cy.contains('已中断模拟，不计严格一次听成绩').should('be.visible');
    cy.then(() => cy.request(`/api/ielts-listening/attempts/${id}`)).then(({body}) => {expect(body.data.answers['1']).to.eq(paper.expectedAnswers['1']);expect(body.data.interrupted).to.eq(true);expect(body.data.result.total).to.eq(40);});
    cy.contains('button', /^回听$/).click();
    cy.contains('当前提供整段回听；尚无经核实的逐题时间定位。').scrollIntoView().should('be.visible');
  });

  it('AC03 completes a real spoken text-map paper with ten keyboard-entered labels and stable positions', {requestTimeout: 120000, responseTimeout: 120000, defaultCommandTimeout: 15000}, () => {
    let count: number, duration: number;
    const plays: string[] = [], ends: string[] = [];
    cy.then(() => cy.request('/api/ielts-listening/materials')).then(({body}) => {
      const material = body.data.find((m: {id: string}) => m.id === paper.textMapId);
      expect(material, 'real spoken map rendered as text-label positions').to.exist;
      expect(Object.keys(paper.expectedTextMapAnswers)).to.have.length(10);
      count = material.sections.reduce((n: number, section: {audioCount: number}) => n + section.audioCount, 0);
      duration = material.sections.reduce((n: number, section: {audioSeconds: number}) => n + section.audioSeconds, 0);
      cy.visit('/englishWorld/ielts-listening');cy.get('.ielts-setup-fields select').eq(1).select('training');cy.contains('.ielts-records li', material.title).contains('button', '开始作答').click();
    });
    cy.contains('button', '开始听力', {timeout: 120000}).should('be.enabled');
    cy.get('audio').then(elements => {const media = elements[0] as HTMLAudioElement;media.addEventListener('play', () => plays.push(media.currentSrc));media.addEventListener('ended', () => ends.push(media.currentSrc));});
    cy.contains('button', '开始听力').click();cy.contains('音频正在播放').should('be.visible');
    cy.get('.ielts-map-scroll svg circle').first().then(marker => {const x = marker.attr('cx'), y = marker.attr('cy');cy.contains('button', '放大地图').click();cy.viewport(1280, 800);cy.get('.ielts-map-scroll svg circle').first().should('have.attr','cx',x).and('have.attr','cy',y);cy.contains('button','复位').click();cy.viewport(1440,900);cy.get('.ielts-map-scroll svg circle').first().should('have.attr','cx',x).and('have.attr','cy',y);});
    cy.then(() => Object.entries(paper.expectedTextMapAnswers).forEach(([id, value]) => {
      cy.get(`#ielts-answer-${id}`).should('have.prop', 'tagName', 'INPUT').focus().type(value, {parseSpecialCharSequences:false}).should('have.value',value);
    }));
    cy.then(() => {
      cy.get('audio', {timeout: Math.ceil(duration * 1000) + 90000}).should(() => expect(ends, 'each real map segment naturally ends').to.have.length(count));
    });
    cy.then(() => {expect(plays).to.deep.eq(ends);expect(new Set(plays).size).to.eq(count);});
    cy.contains('button','检查并交卷').click();cy.contains('还有 0 题未答').should('be.visible');cy.contains('button','确认交卷').click();cy.contains('h2','本次结果 10 / 10').should('be.visible');
    cy.location('search').then(search => cy.request(`/api/ielts-listening/attempts/${new URLSearchParams(search).get('attempt')}`)).then(({body}) => {expect(body.data.answers).to.deep.eq(paper.expectedTextMapAnswers);expect(body.data.result.score).to.eq(10);});
    cy.contains('button', /^回听$/).click();
    cy.contains('当前提供整段回听；尚无经核实的逐题时间定位。').scrollIntoView().should('be.visible');
    cy.then(() => cy.writeFile('cypress/reports/ielts-real-text-map.json', {materialId: paper.textMapId, count, duration, plays, ends, source: 'real previously generated map recording with verified text-label view; no new supplier synthesis'}));
  });

  it('AC06 independently marks a saved simulation interrupted only after leaving for words and reopening it', {requestTimeout: 120000, responseTimeout: 120000, defaultCommandTimeout: 15000}, () => {
    let id: string;
    cy.then(() => cy.request('/api/ielts-listening/materials')).then(({body}) => {
      const material = body.data.find((m: {id: string}) => m.id === paper.id);
      cy.visit('/englishWorld/ielts-listening');cy.get('.ielts-setup-fields select').eq(1).select('simulation');cy.contains('.ielts-records li', material.title).contains('button', '开始作答').click();
    });
    cy.contains('button', '开始听力', {timeout: 120000}).should('be.enabled').click();cy.contains('音频正在播放').should('be.visible');
    cy.then(() => cy.get('#ielts-answer-1').type(paper.expectedAnswers['1'], {parseSpecialCharSequences: false}));
    cy.contains('已保存', {timeout: 15000}).should('exist');
    cy.location('search').then(search => {id = new URLSearchParams(search).get('attempt')!;return cy.request(`/api/ielts-listening/attempts/${id}`);}).then(({body}) => {
      expect(body.data.interrupted, 'this independent attempt was uninterrupted before leaving').to.eq(false);
      expect(body.data.answers['1']).to.eq(paper.expectedAnswers['1']);
    });
    cy.contains('[role="menuitem"]', '词库列表').click();cy.location('pathname').should('eq', '/englishWorld/words');
    cy.then(() => cy.visit(`/englishWorld/ielts-listening?attempt=${id}`));
    cy.then(() => cy.get('#ielts-answer-1').should('have.value', paper.expectedAnswers['1']));
    cy.contains('已中断 · 可继续练习').should('be.visible');
    cy.then(() => cy.request(`/api/ielts-listening/attempts/${id}`)).then(({body}) => {expect(body.data.interrupted).to.eq(true);expect(body.data.answers['1']).to.eq(paper.expectedAnswers['1']);});
    cy.contains('button', '继续播放（标记中断）', {timeout: 120000}).should('be.enabled').click();cy.contains('音频正在播放').should('be.visible');
    cy.contains('button', '检查并交卷').click();cy.contains('button', '确认交卷').click();cy.contains('已中断模拟，不计严格一次听成绩').should('be.visible');
  });

  it('plays every real segment once, checks for two real minutes and preserves the first /40 result', {requestTimeout: 120000, responseTimeout: 120000, defaultCommandTimeout: 15000}, () => {
    const events: AudioEvent[] = [];
    const audioRequests: number[] = [];
    let attemptId: string;
    let monitoring = true;
    let freezeObserved = false;
    let observer: MutationObserver;
    let startedAt = 0;
    let checkingAt = 0;
    let savedResult: unknown;
    const assertQuestionsOnly = (sections: any[]) => sections.forEach(section => {
      expect(section, 'pre-submit section has no transcript').not.to.have.property('transcript');
      section.groups.forEach((group: any) => group.questions.forEach((q: any) => {
        expect(q, 'pre-submit question has no score key').not.to.have.property('answers');
        expect(q, 'pre-submit question has no answer evidence').not.to.have.property('evidence');
        expect(q, 'pre-submit question has no explanation').not.to.have.property('explanation');
      }));
    });
    cy.intercept({ method: 'GET', url: '**/ielts-listening/**' }, request => {
      const audioMatch = request.url.match(/\/attempts\/[^/]+\/audio\/(\d+)(?:\?|$)/);
      if (audioMatch) {
        audioRequests.push(Number(audioMatch[1]));
        request.continue(response => {
          expect(response.statusCode, 'real audio HTTP').to.eq(200);
          expect(String(response.headers['content-type']), 'real MPEG transport').to.match(/audio\//);
        });
      } else request.continue(response => {
        if (!monitoring) return;
        const data = response.body?.data;
        if (Array.isArray(data)) data.forEach(item => { if (Array.isArray(item.sections)) assertQuestionsOnly(item.sections); });
        else if (data?.material?.sections) {
          expect(data.result, 'no first-result leak').to.be.null;
          assertQuestionsOnly(data.material.sections);
        } else if (Array.isArray(data?.sections)) assertQuestionsOnly(data.sections);
      });
    });
    cy.then(() => cy.request('/api/ielts-listening/materials')).then(({body}) => {
      const material = body.data.find((item: {id: string}) => item.id === paper.id);
      expect(material, 'seeded published original is accessible').to.exist;
      expect([...new Set(material.sections.flatMap((section:any)=>section.groups.map((group:any)=>group.kind)))].sort(), 'all seven listening answer forms in this one paper').to.deep.eq(['completion','map','matching','multiple','sentence','short','single'].sort());
      cy.visit('/englishWorld/ielts-listening');
      cy.get('.ielts-setup-fields select').eq(1).select('simulation');
      cy.contains('.ielts-records li', material.title).contains('button', '开始作答').click();
    });
    cy.contains('button', '开始听力', {timeout: 120000}).should('be.enabled');
    cy.location('search').then(search => { attemptId = new URLSearchParams(search).get('attempt')!; });
    cy.get('.ielts-number-list button').should('have.length', 40);
    cy.get('audio').should(elements => expect(elements).not.to.have.attr('controls')).then(elements => {
      const media = elements[0] as HTMLAudioElement;
      ['play', 'ended', 'pause', 'seeking', 'ratechange', 'error'].forEach(kind => {
        media.addEventListener(kind, () => {
          if (monitoring) events.push({kind, src: media.currentSrc || media.src, at: Date.now(), time: media.currentTime, rate: media.playbackRate});
        });
      });
      const doc = media.ownerDocument;
      observer = new MutationObserver(() => {
        if (!monitoring || events.filter(event => event.kind === 'ended').length !== paper.audioSegments) return;
        const inputs = [...doc.querySelectorAll<HTMLInputElement | HTMLSelectElement>('.ielts-answer-list input, .ielts-answer-list select')];
        if (inputs.length && inputs.every(input => input.disabled)) freezeObserved = true;
      });
      observer.observe(doc.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['disabled']});
    });
    cy.then(() => {startedAt = Date.now();});
    cy.contains('button', '开始听力').click();
    cy.contains('音频正在播放').should('be.visible');
    cy.contains('button', /^暂停$/).should('not.exist');
    cy.contains('button', /慢速|重听当前段|重播|倒带/).should('not.exist');
    cy.get('audio').should(elements => expect((elements[0] as HTMLAudioElement).playbackRate).to.eq(1));
    cy.then(() => {
      Object.entries(paper.expectedAnswers).sort(([a], [b]) => Number(a) - Number(b)).forEach(([id, value]) => {
        cy.get(`.ielts-number-list button[aria-label^="第${id}题 "]`).click();
        cy.get(`#ielts-answer-${id}`).then(elements => {
          if (elements[0].tagName === 'SELECT') cy.wrap(elements).select(value);
          else cy.wrap(elements).clear().type(value, {parseSpecialCharSequences: false});
        });
      });
    });
    // Moving across all four parts must not seek, restart or speed up the audio.
    cy.then(() => {
      expect(events.filter(event => event.kind === 'seeking')).to.have.length(0);
      expect(events.filter(event => event.rate !== 1)).to.have.length(0);
    });
    cy.then(() => {
      const playbackTimeout = Math.ceil(paper.durationSeconds * 1000) + 180000;
      cy.get('.ielts-session-status', {timeout: playbackTimeout}).should('contain', '检查时间').then(() => {checkingAt = Date.now();});
    });
    cy.then(() => {
      const plays = events.filter(event => event.kind === 'play');
      const ends = events.filter(event => event.kind === 'ended');
      expect(plays, 'one actual play event for every downloaded segment').to.have.length(paper.audioSegments);
      expect(ends, 'every real recording ended naturally').to.have.length(paper.audioSegments);
      expect(ends.reduce((sum, event) => sum + event.time, 0), 'full real media duration reached').to.be.at.least(paper.durationSeconds - 3);
      expect(new Set(plays.map(event => event.src)).size, 'no segment replay').to.eq(paper.audioSegments);
      expect(plays.map(event => event.src), 'play and ended order matches').to.deep.eq(ends.map(event => event.src));
      for (let i = 1; i < plays.length; i++) expect(plays[i].at, 'next segment starts after previous ends').to.be.at.least(ends[i - 1].at);
      expect(audioRequests.slice(0, paper.audioSegments), 'all real HTTP segments fetched in order').to.deep.eq(Array.from({length: paper.audioSegments}, (_, i) => i));
      expect(events.filter(event => ['seeking', 'error'].includes(event.kind)), 'no seeks or audio errors').to.have.length(0);
      expect(events.filter(event => event.kind === 'ratechange' && event.rate !== 1), 'normal speed throughout').to.have.length(0);
      const activePause = events.filter(event => event.kind === 'pause' && !ends.some(end => end.src === event.src && Math.abs(end.at - event.at) < 1000));
      expect(activePause, 'no mid-recording pause or overlapping restart').to.have.length(0);
      expect(checkingAt - startedAt, 'real elapsed playback, not synthetic ended events').to.be.at.least(paper.durationSeconds * 1000 - 3000);
      cy.get('.ielts-session-status').invoke('text').then(text => {
        const timer = text.match(/检查时间\s*(\d+):(\d{2})/)!;
        expect(timer, 'visible computer-test check countdown').not.to.be.null;
        const seconds = Number(timer[1]) * 60 + Number(timer[2]); expect(seconds).to.be.within(115, 120);
      });
    });
    // No cy.clock/cy.tick: allow the complete two-minute checking period to pass.
    cy.contains('h2', '本次结果 40 / 40', {timeout: 150000}).should('be.visible').then(() => {
      expect(Date.now() - checkingAt, 'real two-minute check window').to.be.at.least(115000);
      expect(freezeObserved, 'inputs freeze at the deadline before persistence').to.eq(true);
      monitoring = false; observer.disconnect();
    });
    cy.contains('一次播放模拟（按播放器记录）').should('be.visible');
    cy.contains('原创练习成绩，不是官方 Band。').should('be.visible');
    cy.get('.ielts-result-list li').should('have.length', 40);
    cy.contains('button', /^原文$/).click();
    cy.contains('h2', '听力原文').should('exist');
    cy.get('.ielts-transcript').should('have.length', 4).each(element => expect(element.text().trim().length).to.be.greaterThan(100));
    cy.then(() => cy.request(`/api/ielts-listening/attempts/${attemptId}`)).then(({body}) => {
      expect(body.data.answers).to.deep.eq(paper.expectedAnswers);
      expect(body.data.interrupted).to.eq(false);
      expect(body.data.assists).to.deep.eq({replays: 0, slow: false});
      savedResult = body.data.result;
      expect(body.data.result.total).to.eq(40); expect(body.data.result.score).to.eq(40);
    });
    cy.contains('button', /^回听$/).click();
    cy.contains('当前提供整段回听；尚无经核实的逐题时间定位。').scrollIntoView().should('be.visible');
    cy.contains('button', '回听第1段').should('be.enabled').click();
    cy.get('audio').should(elements => expect((elements[0] as HTMLAudioElement).currentTime, 'real result review starts playback').to.be.greaterThan(0.3));
    cy.contains('button', '停止播放').click();
    cy.get('audio').should(elements => expect((elements[0] as HTMLAudioElement).paused, 'review stop pauses audio').to.eq(true));
    cy.contains('button', '同题再练（保留本次成绩）').click();
    cy.contains('button', '开始听力', {timeout: 120000}).should('be.enabled');
    cy.location('search').then(search => expect(new URLSearchParams(search).get('attempt')).not.to.eq(attemptId));
    cy.then(() => cy.request(`/api/ielts-listening/attempts/${attemptId}`)).then(({body}) => expect(body.data.result).to.deep.eq(savedResult));
    cy.then(() => {
      cy.writeFile('cypress/reports/ielts-real-paper-playback.json', {
        source: 'cached replay of one freshly generated real DeepSeek/Doubao four-part paper',
        supplierRequestsInThisBrowserTest: 0, supplierGenerationEvidence: 'test-results/ielts-real/2026-10-29T02-28-49-346Z/result.json', durationSeconds: paper.durationSeconds, audioSegments: paper.audioSegments,
        materialId: paper.id, attemptId, startedAt, checkingAt, freezeObserved, audioRequests, events,
      });
    });
  });
});

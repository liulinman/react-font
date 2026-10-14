// Local-only native integration fixture. Never connects to production.
import http from 'node:http';

const user = { id: 900001, username: 'ios-fixture', avatar: '' };
const words = [{id: 1, englishWord: 'serendipity', englishChinese: '意外的美好', englishLevel: 0}, {id: 2, englishWord: 'wander', englishChinese: '漫步', englishLevel: 1}];
const article = {id:10,taskId:10,status:'succeeded',sourceType:'custom',words:['wander'],articleExerciseId:99,article:'A quiet morning\n\nMaya walks beside the river every morning.',questions:[{id:'q1',stem:'Where does Maya walk?',options:['By the river','In a forest'],questionType:'detail'}]};
const articleResult={id:55,attemptId:55,taskId:10,articleExerciseId:99,score:100,correctCount:1,wrongCount:0,weakWords:[],nextSuggestions:[],results:[{questionId:'q1',correct:true,correctIndex:0,userSelectedIndex:0,explanation:'The article says she walks beside the river.'}]};
const counters = { authenticatedChecks: 0, uploads: 0 };
const server = http.createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const authenticated = (request.headers.cookie ?? '').split(';').some(part => part.trim() === 'token=fixture-session');
  const send = (status, data, message = 'ok') => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ code: status === 401 ? 4001 : status, data, message }));
  };
  if (pathname === '/__test/status') return send(200, counters);
  if (pathname === '/api/user/login') {
    let input;
    try { input = JSON.parse(body.toString()); } catch { return send(400, null, 'invalid json'); }
    if (input.username !== user.username || input.password !== 'fixture-only') return send(401, null, 'invalid credentials');
    response.setHeader('Set-Cookie', 'token=fixture-session; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800');
    return send(200, { user });
  }
  if (pathname === '/api/user/logout') {
    response.setHeader('Set-Cookie', 'token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
    return send(200, null);
  }
  if (!authenticated) return send(401, null, '未登录，请先登录');
  if (pathname === '/api/user/getCurrentUser') {
    counters.authenticatedChecks++;
    return send(200, user);
  }
  if (pathname === '/api/english/findWordList') return send(404, null, 'Cannot GET /english/findWordList');
  if (pathname === '/api/english/filterWordList') return send(200, {list: words, total: 2, totalPages: 1});
  if (pathname === '/api/english/updateEnglishWordLevel') return send(200, {});
  if (pathname === '/api/context-lab/history') return send(200,{list:[article],total:1,page:1,pageSize:12});
  if (pathname === '/api/context-lab/detail') return send(200,article);
  if (pathname === '/api/context-lab/attempt-detail') return send(200,articleResult);
  if (pathname === '/api/context-lab/attempt-history') return send(200,{list:[articleResult],total:1,page:1,pageSize:20});
  if (pathname === '/api/context-lab/submit') {
    const input=JSON.parse(body.toString());
    if(input.sessionId!==99||input.answers?.[0]?.selectedIndex!==0) return send(400,null,'Wrong article submission');
    return send(200,articleResult);
  }
  if (pathname === '/api/recite/start') return send(200, {questions: words.map(w => ({wordId: w.id, question: w.englishChinese, direction: 0})), direction: 0, totalCount: 2});
  if (pathname === '/api/recite/submit') return send(200, {sessionId: 42, direction: 0, statistics: {totalCount: 2, correctCount: 0, errorCount: 2, accuracy: 0}, results: words.map(w => ({wordId: w.id, englishWord: w.englishWord, correctAnswer: w.englishWord, userAnswer: '', isCorrect: false}))});
  if (pathname === '/api/recite/stats') return send(200, { statistics: {totalCount: 24, correctCount: 20, errorCount: 4, accuracy: 83}, directionStats: {} });
  if (pathname === '/api/recite/history') return send(200, {list: [], total: 0, totalPages: 0, page: 1, pageSize: 10});
  if (pathname === '/api/notifications/unread-count') return send(200, { count: 0 });
  if (pathname === '/api/notifications') return send(200, { list: [], nextCursor: null });
  if (pathname === '/api/upload/file') {
    const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(request.headers['content-type'] ?? '');
    const boundary = match?.[1] ?? match?.[2];
    if (!boundary || !body.includes(`--${boundary}`) || !body.includes('fixture-image')) {
      return send(400, null, 'multipart boundary or bytes lost');
    }
    counters.uploads++;
    return send(200, '/api/upload/fixture.png');
  }
  return send(200, { list: [], total: 0 });
});

server.listen(4179, '127.0.0.1', () => console.log('iOS fixture listening on http://localhost:4179'));

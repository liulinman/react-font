import XCTest
import WebKit

/// Runs against scripts/ios-fixture-server.mjs, never a production account.
@MainActor
final class NativeSessionTests: XCTestCase {
    private func findWebView(_ view: UIView) -> WKWebView? {
        if let webView = view as? WKWebView { return webView }
        return view.subviews.compactMap { findWebView($0) }.first
    }

    private func readyWebView() async throws -> WKWebView {
        for _ in 0..<200 {
            let windows = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }.flatMap(\.windows)
            if let webView = windows.compactMap({ findWebView($0) }).first,
               let ready = try? await webView.evaluateJavaScript("document.readyState === 'complete' && !!window.Capacitor"),
               ready as? Bool == true {
                return webView
            }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        throw NSError(domain: "NativeSessionTests", code: 1, userInfo: [NSLocalizedDescriptionKey: "Native web view did not become ready"])
    }

    private let xhr = """
    const base = 'http://127.0.0.1:4179/api';
    const xhr = (path, body, method = 'POST') => new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open(method, base + path);
      request.withCredentials = true;
      if (body instanceof FormData) request.setRequestHeader('Content-Type', 'multipart/form-data');
      else request.setRequestHeader('Content-Type', 'application/json');
      request.onload = () => resolve({ status: request.status, body: JSON.parse(request.responseText), headers: request.getAllResponseHeaders(), cookie: request.getResponseHeader('set-cookie') });
      request.onerror = () => reject(new Error('Native request failed'));
      request.send(body instanceof FormData ? body : body ? JSON.stringify(body) : null);
    });
    """

    func test01NativeSessionAndMultipart() async throws {
        let webView = try await readyWebView()
        let script = xhr + """
        await xhr('/user/logout');
        const denied = await xhr('/user/getCurrentUser');
        const login = await xhr('/user/login', {username: 'ios-fixture', password: 'fixture-only'});
        const current = await xhr('/user/getCurrentUser');
        const count = await xhr('/notifications/unread-count', null, 'GET');
        const hidden = !document.cookie.includes('fixture-session');
        const raw = await window.Capacitor.nativePromise('CapacitorHttp', 'request', {
          url: base + '/user/login', method: 'POST', headers: {'Content-Type': 'application/json'},
          data: {username: 'ios-fixture', password: 'fixture-only'}
        });
        const nativeHeadersHidden = !Object.keys(raw.headers).some(name => name.toLowerCase().startsWith('set-cookie'));
        const form = new FormData();
        form.append('file', new File(['fixture-image'], 'word.png', {type: 'image/png'}));
        const upload = await xhr('/upload/file', form);
        await xhr('/user/logout');
        const signedOut = await xhr('/user/getCurrentUser');
        return JSON.stringify({
          native: window.Capacitor.getPlatform(),
          denied: denied.status, login: login.status, current: current.status,
          username: current.body.data?.username, count: count.status,
          hidden, nativeHeadersHidden, headersHidden: !login.headers.includes('fixture-session') && !login.cookie, upload: upload.status, signedOut: signedOut.status
        });
        """
        let result = try await webView.callAsyncJavaScript(script, arguments: [:], in: nil, contentWorld: .page)
        let data = try XCTUnwrap((result as? String)?.data(using: .utf8))
        let values = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(values["native"] as? String, "ios")
        XCTAssertEqual(values["denied"] as? Int, 401)
        for key in ["login", "current", "count", "upload"] { XCTAssertEqual(values[key] as? Int, 200, key) }
        XCTAssertEqual(values["username"] as? String, "ios-fixture")
        XCTAssertEqual(values["hidden"] as? Bool, true)
        XCTAssertEqual(values["headersHidden"] as? Bool, true)
        XCTAssertEqual(values["nativeHeadersHidden"] as? Bool, true)
        XCTAssertEqual(values["signedOut"] as? Int, 401)
    }

    func test02PersistentSessionForRelaunch() async throws {
        let webView = try await readyWebView()
        let result = try await webView.callAsyncJavaScript(xhr + """
        const response = await xhr('/user/login', {username: 'ios-fixture', password: 'fixture-only'});
        return response.status;
        """, arguments: [:], in: nil, contentWorld: .page)
        XCTAssertEqual(result as? Int, 200)
        let cookies = HTTPCookieStorage.shared.cookies(for: URL(string: "http://127.0.0.1:4179")!) ?? []
        let cookie = try XCTUnwrap(cookies.first { $0.name == "token" })
        XCTAssertTrue(cookie.isHTTPOnly)
        XCTAssertNotNil(cookie.expiresDate)
    }
    func test03MobileStudyUIAndNativeSpeech() async throws {
        let view = try await readyWebView()
        _ = try await view.evaluateJavaScript("Object.keys(localStorage).filter(k => k.startsWith('english-world:study:v1:900001:')).forEach(k => localStorage.removeItem(k)); window.location.href = '/mobile'; true")
        try await Task.sleep(nanoseconds: 1_000_000_000)
        let webView = try await readyWebView()
        let result = try await webView.callAsyncJavaScript("""
        const wait = async (fn) => { for(let i=0;i<150;i++){const result=fn();if(result)return result;await new Promise(r=>setTimeout(r,100));}throw Error('UI did not become ready'); };
        const click = async (text) => (await wait(()=>Array.from(document.querySelectorAll('button,a')).find(e=>e.textContent.trim()===text && !e.disabled))).click();
        await wait(()=>document.body.textContent.includes('让每个词'));
        await click('开始学习 ↗');
        await wait(()=>document.body.textContent.includes('选一组词'));
        await click('开始学习');
        await wait(()=>document.body.textContent.includes('serendipity'));
        await window.Capacitor.nativePromise('EnglishWorldSpeech','speak',{text:'wander'});
        await click('查看释义'); await click('记住了');
        await wait(()=>document.querySelector('.study-word-card h2')?.textContent==='wander');
        await click('查看释义'); await click('还不熟');
        await click('默写一下，检验记忆'); await click('开始复习');
        await wait(()=>document.body.textContent.includes('意外的美好'));
        await click('下一词'); await click('完成并查看结果');
        await wait(()=>document.body.textContent.includes('复习完成'));
        return document.body.textContent.includes('重练错词');
        """, arguments: [:], in: nil, contentWorld: .page)
        XCTAssertEqual(result as? Bool, true)
    }

    func test04ArticleReadingAndScoring() async throws {
        let view = try await readyWebView()
        _ = try await view.evaluateJavaScript("window.location.href = '/mobile/tools/context-lab'; true")
        try await Task.sleep(nanoseconds: 1_000_000_000)
        let webView = try await readyWebView()
        let result = try await webView.callAsyncJavaScript("""
        const wait = async (fn) => {for(let i=0;i<150;i++){const v=fn();if(v)return v;await new Promise(r=>setTimeout(r,100));}throw Error('Article UI not ready: '+document.body.textContent);};
        const click = async (text) => (await wait(()=>Array.from(document.querySelectorAll('button,a')).find(e=>e.textContent.trim()===text&&!e.disabled))).click();
        (await wait(()=>Array.from(document.querySelectorAll('a')).find(e=>e.textContent.includes('A quiet morning')))).click();
        await wait(()=>document.body.textContent.includes('Maya walks beside the river'));
        await click('开始答题 →');
        (await wait(()=>document.querySelector('input[type=radio]'))).click();
        await click('提交练习');
        await wait(()=>document.body.textContent.includes('The article says she walks beside the river.'));
        return document.body.textContent.includes('答对 1 题');
        """, arguments: [:], in: nil, contentWorld: .page)
        XCTAssertEqual(result as? Bool, true)
    }

}

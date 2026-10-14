import Capacitor
import AVFoundation

/// Preserve Capacitor's networking/cookie handling, but redact cookie response
/// headers before they cross the native bridge (header names are case-insensitive).
@objc(PrivateHttpPlugin)
final class PrivateHttpPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "PrivateHttpPlugin"
    let jsName = "CapacitorHttp"
    let pluginMethods: [CAPPluginMethod] = ["request", "get", "post", "put", "patch", "delete"].compactMap {
        CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise)
    }

    private func perform(_ call: CAPPluginCall, method: String? = nil) {
        let filteredCall = CAPPluginCall(
            callbackId: call.callbackId,
            methodName: call.methodName,
            options: call.options,
            success: { result, _ in
                var data = result?.data ?? [:]
                if let headers = data["headers"] as? [String: Any] {
                    data["headers"] = NativeResponseHeaders.publicHeaders(headers)
                }
                call.resolve(data)
            },
            error: { error in call.errorHandler(error) }
        )!
        do {
            try HttpRequestHandler.request(filteredCall, method, bridge?.config)
        } catch {
            call.reject("Network request failed", "NATIVE_HTTP_ERROR")
        }
    }

    @objc func request(_ call: CAPPluginCall) { perform(call) }
    @objc func get(_ call: CAPPluginCall) { perform(call, method: "GET") }
    @objc func post(_ call: CAPPluginCall) { perform(call, method: "POST") }
    @objc func put(_ call: CAPPluginCall) { perform(call, method: "PUT") }
    @objc func patch(_ call: CAPPluginCall) { perform(call, method: "PATCH") }
    @objc func delete(_ call: CAPPluginCall) { perform(call, method: "DELETE") }
}

@objc(EnglishWorldViewController)
final class EnglishWorldViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PrivateHttpPlugin())
        bridge?.registerPluginInstance(EnglishWorldSpeechPlugin())
    }
}

/// On-device pronunciation works without a third-party dictionary connection.
@objc(EnglishWorldSpeechPlugin)
final class EnglishWorldSpeechPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    let identifier = "EnglishWorldSpeechPlugin"
    let jsName = "EnglishWorldSpeech"
    let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise)].compactMap { $0 }
    private let synthesizer = AVSpeechSynthesizer()

    @objc func speak(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, text.count <= 4000 else {
            call.reject("Invalid pronunciation text")
            return
        }
        DispatchQueue.main.async { [self] in
            do {
                synthesizer.stopSpeaking(at: .immediate)
                try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
                try AVAudioSession.sharedInstance().setActive(true)
                synthesizer.delegate = self
                let utterance = AVSpeechUtterance(string: text)
                utterance.voice = AVSpeechSynthesisVoice(language: "en-GB")
                utterance.rate = 0.45
                synthesizer.speak(utterance)
                call.resolve()
            } catch { call.reject("Pronunciation unavailable") }
        }
    }
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    }
}

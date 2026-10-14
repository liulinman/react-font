import Foundation

enum NativeResponseHeaders {
    static func publicHeaders(_ headers: [String: Any]) -> [String: Any] {
        headers.filter { !["set-cookie", "set-cookie2"].contains($0.key.lowercased()) }
    }
}

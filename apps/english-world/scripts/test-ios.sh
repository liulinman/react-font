#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

simulator_id="${IOS_SIMULATOR_ID:-$(xcrun simctl list devices available -j | python3 -c 'import json,sys; ds=[d for group in json.load(sys.stdin)["devices"].values() for d in group if d.get("isAvailable")]; print(next((d["udid"] for d in ds if d["state"]=="Booted"), ds[0]["udid"] if ds else ""))')}"
if [ -z "$simulator_id" ]; then
  echo "Install an iOS Simulator runtime in Xcode > Settings > Components first."
  exit 1
fi

repo_root="$(cd ../.. && pwd)"
mkdir -p "$repo_root/.ios-build"
fixture_log="$repo_root/.ios-build/fixture.log"
plist_backup="$(mktemp)"
cp ios/App/App/Info.plist "$plist_backup"
fixture_pid=""
cleanup() {
  exit_status=$?
  trap - EXIT
  if [ -n "$fixture_pid" ]; then kill "$fixture_pid" 2>/dev/null || true; fi
  cp "$plist_backup" ios/App/App/Info.plist
  rm -f "$plist_backup"
  # Always restore bundled assets to the real server, even after test failure.
  if ! pnpm ios:sync > "$repo_root/.ios-build/restore-production.log" 2>&1; then
    echo "Production bundle restore failed. Run pnpm ios:sync before installing."
    exit_status=1
  fi
  exit "$exit_status"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

node scripts/ios-fixture-server.mjs > "$fixture_log" 2>&1 &
fixture_pid=$!
for attempt in {1..20}; do
  kill -0 "$fixture_pid" 2>/dev/null || { cat "$fixture_log"; exit 1; }
  if curl -fsS http://127.0.0.1:4179/__test/status >/dev/null; then break; fi
  sleep 0.2
done

python3 - <<'PY'
from pathlib import Path
import plistlib
p = Path('ios/App/App/Info.plist')
v = plistlib.loads(p.read_bytes())
v['NSAppTransportSecurity']['NSExceptionDomains']['127.0.0.1'] = {'NSExceptionAllowsInsecureHTTPLoads': True}
p.write_bytes(plistlib.dumps(v, sort_keys=False))
PY
VITE_API_BASE_URL=http://127.0.0.1:4179/api pnpm build:ios
pnpm exec cap sync ios
xcrun simctl boot "$simulator_id" 2>/dev/null || true
xcrun simctl bootstatus "$simulator_id" -b
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination "platform=iOS Simulator,id=$simulator_id" \
  -derivedDataPath "$repo_root/.ios-build/tests" \
  -parallel-testing-enabled NO -only-testing:NativeTests CODE_SIGNING_ALLOWED=NO test

# Verify the actual app can restore its session after termination and relaunch.
before="$(curl -fsS http://127.0.0.1:4179/__test/status | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["authenticatedChecks"])')"
xcrun simctl terminate "$simulator_id" com.liulin.englishworld 2>/dev/null || true
xcrun simctl launch "$simulator_id" com.liulin.englishworld
restored=false
for attempt in {1..50}; do
  after="$(curl -fsS http://127.0.0.1:4179/__test/status | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["authenticatedChecks"])')"
  if [ "$after" -gt "$before" ]; then restored=true; break; fi
  sleep 0.2
done
if [ "$restored" != true ]; then echo "FAIL: session was not restored after relaunch"; exit 1; fi
xcrun simctl io "$simulator_id" screenshot "$repo_root/.ios-build/native-fixture-home.png"
echo "PASS: native session, HttpOnly, multipart, logout and relaunch."

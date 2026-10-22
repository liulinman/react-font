import { afterEach, expect, it, vi } from "vitest";
vi.mock("./api", () => ({ audioFetch: vi.fn() }));
import { audioFetch } from "./api";
import { playListeningAudio, stopListeningAudio } from "./audio";
afterEach(() => {
  stopListeningAudio();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("new audio stops old playback, records playing only when actual event fires", async () => {
  const instances: Array<
    EventTarget & {
      pause: ReturnType<typeof vi.fn>;
      play: ReturnType<typeof vi.fn>;
    }
  > = [];
  class FakeAudio extends EventTarget {
    pause = vi.fn();
    load = vi.fn();
    removeAttribute = vi.fn();
    play = vi.fn().mockResolvedValue(undefined);
    constructor() {
      super();
      instances.push(this);
    }
  }
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn().mockReturnValue("blob:test"),
      revokeObjectURL: vi.fn(),
    }),
  );
  vi.mocked(audioFetch).mockResolvedValue(new Blob(["audio"]));
  const played = vi.fn();
  await playListeningAudio("/one", { onPlaying: played });
  expect(played).not.toHaveBeenCalled();
  instances[0].dispatchEvent(new Event("playing"));
  expect(played).toHaveBeenCalledTimes(1);
  await playListeningAudio("/two");
  expect(instances[0].pause).toHaveBeenCalled();
});
it("late response after leaving cannot start playing", async () => {
  let resolve!: (blob: Blob) => void;
  vi.mocked(audioFetch).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const audio = vi.fn();
  vi.stubGlobal("Audio", audio);
  const pending = playListeningAudio("/one");
  stopListeningAudio();
  resolve(new Blob(["audio"]));
  await pending;
  expect(audio).not.toHaveBeenCalled();
});
it("reports DOM media errors after play() already resolved and stops failed audio", async () => {
  let instance!: EventTarget;
  class FakeAudio extends EventTarget {
    pause = vi.fn();
    load = vi.fn();
    removeAttribute = vi.fn();
    play = vi.fn().mockResolvedValue(undefined);
    constructor() {
      super();
      instance = this;
    }
  }
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn().mockReturnValue("blob:test"),
      revokeObjectURL: vi.fn(),
    }),
  );
  vi.mocked(audioFetch).mockResolvedValue(new Blob(["sound"]));
  const onError = vi.fn();
  await playListeningAudio("/sound", { onError });
  instance.dispatchEvent(new Event("error"));
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ message: "音频播放失败，请重试" }),
  );
});
it("rejects a decodable silent response before playing or recording a played event", async () => {
  class SilentContext {
    decodeAudioData = vi.fn().mockResolvedValue({
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(240),
    });
  }
  vi.stubGlobal("OfflineAudioContext", SilentContext);
  const audio = vi.fn();
  vi.stubGlobal("Audio", audio);
  vi.mocked(audioFetch).mockResolvedValue({arrayBuffer: async () => new ArrayBuffer(8)} as Blob);
  const played = vi.fn();
  await expect(playListeningAudio("/silent", {onPlaying: played})).rejects.toThrow("音频没有可听内容");
  expect(audio).not.toHaveBeenCalled();
  expect(played).not.toHaveBeenCalled();
});

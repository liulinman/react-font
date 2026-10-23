import { audioFetch } from "./api";
let current: HTMLAudioElement | null = null;
let controller: AbortController | null = null;
let url = "";
let generation = 0;
export type PlaybackState = "loading" | "playing" | "idle";
let stateListener: ((state: PlaybackState) => void) | undefined;
export function stopListeningAudio() {
  generation++;
  const notify = stateListener;
  stateListener = undefined;
  notify?.("idle");
  controller?.abort();
  controller = null;
  if (current) {
    current.pause();
    current.removeAttribute("src");
    current.load();
    current = null;
  }
  if (url) {
    URL.revokeObjectURL(url);
    url = "";
  }
}
if (typeof window !== "undefined")
  window.addEventListener("pagehide", stopListeningAudio);
async function verifyAudibleAudio(blob: Blob) {
  // Offline decoding does not request an audio device or change playback speed.
  if (typeof OfflineAudioContext === "undefined" || typeof blob.arrayBuffer !== "function") return;
  let decoded: AudioBuffer;
  try {
    decoded = await new OfflineAudioContext(1, 1, 24000).decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new Error("音频无法解码，请重试");
  }
  for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
    const samples = decoded.getChannelData(channel);
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) > 0.00001) return;
    }
  }
  throw new Error("音频没有可听内容，请重试");
}
export async function playListeningAudio(
  path: string,
  options: {
    body?: unknown;
    slow?: boolean;
    onPlaying?: () => void | Promise<void>;
    onError?: (error: Error) => void;
    onStateChange?: (state: PlaybackState) => void;
  } = {},
) {
  stopListeningAudio();
  const token = generation;
  stateListener = options.onStateChange;
  stateListener?.("loading");
  try {
  controller = new AbortController();
  const blob = await audioFetch(path, options.body, controller.signal);
  if (token !== generation) return;
  await verifyAudibleAudio(blob);
  if (token !== generation) return;
  url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  current = audio;
  audio.playbackRate = options.slow ? 0.8 : 1;
  audio.preservesPitch = true;
  audio.addEventListener("waiting", () => { if (token === generation) stateListener?.("loading"); });
  audio.addEventListener("playing", () => { if (token === generation) stateListener?.("playing"); });
  audio.addEventListener(
    "playing",
    () => {
      if (token === generation) void options.onPlaying?.();
    },
    { once: true },
  );
  audio.addEventListener(
    "ended",
    () => {
      if (token === generation) stopListeningAudio();
    },
    { once: true },
  );
  audio.addEventListener(
    "error",
    () => {
      if (token !== generation) return;
      const error = new Error("音频播放失败，请重试");
      stopListeningAudio();
      options.onError?.(error);
    },
    { once: true },
  );
  await audio.play();
  } catch (error) {
    if (token === generation) stopListeningAudio();
    throw error;
  }
}

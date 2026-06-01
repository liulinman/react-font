type DictionaryPhonetic = {
  text?: string;
  audio?: string;
};

type DictionaryEntry = {
  phonetics?: DictionaryPhonetic[];
};

const audioCache = new Map<string, string | null>();

export function normalizeAudioUrl(audioUrl?: string) {
  if (!audioUrl) return "";
  return audioUrl.startsWith("//") ? `https:${audioUrl}` : audioUrl;
}

function isBritishAudioUrl(audioUrl: string) {
  const normalized = audioUrl.toLowerCase();

  return (
    normalized.includes("-uk.") ||
    normalized.includes("-uk_") ||
    normalized.includes("_gb_") ||
    normalized.includes("-gb.") ||
    normalized.includes("-gb_") ||
    normalized.includes("british")
  );
}

export function selectBritishAudioUrl(phonetics: DictionaryPhonetic[]) {
  const britishAudio = phonetics
    .map((phonetic) => normalizeAudioUrl(phonetic.audio))
    .find((audioUrl) => audioUrl && isBritishAudioUrl(audioUrl));

  return britishAudio || null;
}

export async function getBritishAudioUrl(word: string) {
  const normalizedWord = word.trim().toLowerCase();
  if (!normalizedWord) return null;

  const cached = audioCache.get(normalizedWord);
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
        normalizedWord,
      )}`,
    );

    if (!response.ok) {
      audioCache.set(normalizedWord, null);
      return null;
    }

    const entries = (await response.json()) as DictionaryEntry[];
    const audioUrl = selectBritishAudioUrl(
      entries.flatMap((entry) => entry.phonetics || []),
    );

    audioCache.set(normalizedWord, audioUrl);
    return audioUrl;
  } catch {
    return null;
  }
}

function speakBritish(word: string) {
  if (!window.speechSynthesis) {
    throw new Error("当前浏览器不支持发音");
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-GB";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

export async function playBritishPronunciation(word: string) {
  const normalizedWord = word.trim();
  if (!normalizedWord) return;

  const audioUrl = await getBritishAudioUrl(normalizedWord);

  if (audioUrl) {
    try {
      await new Audio(audioUrl).play();
      return;
    } catch {
      // 音频可能被浏览器或网络拦截，继续使用 TTS 兜底。
    }
  }

  speakBritish(normalizedWord);
}

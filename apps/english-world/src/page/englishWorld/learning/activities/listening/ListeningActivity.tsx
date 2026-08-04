import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import type { ListeningPublicItemV1 } from "../../contracts/activity-contract";
import type {
  HintType,
  LearningAnswerDraft,
} from "../shared/answerDraft";

type Accent = "british" | "american";

const ACCENT_LABEL: Record<Accent, string> = {
  british: "英式",
  american: "美式",
};

export interface ListeningActivityProps {
  item: ListeningPublicItemV1;
  draft: LearningAnswerDraft;
  submitting?: boolean;
  hints?: readonly HintType[];
  onDraftChange(draft: LearningAnswerDraft): void;
  onRevealHint(hint: HintType): void;
  onSubmit(draft: LearningAnswerDraft): void;
}

export function ListeningActivity({
  item,
  draft,
  submitting = false,
  hints = [],
  onDraftChange,
  onRevealHint,
  onSubmit,
}: ListeningActivityProps) {
  const availableAccents = useMemo(
    () =>
      ([
        item.audio.britishUrl
          ? (["british", item.audio.britishUrl] as const)
          : null,
        item.audio.americanUrl
          ? (["american", item.audio.americanUrl] as const)
          : null,
      ].filter(Boolean) as Array<readonly [Accent, string]>),
    [item.audio.americanUrl, item.audio.britishUrl],
  );
  const [selectedAccent, setSelectedAccent] = useState<Accent>(
    availableAccents[0]?.[0] ?? "british",
  );
  const [failedAccents, setFailedAccents] = useState<Set<Accent>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [pendingPlaybackRate, setPendingPlaybackRate] = useState<number | null>(
    null,
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const composingRef = useRef(false);
  const failedAccentsRef = useRef<Set<Accent>>(new Set());
  const unavailableSubmittedRef = useRef(false);

  const selectedUrl = availableAccents.find(
    ([accent]) => accent === selectedAccent,
  )?.[1];

  useEffect(() => {
    setSelectedAccent(availableAccents[0]?.[0] ?? "british");
    failedAccentsRef.current = new Set();
    setFailedAccents(new Set());
    setIsPlaying(false);
    setPendingPlaybackRate(null);
    unavailableSubmittedRef.current = false;
  }, [item.itemUid, item.audio.americanUrl, item.audio.britishUrl]);

  useEffect(() => {
    if (availableAccents.length > 0 || unavailableSubmittedRef.current) return;
    unavailableSubmittedRef.current = true;
    onSubmit({ kind: "skip", reason: "audio_unavailable" });
  }, [availableAccents.length, onSubmit]);

  const recordAudioFailure = useCallback(
    (accent: Accent) => {
      setIsPlaying(false);
      const next = new Set(failedAccentsRef.current);
      if (next.has(accent)) return;
      next.add(accent);
      failedAccentsRef.current = next;
      setFailedAccents(next);
      const fallback = availableAccents.find(
        ([candidate]) => candidate !== accent && !next.has(candidate),
      );
      if (fallback) {
        setSelectedAccent(fallback[0]);
      } else if (
        availableAccents.length > 0 &&
        availableAccents.every(([candidate]) => next.has(candidate)) &&
        !unavailableSubmittedRef.current
      ) {
        unavailableSubmittedRef.current = true;
        onSubmit({ kind: "skip", reason: "audio_unavailable" });
      }
    },
    [availableAccents, onSubmit],
  );

  const playAudio = useCallback(
    (rate: number) => {
      const audio = audioRef.current;
      if (!audio || !selectedUrl || submitting) return;
      audio.playbackRate = rate;
      void audio.play().catch(() => recordAudioFailure(selectedAccent));
    },
    [recordAudioFailure, selectedAccent, selectedUrl, submitting],
  );

  useEffect(() => {
    if (pendingPlaybackRate === null) return;
    const rate = pendingPlaybackRate;
    setPendingPlaybackRate(null);
    const audio = audioRef.current;
    if (!audio || !selectedUrl || submitting) return;
    audio.load();
    audio.playbackRate = rate;
    void audio.play().catch(() => recordAudioFailure(selectedAccent));
  }, [
    pendingPlaybackRate,
    recordAudioFailure,
    selectedAccent,
    selectedUrl,
    submitting,
  ]);

  const retryAccent = (accent: Accent) => {
    if (submitting) return;
    const next = new Set(failedAccentsRef.current);
    next.delete(accent);
    failedAccentsRef.current = next;
    setFailedAccents(next);
    setSelectedAccent(accent);
    setPendingPlaybackRate(1);
  };

  const submitCurrentDraft = () => {
    if (submitting) return;
    if (draft.kind === "spelling" && draft.text.trim().length === 0) return;
    if (draft.kind === "choice" && draft.selectedValue.length === 0) return;
    onSubmit(draft);
  };

  const handleSpellingKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    if (composingRef.current || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submitCurrentDraft();
  };

  const handleSpellingChange = (event: ChangeEvent<HTMLInputElement>) => {
    onDraftChange({ kind: "spelling", text: event.target.value });
  };

  const selectedLabel = ACCENT_LABEL[selectedAccent];
  const canSubmit =
    !submitting &&
    ((draft.kind === "spelling" && draft.text.trim().length > 0) ||
      (draft.kind === "choice" && draft.selectedValue.length > 0));

  return (
    <section aria-label="听力练习" className="listening-activity">
      {selectedUrl ? (
        <audio
          ref={audioRef}
          src={selectedUrl}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => recordAudioFailure(selectedAccent)}
        />
      ) : null}

      <div aria-label="发音播放控制">
        <button
          type="button"
          disabled={
            !selectedUrl || failedAccents.has(selectedAccent) || submitting
          }
          aria-pressed={isPlaying}
          onClick={() => playAudio(1)}
        >
          播放{selectedLabel}发音
        </button>
        <button
          type="button"
          disabled={
            !selectedUrl || failedAccents.has(selectedAccent) || submitting
          }
          onClick={() => {
            onRevealHint("replay_slow");
            playAudio(0.8);
          }}
        >
          0.8 倍慢速重播
        </button>
        {availableAccents
          .filter(
            ([accent]) =>
              accent !== selectedAccent && !failedAccents.has(accent),
          )
          .map(([accent]) => (
            <button
              key={accent}
              type="button"
              disabled={submitting}
              onClick={() => {
                setSelectedAccent(accent);
                setIsPlaying(false);
              }}
            >
              切换到{ACCENT_LABEL[accent]}发音
            </button>
          ))}
        {[...failedAccents].map((accent) => (
          <button
            key={`retry-${accent}`}
            type="button"
            disabled={submitting}
            onClick={() => retryAccent(accent)}
          >
            重试{ACCENT_LABEL[accent]}发音
          </button>
        ))}
      </div>
      <p role="status" aria-live="polite">
        {availableAccents.length === 0 ||
        availableAccents.every(([accent]) => failedAccents.has(accent))
          ? "音频暂不可用，请重试"
          : isPlaying
            ? `正在播放${selectedLabel}发音`
            : `${selectedLabel}发音已暂停`}
      </p>

      {item.itemType === "listening_meaning" ? (
        <fieldset disabled={submitting}>
          <legend>选择听到单词的含义</legend>
          {(item.meaningChoices ?? []).map((choice) => (
            <label key={choice.value}>
              <input
                type="radio"
                name={`meaning-${item.itemUid}`}
                value={choice.value}
                checked={
                  draft.kind === "choice" &&
                  draft.selectedValue === choice.value
                }
                onChange={() =>
                  onDraftChange({
                    kind: "choice",
                    selectedValue: choice.value,
                  })
                }
              />
              {choice.label}
            </label>
          ))}
        </fieldset>
      ) : (
        <label>
          输入听到的单词
          <input
            type="text"
            value={draft.kind === "spelling" ? draft.text : ""}
            disabled={submitting}
            autoComplete="off"
            spellCheck={false}
            onChange={handleSpellingChange}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
            onKeyDown={handleSpellingKeyDown}
          />
        </label>
      )}

      {item.itemType === "listening_spelling" ? (
        <button
          type="button"
          disabled={submitting || hints.includes("show_spelling")}
          onClick={() => onRevealHint("show_spelling")}
        >
          查看拼写提示
        </button>
      ) : null}
      <button type="button" disabled={!canSubmit} onClick={submitCurrentDraft}>
        提交答案
      </button>
      <button
        type="button"
        disabled={submitting}
        onClick={() => onSubmit({ kind: "skip", reason: "dont_know" })}
      >
        暂时不会
      </button>
    </section>
  );
}

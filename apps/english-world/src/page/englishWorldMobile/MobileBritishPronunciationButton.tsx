import { requestUid } from "@/aiListening/api";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { Button, Toast } from "antd-mobile";
import { SoundOutline } from "antd-mobile-icons";
import { playBritishPronunciation } from "@/page/englishWorld/utils/pronunciation";

type MobileBritishPronunciationButtonProps = {
  ariaLabel?: string;
  word?: string;
  wordId?: number;
};

export function MobileBritishPronunciationButton({
  ariaLabel = "播放单词发音",
  word,
  wordId,
}: MobileBritishPronunciationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [word, wordId]);

  const handlePlay = async (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!word?.trim()) {
      Toast.show({ icon: "fail", content: "暂无可播放的单词" });
      return;
    }

    setLoading(true);
    try {
      await playBritishPronunciation(word, wordId, {
        ...(failed ? { retryUid: requestUid() } : {}),
        onError: () => setFailed(true),
      });
      setFailed(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFailed(true);
      Toast.show({ icon: "fail", content: "发音播放失败，请点击重试发音" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      aria-label={failed ? "重试发音" : ariaLabel}
      className="mobile-pronunciation-button"
      fill="none"
      loading={loading}
      onClick={handlePlay}
      size="small"
    >
      {failed ? "重试发音" : <SoundOutline />}
    </Button>
  );
}

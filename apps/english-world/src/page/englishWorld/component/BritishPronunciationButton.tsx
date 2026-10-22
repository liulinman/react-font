import { requestUid } from "@/aiListening/api";
import { Button, Tooltip, message } from "antd";
import { SoundOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { playBritishPronunciation } from "../utils/pronunciation";

type BritishPronunciationButtonProps = {
  ariaLabel?: string;
  title?: string;
  word?: string;
  wordId?: number;
  size?: "small" | "middle" | "large";
};

export function BritishPronunciationButton({
  ariaLabel = "播放单词发音",
  title = "播放单词发音",
  word,
  wordId,
  size = "small",
}: BritishPronunciationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [word, wordId]);

  const handlePlay = async (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!word?.trim()) {
      message.warning("暂无可播放的单词");
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
      message.error("发音播放失败，请点击重试发音");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title={title}>
      <Button
        aria-label={failed ? "重试发音" : ariaLabel}
        className="british-pronunciation-button"
        icon={<SoundOutlined />}
        loading={loading}
        onClick={handlePlay}
        shape={failed ? "default" : "circle"}
        size={size}
        type="text"
      >
        {failed ? "重试发音" : null}
      </Button>
    </Tooltip>
  );
}

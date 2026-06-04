import { Button, Tooltip, message } from "antd";
import { SoundOutlined } from "@ant-design/icons";
import { useState } from "react";
import type { MouseEvent } from "react";
import { playBritishPronunciation } from "../utils/pronunciation";

type BritishPronunciationButtonProps = {
  ariaLabel?: string;
  title?: string;
  word?: string;
  size?: "small" | "middle" | "large";
};

export function BritishPronunciationButton({
  ariaLabel = "播放英式发音",
  title = "播放英式发音",
  word,
  size = "small",
}: BritishPronunciationButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePlay = async (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!word?.trim()) {
      message.warning("暂无可播放的单词");
      return;
    }

    setLoading(true);
    try {
      await playBritishPronunciation(word);
    } catch (error) {
      console.error("播放英式发音失败:", error);
      message.error("发音播放失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title={title}>
      <Button
        aria-label={ariaLabel}
        className="british-pronunciation-button"
        icon={<SoundOutlined />}
        loading={loading}
        onClick={handlePlay}
        shape="circle"
        size={size}
        type="text"
      />
    </Tooltip>
  );
}

import { Button, Tooltip, message } from "antd";
import { SoundOutlined } from "@ant-design/icons";
import { useState } from "react";
import type { MouseEvent } from "react";
import { playBritishPronunciation } from "../utils/pronunciation";

type BritishPronunciationButtonProps = {
  word?: string;
  size?: "small" | "middle" | "large";
};

export function BritishPronunciationButton({
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
    <Tooltip title="播放英式发音">
      <Button
        aria-label="播放英式发音"
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

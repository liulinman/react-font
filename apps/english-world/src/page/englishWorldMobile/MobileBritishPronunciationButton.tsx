import { useState } from "react";
import type { MouseEvent } from "react";
import { Button, Toast } from "antd-mobile";
import { SoundOutline } from "antd-mobile-icons";
import { playBritishPronunciation } from "@/page/englishWorld/utils/pronunciation";

type MobileBritishPronunciationButtonProps = {
  word?: string;
};

export function MobileBritishPronunciationButton({
  word,
}: MobileBritishPronunciationButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePlay = async (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!word?.trim()) {
      Toast.show({ icon: "fail", content: "暂无可播放的单词" });
      return;
    }

    setLoading(true);
    try {
      await playBritishPronunciation(word);
    } catch (error) {
      console.error("播放英式发音失败:", error);
      Toast.show({ icon: "fail", content: "发音播放失败" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      aria-label="播放英式发音"
      className="mobile-pronunciation-button"
      fill="none"
      loading={loading}
      onClick={handlePlay}
      size="small"
    >
      <SoundOutline />
    </Button>
  );
}

import { useContext } from "react";
import { Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { MobileActivityLockContext } from "../../englishWorldMobile/offline/MobileActivityLockContext";

export function ApplicationUpdateCard() {
  const activity = useContext(MobileActivityLockContext);
  return (
    <section aria-label="应用更新" className="settings-card settings-card-row">
      <div>
        <h2><ReloadOutlined aria-hidden /> 应用更新</h2>
        <p>
          {activity?.locked
            ? "请先完成当前学习操作，再检查更新。"
            : "在新页面检查并确认更新，学习记录和离线资料会保留。"}
        </p>
      </div>
      <Button
        href={activity?.locked ? undefined : "/docs/app-update.html"}
        target="_blank"
        rel="noopener noreferrer"
        disabled={activity?.locked}
      >
        检查更新
      </Button>
    </section>
  );
}

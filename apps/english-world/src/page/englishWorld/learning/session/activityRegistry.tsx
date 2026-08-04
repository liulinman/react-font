import type { ComponentType } from "react";
import type { ListeningActivityProps } from "../activities/listening/ListeningActivity";
import { ListeningActivity } from "../activities/listening/ListeningActivity";
import type { LearningMode } from "../contracts/activity-contract";

export type ActivityRenderer = ComponentType<ListeningActivityProps>;

function UnsupportedActivity() {
  return (
    <section aria-label="暂不支持的学习活动" role="status">
      此学习模式即将开放，当前会话无法进入该活动。
    </section>
  );
}

export const activityRegistry: Record<LearningMode, ActivityRenderer> = {
  listening: ListeningActivity,
  root_family: UnsupportedActivity,
  micro_scene: UnsupportedActivity,
  confusion: UnsupportedActivity,
  output: UnsupportedActivity,
};

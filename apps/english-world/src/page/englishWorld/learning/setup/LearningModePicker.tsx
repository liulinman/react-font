import type { LearningMode } from "../contracts/activity-contract";
import type { LearningModeCapabilityV1 } from "../contracts/learning-session";

export const MODE_ORDER: LearningMode[] = [
  "root_family",
  "micro_scene",
  "confusion",
  "listening",
  "output",
];

const MODE_LABELS: Record<LearningMode, string> = {
  root_family: "词根词族",
  micro_scene: "微场景",
  confusion: "易混辨析",
  listening: "听音记忆",
  output: "主动输出",
};

export interface LearningModePickerProps {
  capabilities: LearningModeCapabilityV1[];
  selectedModes: LearningMode[];
  onChange(modes: LearningMode[]): void;
}

function visibleCapabilityReason(reason?: string) {
  const normalizedReason = reason?.trim();
  if (
    !normalizedReason ||
    normalizedReason === "即将开放" ||
    normalizedReason.startsWith("LEARNING_MODE_")
  ) {
    return undefined;
  }
  return normalizedReason;
}

export function LearningModePicker({
  capabilities,
  selectedModes,
  onChange,
}: LearningModePickerProps) {
  const capabilityByMode = new Map(
    capabilities.map((capability) => [capability.mode, capability]),
  );

  const toggleMode = (mode: LearningMode, checked: boolean) => {
    const nextModes = checked
      ? MODE_ORDER.filter(
          (candidate) => candidate === mode || selectedModes.includes(candidate),
        )
      : selectedModes.filter((candidate) => candidate !== mode);
    onChange(nextModes);
  };

  return (
    <fieldset className="learning-mode-picker">
      <legend>选择记忆模式（可多选）</legend>
      <div className="learning-mode-grid">
        {MODE_ORDER.map((mode) => {
          const capability = capabilityByMode.get(mode) ?? {
            mode,
            status: "coming_soon" as const,
          };
          const enabled = capability.status === "enabled";
          const visibleReason = visibleCapabilityReason(capability.reason);
          return (
            <label
              className={`learning-mode-card${
                enabled ? " learning-mode-card-enabled" : " learning-mode-card-disabled"
              }`}
              key={mode}
            >
              <span className="learning-mode-card-heading">
                <input
                  aria-label={MODE_LABELS[mode]}
                  type="checkbox"
                  checked={selectedModes.includes(mode)}
                  disabled={!enabled}
                  onChange={(event) => toggleMode(mode, event.target.checked)}
                />
                <strong>{MODE_LABELS[mode]}</strong>
              </span>
              <span className="learning-mode-status">
                {enabled ? "可用" : "即将开放"}
              </span>
              {!enabled && visibleReason ? (
                <span className="learning-mode-reason">{visibleReason}</span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

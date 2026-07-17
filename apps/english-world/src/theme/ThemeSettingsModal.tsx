import { Modal, Radio, Segmented } from "antd";
import {
  useTheme,
  type ThemeAccent,
  type ThemeAppearance,
} from "./ThemeContext";

type ThemeSettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

const appearanceOptions: Array<{
  label: string;
  value: ThemeAppearance;
}> = [
  { label: "浅色", value: "light" },
  { label: "深色", value: "dark" },
  { label: "跟随系统", value: "system" },
];

const accentOptions: Array<{
  label: string;
  value: ThemeAccent;
  color: string;
}> = [
  { label: "蓝色", value: "blue", color: "#2563eb" },
  { label: "绿色", value: "green", color: "#16a34a" },
  { label: "紫色", value: "purple", color: "#7c3aed" },
];

export function ThemeSettingsModal({
  open,
  onClose,
}: ThemeSettingsModalProps) {
  const { appearance, accent, setAppearance, setAccent } = useTheme();

  return (
    <Modal
      open={open}
      title="主题设置"
      footer={null}
      width={440}
      onCancel={onClose}
      destroyOnHidden
    >
      <div className="theme-settings-section">
        <strong>外观</strong>
        <Segmented
          block
          value={appearance}
          options={appearanceOptions}
          onChange={(value) => setAppearance(value as ThemeAppearance)}
        />
      </div>

      <div className="theme-settings-section">
        <strong>主题色</strong>
        <Radio.Group
          className="theme-accent-options"
          value={accent}
          onChange={(event) => setAccent(event.target.value as ThemeAccent)}
        >
          {accentOptions.map((option) => (
            <Radio.Button key={option.value} value={option.value}>
              <span
                className="theme-accent-swatch"
                style={{ background: option.color }}
                aria-hidden="true"
              />
              {option.label}
            </Radio.Button>
          ))}
        </Radio.Group>
      </div>
    </Modal>
  );
}

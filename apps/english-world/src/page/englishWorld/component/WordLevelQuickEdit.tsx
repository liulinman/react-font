import React from "react";
import { Dropdown, type MenuProps } from "antd";
import {
  CheckOutlined,
  DownOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { getLevelLabel } from "../utils/wordLabels";

const WORD_LEVEL_VALUES = [0, 1, 2, 3] as const;

type WordLevelQuickEditProps = {
  word: string;
  value?: number;
  loading?: boolean;
  disabled?: boolean;
  onChange: (level: number) => void;
};

export const WordLevelQuickEdit: React.FC<WordLevelQuickEditProps> = ({
  word,
  value,
  loading = false,
  disabled = false,
  onChange,
}) => {
  const currentLevel = value ?? 0;
  const currentInfo = getLevelLabel(currentLevel);
  const items: MenuProps["items"] = WORD_LEVEL_VALUES.map((level) => {
    const info = getLevelLabel(level);
    return {
      key: String(level),
      icon:
        currentLevel === level ? (
          <CheckOutlined />
        ) : (
          <span aria-hidden="true" className="word-level-menu-spacer" />
        ),
      label: info.label,
    };
  });

  return (
    <Dropdown
      disabled={disabled || loading}
      menu={{
        items,
        onClick: ({ key }) => onChange(Number(key)),
      }}
      trigger={["click"]}
    >
      <button
        aria-label={`修改 ${word} 的掌握程度，当前${currentInfo.label}`}
        className="word-level-quick-edit"
        disabled={disabled || loading}
        type="button"
        onClick={(event) => event.stopPropagation()}
      >
        <span
          aria-hidden="true"
          className={`word-level-status-dot word-level-status-dot-${currentInfo.color}`}
        />
        <span>{currentInfo.label}</span>
        {loading ? (
          <LoadingOutlined aria-hidden="true" />
        ) : (
          <DownOutlined aria-hidden="true" />
        )}
      </button>
    </Dropdown>
  );
};

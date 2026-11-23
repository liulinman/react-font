import { useEffect, useState } from "react";
import { Alert, Avatar, Select, Space, Spin } from "antd";
import request from "@font/api";
import { adminListUsers } from "./api/notification";

type Option = { value: number; label: string; avatar?: string | null };
export function RecipientSelect({
  value,
  onChange,
  id,
  disabledIds = [],
  disabled = false,
  placement = "bottomLeft",
  placeholder = "搜索用户名，可选择多位用户",
}: {
  value?: number[];
  onChange?: (value: number[]) => void;
  id?: string;
  disabledIds?: number[];
  disabled?: boolean;
  placement?: "topLeft" | "bottomLeft";
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const result = await request(
          adminListUsers({ page: 1, pageSize: 50, search, status: "active" }),
        );
        if (active)
          setOptions(
            result.list.map((user) => ({
              value: user.id,
              label: user.displayName || user.username,
              avatar: user.avatar,
            })),
          );
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search]);
  const merged = [
    ...new Map(
      [...selected, ...options].map((option) => [option.value, option]),
    ).values(),
  ];
  return (
    <>
      <Select
        id={id}
        aria-label="接收用户"
        placement={placement}
        mode="multiple"
        showSearch
        allowClear
        disabled={disabled}
        style={{ width: "100%" }}
        value={value}
        options={merged.map((option) => ({
          ...option,
          disabled: disabledIds.includes(option.value),
        }))}
        optionRender={({ data }) => (
          <Space size={8}>
            <Avatar src={data.avatar} size={24} aria-hidden="true">
              {Array.from(data.label)[0]?.toUpperCase()}
            </Avatar>
            <span>{data.label}</span>
            {data.disabled && <span>已接收</span>}
          </Space>
        )}
        filterOption={false}
        onSearch={setSearch}
        placeholder={placeholder}
        loading={loading}
        notFoundContent={
          loading ? <Spin size="small" /> : "没有匹配用户，请更换关键词"
        }
        onChange={(ids: number[]) => {
          setSelected(merged.filter((option) => ids.includes(option.value)));
          onChange?.(ids);
        }}
      />
      {error && (
        <Alert
          type="error"
          showIcon
          message="用户加载失败，请重新输入关键词重试"
        />
      )}
    </>
  );
}

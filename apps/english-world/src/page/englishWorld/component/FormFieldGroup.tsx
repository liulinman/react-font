import { Button, Col, Row } from "antd";
import type { ReactNode } from "react";
import { useState } from "react";

type FormFieldGroupProps = {
  /**
   * 需要展示的表单项集合
   */
  items: { key: React.Key; node: ReactNode }[];
  /**
   * 每行展示几个（默认 4 个，对应 span=6）
   */
  columnsPerRow?: number;
  /**
   * 折叠状态下展示的行数
   */
  collapsedRows?: number;
  /**
   * Row 间距
   */
  gutter?: number;
  /**
   * 是否默认展开
   */
  defaultExpanded?: boolean;
  /**
   * 自定义操作区域（如查询按钮等）
   */
  renderActions?: (options: {
    expanded: boolean;
    toggle: () => void;
    shouldShowToggle: boolean;
  }) => ReactNode;
  className?: string;
  gridClassName?: string;
  actionsClassName?: string;
};

export const FormFieldGroup = ({
  items,
  columnsPerRow = 4,
  collapsedRows = 1,
  gutter = 16,
  defaultExpanded = false,
  renderActions,
  className,
  gridClassName,
  actionsClassName,
}: FormFieldGroupProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const colSpan = Math.floor(24 / columnsPerRow);
  const collapsedCount = columnsPerRow * collapsedRows;
  const shouldShowToggle = items.length > collapsedCount;
  const visibleItems = expanded ? items : items.slice(0, collapsedCount);
  const toggle = () => setExpanded((prev) => !prev);

  return (
    <div className={className}>
      <Row className={gridClassName} gutter={gutter}>
        {visibleItems.map((item) => (
          <Col span={colSpan} key={item.key}>
            {item.node}
          </Col>
        ))}
      </Row>
      <div
        className={actionsClassName}
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 8,
        }}
      >
        {renderActions?.({ expanded, toggle, shouldShowToggle })}
        {!renderActions && shouldShowToggle && (
          <Button type="link" onClick={toggle}>
            {expanded ? "收起筛选" : "展开更多"}
          </Button>
        )}
      </div>
    </div>
  );
};

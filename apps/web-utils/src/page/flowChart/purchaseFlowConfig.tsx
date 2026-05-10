import { FlowNodeConfig, FlowEdgeConfig } from "@/components/FlowChart/FlowChart";

export const purchaseNodes: FlowNodeConfig[] = [
  // 采购订单
  {
    id: "1",
    label: "采购订单",
    position: { x: 20, y: 40 },
    nodeType: "purchase",
    route: "/purchase/order",
  },

  // 分组框 - 采购入库（上方虚线框）
  {
    id: "group-1",
    label: "",
    position: { x: 240, y: 10 },
    isGroup: true,
    groupStyle: {
      width: 260,
      height: 170,
    },
  },

  // 采购入库单
  {
    id: "2",
    label: "采购入库单",
    position: { x: 280, y: 30 },
    nodeType: "purchase",
    route: "/purchase/warehouse",
  },

  // 采购退货单
  {
    id: "3",
    label: "采购退货单",
    position: { x: 280, y: 120 },
    nodeType: "purchase",
    route: "/purchase/return",
  },

  // 库存查询
  {
    id: "4",
    label: "库存查询",
    position: { x: 600, y: 30 },
    nodeType: "inventory",
    route: "/inventory/query",
  },

  // 供应商结算
  {
    id: "5",
    label: "供应商结算",
    position: { x: 600, y: 120 },
    nodeType: "supplier",
    route: "/supplier/settlement",
  },

  // 供应商对账
  {
    id: "6",
    label: "供应商对账",
    position: { x: 780, y: 120 },
    nodeType: "supplier",
    route: "/supplier/reconciliation",
  },

  // 分组框 - 统计模块（下方虚线框）
  {
    id: "group-2",
    label: "",
    position: { x: 240, y: 220 },
    isGroup: true,
    groupStyle: {
      width: 330,
      height: 100,
    },
  },

  // 采购明细统计
  {
    id: "7",
    label: "采购明细统计",
    position: { x: 260, y: 250 },
    nodeType: "stats",
  },

  // 采购汇总统计
  {
    id: "8",
    label: "采购汇总统计",
    position: { x: 410, y: 250 },
    nodeType: "stats",
  },
];

export const purchaseEdges: FlowEdgeConfig[] = [
  // 采购订单 -> 采购入库单
  {
    id: "e1-2",
    source: "1",
    target: "2",
    label: "支持分批入库",
    type: "smoothstep",
    color: "#1677ff",
  },

  // 采购入库单 -> 库存查询（虚线）
  {
    id: "e2-4",
    source: "2",
    target: "4",
    type: "smoothstep",
    color: "#52c41a",
    dashed: true,
  },

  // 采购退货单 -> 供应商结算（虚线）
  {
    id: "e3-5",
    source: "3",
    target: "5",
    type: "smoothstep",
    color: "#52c41a",
    dashed: true,
  },

  // 供应商结算 -> 供应商对账
  {
    id: "e5-6",
    source: "5",
    target: "6",
    type: "smoothstep",
    color: "#52c41a",
  },

  // 采购退货单 -> 采购明细统计（虚线）
  {
    id: "e3-7",
    source: "3",
    target: "7",
    type: "smoothstep",
    color: "#1677ff",
    dashed: true,
  },

  // 采购退货单 -> 采购汇总统计（虚线）
  {
    id: "e3-8",
    source: "3",
    target: "8",
    type: "smoothstep",
    color: "#1677ff",
    dashed: true,
  },
];

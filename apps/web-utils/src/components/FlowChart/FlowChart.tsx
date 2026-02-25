import { CSSProperties } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { useNavigate } from "react-router-dom";
import "./FlowChart.css";

export type NodeType =
  | "purchase"
  | "inventory"
  | "supplier"
  | "stats"
  | "default";

export interface FlowNodeConfig {
  id: string;
  label: string;
  position: { x: number; y: number };
  nodeType?: NodeType;
  route?: string;
  isGroup?: boolean;
  groupStyle?: CSSProperties;
  parentNode?: string;
}

export interface FlowEdgeConfig {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: "default" | "smoothstep" | "step" | "straight";
  animated?: boolean;
  dashed?: boolean;
  color?: string;
  strokeWidth?: number;
}

export interface FlowChartProps {
  nodes: FlowNodeConfig[];
  edges: FlowEdgeConfig[];
  height?: string | number;
  showMiniMap?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
}

export const FlowChart = ({
  nodes: nodeConfigs,
  edges: edgeConfigs,
  height = "600px",
  showMiniMap = true,
  showControls = true,
  showBackground = true,
}: FlowChartProps) => {
  const navigate = useNavigate();

  // 转换为 ReactFlow 节点
  const reactFlowNodes: Node[] = nodeConfigs
    .filter((n) => !n.isGroup)
    .map((n) => ({
      id: n.id,
      position: n.position,
      data: { label: n.label },
      style: {
        background:
          n.nodeType === "purchase"
            ? "#e6f4ff"
            : n.nodeType === "inventory" || n.nodeType === "supplier"
            ? "#f6ffed"
            : "#e6f4ff",
        border: `1px solid ${
          n.nodeType === "purchase"
            ? "#91caff"
            : n.nodeType === "inventory" || n.nodeType === "supplier"
            ? "#95de64"
            : "#91caff"
        }`,
        borderRadius: "4px",
        padding: "8px 16px",
        color:
          n.nodeType === "purchase"
            ? "#1677ff"
            : n.nodeType === "inventory" || n.nodeType === "supplier"
            ? "#52c41a"
            : "#1677ff",
        fontWeight: 400,
        fontSize: "13px",
        minWidth: "100px",
        textAlign: "center",
        cursor: n.route ? "pointer" : "default",
      },
    }));

  // 分组框节点
  const groupNodes: Node[] = nodeConfigs
    .filter((n) => n.isGroup)
    .map((n) => ({
      id: n.id,
      position: n.position,
      data: { label: "" },
      style: {
        width: n.groupStyle?.width || 200,
        height: n.groupStyle?.height || 200,
        border: "1px dashed #d9d9d9",
        borderRadius: "4px",
        backgroundColor: "transparent",
        zIndex: -1,
      },
      draggable: false,
      selectable: false,
    }));

  // 转换为 ReactFlow 边
  const reactFlowEdges: Edge[] = edgeConfigs.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: e.type || "default",
    animated: e.animated || false,
    style: {
      stroke: e.color || "#1677ff",
      strokeWidth: 1,
      strokeDasharray: e.dashed ? "4,4" : undefined,
    },
    labelStyle: {
      fill: "#595959",
      fontSize: 12,
      fontWeight: 400,
    },
    labelBgStyle: {
      fill: "#ffffff",
      fillOpacity: 0.8,
    },
    labelBgPadding: [4, 4] as [number, number],
    labelBgBorderRadius: 2,
  }));

  const [nodes, , onNodesChange] = useNodesState([
    ...groupNodes,
    ...reactFlowNodes,
  ]);
  const [edges, , onEdgesChange] = useEdgesState(reactFlowEdges);

  const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
    const nodeConfig = nodeConfigs.find((n) => n.id === node.id);
    if (nodeConfig?.route) {
      navigate(nodeConfig.route);
    }
  };

  return (
    <div style={{ width: "100%", height, background: "#fff" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.5}
        maxZoom={2}
      >
        {showBackground && <Background color="#fafafa" gap={16} size={0.5} />}
        {showControls && <Controls />}
        {showMiniMap && (
          <MiniMap
            nodeColor={(node) => {
              const nodeConfig = nodeConfigs.find((n) => n.id === node.id);
              if (nodeConfig?.nodeType === "purchase") return "#e6f4ff";
              if (
                nodeConfig?.nodeType === "inventory" ||
                nodeConfig?.nodeType === "supplier"
              )
                return "#f6ffed";
              return "#fff";
            }}
          />
        )}
      </ReactFlow>
    </div>
  );
};

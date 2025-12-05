import ReactFlow, { Node, Edge } from "reactflow";
import "reactflow/dist/style.css";

const nodes: Node[] = [
  {
    id: "1",
    position: { x: 0, y: 0 },
    data: { label: "节点1" },
  },
  {
    id: "2",
    position: { x: 200, y: 0 },
    data: { label: "节点2" },
  },
];

const edges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
  },
];

export const SimpleTest = () => {
  return (
    <div style={{ width: "100%", height: "500px" }}>
      <ReactFlow nodes={nodes} edges={edges} />
    </div>
  );
};

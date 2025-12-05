import { FlowChart } from "@/components";
import { purchaseNodes, purchaseEdges } from "./purchaseFlowConfig";

export const PurchaseFlowPage = () => {
  return (
    <div>
      <h1 style={{ padding: "16px" }}>采购全流程</h1>
      <FlowChart
        nodes={purchaseNodes}
        edges={purchaseEdges}
        height="600px"
        showMiniMap
        showControls
        showBackground
      />
    </div>
  );
};

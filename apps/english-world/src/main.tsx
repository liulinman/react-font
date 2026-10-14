import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "antd-mobile/es/global";
import "./index.css";
import App from "./App";
import "./theme/workbench.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

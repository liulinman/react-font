import { createBrowserRouter } from "react-router-dom";
import Home from "../page/home/home";
import TransferSlash from "../page/transferSlash/transferSlash";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/transferSlash",
    element: <TransferSlash />,
  },
]);

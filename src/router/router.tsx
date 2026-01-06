import { createBrowserRouter } from "react-router-dom";
import Home from "@/page/home/home";
import TransferSlash from "@/page/transferSlash/transferSlash";
import UserList from "@/page/user/userList/userList";
import UserAdd from "@/page/user/userAdd/userAdd";
import EnglishWorld from "@/page/englishWorld/EnglishWorld";
import AuthIdMap from "@/page/authIdMap/AuthIdMap";
import { PurchaseFlowPage } from "@/page/flowChart/FlowChart";
import { SimpleTest } from "@/page/SimpleTest/SimpleTest";
import EnglishWorldMobile from "@/page/englishWorldMobile/EnglishWorldMobile";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/transferSlash",
    element: <TransferSlash />,
  },

  {
    path: "/userList",
    element: <UserList />,
  },
  {
    path: "/userAdd",
    element: <UserAdd />,
  },
  {
    path: "/englishWorld",
    element: <EnglishWorld />,
  },
  {
    path: "/authIdMap",
    element: <AuthIdMap />,
  },
  {
    path: "/purchaseFlowChart",
    element: <PurchaseFlowPage />,
  },

  {
    path: "/test-flow",
    element: <SimpleTest />,
  },
  {
    path: "/englishWorldMobile",
    element: <EnglishWorldMobile />,
  },
]);

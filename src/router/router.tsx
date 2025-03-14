/*
 * @Author: yifeng 2108546503@qq.com
 * @Date: 2025-03-06 10:02:03
 * @LastEditors: yifeng 2108546503@qq.com
 * @LastEditTime: 2025-03-14 14:09:49
 * @FilePath: \font\src\router\router.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createBrowserRouter } from "react-router-dom";
import Home from "../page/home/home";
import TransferSlash from "../page/transferSlash/transferSlash";
import UserList from "../page/user/userList/userList";
import UserAdd from "../page/user/userAdd/userAdd";

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
]);

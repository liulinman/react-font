/*
 * @Author: yifeng 2108546503@qq.com
 * @Date: 2025-03-14 13:57:29
 * @LastEditors: yifeng 2108546503@qq.com
 * @LastEditTime: 2025-03-14 14:17:35
 * @FilePath: \font\src\server\user\user.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export const userFindList = () => {
  return {
    url: "/user/getUsers",
    method: "GET",
  };
};

export const userAdd = (data: any) => {
  return {
    url: "/user/createUser",
    method: "POST",
    data,
  };
};

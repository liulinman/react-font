export const userFindList = () => {
  return {
    url: "/user/getUsers",
    method: "GET",
  };
};

export const userAdd = (data: Record<string, unknown>) => {
  return {
    url: "/user/createUser",
    method: "POST",
    data,
  };
};

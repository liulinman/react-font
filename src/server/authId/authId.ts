export const userFindList = () => {
  return {
    url: "/auth-id-map",
    method: "GET",
  };
};

export const userCreate = (data: any) => {
  return {
    url: "/auth-id-map/createCookie",
    data,
    method: "POST",
  };
};

export const findModel = (data: any) => {
  return {
    url: "/auth-id-map/findModel",
    data,
    method: "POST",
  };
};

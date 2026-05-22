export type AuthIdPayload = Record<string, unknown>;

export const userFindList = () => {
  return {
    url: "/auth-id-map",
    method: "GET",
  };
};

export const userCreate = (data: AuthIdPayload) => {
  return {
    url: "/auth-id-map/createCookie",
    data,
    method: "POST",
  };
};

export const findModel = (data: AuthIdPayload) => {
  return {
    url: "/auth-id-map/findModel",
    data,
    method: "POST",
  };
};

export const getAuthIdOption = () => {
  return {
    url: "/auth-id-map/modelSearch",
    method: "GET",
  };
};

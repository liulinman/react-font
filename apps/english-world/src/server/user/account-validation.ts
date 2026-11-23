export const validPassword = (value: string) =>
  [...value].length >= 8 && [...value].length <= 64;
export const readableError = (error: unknown) =>
  error &&
  typeof error === "object" &&
  "message" in error &&
  typeof error.message === "string"
    ? error.message
    : "暂时无法完成，请稍后重试";

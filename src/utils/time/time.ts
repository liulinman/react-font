import dayjs from "dayjs"; // 引入 dayjs
import utc from "dayjs/plugin/utc"; // 引入 utc 插件

dayjs.extend(utc); // 使用 utc 插件

export const convertToFormat = (time: string, type?: "start" | "end") => {
  // 首先，将输入的时间解析为 dayjs 对象
  const dayjsTime = dayjs(time);

  // 根据 type 参数决定返回的时间
  if (type === "start") {
    return dayjsTime.startOf("day").format("YYYY-MM-DD HH:mm:ss"); // 返回当天的 00:00:00
  } else if (type === "end") {
    return dayjsTime.endOf("day").format("YYYY-MM-DD HH:mm:ss"); // 返回当天的 23:59:59
  }

  // 默认返回解析的时间的 UTC 格式
  return dayjsTime.format("YYYY-MM-DD HH:mm:ss");
};

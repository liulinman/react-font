import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

/**
 * @description: 国际时间转换方法，转换成当地时间
 * @param {string} time
 * @param {"start" | "end"} type 一天开始或者结束
 * @return string
 */
export const convertToFormat = (time: string, type?: "start" | "end") => {
  const dayjsTime = dayjs(time);

  if (type === "start") {
    return dayjsTime.startOf("day").format("YYYY-MM-DD HH:mm:ss");
  } else if (type === "end") {
    return dayjsTime.endOf("day").format("YYYY-MM-DD HH:mm:ss");
  }

  return dayjsTime.format("YYYY-MM-DD HH:mm:ss");
};

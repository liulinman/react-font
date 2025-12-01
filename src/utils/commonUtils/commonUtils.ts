/**
 * 将枚举转换为 Select 组件的 options
 * @param enumObj 枚举对象
 * @param OmitKey 需要过滤掉的val
 */
export const enumToOptions = (
  enumObj: Record<string, string | number>,
  omitValue?: Array<string | number>
) => {
  return Object.entries(enumObj)
    .map(([key, value]) => {
      // 过滤掉数字类型的key
      if (!Number.isNaN(Number(key)) || omitValue?.includes(value)) {
        return undefined;
      }
      return {
        label: key,
        value: value,
      };
    })
    .filter(Boolean) as { label: string; value: string | number }[];
};

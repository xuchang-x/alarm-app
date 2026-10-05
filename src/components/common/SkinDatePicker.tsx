import { Platform } from "react-native";
import DateTimePicker, {
  type AndroidNativeProps,
} from "@react-native-community/datetimepicker";
import { NATIVE_DIALOG_LABELS, getCurrentSkinTheme } from "@/constants";
import { dateToUtcMidnight } from "@/utils/date";

/**
 * 原生日期弹窗统一封装。
 *
 * 皮肤逻辑（Material 主题、固定中文文案、跟随当前皮肤主题）集中在这里，
 * 业务模块不要直接使用 DateTimePicker，避免各处配置漂移导致样式不一致。
 *
 * Android 时区修正：Material DatePicker 的 selection 按「UTC 零点」解读，
 * 而业务侧传入的是本地零点 Date（东八区下会被当成前一天），导致弹窗回显
 * 与「不改日期直接确认」的回传都偏早一天。这里在 date 模式下把 value 转成
 * 同一天的 UTC 零点，对齐 native 端的解读方式（RNMaterialDatePicker 收到
 * 的回传会按 UTC 拆年月日后拼回本地时区）。
 */
type SkinDatePickerProps = Omit<
  AndroidNativeProps,
  | "design"
  | "themeVariant"
  | "title"
  | "positiveButton"
  | "negativeButton"
  | "neutralButton"
>;

function toNativeValue(value: Date, mode: AndroidNativeProps["mode"]): Date {
  if (Platform.OS === "android" && mode === "date") {
    return dateToUtcMidnight(value);
  }
  return value;
}

export default function SkinDatePicker(props: SkinDatePickerProps) {
  const labels = NATIVE_DIALOG_LABELS.datePicker;
  const { mode, value } = props;

  return (
    <DateTimePicker
      {...props}
      design="material"
      themeVariant={getCurrentSkinTheme()}
      title={labels.title}
      positiveButton={{ label: labels.confirm }}
      negativeButton={{ label: labels.cancel }}
      value={toNativeValue(value, mode)}
    />
  );
}

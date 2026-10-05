import DateTimePicker, {
  type AndroidNativeProps,
} from '@react-native-community/datetimepicker';
import { NATIVE_DIALOG_LABELS, getCurrentSkinTheme } from '@/constants';

/**
 * 原生日期弹窗统一封装。
 *
 * 皮肤逻辑（Material 主题、固定中文文案、跟随当前皮肤主题）集中在这里，
 * 业务模块不要直接使用 DateTimePicker，避免各处配置漂移导致样式不一致。
 */
type SkinDatePickerProps = Omit<
  AndroidNativeProps,
  'design' | 'themeVariant' | 'title' | 'positiveButton' | 'negativeButton' | 'neutralButton'
>;

export default function SkinDatePicker(props: SkinDatePickerProps) {
  const labels = NATIVE_DIALOG_LABELS.datePicker;

  return (
    <DateTimePicker
      {...props}
      design="material"
      themeVariant={getCurrentSkinTheme()}
      title={labels.title}
      positiveButton={{ label: labels.confirm }}
      negativeButton={{ label: labels.cancel }}
    />
  );
}

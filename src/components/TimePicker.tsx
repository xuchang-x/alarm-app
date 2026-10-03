import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '@/constants';
import { formatTime } from '@/utils/date';

interface TimePickerProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

interface WheelColumnProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  accessibilityLabel: string;
}

const ITEM_HEIGHT = 48;
const WHEEL_HEIGHT = ITEM_HEIGHT * 3;
const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

function to12Hour(hour: number): { hourIndex: number; periodIndex: number } {
  return {
    hourIndex: (hour % 12 || 12) - 1,
    periodIndex: hour >= 12 ? 1 : 0,
  };
}

function to24Hour(hourIndex: number, periodIndex: number): number {
  const hour = hourIndex + 1;
  if (periodIndex === 0) return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function WheelColumn({
  items,
  selectedIndex,
  onChange,
  accessibilityLabel,
}: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  const handleScrollEnd = (offsetY: number) => {
    const nextIndex = Math.max(
      0,
      Math.min(items.length - 1, Math.round(offsetY / ITEM_HEIGHT))
    );
    onChange(nextIndex);
  };

  return (
    <View style={styles.wheelColumn} accessible accessibilityLabel={accessibilityLabel}>
      <ScrollView
        ref={scrollRef}
        style={styles.wheelScroll}
        contentContainerStyle={styles.wheelContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => handleScrollEnd(event.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(event) => handleScrollEnd(event.nativeEvent.contentOffset.y)}
      >
        {items.map((item, index) => {
          const selected = index === selectedIndex;
          return (
            <Pressable
              key={`${item}-${index}`}
              style={styles.wheelItem}
              onPress={() => {
                onChange(index);
                scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
              }}
            >
              <Text style={[styles.wheelItemText, selected && styles.wheelItemTextSelected]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TimePicker({ hour, minute, onChange }: TimePickerProps) {
  const [show, setShow] = useState(false);
  const [draftHour, setDraftHour] = useState(0);
  const [draftMinute, setDraftMinute] = useState(0);
  const [draftPeriod, setDraftPeriod] = useState(0);

  const openPicker = () => {
    const time = to12Hour(hour);
    setDraftHour(time.hourIndex);
    setDraftMinute(minute);
    setDraftPeriod(time.periodIndex);
    setShow(true);
  };

  const confirmPicker = () => {
    onChange(to24Hour(draftHour, draftPeriod), draftMinute);
    setShow(false);
  };

  return (
    <View>
      <Pressable
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel="选择提醒时间"
      >
        <Text style={styles.timeLabel}>提醒时间</Text>
        <Text style={styles.timeText}>{formatTime(hour, minute)}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Modal
        visible={show}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShow(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setShow(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>TIME</Text>
                <Text style={styles.modalTitle}>选择提醒时间</Text>
              </View>
              <View style={styles.previewPill}>
                <Text style={styles.previewText}>
                  {formatTime(to24Hour(draftHour, draftPeriod), draftMinute)}
                </Text>
              </View>
            </View>

            <View style={styles.wheelArea}>
              <View style={styles.selectionBand} pointerEvents="none" />
              <WheelColumn items={HOURS} selectedIndex={draftHour} onChange={setDraftHour} accessibilityLabel="小时" />
              <Text style={styles.colon}>:</Text>
              <WheelColumn items={MINUTES} selectedIndex={draftMinute} onChange={setDraftMinute} accessibilityLabel="分钟" />
              <WheelColumn items={PERIODS} selectedIndex={draftPeriod} onChange={setDraftPeriod} accessibilityLabel="上午或下午" />
            </View>

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setShow(false)}>
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={confirmPicker}>
                <Text style={styles.confirmText}>确认时间</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.card,
  },
  triggerPressed: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  timeLabel: { flex: 1, color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  timeText: { color: COLORS.primary, fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  chevron: { marginLeft: 10, color: COLORS.textMuted, fontSize: 25 },
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(37, 34, 58, 0.38)' },
  modalCard: { width: '100%', maxWidth: 390, paddingTop: 22, borderRadius: 26, backgroundColor: COLORS.card, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 26, elevation: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  modalEyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  modalTitle: { marginTop: 5, color: COLORS.textPrimary, fontSize: 19, fontWeight: '800' },
  previewPill: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.primarySoft },
  previewText: { color: COLORS.primaryDark, fontSize: 13, fontWeight: '800' },
  wheelArea: { position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: WHEEL_HEIGHT, marginTop: 18, paddingHorizontal: 16 },
  selectionBand: { position: 'absolute', top: ITEM_HEIGHT, right: 16, left: 16, height: ITEM_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.primary, borderRadius: 12, backgroundColor: COLORS.primarySoft },
  wheelColumn: { flex: 1, height: WHEEL_HEIGHT, overflow: 'hidden' },
  wheelScroll: { flex: 1 },
  wheelContent: { paddingVertical: ITEM_HEIGHT },
  wheelItem: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  wheelItemText: { color: COLORS.textMuted, fontSize: 20, fontWeight: '500' },
  wheelItemTextSelected: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  colon: { zIndex: 1, marginHorizontal: 2, color: COLORS.primary, fontSize: 22, fontWeight: '800' },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 18, borderTopWidth: 1, borderTopColor: COLORS.border },
  cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 14, backgroundColor: COLORS.input },
  cancelText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  confirmButton: { flex: 1.35, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 14, backgroundColor: COLORS.primary },
  confirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants';

type ViewNavigationLinkProps = {
  label: string;
  description?: string;
  onPress: () => void;
  compact?: boolean;
};

/**
 * Lists the two top-level views using the same surface, typography and pressed state.
 * The compact form is used in the calendar header, while the full form is used in
 * the list content where a short explanation helps users discover the calendar.
 */
export default function ViewNavigationLink({
  label,
  description,
  onPress,
  compact = false,
}: ViewNavigationLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.link,
        compact ? styles.compactLink : styles.cardLink,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.copy, compact && styles.compactCopy]}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {!compact ? <Text style={styles.arrow}>›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
  },
  compactLink: {
    minWidth: 72,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pressed: {
    backgroundColor: COLORS.input,
    borderColor: COLORS.primary,
  },
  copy: {
    flex: 1,
  },
  compactCopy: {
    flex: 0,
    alignItems: 'center',
  },
  label: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  description: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  arrow: {
    color: COLORS.primary,
    fontSize: 26,
    fontWeight: '300',
  },
});

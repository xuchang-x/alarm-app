import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants';

type ViewNavigationLinkProps = {
  label: string;
  description?: string;
  onPress: () => void;
};

/**
 * Content-level shortcut that uses the same surface, typography and pressed state
 * as the app's other interactive cards.
 */
export default function ViewNavigationLink({
  label,
  description,
  onPress,
}: ViewNavigationLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.link,
        styles.cardLink,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Text style={styles.arrow}>›</Text>
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
  pressed: {
    backgroundColor: COLORS.input,
    borderColor: COLORS.primary,
  },
  copy: {
    flex: 1,
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

import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type PrimaryButtonProps = { label: string; onPress: () => void; disabled?: boolean };

export function PrimaryButton({ label, onPress, disabled }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.arrow} aria-hidden>↗</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58, borderRadius: Radius.medium, backgroundColor: Colors.dark.accent,
    paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  label: { color: Colors.dark.background, fontSize: 16, fontWeight: '800' },
  arrow: { color: Colors.dark.background, fontSize: 23, fontWeight: '500' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.45 },
});

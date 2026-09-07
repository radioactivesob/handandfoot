import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from './AppText';
import { C } from '../theme';

interface Props {
  label: string;
  count: number;
  onAdd: () => void;
  onSubtract: () => void;
  tone?: 'score' | 'penalty';
  style?: ViewStyle;
}

/**
 * The workhorse. Tap to increment, long-press to decrement.
 *
 * Deliberately not animated: this is the tile that gets hit forty times in a
 * row while three people wait, and anything that has to settle between taps
 * drops one. The flip treatment lives on FlipTile, where an actual choice is
 * being made.
 */
export default function CountTile({
  label, count, onAdd, onSubtract, tone = 'score', style,
}: Props) {
  const penalty = tone === 'penalty';
  return (
    <TouchableOpacity
      style={[styles.tile, penalty && styles.tilePenalty, count > 0 && (penalty ? styles.tilePenaltyOn : styles.tileOn), style]}
      onPress={onAdd}
      onLongPress={onSubtract}
      delayLongPress={280}
      activeOpacity={0.6}
      accessibilityLabel={`${label}, ${count}. Tap to add, hold to remove.`}
    >
      <Text style={[styles.count, penalty && styles.countPenalty]}>{count}</Text>
      <Text style={[styles.label, penalty && styles.labelPenalty]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tileOn: { borderColor: C.brassDim },
  tilePenalty: { backgroundColor: C.dangerBg, borderColor: C.dangerFaint },
  tilePenaltyOn: { borderColor: C.dangerBorder },
  count: { color: C.brass, fontSize: 30, fontWeight: '800' },
  countPenalty: { color: C.dangerBright },
  label: { color: C.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  labelPenalty: { color: C.danger },
});

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, BODY_FONT_SCALE } from './AppText';
import { C } from '../theme';

interface Props {
  label: string;
  sub?: string;
  value: number;
  onChange: (n: number) => void;
  tone?: 'score' | 'penalty';
  /** Points this row contributes, shown on the right once it's non-zero. */
  points?: number;
}

/**
 * Label, minus, a typeable number, plus.
 *
 * The typeable middle is the point. Counting a round's melds means entering
 * numbers like 30 — tapping a tile thirty times while three people wait is
 * the exact tedium this app exists to remove. The steppers stay because a
 * correction is usually ±1 and a keyboard for that is worse.
 */
export default function NumberField({
  label, sub, value, onChange, tone = 'score', points,
}: Props) {
  const penalty = tone === 'penalty';
  const [draft, setDraft] = useState(value ? String(value) : '');

  // Resync when the value changes from outside — clearing a round, or the
  // steppers moving it while the field is on screen.
  useEffect(() => { setDraft(value ? String(value) : ''); }, [value]);

  const commit = (text: string) => {
    setDraft(text);
    const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
    onChange(Number.isNaN(n) ? 0 : Math.max(0, n));
  };

  const step = (by: number) => {
    const next = Math.max(0, value + by);
    setDraft(next ? String(next) : '');
    onChange(next);
  };

  return (
    <View style={styles.row}>
      <View style={styles.labelCol}>
        <Text
          style={[styles.label, penalty && styles.labelPenalty]}
          maxFontSizeMultiplier={BODY_FONT_SCALE}
          numberOfLines={2}
        >
          {label}
        </Text>
        {!!sub && (
          <Text style={styles.sub} maxFontSizeMultiplier={BODY_FONT_SCALE} numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>

      {points != null && value > 0 && (
        <Text style={[styles.points, penalty && styles.pointsPenalty]}>
          {penalty ? '−' : '+'}{Math.abs(points)}
        </Text>
      )}

      <View style={styles.stepper}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => step(-1)}
          hitSlop={6}
          accessibilityLabel={`Remove one ${label}`}
        >
          <Text style={styles.stepText}>−</Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, penalty && styles.inputPenalty]}
          value={draft}
          onChangeText={commit}
          keyboardType="number-pad"
          maxLength={3}
          placeholder="0"
          placeholderTextColor={C.textGhost}
          selectTextOnFocus
          accessibilityLabel={label}
        />

        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => step(1)}
          hitSlop={6}
          accessibilityLabel={`Add one ${label}`}
        >
          <Text style={styles.stepText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 7,
  },
  labelCol: { flex: 1 },
  label: { color: C.text, fontSize: 16 },
  labelPenalty: { color: C.dangerBright },
  sub: { color: C.textMuted, fontSize: 12, marginTop: 1 },
  points: { color: C.brassMuted, fontSize: 13, fontWeight: '700' },
  pointsPenalty: { color: C.dangerBorder },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  stepBtn: {
    width: 38, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surfaceRaised, borderWidth: 1, borderColor: C.border,
  },
  stepText: { color: C.brass, fontSize: 22, fontWeight: '800', lineHeight: 26 },
  input: {
    width: 62, height: 44, textAlign: 'center',
    color: C.brass, fontSize: 20, fontWeight: '800',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong,
    borderRadius: 10, paddingVertical: 0,
  },
  inputPenalty: { color: C.dangerBright, borderColor: C.dangerBorder },
});

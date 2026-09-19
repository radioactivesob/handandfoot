import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, ViewStyle } from 'react-native';
import { Text, BODY_FONT_SCALE } from './AppText';
import { useHalfFlip } from '../hooks/useHalfFlip';
import { C } from '../theme';

export interface FlipOption {
  key: string;
  label: string;
  sub?: string;
}

interface Props {
  label: string;
  /** What the face shows when it's resting — usually the running counts. */
  summary: string;
  options: FlipOption[];
  onPick: (key: string) => void;
  style?: ViewStyle;
}

/**
 * A tile that turns over to reveal a choice.
 *
 * This treatment is deliberately rare. It belongs where a genuine one-of-N
 * pick exists — a book is clean or dirty, and you decide which as you lay it
 * down. It does *not* belong on the value counters: those are high-volume
 * repeat taps under four people's attention, and an animation that has to
 * settle before the next tap lands is how a 400 becomes a 350.
 *
 * One face is rendered at a time and the turn stops at 90° — see useHalfFlip.
 * The earlier version stacked two absolutely-positioned faces held at 0° and
 * 180° with `backfaceVisibility: hidden`, which left a 3D transform on the
 * tile at rest and made every label inside it soft.
 */
export default function FlipTile({ label, summary, options, onPick, style }: Props) {
  const [open, setOpen] = useState(false);
  const { face, flipStyle } = useHalfFlip(open);

  const pick = (key: string) => {
    onPick(key);
    setOpen(false);
  };

  return (
    <Animated.View style={[styles.tile, open && styles.tileOpen, flipStyle, style]}>
      {face === 'front' ? (
        <TouchableOpacity style={styles.front} onPress={() => setOpen(true)} activeOpacity={0.75}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.summary} numberOfLines={2} maxFontSizeMultiplier={BODY_FONT_SCALE}>
            {summary}
          </Text>
          <Text style={styles.hint}>TAP TO ADD</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.back}>
          <View style={styles.options}>
            {options.map(o => (
              <TouchableOpacity
                key={o.key}
                style={styles.option}
                onPress={() => pick(o.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionLabel} maxFontSizeMultiplier={BODY_FONT_SCALE}>
                  {o.label}
                </Text>
                {!!o.sub && <Text style={styles.optionSub}>{o.sub}</Text>}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
            <Text style={styles.cancel}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 132,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surfaceRaised,
    justifyContent: 'center',
  },
  tileOpen: { backgroundColor: C.surface, borderColor: C.brassDim },
  front: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10 },
  back: { flex: 1, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 8 },
  label: { color: C.brassMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  summary: { color: C.brass, fontSize: 20, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  hint: { color: C.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 8 },
  options: { flexDirection: 'row', gap: 8, minHeight: 84 },
  option: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.brassDim,
    backgroundColor: C.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  optionLabel: { color: C.text, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  optionSub: { color: C.brassMuted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  cancel: {
    color: C.textFaint, fontSize: 13, fontWeight: '800',
    letterSpacing: 1.2, textAlign: 'center', paddingTop: 6,
  },
});

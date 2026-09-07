import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, ViewStyle } from 'react-native';
import { Text } from './AppText';
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
 * A tile that rotates to reveal a choice.
 *
 * This treatment is deliberately rare. It belongs where a genuine one-of-N
 * pick exists — a book is clean or dirty, and you decide which as you lay it
 * down. It does *not* belong on the value counters: those are high-volume
 * repeat taps under four people's attention, and an animation that has to
 * settle before the next tap lands is how a 400 becomes a 350.
 *
 * Built on RN's own Animated rather than Reanimated so the app keeps a single
 * dependency-free animation path — which matters because AppText caps Dynamic
 * Type at 1.3x and animated fixed-height tiles are exactly where large text
 * breaks layouts.
 */
export default function FlipTile({ label, summary, options, onPick, style }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);

  const turn = useCallback((to: 0 | 1) => {
    setOpen(to === 1);
    Animated.timing(spin, {
      toValue: to,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [spin]);

  const frontSpin = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backSpin = spin.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const pick = (key: string) => {
    onPick(key);
    turn(0);
  };

  return (
    <View style={[styles.wrap, style]}>
      {/* Front: resting face, showing what's been counted so far. */}
      <Animated.View
        style={[styles.face, { transform: [{ perspective: 800 }, { rotateY: frontSpin }] }]}
        pointerEvents={open ? 'none' : 'auto'}
      >
        <TouchableOpacity style={styles.faceInner} onPress={() => turn(1)} activeOpacity={0.7}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.summary} numberOfLines={2}>{summary}</Text>
          <Text style={styles.hint}>TAP TO ADD</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Back: the choice. */}
      <Animated.View
        style={[
          styles.face, styles.back,
          { transform: [{ perspective: 800 }, { rotateY: backSpin }] },
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <View style={styles.options}>
          {options.map(o => (
            <TouchableOpacity
              key={o.key}
              style={styles.option}
              onPress={() => pick(o.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionLabel}>{o.label}</Text>
              {!!o.sub && <Text style={styles.optionSub}>{o.sub}</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => turn(0)} hitSlop={10}>
          <Text style={styles.cancel}>CANCEL</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 132 },
  face: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backfaceVisibility: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surfaceRaised,
    justifyContent: 'center',
  },
  faceInner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10 },
  back: { backgroundColor: C.surface, paddingVertical: 8, paddingHorizontal: 8 },
  label: { color: C.brassMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  summary: { color: C.brass, fontSize: 20, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  hint: { color: C.textFaint, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 8 },
  options: { flex: 1, flexDirection: 'row', gap: 8 },
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
    color: C.textFaint, fontSize: 11, fontWeight: '800',
    letterSpacing: 1.2, textAlign: 'center', paddingTop: 6,
  },
});

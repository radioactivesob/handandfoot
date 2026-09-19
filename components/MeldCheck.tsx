import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Text, BODY_FONT_SCALE } from './AppText';
import CountTile from './CountTile';
import { Denomination, DENOMINATIONS, emptyTally, tallyPoints } from '../hooks/scoring';
import { C } from '../theme';

interface Props {
  visible: boolean;
  /** This round's meld minimum — 60, 90, 120, 150. */
  minimum: number;
  roundNumber: number;
  onClose: () => void;
}

/**
 * "Do I have enough to go down?"
 *
 * The meld minimum is a question about a hand, asked mid-round by someone
 * looking at cards they haven't played yet, and at a real table it gets
 * counted two and three times before anyone is sure. This is that count, in
 * five taps. It is reached by tapping the NEED line on the scoreboard, which
 * is where the question is already written.
 *
 * It is a calculator, not a ledger. Nothing here touches a score, and it
 * starts empty every time it opens — the previous player's hand is never the
 * one you want.
 */
export default function MeldCheck({ visible, minimum, roundNumber, onClose }: Props) {
  const [tally, setTally] = useState(emptyTally);
  useEffect(() => { if (visible) setTally(emptyTally()); }, [visible]);

  const total = tallyPoints(tally);
  const enough = total >= minimum;
  const bump = (d: Denomination, by: number) =>
    setTally(t => ({ ...t, [d]: Math.max(0, (t[d] ?? 0) + by) }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, enough && styles.cardEnough]}>
          <Text style={styles.title}>CAN I MELD?</Text>
          <Text style={styles.sub} maxFontSizeMultiplier={BODY_FONT_SCALE}>
            Round {roundNumber} needs {minimum}. Count what you'd lay down.
          </Text>

          <View style={styles.pad}>
            {DENOMINATIONS.map(d => (
              <CountTile
                key={d}
                label={`×${d}`}
                count={tally[d]}
                onAdd={() => bump(d, 1)}
                onSubtract={() => bump(d, -1)}
              />
            ))}
          </View>
          <Text style={styles.hint}>tap to add · hold to remove</Text>

          <View style={styles.totalRow}>
            <Text style={[styles.total, enough && styles.totalEnough]}>{total}</Text>
            <Text style={[styles.verdict, enough ? styles.verdictEnough : styles.verdictShort]}>
              {enough ? '✓  ENOUGH TO MELD' : `${minimum - total} SHORT OF ${minimum}`}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetBtn} onPress={() => setTally(emptyTally())} hitSlop={8}>
              <Text style={styles.resetText}>RESET</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: C.scrim,
    justifyContent: 'center', alignItems: 'center', padding: 18,
  },
  card: {
    width: '100%', maxWidth: 420,
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1.5, borderColor: C.brassDim, padding: 18,
  },
  cardEnough: { borderColor: C.good },
  title: { color: C.brass, fontSize: 15, fontWeight: '800', letterSpacing: 1.6 },
  sub: { color: C.textDim, fontSize: 15, lineHeight: 21, marginTop: 4, marginBottom: 14 },
  pad: { flexDirection: 'row', gap: 8 },
  hint: {
    color: C.textFaint, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textAlign: 'center', marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 12,
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  total: { color: C.text, fontSize: 40, fontWeight: '800' },
  totalEnough: { color: C.good },
  verdict: { flex: 1, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  verdictEnough: { color: C.good },
  verdictShort: { color: C.textMuted },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  resetBtn: {
    paddingHorizontal: 16, justifyContent: 'center',
    borderRadius: 12, borderWidth: 1, borderColor: C.borderStrong,
  },
  resetText: { color: C.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  doneBtn: {
    flex: 1, backgroundColor: C.brass, borderRadius: 12,
    alignItems: 'center', paddingVertical: 13,
  },
  doneText: { color: C.onBrass, fontSize: 14, fontWeight: '800', letterSpacing: 1.4 },
});

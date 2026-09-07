import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Text, BODY_FONT_SCALE } from './AppText';
import NumberField from './NumberField';
import {
  RuleSet, TeamRound, Denomination, DENOMINATIONS,
  denominationLabel, breakdown, tallyPoints,
} from '../hooks/scoring';
import { C } from '../theme';

interface Props {
  title: string;
  rules: RuleSet;
  round: TeamRound;
  minimum: number;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (next: TeamRound) => void;
}

/**
 * One panel per team. Tap it, it turns over, and everything that team scored
 * this round is on the back — books, what's on the table, what they got caught
 * holding. It stays turned until DONE, because filling in six numbers behind a
 * panel that flips back after each one would be unusable.
 *
 * The flip swaps faces at the halfway point rather than stacking two
 * absolutely-positioned faces. That costs a line of timing code and buys a
 * panel whose height follows its own content — which matters here, because the
 * back is roughly six times taller than the front and both have to grow again
 * when someone turns their phone's text size up.
 */
export default function TeamScorePanel({
  title, rules, round, minimum, open, onOpen, onClose, onChange,
}: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const [face, setFace] = useState<'front' | 'back'>('front');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showInHand, setShowInHand] = useState(false);

  const bd = breakdown(round, rules);
  const melded = tallyPoints(round.melded);
  const inHand = tallyPoints(round.inHand);

  useEffect(() => {
    Animated.timing(spin, {
      toValue: open ? 1 : 0,
      duration: 260,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFace(open ? 'back' : 'front'), 130);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [open, spin]);

  // Anything the panel already knows about, so a closed panel still reports.
  const closedSummary = () => {
    const bits: string[] = [];
    if (round.cleanBooks) bits.push(`${round.cleanBooks} clean`);
    if (round.dirtyBooks) bits.push(`${round.dirtyBooks} dirty`);
    if (melded) bits.push(`${melded} on the table`);
    if (round.redThrees) bits.push(`${round.redThrees} red 3`);
    if (inHand) bits.push(`−${inHand} in hand`);
    if (round.wentOut && rules.goOutEnabled) bits.push('went out');
    return bits.length ? bits.join(' · ') : 'Nothing scored yet';
  };

  const set = useCallback((patch: Partial<TeamRound>) => {
    onChange({ ...round, ...patch });
  }, [onChange, round]);

  const setTally = (which: 'melded' | 'inHand', d: Denomination, n: number) =>
    onChange({ ...round, [which]: { ...round[which], [d]: n } });

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <Animated.View
      style={[
        styles.panel,
        open && styles.panelOpen,
        { transform: [{ perspective: 1000 }, { rotateY: rotate }] },
      ]}
    >
      {/* Un-mirror the content while the panel itself is turned over. */}
      <View style={face === 'back' ? styles.unmirror : undefined}>
        {face === 'front' ? (
          <TouchableOpacity style={styles.front} onPress={onOpen} activeOpacity={0.75}>
            <View style={styles.frontHead}>
              <Text style={styles.frontTitle} numberOfLines={1} maxFontSizeMultiplier={BODY_FONT_SCALE}>
                {title.toUpperCase()}
              </Text>
              <Text style={styles.frontScore}>{bd.total}</Text>
            </View>
            <Text style={styles.frontSummary} maxFontSizeMultiplier={BODY_FONT_SCALE} numberOfLines={2}>
              {closedSummary()}
            </Text>
            <Text style={styles.frontHint}>TAP TO SCORE</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.back}>
            <View style={styles.backHead}>
              <Text style={styles.backTitle} numberOfLines={1} maxFontSizeMultiplier={BODY_FONT_SCALE}>
                {title.toUpperCase()}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.doneChip}>
                <Text style={styles.doneChipText}>DONE</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.section}>BOOKS</Text>
            <NumberField
              label="Clean books"
              sub={`no wilds · +${rules.cleanBook} each`}
              value={round.cleanBooks}
              points={round.cleanBooks * rules.cleanBook}
              onChange={n => set({ cleanBooks: n })}
            />
            <NumberField
              label="Dirty books"
              sub={`with wilds · +${rules.dirtyBook} each`}
              value={round.dirtyBooks}
              points={round.dirtyBooks * rules.dirtyBook}
              onChange={n => set({ dirtyBooks: n })}
            />

            <Text style={styles.section}>ON THE TABLE</Text>
            {DENOMINATIONS.map(d => (
              <NumberField
                key={`m${d}`}
                label={denominationLabel(rules, d)}
                sub={`${d} each`}
                value={round.melded[d]}
                points={round.melded[d] * d}
                onChange={n => setTally('melded', d, n)}
              />
            ))}
            <View style={styles.subtotal}>
              <Text style={styles.subtotalLabel}>MELDED</Text>
              <Text style={styles.subtotalValue}>{melded}</Text>
              <Text style={[styles.minFlag, melded >= minimum ? styles.minOk : styles.minShort]}>
                {melded >= minimum ? '✓ PAST MINIMUM' : `${minimum - melded} SHORT OF ${minimum}`}
              </Text>
            </View>

            {rules.goOutEnabled && (
              <TouchableOpacity
                style={[styles.goOut, round.wentOut && styles.goOutOn]}
                onPress={() => set({ wentOut: !round.wentOut })}
              >
                <Text
                  style={[styles.goOutText, round.wentOut && styles.goOutTextOn]}
                  maxFontSizeMultiplier={BODY_FONT_SCALE}
                >
                  {round.wentOut ? `✓ WENT OUT  +${rules.goOut}` : `WENT OUT?  +${rules.goOut}`}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.section, styles.sectionDanger]}>WHAT IT COST</Text>
            <NumberField
              label="Red threes"
              sub={`${rules.redThree} each`}
              value={round.redThrees}
              points={round.redThrees * rules.redThree}
              onChange={n => set({ redThrees: n })}
              tone="penalty"
            />

            {showInHand || inHand > 0 ? (
              <>
                <Text style={styles.subsection}>LEFT IN HAND &amp; FOOT</Text>
                {DENOMINATIONS.map(d => (
                  <NumberField
                    key={`h${d}`}
                    label={denominationLabel(rules, d)}
                    sub={`−${d} each`}
                    value={round.inHand[d]}
                    points={round.inHand[d] * d}
                    onChange={n => setTally('inHand', d, n)}
                    tone="penalty"
                  />
                ))}
              </>
            ) : (
              // Usually one team goes out and the other is the only one holding
              // anything, so this stays folded away rather than showing four
              // zeroes to everybody every round.
              <TouchableOpacity style={styles.addInHand} onPress={() => setShowInHand(true)}>
                <Text style={styles.addInHandText} maxFontSizeMultiplier={BODY_FONT_SCALE}>
                  + Cards left in hand
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel} maxFontSizeMultiplier={BODY_FONT_SCALE}>ROUND</Text>
              <Text style={styles.totalValue}>{bd.total}</Text>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText} maxFontSizeMultiplier={BODY_FONT_SCALE}>DONE</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  panelOpen: { borderColor: C.brass, backgroundColor: C.surfaceRaised },
  unmirror: { transform: [{ rotateY: '180deg' }] },

  front: { padding: 16, gap: 4 },
  frontHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  frontTitle: { flex: 1, color: C.text, fontSize: 18, fontWeight: '800' },
  frontScore: { color: C.brass, fontSize: 30, fontWeight: '800' },
  frontSummary: { color: C.textMuted, fontSize: 14, lineHeight: 20 },
  frontHint: { color: C.brassDim, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginTop: 4 },

  back: { padding: 14, paddingBottom: 12 },
  backHead: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backTitle: { flex: 1, color: C.brass, fontSize: 17, fontWeight: '800' },
  doneChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: C.borderStrong,
  },
  doneChipText: { color: C.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },

  section: {
    color: C.brassMuted, fontSize: 11, fontWeight: '800',
    letterSpacing: 1.4, marginTop: 14, marginBottom: 2,
  },
  sectionDanger: { color: C.danger },
  subsection: {
    color: C.danger, fontSize: 11, fontWeight: '800',
    letterSpacing: 1.2, marginTop: 8, marginBottom: 2,
  },

  subtotal: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border,
  },
  subtotalLabel: { color: C.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  subtotalValue: { color: C.brassBright, fontSize: 20, fontWeight: '800' },
  minFlag: { flex: 1, textAlign: 'right', fontSize: 11, fontWeight: '800' },
  minOk: { color: C.good },
  minShort: { color: C.textMuted },

  goOut: {
    marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, alignItems: 'center', paddingVertical: 13,
  },
  goOutOn: { borderColor: C.brass, backgroundColor: C.brassFaint },
  goOutText: { color: C.textDim, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  goOutTextOn: { color: C.brass },

  addInHand: { paddingVertical: 12 },
  addInHandText: { color: C.dangerBorder, fontSize: 14, fontWeight: '700' },

  totalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.borderStrong,
  },
  totalLabel: { color: C.text, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  totalValue: { color: C.brass, fontSize: 30, fontWeight: '800' },

  doneBtn: {
    marginTop: 12, backgroundColor: C.brass, borderRadius: 12,
    alignItems: 'center', paddingVertical: 14,
  },
  doneBtnText: { color: C.onBrass, fontSize: 14, fontWeight: '800', letterSpacing: 1.4 },
});

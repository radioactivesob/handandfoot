import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, BODY_FONT_SCALE } from './AppText';
import NumberField from './NumberField';
import {
  RuleSet, TeamRound, Denomination, DENOMINATIONS,
  denominationLabel, breakdown, tallyPoints,
} from '../hooks/scoring';
import { useHalfFlip } from '../hooks/useHalfFlip';
import { C } from '../theme';

interface Props {
  title: string;
  rules: RuleSet;
  round: TeamRound;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (next: TeamRound) => void;
}

/**
 * One panel per team. Tap it, it turns over, and everything that team scored
 * this round is on the back — books, what's on the table, what they got caught
 * holding. It stays turned until you leave it, because filling in six numbers
 * behind a panel that flips back after each one would be unusable.
 *
 * It has two exits, and they are not interchangeable. At the table books get
 * counted first for both teams, because they are the piles; the loose cards
 * come after. So each panel is opened twice a round, and the first visit ends
 * after BOOKS. RETURN sits right there. DONE sits at the end of the whole
 * pass. The first version had two buttons both labelled DONE doing the same
 * thing, and the table read them — correctly — as two different things.
 *
 * There is no meld-minimum check on this panel, on purpose. The minimum is a
 * question about a hand — "do I have enough to go down?" — asked mid-round by
 * a player looking at cards they haven't played. By the time this panel is
 * being filled in, every team that melded already met it, so the flag could
 * only ever say ✓. It lives on the count-as-you-go pad, where the running
 * total is the thing being watched, and behind the scoreboard's NEED line.
 *
 * The penalty section is always shown. It was folded behind a small link to
 * keep the panel short, and with four people waiting nobody found a grey link,
 * so a player caught with a full hand could not be scored at all. The moment
 * someone is holding a fistful of cards is exactly when the column that
 * counts against them needs to be the most obvious thing on the screen.
 *
 * The turn goes half way and back rather than a full 180° — see useHalfFlip
 * for why that matters for text sharpness. Rendering one face at a time also
 * lets the panel's height follow its own content, which matters here because
 * the back is roughly six times taller than the front and both have to grow
 * again when someone turns their phone's text size up.
 */
export default function TeamScorePanel({
  title, rules, round, open, onOpen, onClose, onChange,
}: Props) {
  const { face, flipStyle } = useHalfFlip(open);

  const bd = breakdown(round, rules);
  const melded = tallyPoints(round.melded);
  const inHand = tallyPoints(round.inHand);

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

  return (
    <Animated.View style={[styles.panel, open && styles.panelOpen, flipStyle]}>
      <View>
        {face === 'front' ? (
          <TouchableOpacity style={styles.front} onPress={onOpen} activeOpacity={0.75}>
            <View style={styles.frontHead}>
              <Text style={styles.frontTitle} numberOfLines={1} maxFontSizeMultiplier={BODY_FONT_SCALE}>
                {title.toUpperCase()}
              </Text>
              <Text style={[styles.frontScore, bd.total < 0 && styles.negative]}>{bd.total}</Text>
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
            <TouchableOpacity style={styles.returnBtn} onPress={onClose}>
              <Text style={styles.returnBtnText} maxFontSizeMultiplier={BODY_FONT_SCALE}>
                ↩︎  RETURN
              </Text>
              <Text style={styles.returnBtnSub} maxFontSizeMultiplier={BODY_FONT_SCALE}>
                books are in — come back for the cards
              </Text>
            </TouchableOpacity>

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

            <Text style={styles.subsection}>LEFT IN HAND &amp; FOOT</Text>
            <Text style={styles.subsectionNote} maxFontSizeMultiplier={BODY_FONT_SCALE}>
              Everything still held when someone went out counts against you.
            </Text>
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
            {inHand > 0 && (
              <View style={styles.subtotal}>
                <Text style={[styles.subtotalLabel, styles.negative]}>IN HAND</Text>
                <Text style={[styles.subtotalValue, styles.negative]}>−{inHand}</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel} maxFontSizeMultiplier={BODY_FONT_SCALE}>ROUND</Text>
              <Text style={[styles.totalValue, bd.total < 0 && styles.negative]}>{bd.total}</Text>
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
    borderWidth: 1, borderColor: C.border,
  },
  panelOpen: { borderColor: C.brass, backgroundColor: C.surfaceRaised },

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
  returnBtn: {
    marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: C.brassDim,
    backgroundColor: C.surface, alignItems: 'center', paddingVertical: 11,
  },
  returnBtnText: { color: C.brass, fontSize: 14, fontWeight: '800', letterSpacing: 1.4 },
  returnBtnSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  negative: { color: C.danger },

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

  goOut: {
    marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, alignItems: 'center', paddingVertical: 13,
  },
  goOutOn: { borderColor: C.brass, backgroundColor: C.brassFaint },
  goOutText: { color: C.textDim, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  goOutTextOn: { color: C.brass },

  subsectionNote: { color: C.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 4 },

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

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Switch } from 'react-native';
import { Text, TextInput, BODY_FONT_SCALE } from '../components/AppText';
import { useRouter } from 'expo-router';
import { useGames } from '../hooks/useGames';
import { RuleSet, DEFAULT_RULES } from '../hooks/scoring';
import { C } from '../theme';

/** A signed integer field. Empty and "-" are legal mid-typing, so the value
 *  is only committed when it parses — otherwise backspacing to nothing
 *  snaps the field to 0 and fights the person editing it. */
function NumberRow({
  label, help, value, onChange,
}: { label: string; help?: string; value: number; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  // Resync when the value changes from outside — otherwise "reset to
  // defaults" silently leaves every field showing the old number.
  useEffect(() => { setDraft(String(value)); }, [value]);
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!help && <Text style={styles.rowHelp}>{help}</Text>}
      </View>
      <TextInput
        style={styles.numInput}
        value={draft}
        onChangeText={v => {
          setDraft(v);
          const n = parseInt(v, 10);
          if (!Number.isNaN(n)) onChange(n);
        }}
        onBlur={() => setDraft(String(value))}
        keyboardType="numbers-and-punctuation"
        selectTextOnFocus
      />
    </View>
  );
}

export default function Rules() {
  const router = useRouter();
  const { rules, saveRules, current, prefs, savePrefs } = useGames();
  const [draft, setDraft] = useState<RuleSet | null>(null);
  const r = draft ?? rules;

  const edit = (patch: Partial<RuleSet>) => {
    const next = { ...r, ...patch };
    setDraft(next);
    saveRules(next);
  };

  const setMinimum = (i: number, n: number) =>
    edit({ roundMinimums: r.roundMinimums.map((m, j) => (j === i ? n : m)) });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← BACK</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>HOUSE RULES</Text>
        <View style={{ width: 54 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardDismissMode="on-drag">
        {/* The single most important thing this screen has to say. */}
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Changes apply to the <Text style={styles.noticeBold}>next</Text> game.
            {current ? ' The game in progress keeps the rules it was dealt under.' : ''}
          </Text>
        </View>

        {/* A preference, not a rule — it changes how numbers get entered,
            never what they are worth, so it is not frozen onto a game. */}
        <Text style={styles.section}>HOW YOU COUNT</Text>
        <View style={styles.modeRow}>
          {([
            ['endOfRound', 'At the end', 'Type the totals off the piles once the round is over.'],
            ['asYouGo', 'As you play', 'Tap a tile each time a book goes down.'],
          ] as const).map(([key, title, blurb]) => {
            const on = prefs.scoringMode === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.modeCard, on && styles.modeCardOn]}
                onPress={() => savePrefs({ ...prefs, scoringMode: key })}
              >
                <Text
                  style={[styles.modeTitle, on && styles.modeTitleOn]}
                  maxFontSizeMultiplier={BODY_FONT_SCALE}
                >
                  {on ? '✓ ' : ''}{title}
                </Text>
                <Text style={styles.modeBlurb} maxFontSizeMultiplier={BODY_FONT_SCALE}>{blurb}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.section}>THE DEAL</Text>
        <NumberRow
          label="Decks"
          help="Shuffled together, jokers included. Scoring never reads this — it is here so How to Play can tell a newcomer what to shuffle."
          value={r.decks}
          onChange={n => edit({ decks: n })}
        />

        <Text style={styles.section}>ROUND MINIMUMS</Text>
        {r.roundMinimums.map((m, i) => (
          <NumberRow key={i} label={`Round ${i + 1}`} value={m} onChange={n => setMinimum(i, n)} />
        ))}
        <View style={styles.roundCountRow}>
          <TouchableOpacity
            style={styles.smallBtn}
            onPress={() => r.roundMinimums.length > 1 && edit({ roundMinimums: r.roundMinimums.slice(0, -1) })}
          >
            <Text style={styles.smallBtnText}>− ROUND</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallBtn}
            onPress={() => edit({
              roundMinimums: [...r.roundMinimums, (r.roundMinimums[r.roundMinimums.length - 1] ?? 150) + 30],
            })}
          >
            <Text style={styles.smallBtnText}>+ ROUND</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>BOOKS</Text>
        <NumberRow label="Clean book" help="No wilds — red card on top." value={r.cleanBook} onChange={n => edit({ cleanBook: n })} />
        <NumberRow label="Dirty book" help="Contains wilds — black card on top." value={r.dirtyBook} onChange={n => edit({ dirtyBook: n })} />

        <Text style={styles.section}>BONUSES</Text>
        <NumberRow
          label="Perfect deal"
          help="Drew two piles of exactly 13, without counting."
          value={r.perfectDeal}
          onChange={n => edit({ perfectDeal: n })}
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Play the go-out bonus</Text>
            <Text style={styles.rowHelp}>Off is different from zero — the amount is kept.</Text>
          </View>
          <Switch
            value={r.goOutEnabled}
            onValueChange={v => edit({ goOutEnabled: v })}
            trackColor={{ true: C.brassDim, false: C.border }}
            thumbColor={r.goOutEnabled ? C.brass : C.textGhost}
          />
        </View>
        {r.goOutEnabled && (
          <NumberRow label="Go out" value={r.goOut} onChange={n => edit({ goOut: n })} />
        )}

        <Text style={[styles.section, { color: C.danger }]}>PENALTIES</Text>
        <NumberRow
          label="Red three"
          help="Signed. Negative is a penalty; set it positive if your house pays for melding them."
          value={r.redThree}
          onChange={n => edit({ redThree: n })}
        />

        <Text style={styles.section}>WHAT A CARD IS WORTH</Text>
        <View style={styles.refCard}>
          {r.cardValues.map(cv => (
            <View key={cv.label} style={styles.refRow}>
              <Text style={styles.refLabel}>{cv.label}</Text>
              <Text style={[styles.refValue, cv.value < 0 && { color: C.dangerBright }]}>{cv.value}</Text>
            </View>
          ))}
          <Text style={styles.refNote}>
            For settling arguments. Scoring counts the four values on the pad, so
            moving a rank between columns changes nothing in the app.
          </Text>
        </View>

        <TouchableOpacity style={styles.reset} onPress={() => { setDraft(DEFAULT_RULES); saveRules(DEFAULT_RULES); }}>
          <Text style={styles.resetText}>RESET TO HOUSE DEFAULTS</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: C.brass, backgroundColor: C.surface,
  },
  back: { color: C.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: C.text, fontSize: 15, fontWeight: '800', letterSpacing: 1.4 },
  body: { padding: 16, paddingBottom: 40 },
  notice: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1,
    borderColor: C.brassDim, padding: 12, marginBottom: 8,
  },
  noticeText: { color: C.textDim, fontSize: 15, lineHeight: 22 },
  modeRow: { gap: 8, marginTop: 4 },
  modeCard: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1,
    borderColor: C.border, padding: 14,
  },
  modeCardOn: { borderColor: C.brass, backgroundColor: C.surfaceRaised },
  modeTitle: { color: C.textDim, fontSize: 16, fontWeight: '800' },
  modeTitleOn: { color: C.brass },
  modeBlurb: { color: C.textMuted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  noticeBold: { color: C.brass, fontWeight: '800' },
  section: { color: C.brassMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1.4, marginTop: 22, marginBottom: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rowLabel: { color: C.text, fontSize: 16 },
  rowHelp: { color: C.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  numInput: {
    minWidth: 88, textAlign: 'right', color: C.brass, fontSize: 19, fontWeight: '800',
    backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  roundCountRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  smallBtn: {
    flex: 1, borderRadius: 10, borderWidth: 1, borderColor: C.borderStrong,
    alignItems: 'center', paddingVertical: 11,
  },
  smallBtnText: { color: C.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  refCard: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12,
  },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  refLabel: { color: C.textDim, fontSize: 14 },
  refValue: { color: C.brass, fontSize: 15, fontWeight: '800' },
  refNote: { color: C.textFaint, fontSize: 13, lineHeight: 16, marginTop: 10 },
  reset: { alignItems: 'center', paddingTop: 30 },
  resetText: { color: C.dangerBorder, fontSize: 13, fontWeight: '800', letterSpacing: 1.4 },
});

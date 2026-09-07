import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { useRouter } from 'expo-router';
import { useGames, newId } from '../hooks/useGames';
import { Game, roundCount } from '../hooks/scoring';
import { C } from '../theme';

// The UI ships fixed at four in two pairs, which is what the family plays.
// The data model allows any two teams of any size — see DESIGN.md.
const SEATS = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

export default function Setup() {
  const router = useRouter();
  const { rules, names, current, saveCurrent, rememberNames } = useGames();
  const [entered, setEntered] = useState<string[]>(['', '', '', '']);

  const set = (i: number, v: string) =>
    setEntered(prev => prev.map((x, j) => (j === i ? v : x)));

  // Tapping a remembered name drops it into the first empty seat, which is
  // the whole point of remembering them — four taps instead of four
  // keyboard entries for the same four people every week.
  const fill = (name: string) => {
    if (entered.includes(name)) {
      setEntered(prev => prev.map(x => (x === name ? '' : x)));
      return;
    }
    const slot = entered.findIndex(x => !x.trim());
    if (slot === -1) return;
    set(slot, name);
  };

  const start = () => {
    const final = entered.map((n, i) => n.trim() || SEATS[i]);
    const players = final.map(n => ({ id: newId(), name: n }));
    const game: Game = {
      id: newId(),
      startedAt: Date.now(),
      rules,
      players,
      teams: [
        { id: newId(), name: 'Team 1', playerIds: [players[0].id, players[2].id] },
        { id: newId(), name: 'Team 2', playerIds: [players[1].id, players[3].id] },
      ],
      rounds: [],
    };
    rememberNames(final);
    saveCurrent(game);
    router.replace('/round');
  };

  const confirmStart = () => {
    if (!current) return start();
    Alert.alert('Replace Game in Progress?', 'The current game will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', style: 'destructive', onPress: start },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← BACK</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>NEW GAME</Text>
        <View style={{ width: 54 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardDismissMode="on-drag">
        <Text style={styles.note}>
          Partners sit across from each other — seats 1 &amp; 3 are one team,
          2 &amp; 4 are the other.
        </Text>

        {[0, 1, 2, 3].map(i => (
          <View key={i} style={styles.seatRow}>
            <Text style={[styles.seatTag, i % 2 === 0 ? styles.seatTagA : styles.seatTagB]}>
              {i % 2 === 0 ? 'TEAM 1' : 'TEAM 2'}
            </Text>
            <TextInput
              style={styles.input}
              value={entered[i]}
              onChangeText={v => set(i, v)}
              placeholder={SEATS[i]}
              placeholderTextColor={C.textGhost}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        ))}

        {names.length > 0 && (
          <>
            <Text style={styles.section}>THE USUAL SUSPECTS</Text>
            <View style={styles.chips}>
              {names.map(n => {
                const on = entered.includes(n);
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => fill(n)}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{n}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>PLAYING BY</Text>
          <Text style={styles.rulesLine}>
            {roundCount(rules)} rounds · {rules.roundMinimums.join(' / ')}
          </Text>
          <Text style={styles.rulesLine}>
            Clean {rules.cleanBook} · Dirty {rules.dirtyBook} · Red three {rules.redThree}
          </Text>
          <Text style={styles.rulesLine}>
            Perfect deal +{rules.perfectDeal} · Go out {rules.goOutEnabled ? `+${rules.goOut}` : 'off'}
          </Text>
          <TouchableOpacity onPress={() => router.push('/rules')}>
            <Text style={styles.rulesEdit}>CHANGE HOUSE RULES →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryBtn} onPress={confirmStart}>
          <Text style={styles.primaryBtnText}>DEAL</Text>
        </TouchableOpacity>
      </View>
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
  body: { padding: 16, gap: 10, paddingBottom: 28 },
  note: { color: C.textMuted, fontSize: 13, marginBottom: 4 },
  seatRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seatTag: { fontSize: 10, fontWeight: '800', letterSpacing: 1, width: 54 },
  seatTagA: { color: C.brass },
  seatTagB: { color: C.good },
  input: {
    flex: 1, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1,
    borderColor: C.border, color: C.text, fontSize: 17, paddingHorizontal: 14, paddingVertical: 13,
  },
  section: { color: C.brassMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  chipOn: { borderColor: C.brass, backgroundColor: C.brassFaint },
  chipText: { color: C.textDim, fontSize: 14, fontWeight: '700' },
  chipTextOn: { color: C.brass },
  rulesCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 14, gap: 3, marginTop: 14,
  },
  rulesTitle: { color: C.brassMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  rulesLine: { color: C.textDim, fontSize: 13 },
  rulesEdit: { color: C.brass, fontSize: 12, fontWeight: '800', letterSpacing: 1, paddingTop: 8 },
  bottomBar: {
    padding: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface,
  },
  primaryBtn: {
    backgroundColor: C.brass, borderRadius: 12, alignItems: 'center', paddingVertical: 16,
  },
  primaryBtnText: { color: C.onBrass, fontSize: 16, fontWeight: '800', letterSpacing: 2 },
});

import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Text } from '../components/AppText';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGames } from '../hooks/useGames';
import { totals, teamLabel, winners } from '../hooks/scoring';
import { C } from '../theme';

const when = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function History() {
  const router = useRouter();
  const { games, deleteGame, reload } = useGames();
  useFocusEffect(React.useCallback(() => { reload(); }, [reload]));

  const newestFirst = [...games].reverse();

  const confirmDelete = (id: string) =>
    Alert.alert('Delete Game?', 'The scorecard goes with it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGame(id) },
    ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← BACK</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>PAST GAMES</Text>
        <View style={{ width: 54 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {newestFirst.length === 0 && (
          <Text style={styles.empty}>Nothing played yet. The first scorecard shows up here.</Text>
        )}
        {newestFirst.map(g => {
          const t = totals(g);
          const win = winners(g);
          const tied = win.length > 1;
          return (
            <TouchableOpacity
              key={g.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/summary', params: { gameId: g.id } })}
              onLongPress={() => confirmDelete(g.id)}
            >
              <View style={styles.cardHead}>
                <Text style={styles.cardDate}>{when(g.startedAt)}</Text>
                <Text style={styles.cardResult}>
                  {tied ? 'TIE' : teamLabel(g, g.teams.find(x => x.id === win[0])!).toUpperCase()}
                </Text>
              </View>
              {g.teams.map(tm => (
                <View key={tm.id} style={styles.line}>
                  <Text style={styles.lineName} numberOfLines={1}>{teamLabel(g, tm)}</Text>
                  <Text style={[styles.lineScore, win.includes(tm.id) && styles.lineScoreWin]}>
                    {t[tm.id] ?? 0}
                  </Text>
                </View>
              ))}
            </TouchableOpacity>
          );
        })}
        {newestFirst.length > 0 && (
          <Text style={styles.hint}>Hold a card to delete it.</Text>
        )}
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
  body: { padding: 14, gap: 10, paddingBottom: 28 },
  empty: { color: C.textMuted, fontSize: 14, textAlign: 'center', paddingTop: 40, lineHeight: 21 },
  card: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardDate: { color: C.textMuted, fontSize: 12, fontWeight: '700' },
  cardResult: { color: C.brass, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 3, gap: 12 },
  lineName: { color: C.textDim, fontSize: 15, flex: 1 },
  lineScore: { color: C.textMuted, fontSize: 19, fontWeight: '800' },
  lineScoreWin: { color: C.brass },
  hint: { color: C.textFaint, fontSize: 11, textAlign: 'center', paddingTop: 8 },
});

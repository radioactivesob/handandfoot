import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Text } from '../components/AppText';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGames } from '../hooks/useGames';
import { totals, teamLabel, roundCount } from '../hooks/scoring';
import { C } from '../theme';

export default function Home() {
  const router = useRouter();
  const { games, current, loading, reload } = useGames();

  // On focus, not just mount — finishing a game or editing rules changes
  // what this screen should say while it stays mounted underneath.
  useFocusEffect(React.useCallback(() => { reload(); }, [reload]));

  const resumeLine = () => {
    if (!current) return null;
    const t = totals(current);
    const line = current.teams
      .map(tm => `${teamLabel(current, tm)} ${t[tm.id] ?? 0}`)
      .join('   ·   ');
    return `Round ${Math.min(current.rounds.length + 1, roundCount(current.rules))} — ${line}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.masthead}>
          <Text style={styles.wordmark} numberOfLines={1} adjustsFontSizeToFit>HAND & FOOT</Text>
          <Text style={styles.tagline}>Score the night, settle the argument.</Text>
        </View>

        {current && (
          <TouchableOpacity
            style={[styles.card, styles.cardPrimary]}
            onPress={() => router.push('/round')}
          >
            <Text style={styles.cardIcon}>🃏</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitlePrimary}>RESUME GAME</Text>
              <Text style={styles.cardDescPrimary}>{resumeLine()}</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.card} onPress={() => router.push('/setup')}>
          <Text style={styles.cardIcon}>🎴</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{current ? 'NEW GAME' : 'START A GAME'}</Text>
            <Text style={styles.cardDesc}>
              {current ? 'Replaces the game in progress.' : 'Four players, two teams, four rounds.'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/history')}>
          <Text style={styles.cardIcon}>📜</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>PAST GAMES</Text>
            <Text style={styles.cardDesc}>
              {loading ? ' ' : games.length === 0
                ? 'Nothing played yet.'
                : `${games.length} game${games.length === 1 ? '' : 's'} on the books.`}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/rules')}>
          <Text style={styles.cardIcon}>📖</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>HOUSE RULES</Text>
            <Text style={styles.cardDesc}>Minimums, books, red threes, bonuses.</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  body: { padding: 16, gap: 12 },
  masthead: { paddingTop: 24, paddingBottom: 12 },
  wordmark: { color: C.brass, fontSize: 40, fontWeight: '800', letterSpacing: 1 },
  tagline: { color: C.textMuted, fontSize: 14, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 1,
    borderColor: C.border, padding: 16,
  },
  cardPrimary: { borderColor: C.brass, backgroundColor: C.surfaceRaised },
  cardIcon: { fontSize: 30 },
  cardText: { flex: 1 },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  cardTitlePrimary: { color: C.brass, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  cardDesc: { color: C.textMuted, fontSize: 13, marginTop: 3 },
  cardDescPrimary: { color: C.textDim, fontSize: 13, marginTop: 3 },
});

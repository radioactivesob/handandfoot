import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, Share } from 'react-native';
import { Text } from '../components/AppText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { useGames } from '../hooks/useGames';
import {
  totals, teamLabel, breakdown, roundMinimum, winners, superlatives,
} from '../hooks/scoring';
import { reportHtml, reportFileName, textSummary } from '../hooks/report';
import { C } from '../theme';

export default function Summary() {
  const router = useRouter();
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { games, current, loading } = useGames();
  const [busy, setBusy] = useState(false);

  const game = games.find(g => g.id === gameId) ?? (current?.id === gameId ? current : null);

  if (loading) return <SafeAreaView style={styles.container} />;
  if (!game) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>That game is gone.</Text>
          <TouchableOpacity onPress={() => router.replace('/')}>
            <Text style={styles.link}>HOME</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const t = totals(game);
  const win = winners(game);
  const tied = win.length > 1;
  const sups = superlatives(game);

  const sendPdf = async () => {
    try {
      setBusy(true);
      const { uri } = await Print.printToFileAsync({ html: reportHtml(game) });
      // printToFileAsync names the file with a random uuid. Rename it so what
      // lands in the group chat says what it is.
      const src = new File(uri);
      const dest = new File(Paths.cache, reportFileName(game));
      if (dest.exists) dest.delete();
      await src.move(dest);
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing Unavailable', 'This device cannot open the share sheet.');
        return;
      }
      await Sharing.shareAsync(src.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Hand & Foot scorecard',
      });
    } catch {
      Alert.alert('Export Failed', 'Could not build the scorecard. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // Plain text goes straight into a group chat as a message rather than an
  // attachment nobody opens on a phone.
  const sendText = () => Share.share({ message: textSummary(game) });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')}><Text style={styles.back}>⌂ HOME</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>FINAL</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.headline}>
          <Text style={styles.headlineText}>
            {tied
              ? `Dead tie at ${t[win[0]] ?? 0}`
              : `${teamLabel(game, game.teams.find(x => x.id === win[0])!)} win it`}
          </Text>
          {!tied && (
            <Text style={styles.headlineSub}>
              {t[win[0]] ?? 0} to {Math.min(...game.teams.filter(x => x.id !== win[0]).map(x => t[x.id] ?? 0))}
            </Text>
          )}
        </View>

        {/* Round-by-round grid. */}
        <View style={styles.grid}>
          <View style={styles.gridHead}>
            <Text style={[styles.gcell, styles.gcellFirst, styles.ghead]} />
            {game.teams.map(tm => (
              <Text key={tm.id} style={[styles.gcell, styles.ghead]} numberOfLines={1}>
                {teamLabel(game, tm).toUpperCase()}
              </Text>
            ))}
          </View>
          {game.rounds.map((round, i) => (
            <View key={i} style={styles.gridRow}>
              <View style={[styles.gcell, styles.gcellFirst]}>
                <Text style={styles.roundLabel}>ROUND {i + 1}</Text>
                <Text style={styles.roundMin}>min {roundMinimum(game.rules, i)}</Text>
              </View>
              {game.teams.map(tm => {
                const tr = round.teams.find(x => x.teamId === tm.id);
                const bd = tr ? breakdown(tr, game.rules) : null;
                return (
                  <View key={tm.id} style={styles.gcell}>
                    <Text style={styles.roundScore}>{bd ? bd.total : '—'}</Text>
                    {!!tr && (
                      <Text style={styles.roundBits}>
                        {[
                          tr.cleanBooks ? `${tr.cleanBooks}c` : '',
                          tr.dirtyBooks ? `${tr.dirtyBooks}d` : '',
                          tr.redThrees ? `${tr.redThrees}✕3` : '',
                          tr.wentOut && game.rules.goOutEnabled ? 'out' : '',
                        ].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
          <View style={[styles.gridRow, styles.gridTotal]}>
            <Text style={[styles.gcell, styles.gcellFirst, styles.totalLabel]}>FINAL</Text>
            {game.teams.map(tm => (
              <Text key={tm.id} style={[styles.gcell, styles.totalScore]}>{t[tm.id] ?? 0}</Text>
            ))}
          </View>
        </View>

        {sups.length > 0 && (
          <>
            <Text style={styles.section}>FOR THE RECORD</Text>
            <View style={styles.sups}>
              {sups.map(s => (
                <View key={s.title} style={styles.sup}>
                  <Text style={styles.supTitle}>{s.title.toUpperCase()}</Text>
                  <Text style={styles.supWho}>{s.who}</Text>
                  <Text style={styles.supDetail}>{s.detail}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={sendText}>
          <Text style={styles.secondaryBtnText}>TEXT IT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryBtn, busy && styles.btnBusy]} onPress={busy ? undefined : sendPdf}>
          <Text style={styles.primaryBtnText}>{busy ? 'BUILDING…' : 'SEND THE PDF'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: C.textDim, fontSize: 16 },
  link: { color: C.brass, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: C.brass, backgroundColor: C.surface,
  },
  back: { color: C.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: C.text, fontSize: 15, fontWeight: '800', letterSpacing: 1.4 },
  body: { padding: 14, paddingBottom: 28 },

  headline: {
    backgroundColor: C.surfaceRaised, borderRadius: 16, borderWidth: 1,
    borderColor: C.brass, padding: 18, marginBottom: 16,
  },
  headlineText: { color: C.brass, fontSize: 26, fontWeight: '800' },
  headlineSub: { color: C.textDim, fontSize: 15, marginTop: 4 },

  grid: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  gridHead: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  gridRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, alignItems: 'center' },
  gridTotal: { borderBottomWidth: 0, backgroundColor: C.surfaceRaised },
  gcell: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  gcellFirst: { flex: 0.85, alignItems: 'flex-start', paddingLeft: 12 },
  ghead: { color: C.brassMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  roundLabel: { color: C.textMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  roundMin: { color: C.textGhost, fontSize: 12, marginTop: 1 },
  roundScore: { color: C.text, fontSize: 19, fontWeight: '800' },
  roundBits: { color: C.textFaint, fontSize: 12, marginTop: 1 },
  totalLabel: { color: C.text, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  totalScore: { color: C.brass, fontSize: 26, fontWeight: '800' },

  section: { color: C.brassMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1.4, marginTop: 24, marginBottom: 8 },
  sups: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sup: {
    flexGrow: 1, flexBasis: '45%', backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, padding: 12,
  },
  supTitle: { color: C.brassMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  supWho: { color: C.text, fontSize: 16, fontWeight: '800', marginTop: 3 },
  supDetail: { color: C.textMuted, fontSize: 12, marginTop: 2 },

  bottomBar: {
    flexDirection: 'row', gap: 10, padding: 10,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface,
  },
  primaryBtn: { flex: 1.4, backgroundColor: C.brass, borderRadius: 12, alignItems: 'center', paddingVertical: 15 },
  primaryBtnText: { color: C.onBrass, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  btnBusy: { opacity: 0.6 },
  secondaryBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: C.borderStrong, alignItems: 'center', paddingVertical: 15 },
  secondaryBtnText: { color: C.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});

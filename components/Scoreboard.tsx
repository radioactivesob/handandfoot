import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './AppText';
import { C } from '../theme';

interface Props {
  teams: { id: string; label: string; total: number }[];
  /** 0-based index of the round on screen. */
  roundIndex: number;
  /** 0-based index of the round actually in progress. Equal to roundIndex
   *  unless a past round has been reopened to fix a score. */
  liveIndex: number;
  roundCount: number;
  minimum: number;
  /** Which team the pad is currently collecting, if any. */
  activeTeamId?: string;
  onBack?: () => void;
  onForward?: () => void;
}

/**
 * The persistent scoreboard, on every screen where a game is live.
 *
 * The third line is the one that earns its keep: the meld minimum for this
 * round is the question actually asked out loud every round ("what do we need
 * to get down?"), and answering it permanently in chrome costs nothing.
 *
 * The arrows either side of the round are how a past round gets reopened —
 * the same control Crosscourt puts on its set indicator. Round 2 was open at
 * the first real game when someone realised round 1 hadn't been fully
 * counted, and there was no way back.
 */
export default function Scoreboard({
  teams, roundIndex, liveIndex, roundCount, minimum, activeTeamId, onBack, onForward,
}: Props) {
  const revisiting = roundIndex < liveIndex;
  return (
    <View style={styles.bar}>
      <View style={styles.teams}>
        {teams.map(t => {
          const active = t.id === activeTeamId;
          return (
            <View key={t.id} style={[styles.team, active && styles.teamActive]}>
              <Text style={[styles.teamLabel, active && styles.teamLabelActive]} numberOfLines={1}>
                {t.label.toUpperCase()}
              </Text>
              <Text style={[styles.teamTotal, active && styles.teamTotalActive]}>{t.total}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.meta}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.arrow}>
            <Text style={styles.arrowText}>←</Text>
          </TouchableOpacity>
        ) : <View style={styles.arrow} />}
        <Text style={[styles.round, revisiting && styles.roundRevisiting]}>
          ROUND {roundIndex + 1} OF {roundCount}{revisiting ? '  ·  FIXING' : ''}
        </Text>
        {onForward ? (
          <TouchableOpacity onPress={onForward} hitSlop={12} style={styles.arrow}>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>
        ) : <View style={styles.arrow} />}
        <Text style={styles.dot}>·</Text>
        <Text style={styles.minimum}>NEED {minimum} TO MELD</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: C.surface,
    borderBottomWidth: 2,
    borderBottomColor: C.brass,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 10,
  },
  teams: { flexDirection: 'row', gap: 8 },
  team: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  teamActive: { borderColor: C.brassDim, backgroundColor: C.surfaceRaised },
  teamLabel: { color: C.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  teamLabelActive: { color: C.brassMuted },
  teamTotal: { color: C.textDim, fontSize: 30, fontWeight: '800' },
  teamTotalActive: { color: C.brass },
  meta: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 2 },
  round: { color: C.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  roundRevisiting: { color: C.brass },
  arrow: { width: 26, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  arrowText: { color: C.brass, fontSize: 15, fontWeight: '800' },
  dot: { color: C.textGhost, fontSize: 11 },
  minimum: { color: C.brassMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { C } from '../theme';

interface Props {
  teams: { id: string; label: string; total: number }[];
  /** 0-based index of the round being played. */
  roundIndex: number;
  roundCount: number;
  minimum: number;
  /** Which team the pad is currently collecting, if any. */
  activeTeamId?: string;
}

/**
 * The persistent scoreboard, on every screen where a game is live.
 *
 * The third line is the one that earns its keep: the meld minimum for this
 * round is the question actually asked out loud every round ("what do we need
 * to get down?"), and answering it permanently in chrome costs nothing.
 */
export default function Scoreboard({
  teams, roundIndex, roundCount, minimum, activeTeamId,
}: Props) {
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
        <Text style={styles.round}>ROUND {roundIndex + 1} OF {roundCount}</Text>
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
  dot: { color: C.textGhost, fontSize: 11 },
  minimum: { color: C.brassMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
});

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
  /** When set, the team tiles are the selector: tap one to score it. */
  onSelectTeam?: (teamId: string) => void;
  /** Tapping the NEED line opens the meld calculator. */
  onCheckMeld?: () => void;
  onBack?: () => void;
  onForward?: () => void;
}

/**
 * The persistent scoreboard, on every screen where a game is live.
 *
 * The third line is the one that earns its keep: the meld minimum for this
 * round is the question actually asked out loud every round ("what do we need
 * to get down?"), and answering it permanently in chrome costs nothing. It is
 * also tappable, because the follow-up question — "do I *have* that?" — gets
 * counted two and three times at a real table before anyone is sure.
 *
 * In count-as-you-go mode the two team tiles are also the team selector.
 * Both teams play at once and books go down in any order, so the pad has to
 * switch between them freely. The first version stepped through teams with a
 * NEXT button at the bottom, which read as a linear flow — score one team,
 * then the other, then save — and contradicted the whole point of the mode.
 *
 * The arrows either side of the round are how a past round gets reopened —
 * the same control Crosscourt puts on its set indicator. Round 2 was open at
 * the first real game when someone realised round 1 hadn't been fully
 * counted, and there was no way back.
 */
export default function Scoreboard({
  teams, roundIndex, liveIndex, roundCount, minimum, activeTeamId,
  onSelectTeam, onCheckMeld, onBack, onForward,
}: Props) {
  const revisiting = roundIndex < liveIndex;
  return (
    <View style={styles.bar}>
      <View style={styles.teams}>
        {teams.map(t => {
          const active = t.id === activeTeamId;
          const inner = (
            <>
              <Text style={[styles.teamLabel, active && styles.teamLabelActive]} numberOfLines={1}>
                {t.label.toUpperCase()}
              </Text>
              <Text style={[styles.teamTotal, active && styles.teamTotalActive]}>{t.total}</Text>
            </>
          );
          return onSelectTeam ? (
            <TouchableOpacity
              key={t.id}
              style={[styles.team, styles.teamTappable, active && styles.teamActive]}
              onPress={() => onSelectTeam(t.id)}
              activeOpacity={0.7}
            >
              {inner}
            </TouchableOpacity>
          ) : (
            <View key={t.id} style={[styles.team, active && styles.teamActive]}>{inner}</View>
          );
        })}
      </View>
      {/* Two rows, not one. With FIXING, both arrows, and the CHECK pill all
          present, a single line overflows the phone and clips at both edges. */}
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
      </View>
      <View style={styles.meta}>
        {onCheckMeld ? (
          <TouchableOpacity onPress={onCheckMeld} hitSlop={8} style={styles.needBtn}>
            <Text style={styles.minimum}>NEED {minimum} TO MELD</Text>
            <Text style={styles.needHint}>·  CHECK</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.minimum}>NEED {minimum} TO MELD</Text>
        )}
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
  // A faint outline on the idle tile too, so both read as things you can tap
  // and the brass one reads as the one you're on.
  teamTappable: { borderColor: C.border },
  teamActive: { borderColor: C.brass, backgroundColor: C.surfaceRaised },
  teamLabel: { color: C.textMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
  teamLabelActive: { color: C.brassMuted },
  teamTotal: { color: C.textDim, fontSize: 30, fontWeight: '800' },
  teamTotalActive: { color: C.brass },
  meta: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 2 },
  round: { color: C.textMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
  roundRevisiting: { color: C.brass },
  arrow: { width: 26, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  arrowText: { color: C.brass, fontSize: 15, fontWeight: '800' },
  minimum: { color: C.brassMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
  needBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
    borderWidth: 1, borderColor: C.borderStrong, marginTop: 3,
  },
  needHint: { color: C.brass, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
});

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Text } from '../components/AppText';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useGames } from '../hooks/useGames';
import {
  Game, Round, TeamRound, Denomination, DENOMINATIONS,
  emptyTeamRound, tallyPoints, breakdown, totals, roundMinimum, roundCount,
  teamLabel, playerName,
} from '../hooks/scoring';
import Scoreboard from '../components/Scoreboard';
import CountTile from '../components/CountTile';
import FlipTile from '../components/FlipTile';
import { C } from '../theme';

const freshRound = (game: Game): Round => ({
  teams: game.teams.map(t => emptyTeamRound(t.id)),
});

export default function RoundScreen() {
  // The phone sits face-up on the table for a whole round with long gaps
  // between taps. It must not lock itself mid-count.
  useKeepAwake();
  const router = useRouter();
  const { current, loading, saveCurrent, finishGame } = useGames();

  const [teamIdx, setTeamIdx] = useState(0);
  const [showDeal, setShowDeal] = useState(true);
  const scroller = useRef<ScrollView>(null);
  // Advancing a round or a team must start at the top of the pad. Otherwise
  // the scroll position carries over and the next screen opens halfway down,
  // with the deal prompt off-screen above.
  const toTop = useCallback(() => scroller.current?.scrollTo({ y: 0, animated: false }), []);

  const game = current;
  const draft = useMemo(() => game?.draft ?? (game ? freshRound(game) : null), [game]);

  // The counters are the most-tapped control in the app, and two taps inside
  // one render frame would both read the same `game` from their closure — the
  // second overwriting the first, silently losing a count. A ref updated
  // synchronously on every edit is what makes fast tapping compose.
  const latest = useRef<Game | null>(null);
  useEffect(() => { latest.current = game; }, [game]);

  const applyDraft = useCallback((fn: (d: Round) => Round) => {
    const base = latest.current ?? game;
    if (!base) return;
    const next: Game = { ...base, draft: fn(base.draft ?? freshRound(base)) };
    latest.current = next;
    saveCurrent(next);
  }, [game, saveCurrent]);

  const editTeam = useCallback((teamId: string, fn: (tr: TeamRound) => TeamRound) => {
    applyDraft(d => ({ ...d, teams: d.teams.map(tr => (tr.teamId === teamId ? fn(tr) : tr)) }));
  }, [applyDraft]);

  if (loading) return <SafeAreaView style={styles.container} />;
  if (!game || !draft) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No game in progress.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/setup')}>
            <Text style={styles.primaryBtnText}>START A GAME</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const roundIndex = game.rounds.length;
  const rules = game.rules;
  const team = game.teams[teamIdx];
  const tr = draft.teams.find(t => t.teamId === team.id) ?? emptyTeamRound(team.id);
  const bd = breakdown(tr, rules);

  // Committed totals plus what's on the pad right now, so the scoreboard is
  // never a round behind what people are looking at.
  const committed = totals(game);
  const live = game.teams.map(t => {
    const d = draft.teams.find(x => x.teamId === t.id);
    return {
      id: t.id,
      label: teamLabel(game, t),
      total: (committed[t.id] ?? 0) + (d ? breakdown(d, rules).total : 0),
    };
  });

  const bump = (field: 'cleanBooks' | 'dirtyBooks' | 'redThrees', by: number) =>
    editTeam(team.id, t => ({ ...t, [field]: Math.max(0, t[field] + by) }));

  const bumpTally = (which: 'melded' | 'inHand', d: Denomination, by: number) =>
    editTeam(team.id, t => ({
      ...t,
      [which]: { ...t[which], [d]: Math.max(0, (t[which][d] ?? 0) + by) },
    }));

  // Only one team goes out in a round, so marking one clears the other
  // rather than letting both claim the bonus.
  const toggleGoOut = () => {
    applyDraft(d => ({
      ...d,
      teams: d.teams.map(t =>
        t.teamId === team.id ? { ...t, wentOut: !t.wentOut } : { ...t, wentOut: false },
      ),
    }));
  };

  const togglePerfectDeal = (playerId: string) => {
    const owner = game.teams.find(t => t.playerIds.includes(playerId));
    if (!owner) return;
    editTeam(owner.id, t => ({
      ...t,
      perfectDealBy: t.perfectDealBy.includes(playerId)
        ? t.perfectDealBy.filter(id => id !== playerId)
        : [...t.perfectDealBy, playerId],
    }));
  };

  const dealtPlayers = draft.teams.flatMap(t => t.perfectDealBy);

  const saveRound = () => {
    const base = latest.current ?? game;
    const committed = base.draft ?? draft;
    const next: Game = { ...base, rounds: [...base.rounds, committed], draft: undefined };
    latest.current = next;
    const last = next.rounds.length >= roundCount(rules);
    if (last) {
      Alert.alert(
        'Last Round',
        'That was the final round. Score the game?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Finish',
            onPress: async () => {
              const done = await finishGame(next);
              router.replace({ pathname: '/summary', params: { gameId: done.id } });
            },
          },
        ],
      );
      return;
    }
    saveCurrent(next);
    setTeamIdx(0);
    setShowDeal(true);
    toTop();
  };

  const abandon = () => {
    Alert.alert('Quit Game?', 'This game and every round in it will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Quit',
        style: 'destructive',
        onPress: () => { saveCurrent(null); router.replace('/'); },
      },
    ]);
  };

  const meldedPts = tallyPoints(tr.melded);
  const madeMinimum = meldedPts >= roundMinimum(rules, roundIndex);

  return (
    <SafeAreaView style={styles.container}>
      <Scoreboard
        teams={live}
        roundIndex={roundIndex}
        roundCount={roundCount(rules)}
        minimum={roundMinimum(rules, roundIndex)}
        activeTeamId={team.id}
      />

      <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={styles.body}>
        {/* The one score event known before a card is played. Asked at the
            deal, because nobody remembers twenty minutes later who grabbed
            thirteen twice. */}
        {showDeal && rules.perfectDeal !== 0 && (
          <View style={styles.dealCard}>
            <Text style={styles.dealTitle}>PERFECT DEAL?</Text>
            <Text style={styles.dealSub}>
              Anyone draw two piles of exactly 13? +{rules.perfectDeal} each.
            </Text>
            <View style={styles.chips}>
              {game.players.map(p => {
                const on = dealtPlayers.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => togglePerfectDeal(p.id)}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setShowDeal(false)}>
              <Text style={styles.dealDone}>
                {dealtPlayers.length > 0 ? 'DONE' : 'NOBODY — SKIP'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.teamHead}>
          <Text style={styles.teamHeadName}>{teamLabel(game, team).toUpperCase()}</Text>
          <Text style={styles.teamHeadStep}>TEAM {teamIdx + 1} OF {game.teams.length}</Text>
        </View>

        {/* ---- melded ---- */}
        <Text style={styles.section}>ON THE TABLE</Text>
        <View style={styles.pad}>
          {DENOMINATIONS.map(d => (
            <CountTile
              key={`m${d}`}
              label={`×${d}`}
              count={tr.melded[d]}
              onAdd={() => bumpTally('melded', d, 1)}
              onSubtract={() => bumpTally('melded', d, -1)}
            />
          ))}
        </View>
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>MELDED</Text>
          <Text style={styles.subtotalValue}>{meldedPts}</Text>
          <Text style={[styles.minFlag, madeMinimum ? styles.minFlagOk : styles.minFlagShort]}>
            {madeMinimum ? '✓ PAST MINIMUM' : `${roundMinimum(rules, roundIndex) - meldedPts} SHORT`}
          </Text>
        </View>

        {/* ---- books, go out, red threes ---- */}
        <Text style={styles.section}>BOOKS & BONUSES</Text>
        <View style={styles.row}>
          <FlipTile
            style={{ flex: 1 }}
            label="BOOKS"
            summary={
              tr.cleanBooks + tr.dirtyBooks === 0
                ? '—'
                : `${tr.cleanBooks} clean · ${tr.dirtyBooks} dirty`
            }
            options={[
              { key: 'clean', label: 'CLEAN', sub: `+${rules.cleanBook}` },
              { key: 'dirty', label: 'DIRTY', sub: `+${rules.dirtyBook}` },
            ]}
            onPick={k => bump(k === 'clean' ? 'cleanBooks' : 'dirtyBooks', 1)}
          />
          <View style={styles.rowCol}>
            {rules.goOutEnabled && (
              <TouchableOpacity
                style={[styles.wideBtn, tr.wentOut && styles.wideBtnOn]}
                onPress={toggleGoOut}
              >
                <Text style={[styles.wideBtnText, tr.wentOut && styles.wideBtnTextOn]}>
                  {tr.wentOut ? `WENT OUT +${rules.goOut}` : 'WENT OUT?'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.undoBooks}
              onPress={() => {
                if (tr.dirtyBooks > 0) bump('dirtyBooks', -1);
                else if (tr.cleanBooks > 0) bump('cleanBooks', -1);
              }}
            >
              <Text style={styles.undoBooksText}>REMOVE A BOOK</Text>
            </TouchableOpacity>
          </View>
        </View>

        {tr.perfectDealBy.length > 0 && (
          <TouchableOpacity style={styles.dealEcho} onPress={() => setShowDeal(true)}>
            <Text style={styles.dealEchoText}>
              Perfect deal: {tr.perfectDealBy.map(id => playerName(game, id)).join(', ')}
              {' '}(+{tr.perfectDealBy.length * rules.perfectDeal}) — tap to change
            </Text>
          </TouchableOpacity>
        )}

        {/* ---- what it costs ---- */}
        <Text style={[styles.section, styles.sectionDanger]}>WHAT IT COST YOU</Text>
        {/* Red threes sit here rather than beside the ×5 tile on purpose: at
            -500 apiece a stray tap is the most expensive mistake the app can
            make, more than a clean book is worth. */}
        <View style={styles.row}>
          <CountTile
            label="RED 3s"
            count={tr.redThrees}
            onAdd={() => bump('redThrees', 1)}
            onSubtract={() => bump('redThrees', -1)}
            tone="penalty"
          />
          <View style={styles.redNote}>
            <Text style={styles.redNoteText}>
              {rules.redThree} each
            </Text>
            <Text style={styles.redNoteSub}>
              {tr.redThrees > 0 ? `${tr.redThrees * rules.redThree} so far` : 'hold to remove'}
            </Text>
          </View>
        </View>

        <Text style={styles.subsection}>LEFT IN HAND & FOOT</Text>
        <View style={styles.pad}>
          {DENOMINATIONS.map(d => (
            <CountTile
              key={`h${d}`}
              label={`×${d}`}
              count={tr.inHand[d]}
              onAdd={() => bumpTally('inHand', d, 1)}
              onSubtract={() => bumpTally('inHand', d, -1)}
              tone="penalty"
            />
          ))}
        </View>

        {/* ---- running total ---- */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalKey}>Melded</Text><Text style={styles.totalVal}>{bd.melded}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalKey}>Books</Text><Text style={styles.totalVal}>{bd.books}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalKey}>Bonuses</Text><Text style={styles.totalVal}>{bd.bonuses}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalKey}>Red threes</Text>
            <Text style={[styles.totalVal, bd.redThrees !== 0 && styles.totalValBad]}>{bd.redThrees}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalKey}>In hand</Text>
            <Text style={[styles.totalVal, bd.inHand !== 0 && styles.totalValBad]}>−{bd.inHand}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalKeyBig}>ROUND</Text>
            <Text style={styles.totalValBig}>{bd.total}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={abandon} style={styles.quit}>
          <Text style={styles.quitText}>QUIT GAME</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomBar}>
        {teamIdx > 0 ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setTeamIdx(teamIdx - 1); toTop(); }}>
            <Text style={styles.secondaryBtnText}>← {teamLabel(game, game.teams[teamIdx - 1]).toUpperCase()}</Text>
          </TouchableOpacity>
        ) : <View style={{ flex: 1 }} />}

        {teamIdx < game.teams.length - 1 ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { setTeamIdx(teamIdx + 1); toTop(); }}>
            <Text style={styles.primaryBtnText}>{teamLabel(game, game.teams[teamIdx + 1]).toUpperCase()} →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={saveRound}>
            <Text style={styles.primaryBtnText}>SAVE ROUND {roundIndex + 1}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  body: { padding: 12, paddingBottom: 28, gap: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyText: { color: C.textDim, fontSize: 16 },

  dealCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
    borderColor: C.brassDim, padding: 12, gap: 8,
  },
  dealTitle: { color: C.brass, fontSize: 14, fontWeight: '800', letterSpacing: 1.4 },
  dealSub: { color: C.textDim, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceRaised,
  },
  chipOn: { borderColor: C.brass, backgroundColor: C.brassFaint },
  chipText: { color: C.textDim, fontSize: 14, fontWeight: '700' },
  chipTextOn: { color: C.brass },
  dealDone: { color: C.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, paddingTop: 2 },

  teamHead: { marginTop: 4 },
  teamHeadName: { color: C.text, fontSize: 20, fontWeight: '800' },
  teamHeadStep: { color: C.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 1 },

  section: {
    color: C.brassMuted, fontSize: 11, fontWeight: '800',
    letterSpacing: 1.4, marginTop: 10,
  },
  sectionDanger: { color: C.danger },
  subsection: { color: C.danger, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 4 },
  pad: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  rowCol: { flex: 1, gap: 8 },

  subtotalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  subtotalLabel: { color: C.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  subtotalValue: { color: C.brassBright, fontSize: 20, fontWeight: '800' },
  minFlag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginLeft: 'auto' },
  minFlagOk: { color: C.good },
  minFlagShort: { color: C.textMuted },

  wideBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surfaceRaised, alignItems: 'center', justifyContent: 'center', padding: 10,
  },
  wideBtnOn: { borderColor: C.brass, backgroundColor: C.brassFaint },
  wideBtnText: { color: C.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  wideBtnTextOn: { color: C.brass },
  undoBooks: {
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 10,
  },
  undoBooksText: { color: C.textFaint, fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  dealEcho: { paddingVertical: 4 },
  dealEchoText: { color: C.brassMuted, fontSize: 12 },

  redNote: { flex: 1, justifyContent: 'center', paddingLeft: 4 },
  redNoteText: { color: C.danger, fontSize: 18, fontWeight: '800' },
  redNoteSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },

  totalCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 12, marginTop: 10, gap: 4,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalKey: { color: C.textMuted, fontSize: 13 },
  totalVal: { color: C.textDim, fontSize: 15, fontWeight: '700' },
  totalValBad: { color: C.dangerBright },
  totalDivider: { height: 1, backgroundColor: C.border, marginVertical: 6 },
  totalKeyBig: { color: C.text, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  totalValBig: { color: C.brass, fontSize: 30, fontWeight: '800' },

  quit: { alignItems: 'center', paddingTop: 18 },
  quitText: { color: C.dangerBorder, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },

  bottomBar: {
    flexDirection: 'row', gap: 10, padding: 10,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface,
  },
  primaryBtn: {
    flex: 1, backgroundColor: C.brass, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 15,
  },
  primaryBtnText: { color: C.onBrass, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  secondaryBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: C.borderStrong,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 15,
  },
  secondaryBtnText: { color: C.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});

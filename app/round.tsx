import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Text, BODY_FONT_SCALE } from '../components/AppText';
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
import TeamScorePanel from '../components/TeamScorePanel';
import MeldCheck from '../components/MeldCheck';
import { C } from '../theme';

const freshRound = (game: Game): Round => ({
  teams: game.teams.map(t => emptyTeamRound(t.id)),
});

export default function RoundScreen() {
  // The phone sits face-up on the table for a whole round with long gaps
  // between taps. It must not lock itself mid-count.
  useKeepAwake();
  const router = useRouter();
  const { current, prefs, loading, saveCurrent, finishGame, savePrefs } = useGames();

  const [teamIdx, setTeamIdx] = useState(0);
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);
  const [showDeal, setShowDeal] = useState(true);
  const [meldCheck, setMeldCheck] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const toTop = useCallback(() => scroller.current?.scrollTo({ y: 0, animated: false }), []);

  const game = current;

  // Which round is on screen. Normally the one in progress, but a committed
  // round can be reopened to fix a score — edits then go straight into
  // game.rounds[viewIndex] and persist on every tap, exactly like the draft
  // does, so there is no second save step to forget. `null` means live.
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const viewRef = useRef<number | null>(null);
  useEffect(() => { viewRef.current = viewIndex; }, [viewIndex]);
  useEffect(() => { setViewIndex(null); }, [game?.id]);

  const liveIndex = game?.rounds.length ?? 0;
  const revisiting = viewIndex != null && viewIndex < liveIndex;
  const roundIndex = revisiting ? viewIndex! : liveIndex;

  const draft = useMemo(() => game?.draft ?? (game ? freshRound(game) : null), [game]);
  const round: Round | null = revisiting ? (game?.rounds[viewIndex!] ?? null) : draft;

  // Two taps inside one render frame would both read the same `game` from
  // their closure, the second overwriting the first and silently losing a
  // count. A ref updated synchronously on every edit is what makes fast
  // input compose.
  const latest = useRef<Game | null>(null);
  useEffect(() => { latest.current = game; }, [game]);

  const applyDraft = useCallback((fn: (d: Round) => Round) => {
    const base = latest.current ?? game;
    if (!base) return;
    const idx = viewRef.current;
    const next: Game = idx != null && idx < base.rounds.length
      // Fixing a past round: write it back in place. Later rounds untouched.
      ? { ...base, rounds: base.rounds.map((r, i) => (i === idx ? fn(r) : r)) }
      : { ...base, draft: fn(base.draft ?? freshRound(base)) };
    latest.current = next;
    saveCurrent(next);
  }, [game, saveCurrent]);

  const editTeam = useCallback((teamId: string, fn: (tr: TeamRound) => TeamRound) => {
    applyDraft(d => ({ ...d, teams: d.teams.map(tr => (tr.teamId === teamId ? fn(tr) : tr)) }));
  }, [applyDraft]);

  const replaceTeam = useCallback((next: TeamRound) => {
    // One team going out means the other did not, whichever way it was entered.
    applyDraft(d => ({
      ...d,
      teams: d.teams.map(tr =>
        tr.teamId === next.teamId ? next : (next.wentOut ? { ...tr, wentOut: false } : tr),
      ),
    }));
  }, [applyDraft]);

  if (loading) return <SafeAreaView style={styles.container} />;
  if (!game || !draft || !round) {
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

  const rules = game.rules;
  const minimum = roundMinimum(rules, roundIndex);
  const endOfRound = prefs.scoringMode === 'endOfRound';
  const team = game.teams[teamIdx];
  const tr = round.teams.find(t => t.teamId === team.id) ?? emptyTeamRound(team.id);
  const bd = breakdown(tr, rules);

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

  const dealtPlayers = round.teams.flatMap(t => t.perfectDealBy);

  const goToRound = (idx: number) => {
    setViewIndex(idx >= liveIndex ? null : idx);
    setOpenTeamId(null);
    setTeamIdx(0);
    // A past round already had its deal; the echo line covers changing it.
    setShowDeal(idx >= liveIndex);
    toTop();
  };

  const swapMode = () => {
    savePrefs({ ...prefs, scoringMode: endOfRound ? 'asYouGo' : 'endOfRound' });
    setOpenTeamId(null);
    setTeamIdx(0);
  };

  const saveRound = () => {
    const base = latest.current ?? game;
    const committedRound = base.draft ?? draft;
    const next: Game = { ...base, rounds: [...base.rounds, committedRound], draft: undefined };
    latest.current = next;
    const last = next.rounds.length >= roundCount(rules);
    if (last) {
      Alert.alert('Last Round', 'That was the final round. Score the game?', [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            const done = await finishGame(next);
            router.replace({ pathname: '/summary', params: { gameId: done.id } });
          },
        },
      ]);
      return;
    }
    saveCurrent(next);
    setTeamIdx(0);
    setOpenTeamId(null);
    setShowDeal(true);
    toTop();
  };

  const abandon = () => {
    Alert.alert('Quit Game?', 'This game and every round in it will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Quit', style: 'destructive', onPress: () => { saveCurrent(null); router.replace('/'); } },
    ]);
  };

  const melded = tallyPoints(tr.melded);
  const madeMinimum = melded >= minimum;

  return (
    <SafeAreaView style={styles.container}>
      <Scoreboard
        teams={live}
        roundIndex={roundIndex}
        liveIndex={liveIndex}
        roundCount={roundCount(rules)}
        minimum={minimum}
        activeTeamId={endOfRound ? (openTeamId ?? undefined) : team.id}
        onSelectTeam={endOfRound ? undefined : id => {
          const idx = game.teams.findIndex(t => t.id === id);
          if (idx >= 0) setTeamIdx(idx);
        }}
        onCheckMeld={() => setMeldCheck(true)}
        onBack={roundIndex > 0 ? () => goToRound(roundIndex - 1) : undefined}
        onForward={revisiting ? () => goToRound(roundIndex + 1) : undefined}
      />
      <MeldCheck
        visible={meldCheck}
        minimum={minimum}
        roundNumber={roundIndex + 1}
        onClose={() => setMeldCheck(false)}
      />

      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        // iOS number pads have no return key, so this is the only way to
        // dismiss the keyboard on a screen made of numeric fields.
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {showDeal && rules.perfectDeal !== 0 && (
          <View style={styles.dealCard}>
            <Text style={styles.dealTitle}>PERFECT DEAL?</Text>
            <Text style={styles.dealSub} maxFontSizeMultiplier={BODY_FONT_SCALE}>
              Anyone draw two piles of exactly 13? +{rules.perfectDeal} each.
            </Text>
            {/* One row per team, chips evenly split — the rows then read the
                same as the scoreboard above. A flow layout wrapped four
                names as three-and-one whenever they ran long. */}
            {game.teams.map(t => (
              <View key={t.id} style={styles.chipRow}>
                {t.playerIds.map(id => {
                  const on = dealtPlayers.includes(id);
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => togglePerfectDeal(id)}
                    >
                      <Text
                        style={[styles.chipText, on && styles.chipTextOn]}
                        maxFontSizeMultiplier={BODY_FONT_SCALE}
                        numberOfLines={1}
                      >
                        {playerName(game, id)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <TouchableOpacity onPress={() => setShowDeal(false)}>
              <Text style={styles.dealDone}>
                {dealtPlayers.length > 0 ? 'DONE' : 'NOBODY — SKIP'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {endOfRound ? (
          /* ---- count everything once, at the end ---- */
          <>
            {game.teams.map(t => {
              const row = round.teams.find(x => x.teamId === t.id) ?? emptyTeamRound(t.id);
              return (
                <TeamScorePanel
                  key={t.id}
                  title={teamLabel(game, t)}
                  rules={rules}
                  round={row}
                  open={openTeamId === t.id}
                  onOpen={() => setOpenTeamId(t.id)}
                  // The open face is ~1100pt taller than the closed one. A
                  // ScrollView keeps its offset when content shrinks under
                  // it, so closing from mid-panel would leave the screen
                  // blank until the next touch. RETURN means "back to the
                  // teams" anyway, so go there.
                  onClose={() => { setOpenTeamId(null); toTop(); }}
                  onChange={replaceTeam}
                />
              );
            })}
            {(dealtPlayers.length > 0 || revisiting) && !showDeal && (
              <TouchableOpacity style={styles.dealEcho} onPress={() => setShowDeal(true)}>
                <Text style={styles.dealEchoText} maxFontSizeMultiplier={BODY_FONT_SCALE}>
                  Perfect deal: {dealtPlayers.length
                    ? dealtPlayers.map(id => playerName(game, id)).join(', ')
                    : 'nobody'} — tap to change
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* ---- score a book at a time, as you play ---- */
          <>
            <View style={styles.teamHead}>
              <Text style={styles.teamHeadName} maxFontSizeMultiplier={BODY_FONT_SCALE}>
                {teamLabel(game, team).toUpperCase()}
              </Text>
              <Text style={styles.teamHeadStep}>SCORING · TAP A TEAM UP TOP TO SWITCH</Text>
            </View>

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
              <Text style={styles.subtotalValue}>{melded}</Text>
              <Text style={[styles.minFlag, madeMinimum ? styles.minFlagOk : styles.minFlagShort]}>
                {madeMinimum ? '✓ PAST MINIMUM' : `${minimum - melded} SHORT`}
              </Text>
            </View>

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

            <Text style={[styles.section, styles.sectionDanger]}>WHAT IT COST YOU</Text>
            <View style={styles.row}>
              <CountTile
                label="RED 3s"
                count={tr.redThrees}
                onAdd={() => bump('redThrees', 1)}
                onSubtract={() => bump('redThrees', -1)}
                tone="penalty"
              />
              <View style={styles.redNote}>
                <Text style={styles.redNoteText}>{rules.redThree} each</Text>
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

            <View style={styles.totalCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalKeyBig}>ROUND</Text>
                <Text style={styles.totalValBig}>{bd.total}</Text>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.modeSwap} onPress={swapMode}>
          <Text style={styles.modeSwapText} maxFontSizeMultiplier={BODY_FONT_SCALE}>
            {endOfRound
              ? 'Counting as you play instead? Switch to tap-to-count →'
              : 'Counting the piles at the end instead? Switch to type-it-in →'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={abandon} style={styles.quit}>
          <Text style={styles.quitText}>QUIT GAME</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomBar}>
        {revisiting ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => goToRound(liveIndex)}>
            <Text style={styles.primaryBtnText} numberOfLines={1}>
              ↩︎  BACK TO ROUND {liveIndex + 1}
            </Text>
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
  body: { padding: 12, paddingBottom: 28, gap: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyText: { color: C.textDim, fontSize: 16 },

  dealCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
    borderColor: C.brassDim, padding: 14, gap: 8,
  },
  dealTitle: { color: C.brass, fontSize: 14, fontWeight: '800', letterSpacing: 1.4 },
  dealSub: { color: C.textDim, fontSize: 14, lineHeight: 20 },
  chipRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  chip: {
    flex: 1, alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceRaised,
  },
  chipOn: { borderColor: C.brass, backgroundColor: C.brassFaint },
  chipText: { color: C.textDim, fontSize: 15, fontWeight: '700' },
  chipTextOn: { color: C.brass },
  dealDone: { color: C.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, paddingTop: 2 },

  teamHead: { marginTop: 4 },
  teamHeadName: { color: C.text, fontSize: 20, fontWeight: '800' },
  teamHeadStep: { color: C.textMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, marginTop: 1 },

  section: { color: C.brassMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1.4, marginTop: 6 },
  sectionDanger: { color: C.danger },
  subsection: { color: C.danger, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 },
  pad: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  rowCol: { flex: 1, gap: 8 },

  subtotalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  subtotalLabel: { color: C.textMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
  subtotalValue: { color: C.brassBright, fontSize: 20, fontWeight: '800' },
  minFlag: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8, marginLeft: 'auto' },
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
  undoBooksText: { color: C.textFaint, fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  dealEcho: { paddingVertical: 4 },
  dealEchoText: { color: C.brassMuted, fontSize: 13 },

  redNote: { flex: 1, justifyContent: 'center', paddingLeft: 4 },
  redNoteText: { color: C.danger, fontSize: 18, fontWeight: '800' },
  redNoteSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },

  totalCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 14, marginTop: 6,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalKeyBig: { color: C.text, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  totalValBig: { color: C.brass, fontSize: 30, fontWeight: '800' },

  modeSwap: { paddingTop: 18, alignItems: 'center' },
  modeSwapText: { color: C.brassMuted, fontSize: 13, textAlign: 'center' },

  quit: { alignItems: 'center', paddingTop: 20 },
  quitText: { color: C.dangerBorder, fontSize: 13, fontWeight: '800', letterSpacing: 1.4 },

  bottomBar: {
    flexDirection: 'row', gap: 10, padding: 10,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface,
  },
  primaryBtn: {
    flex: 1, backgroundColor: C.brass, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 15,
  },
  primaryBtnText: { color: C.onBrass, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
});

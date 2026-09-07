// Pure scoring domain. No React, no storage, no imports from the app —
// so it can be reasoned about and tested on its own.

// ---------------------------------------------------------------------------
// Denominations
// ---------------------------------------------------------------------------

// The app does not model cards. It models the four values a card can be
// worth, because a human at the table counts by value ("that's three fifties
// and four tens"), not by rank.
//
// This is the reason the rules screen is cheap: whether 8s and 9s are worth 5
// or 10 is a house rule that changes what a player counts into which pile, and
// changes nothing in this file or in any pad on screen. Every Hand & Foot
// variant collapses to these same four numbers.
export const DENOMINATIONS = [50, 20, 10, 5] as const;
export type Denomination = (typeof DENOMINATIONS)[number];

export type Tally = Record<Denomination, number>;

export const emptyTally = (): Tally => ({ 50: 0, 20: 0, 10: 0, 5: 0 });

export const tallyPoints = (t: Tally): number =>
  DENOMINATIONS.reduce((sum, d) => sum + d * (t[d] ?? 0), 0);

export const tallyCards = (t: Tally): number =>
  DENOMINATIONS.reduce((sum, d) => sum + (t[d] ?? 0), 0);

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/** A card rank and what it's worth. Reference only — see `cardValues`. */
export interface CardValueRow {
  label: string;
  value: number;
}

export interface RuleSet {
  version: 1;

  /** One minimum per round; the array's length *is* the number of rounds. */
  roundMinimums: number[];

  cleanBook: number;
  dirtyBook: number;

  /**
   * Signed, not a magnitude. The family plays red threes at -500, but houses
   * that award them when melded can set this positive without a code change —
   * which is why the arithmetic adds this rather than subtracting it.
   */
  redThree: number;

  perfectDeal: number;

  /**
   * Two fields for one concept, on purpose. "We don't play that" is a
   * different statement from "it's worth zero", and a house that switches the
   * bonus off shouldn't have to remember what number to type to switch it
   * back on.
   */
  goOut: number;
  goOutEnabled: boolean;

  /**
   * Displayed in the rules screen so players can settle an argument about
   * what a nine is worth. Never read by any calculation — scoring runs on
   * denominations, and the mapping from rank to denomination lives in the
   * players' heads where it always has.
   */
  cardValues: CardValueRow[];
}

export const DEFAULT_RULES: RuleSet = {
  version: 1,
  roundMinimums: [60, 90, 120, 150],
  cleanBook: 500,
  dirtyBook: 300,
  redThree: -500,
  perfectDeal: 100,
  goOut: 100,
  goOutEnabled: true,
  cardValues: [
    { label: 'Joker', value: 50 },
    { label: 'Deuce', value: 20 },
    { label: 'Ace', value: 20 },
    { label: '10 – King', value: 10 },
    { label: '4 – 9', value: 5 },
    { label: 'Black three', value: 5 },
    { label: 'Red three', value: -500 },
  ],
};

export const roundCount = (r: RuleSet): number => r.roundMinimums.length;

export const roundMinimum = (r: RuleSet, roundIndex: number): number =>
  r.roundMinimums[roundIndex] ?? r.roundMinimums[r.roundMinimums.length - 1] ?? 0;

// ---------------------------------------------------------------------------
// Game shape
// ---------------------------------------------------------------------------

export interface Player {
  id: string;
  name: string;
}

/**
 * Capped at two teams by the UI, but modelled as a list with a roster.
 * A `teams` array is less code than teamA/teamB fields and costs nothing,
 * which is what makes six-handed play a setup-screen change later rather
 * than a data migration.
 */
export interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

export interface TeamRound {
  teamId: string;
  melded: Tally;
  inHand: Tally;
  cleanBooks: number;
  dirtyBooks: number;
  redThrees: number;
  wentOut: boolean;
  /** Who drew two piles of exactly thirteen. Recorded per player because
   *  that is the half worth reading back at the end of the night. */
  perfectDealBy: string[];
}

export interface Round {
  teams: TeamRound[];
}

export interface Game {
  id: string;
  startedAt: number;
  finishedAt?: number;
  /** Frozen at kickoff. Editing the rules changes the *next* game, never a
   *  game already played — otherwise old scores silently re-compute under
   *  rules nobody sat down to. */
  rules: RuleSet;
  players: Player[];
  teams: Team[];
  rounds: Round[];
  /** The round being entered right now, not yet committed. Lives on the game
   *  so a single write persists it — a phone that dies mid-round shouldn't
   *  cost the table a round they'd have to reconstruct from memory. */
  draft?: Round;
}

export const emptyTeamRound = (teamId: string): TeamRound => ({
  teamId,
  melded: emptyTally(),
  inHand: emptyTally(),
  cleanBooks: 0,
  dirtyBooks: 0,
  redThrees: 0,
  wentOut: false,
  perfectDealBy: [],
});

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface Breakdown {
  melded: number;
  books: number;
  bonuses: number;
  redThrees: number;
  inHand: number;
  total: number;
}

export function breakdown(tr: TeamRound, r: RuleSet): Breakdown {
  const melded = tallyPoints(tr.melded);
  const books = tr.cleanBooks * r.cleanBook + tr.dirtyBooks * r.dirtyBook;
  const bonuses =
    tr.perfectDealBy.length * r.perfectDeal +
    (tr.wentOut && r.goOutEnabled ? r.goOut : 0);
  const redThrees = tr.redThrees * r.redThree;
  const inHand = tallyPoints(tr.inHand);
  return {
    melded,
    books,
    bonuses,
    redThrees,
    inHand,
    total: melded + books + bonuses + redThrees - inHand,
  };
}

export const teamRoundScore = (tr: TeamRound, r: RuleSet): number =>
  breakdown(tr, r).total;

/** Cumulative score per team id, through `throughRound` rounds (all by default). */
export function totals(game: Game, throughRound?: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of game.teams) out[t.id] = 0;
  const rounds = throughRound == null ? game.rounds : game.rounds.slice(0, throughRound);
  for (const round of rounds) {
    for (const tr of round.teams) {
      out[tr.teamId] = (out[tr.teamId] ?? 0) + teamRoundScore(tr, game.rules);
    }
  }
  return out;
}

export const isComplete = (game: Game): boolean =>
  game.rounds.length >= roundCount(game.rules);

/** Winning team ids. A list because a tie is possible and pretending it
 *  isn't would put the wrong name on the export. */
export function winners(game: Game): string[] {
  const t = totals(game);
  const best = Math.max(...Object.values(t));
  return Object.keys(t).filter(id => t[id] === best);
}

export const playerName = (game: Game, id: string): string =>
  game.players.find(p => p.id === id)?.name ?? '—';

export const teamName = (game: Game, id: string): string =>
  game.teams.find(t => t.id === id)?.name ?? '—';

export const teamLabel = (game: Game, team: Team): string =>
  team.playerIds.map(id => playerName(game, id)).join(' & ') || team.name;

// ---------------------------------------------------------------------------
// Superlatives
// ---------------------------------------------------------------------------

export interface Superlative {
  title: string;
  who: string;
  detail: string;
}

/**
 * What the export is actually for. A four-round score grid is what the
 * spreadsheet already printed; this is the part worth sending to the group
 * chat. Entries with nothing to say are dropped rather than shown empty —
 * "Most red threes: nobody, 0" is not a joke, it's noise.
 */
export function superlatives(game: Game): Superlative[] {
  const out: Superlative[] = [];
  const r = game.rules;
  const label = (id: string) => {
    const t = game.teams.find(x => x.id === id);
    return t ? teamLabel(game, t) : '—';
  };

  // Biggest single round.
  let best = { id: '', round: -1, score: -Infinity };
  game.rounds.forEach((round, i) => {
    round.teams.forEach(tr => {
      const s = teamRoundScore(tr, r);
      if (s > best.score) best = { id: tr.teamId, round: i, score: s };
    });
  });
  if (best.round >= 0) {
    out.push({
      title: 'Biggest round',
      who: label(best.id),
      detail: `${best.score} in round ${best.round + 1}`,
    });
  }

  // Most books laid down.
  const books: Record<string, number> = {};
  const clean: Record<string, number> = {};
  for (const round of game.rounds) {
    for (const tr of round.teams) {
      books[tr.teamId] = (books[tr.teamId] ?? 0) + tr.cleanBooks + tr.dirtyBooks;
      clean[tr.teamId] = (clean[tr.teamId] ?? 0) + tr.cleanBooks;
    }
  }
  const bookLeader = Object.keys(books).sort((a, b) => books[b] - books[a])[0];
  if (bookLeader && books[bookLeader] > 0) {
    out.push({
      title: 'Most books',
      who: label(bookLeader),
      detail: `${books[bookLeader]} total, ${clean[bookLeader] ?? 0} clean`,
    });
  }

  // Red threes, which cost more than anything else in the game.
  const reds: Record<string, number> = {};
  for (const round of game.rounds) {
    for (const tr of round.teams) reds[tr.teamId] = (reds[tr.teamId] ?? 0) + tr.redThrees;
  }
  const redLeader = Object.keys(reds).sort((a, b) => reds[b] - reds[a])[0];
  if (redLeader && reds[redLeader] > 0) {
    out.push({
      title: 'Red three magnet',
      who: label(redLeader),
      detail: `${reds[redLeader]} of them, ${reds[redLeader] * r.redThree} points`,
    });
  }

  // The fattest hand anyone got caught holding.
  let caught = { id: '', round: -1, points: 0 };
  game.rounds.forEach((round, i) => {
    round.teams.forEach(tr => {
      const p = tallyPoints(tr.inHand);
      if (p > caught.points) caught = { id: tr.teamId, round: i, points: p };
    });
  });
  if (caught.round >= 0) {
    out.push({
      title: 'Caught holding',
      who: label(caught.id),
      detail: `−${caught.points} left in hand, round ${caught.round + 1}`,
    });
  }

  // Perfect deals, the one bonus attributed to a person.
  const deals: Record<string, number> = {};
  for (const round of game.rounds) {
    for (const tr of round.teams) {
      for (const pid of tr.perfectDealBy) deals[pid] = (deals[pid] ?? 0) + 1;
    }
  }
  const dealLeader = Object.keys(deals).sort((a, b) => deals[b] - deals[a])[0];
  if (dealLeader) {
    out.push({
      title: 'Cuts like a machine',
      who: playerName(game, dealLeader),
      detail: `${deals[dealLeader]} perfect deal${deals[dealLeader] === 1 ? '' : 's'}`,
    });
  }

  // Go-outs.
  const outs: Record<string, number> = {};
  for (const round of game.rounds) {
    for (const tr of round.teams) if (tr.wentOut) outs[tr.teamId] = (outs[tr.teamId] ?? 0) + 1;
  }
  const outLeader = Object.keys(outs).sort((a, b) => outs[b] - outs[a])[0];
  if (outLeader && r.goOutEnabled) {
    out.push({
      title: 'First to the finish',
      who: label(outLeader),
      detail: `went out ${outs[outLeader]} time${outs[outLeader] === 1 ? '' : 's'}`,
    });
  }

  return out;
}

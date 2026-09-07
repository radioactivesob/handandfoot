// Scoring tests. No test runner on purpose — scoring.ts imports nothing,
// so tsc can emit it standalone and node can check the arithmetic.
//
//   npm test
//
// The numbers below are hand-computed from the house rules in DESIGN.md.
// If a rule changes, change the expected value here first.

const S = require('../.scoring-build/scoring.js');
let fails = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
  else console.log(`ok   ${name} = ${JSON.stringify(got)}`);
};

const R = S.DEFAULT_RULES;

// Hand-computed round:
//   melded  3x50 + 4x20 + 6x10 + 5x5 = 150+80+60+25 = 315
//   books   2 clean (1000) + 1 dirty (300)          = 1300
//   bonuses 1 perfect deal (100) + went out (100)   =  200
//   red 3s  1 x -500                                = -500
//   in hand 2x10 + 3x5 = 20 + 15                    =  -35
//   total                                              1280
const tr = {
  teamId: 'A',
  melded:  { 50: 3, 20: 4, 10: 6, 5: 5 },
  inHand:  { 50: 0, 20: 0, 10: 2, 5: 3 },
  cleanBooks: 2, dirtyBooks: 1, redThrees: 1,
  wentOut: true, perfectDealBy: ['p1'],
};
const bd = S.breakdown(tr, R);
eq('melded', bd.melded, 315);
eq('books', bd.books, 1300);
eq('bonuses', bd.bonuses, 200);
eq('redThrees', bd.redThrees, -500);
eq('inHand', bd.inHand, 35);
eq('round total', bd.total, 1280);

// Go-out switched off must drop exactly the go-out bonus, not the perfect deal.
const off = { ...R, goOutEnabled: false };
eq('go-out off', S.breakdown(tr, off).total, 1180);

// Red threes as a house bonus rather than a penalty — the signed field.
const friendly = { ...R, redThree: 100 };
eq('red 3 positive', S.breakdown(tr, friendly).total, 1880);

// Minimums index by round, and clamp past the end rather than returning undefined.
eq('minimums', [0,1,2,3].map(i => S.roundMinimum(R, i)), [60,90,120,150]);
eq('minimum past end', S.roundMinimum(R, 9), 150);
eq('round count', S.roundCount(R), 4);

// An empty round is 0, not NaN.
eq('empty round', S.breakdown(S.emptyTeamRound('A'), R).total, 0);

// Totals accumulate across rounds and a tie reports both teams.
const game = {
  id: 'g', startedAt: 0, rules: R,
  players: [{id:'p1',name:'Ann'},{id:'p2',name:'Bo'}],
  teams: [{id:'A',name:'T1',playerIds:['p1']},{id:'B',name:'T2',playerIds:['p2']}],
  rounds: [
    { teams: [ {...S.emptyTeamRound('A'), cleanBooks:1}, {...S.emptyTeamRound('B'), dirtyBooks:1} ] },
    { teams: [ {...S.emptyTeamRound('A'), redThrees:1}, {...S.emptyTeamRound('B'), cleanBooks:1, dirtyBooks:1} ] },
  ],
};
eq('totals', S.totals(game), { A: 0, B: 1100 });   // A: 500-500=0, B: 300+800
eq('winner', S.winners(game), ['B']);
const tie = { ...game, rounds: [ { teams: [ {...S.emptyTeamRound('A'), cleanBooks:1}, {...S.emptyTeamRound('B'), cleanBooks:1} ] } ] };
eq('tie reports both', S.winners(tie), ['A','B']);
eq('team label', S.teamLabel(game, game.teams[0]), 'Ann');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails ? 1 : 0);

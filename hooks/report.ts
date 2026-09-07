// The printable scorecard. Pure string building — no React, no file system.
//
// Deliberately no images: expo-print on iOS renders through WKWebView, which
// cannot load local asset URLs, so anything visual has to be CSS or a base64
// blob. CSS is enough here.

import {
  Game, totals, teamLabel, breakdown, roundMinimum, winners, superlatives, teamRoundScore,
} from './scoring';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const dateLine = (ts: number): string =>
  new Date(ts).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

export function reportHtml(game: Game): string {
  const t = totals(game);
  const win = winners(game);
  const tied = win.length > 1;
  const sups = superlatives(game);

  const headline = tied
    ? `Tied at ${t[win[0]] ?? 0}`
    : `${teamLabel(game, game.teams.find(x => x.id === win[0])!)} win, ${t[win[0]] ?? 0}`;

  const roundRows = game.rounds.map((round, i) => {
    const cells = game.teams.map(tm => {
      const tr = round.teams.find(x => x.teamId === tm.id);
      const bd = tr ? breakdown(tr, game.rules) : null;
      if (!bd) return '<td class="n">—</td>';
      const bits: string[] = [];
      if (tr!.cleanBooks) bits.push(`${tr!.cleanBooks} clean`);
      if (tr!.dirtyBooks) bits.push(`${tr!.dirtyBooks} dirty`);
      if (tr!.redThrees) bits.push(`${tr!.redThrees} red 3`);
      if (tr!.wentOut && game.rules.goOutEnabled) bits.push('out');
      return `<td class="n"><b>${bd.total}</b>${
        bits.length ? `<span class="bits">${esc(bits.join(' · '))}</span>` : ''
      }</td>`;
    }).join('');
    return `<tr><td class="r">Round ${i + 1}<span class="bits">min ${roundMinimum(game.rules, i)}</span></td>${cells}</tr>`;
  }).join('');

  const totalCells = game.teams
    .map(tm => `<td class="n total">${t[tm.id] ?? 0}</td>`)
    .join('');

  const supRows = sups.map(s => `
    <div class="sup">
      <div class="supTitle">${esc(s.title)}</div>
      <div class="supWho">${esc(s.who)}</div>
      <div class="supDetail">${esc(s.detail)}</div>
    </div>`).join('');

  const r = game.rules;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { margin: 40px; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #16241d; }
  h1 { font-size: 30px; margin: 0; letter-spacing: -0.5px; }
  .date { color: #6b7a72; font-size: 13px; margin-top: 4px; }
  .headline {
    margin: 22px 0; padding: 16px 18px; background: #0C2018; color: #D9A441;
    border-radius: 10px; font-size: 22px; font-weight: 800;
  }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { padding: 9px 10px; border-bottom: 1px solid #dfe6e2; font-size: 14px; }
  th { text-align: right; font-size: 11px; letter-spacing: 1px; color: #6b7a72; text-transform: uppercase; }
  th:first-child, td.r { text-align: left; }
  td.n { text-align: right; }
  td.r { color: #6b7a72; font-size: 13px; }
  .bits { display: block; font-size: 10px; color: #8b9a92; font-weight: 400; margin-top: 2px; }
  .total { font-size: 22px; font-weight: 800; color: #0C2018; border-top: 2px solid #0C2018; }
  h2 { font-size: 12px; letter-spacing: 1.5px; color: #6b7a72; text-transform: uppercase; margin: 28px 0 10px; }
  .sups { display: flex; flex-wrap: wrap; gap: 10px; }
  .sup { flex: 1 1 44%; border: 1px solid #dfe6e2; border-radius: 10px; padding: 12px 14px; }
  .supTitle { font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; color: #9a7a2a; font-weight: 700; }
  .supWho { font-size: 17px; font-weight: 800; margin-top: 3px; }
  .supDetail { font-size: 12px; color: #6b7a72; margin-top: 2px; }
  .rules { margin-top: 26px; font-size: 11px; color: #8b9a92; line-height: 1.7; border-top: 1px solid #dfe6e2; padding-top: 12px; }
</style></head>
<body>
  <h1>Hand &amp; Foot</h1>
  <div class="date">${esc(dateLine(game.startedAt))}</div>

  <div class="headline">${esc(headline)}</div>

  <table>
    <tr><th></th>${game.teams.map(tm => `<th>${esc(teamLabel(game, tm))}</th>`).join('')}</tr>
    ${roundRows}
    <tr><td class="r"><b>Final</b></td>${totalCells}</tr>
  </table>

  ${sups.length ? `<h2>For the record</h2><div class="sups">${supRows}</div>` : ''}

  <div class="rules">
    Played by: ${r.roundMinimums.join(' / ')} minimums &middot;
    clean book ${r.cleanBook} &middot; dirty book ${r.dirtyBook} &middot;
    red three ${r.redThree} &middot; perfect deal +${r.perfectDeal} &middot;
    go out ${r.goOutEnabled ? `+${r.goOut}` : 'not played'}.
  </div>
</body></html>`;
}

/** Short enough to read in a notification, complete enough to settle it. */
export function textSummary(game: Game): string {
  const t = totals(game);
  const line = game.teams
    .map(tm => `${teamLabel(game, tm)}: ${t[tm.id] ?? 0}`)
    .join('\n');
  const win = winners(game);
  const head = win.length > 1
    ? `Dead tie at ${t[win[0]] ?? 0}.`
    : `${teamLabel(game, game.teams.find(x => x.id === win[0])!)} take it.`;
  const sups = superlatives(game)
    .map(s => `${s.title}: ${s.who} (${s.detail})`)
    .join('\n');
  return `Hand & Foot — ${dateLine(game.startedAt)}\n\n${head}\n\n${line}\n\n${sups}`;
}

export const reportFileName = (game: Game): string => {
  const d = new Date(game.startedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `handfoot-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.pdf`;
};

/** Re-exported so screens don't reach past this module for round scores. */
export { teamRoundScore };

# Hand & Foot — design notes

A scorekeeper for the family's Hand and Foot game. Third sibling to
[Hardwoods](https://github.com/radioactivesob/hardwoods) (basketball) and
Crosscourt (volleyball) — same architecture and build pipeline, deliberately
different domain, palette, and store listing.

Working title only; see Open items.

## Where things stand

**Built and typechecking** (Sept 2026): the scoring domain, the persistent
scoreboard, round entry with the tally pad and the flip tile, per-round
perfect-deal capture, the rules screen, past games, the final summary with
superlatives, and PDF + plain-text export.

Structure mirrors the siblings: pure domain in `hooks/scoring.ts` (no React, no
storage), storage and state in `hooks/useGames.ts`, printable output in
`hooks/report.ts`, colours only in `theme.ts`.

**Verified in the iOS Simulator** (Sept 2026) — a full four-round game played
end to end: setup, the perfect-deal prompt, the tally pad, the book flip, the
go-out toggle, red threes and the in-hand pad, round commit with the minimum
advancing 60 → 90 → 120 → 150, the final summary with superlatives, and a
27 KB PDF built by `expo-print` and offered through the share sheet under its
own filename.

`npm test` compiles `hooks/scoring.ts` standalone and checks the arithmetic
against hand-computed rounds — including go-out disabled, a positive red three,
and a tie. No test runner: the domain file imports nothing, so `tsc` plus
`node` is the whole harness.

**Icon and splash done** (Sept 2026): two overlapping cards — the hand and the
foot — on felt, the front one a red three, which is the rule that hurts most.
Source in `assets/icon-source.svg`, re-export with `rsvg-convert`. The splash
background is `#0C2018`, the same value as `theme.ts` and the icon ground, so
launch flows into the app without a seam.

**EAS project linked**: `@radioactivesob/handandfoot`, id
`dd8d0420-0176-4c30-abb4-0a701ae94319`. `npx expo-doctor` passes 21/21 and
`npx expo export --platform ios` produces a clean 2.5 MB Hermes bundle.

**On a phone via TestFlight** since Sept 2026, with credentials on the EAS
server and an App Store Connect record (ASC app id `6809561558`, now in
`eas.json`, so `eas submit --latest --non-interactive` needs no Apple login).
**Build 6 (`b62daa5`) is the store-submission build** — Sept 19, 2026. It
supersedes build 5 with the deal-card blanking fix and the felt-green window
background; `supportsTablet` has been off since build 5. Listing copy is in `docs/APP_STORE.md`,
screenshots in `docs/screenshots/`, and the privacy and support pages are
live on GitHub Pages. The store name is "Hand and Foot Game Buddy" — "Hand &
Foot Score Keeper" was taken. The whole release path is non-interactive:
doctor → `eas build` → `eas submit`, credentials and the app record on the
EAS server. Two real games
played on it so far. Not done: the JPEG share card — text and PDF only.

**The software keyboard is field-tested, not simulator-tested.** The simulator
connects the hardware keyboard by default, so no on-screen keyboard ever
appeared during any walkthrough here and the whole class of overlap bugs
stayed invisible — the same trap Crosscourt shipped to a real phone. It was
verified the only way it could be: at the table. Second real game, Sept 2026 —
a pile of 35 cards at ×5 went in through the number pad, the small counts
through the steppers, and a full round was scored that way. So the numeric
fields, `keyboardDismissMode="on-drag"` for a pad with no return key, and the
typed-plus-steppers pairing all hold up in use. Setup's four name fields have
not had the same scrutiny but are ordinary text inputs on a screen with no
overlap risk.

## The house rules

As played by the family, and the defaults the app ships with:

| Rule | Value |
|---|---|
| Players | 4, in two fixed partnerships |
| Decks | 4, jokers included |
| Rounds | 4 |
| Round minimums | 60 / 90 / 120 / 150 |
| Clean book (no wilds, red on top) | +500 |
| Dirty book (wilds, black on top) | +300 |
| Red three | **−500 each** |
| Perfect deal | +100 (drew exactly 13 twice, without counting) |
| Go out | +100 (new — on by default, toggleable) |

**Card values, as played:**

| Cards | Value |
|---|---|
| Joker | 50 |
| Deuce, Ace | 20 |
| 10 – King | 10 |
| 4 – 9, black three | 5 |
| Red three | −500 |

Note the split: **4 through 9 are worth 5**, and only 10 through King are worth
10. The other common variant puts 8s and 9s at 10 points, which is a meaningful
swing across four rounds — worth stating explicitly so nobody "corrects" it into
the wrong variant later.

**Cards left in hand or in foot count against you** at those same values.

**The go-out bonus is new.** The family has never played it; it is in because
they liked the idea. It ships **on at +100** and has an explicit off switch in
the rules — the one bonus with a real toggle rather than just an editable
number, because "we don't play that" is a different statement from "it's worth
zero," and a house that turns it off should not have to remember what to type
to turn it back on.

## Round score

For each team, each round:

```
  Σ melded card values          (what's on the table)
+ cleanBooks  × 500
+ dirtyBooks  × 300
+ perfectDeals × 100            (per player, awarded at the deal)
+ goOut ? 100 : 0
− redThrees   × 500
− Σ card values left in hand and foot
```

Everything above the red-three line is a counter. Nothing is typed.

## Locked decisions

**Separate app, not a mode.** Same reasoning as Crosscourt's split from
Hardwoods, and stronger here — a card game is not a sport, and neither existing
listing can rank for "hand and foot score." New repo, copied skeleton: Expo
SDK 57, expo-router, AsyncStorage, `components/AppText`, keep-awake,
persist-on-every-tap, `expo-print` + `react-native-view-shot`, and the
`theme.ts` single-palette rule. New palette — felt green or oxblood, nothing
near Crosscourt's espresso-and-gold or Hardwoods' orange.

**Tally in card units, never a number pad.** The arithmetic was never the hard
part; Excel already sums. What's tedious at the table is counting the face
values of everything melded while three people wait. So the primary input is
four big counters — **×50 / ×20 / ×10 / ×5** — which covers every card in the
deck, plus counters for books. Tap to increment, long-press to decrement,
running subtotal live above the pad.

The four denominations are **invariant under every card-value house rule**. It
does not matter whether 8s and 9s are worth 5 or 10 — the pad still has exactly
four tiles, and the card-to-value mapping stays pure rules configuration that
never touches the UI. That property is what makes the rules screen cheap. This is the entire reason to build this
instead of using one of the App Store scorers, all of which hand you a keypad.

**Score per team, attribute the perfect deal per player.** Partnerships are
fixed and the score is a team number, but the perfect deal is a thing a *person*
did, and it is the best line on the export. It is recorded against the player.

Going out stays team-level, deliberately. In a partnership game it is a team
achievement — your partner's foot is half of why you could — and asking *which
of you* physically discarded last is an extra tap at the exact moment everyone
is already talking. Per-player go-out attribution is deferred; the field can be
added without moving anything else.

**Exactly two teams, any number of players per team.** Hand and Foot is really
played 2-, 3-, 5-, and 6-handed, and the scoring math is entirely indifferent to
the count — books, red threes, minimums, and card values all work unchanged. The
thing that scales badly is *teams*, not players: two totals sit comfortably in a
persistent top bar, three or four columns squeeze it, and six people playing as
individuals destroys the design outright.

So the model is `teams: Team[]` with `Team = { id, name, playerIds }`, capped at
two. That covers head-to-head (two teams of one), the family's 4-in-2, and
6-in-two-teams-of-three — every partnership configuration — while the scoreboard
stays a two-column design permanently. What it gives up is individual
free-for-all play, which is the rarer variant and the one that would cost a
redesign rather than a field.

This is not speculative work: a `teams` array is *less* code than hard-coded
`teamA` / `teamB` fields, and it avoids a migration if the table ever grows. The
**setup UI still ships fixed at four names in two pairs**, because that is what
the family plays. Supporting six later is a setup-screen change and nothing else.

**The perfect-deal bonus is captured at the deal, not at the end.** It is the
only score event in the game that is known *before* any cards are played.
Offering it only in end-of-round entry means someone has to remember, twenty
minutes later, which of four people grabbed thirteen twice — and they won't. So
the round opens with a one-tap prompt naming the four players, skippable, and
the bonus also stays available in round entry as a fallback.

**Red threes get destructive weight.** At −500 a red three costs more than a
clean book is worth, so a stray tap is the most expensive mistake the app can
make. It does not sit next to the ×5 counter, it is styled with the danger
palette rather than the scoring gold, and its count is echoed in the round
summary before the round commits.

**The rule set is stamped onto each game, not read live.** House rules drift —
someone will argue red threes down to −300 next Thanksgiving. A global settings
object read at render time means every past game silently re-scores under rules
nobody played by. Each `Game` carries its own frozen `RuleSet`, and the rules
screen edits the defaults for the *next* game. Same lesson as Crosscourt's
`GameEntry.sets`: record it, don't re-derive it.

**Two ways to count, and the table picks one.** Revised Sept 2026 after the
first real look at the app. The original design assumed you score as you play —
a tile tap per book, per card. The family counts the piles **once, at the end of
the round**, which makes tap-counting actively bad: thirty five-point cards is
thirty taps while three people wait. So `endOfRound` is the default and
`asYouGo` is a preference.

This is a **preference, not a rule** — it changes how numbers are entered, never
what they are worth. So it lives outside `RuleSet` and is deliberately *not*
frozen onto a game: someone will want to switch halfway through, and nothing
about the scoring stops them.

**End-of-round entry is typed, not tapped.** A number field with steppers either
side: type `30`, or nudge ±1 when correcting. The steppers stay because a
correction is almost always one card and summoning a keyboard for that is worse
than the tap it replaces.

**One panel per team, and it stays turned over.** This is the treatment from
Hardwoods' scorebook — a panel you open and fill in. Tap a team's panel, it
turns over, and everything that team scored this round is on the back: books,
what is on the table, what they got caught holding. It stays turned until DONE.
A panel that flipped back after each entry would be unusable, which is the
mistake the first version made by putting the flip on a *counter*.

The flip still belongs only where you are making a choice or opening a form —
never on a control you hit repeatedly. That original instinct was right; it was
attached to the wrong control.

The panel swaps faces at the halfway point of the rotation rather than stacking
two absolutely-positioned faces. That costs a line of timing code and buys a
panel whose height follows its own content, which matters because the back is
roughly six times taller than the front and both have to grow again when
someone turns their phone's text size up.

**A flip must not leave a 3D transform behind.** Found Sept 2026, on a real
phone, and it is the kind of bug that reads as "the design is just a bit
cheap" rather than as a defect.

The obvious way to turn a view over is to rotate it a full 180° and
counter-rotate its content so the text is not mirrored. That is what the first
version did, and it means the panel sits in a *composed* 3D transform for as
long as it is open. iOS responds by keeping the view in an offscreen
rasterized layer and resampling it, so every glyph is drawn once into a bitmap
and then scaled. The text is visibly soft the entire time the panel is open —
not just while it animates. Two people noticed it before anyone could say why.

The same offscreen compositing pass, with `overflow: hidden` in the mix, is
also what made a *sibling* view — the panel above — flash half black for a
second or two on device.

`hooks/useHalfFlip.ts` goes half way and back instead: 0° → 90° turns the view
edge-on, the face swaps while nobody can see it, then −90° → 0° brings it back.
Two things fall out, both good — at rest the transform is removed entirely, so
text renders at native resolution and no offscreen layer lingers; and the
rotation never passes 90°, so content is never mirrored and needs no
counter-rotation at all. `backfaceVisibility` and the stacked
absolutely-positioned faces are both gone.

The lesson generalises past this app: **animate with a transform, then take the
transform away.** Anything left in a 3D transform at rest pays for it in text
quality.

**And then the second half of the same bug, on the phone only.** The panel
above the one being tapped — the Perfect Deal card — still went half black,
or all black, for a moment. The at-rest fix cured the text; it did not touch
the 260ms of animation, which still rotated in 3D with `perspective`. A
perspective rotation is not confined to the view's rectangle: the edge
swinging toward the viewer projects outward over the sibling above, Core
Animation composites the overlap in an offscreen pass, and on a real GPU the
covered region of that sibling can drop out for a frame and show the
window background — which was black. Left half when the near edge was on the
left; the whole card when the projected bounds swallowed it. It never once
reproduced in the simulator.

Two fixes, belt and braces. `useHalfFlip` now animates `scaleX` — a plain
affine transform with no 3D context, nothing projected outside the bounds,
nothing to composite offscreen; it still reads as a card turning. And
`expo.backgroundColor` in `app.json` is the felt green, so if anything ever
drops out again it shows green on green rather than black. That one is
native config and takes a build.

**Row labels come from the rules, not from the code.** The panel names each
denomination with the ranks that earn it — "Joker", "Deuce, Ace", "10 – King",
"4 – 9, Black three" — derived from `cardValues` by grouping on value. A house
that plays 8s and 9s as ten-pointers sees "8 – King" on the ten row without a
code change. This is the payoff for keeping the rank-to-value mapping as
configuration; it was reference-only until the panels needed to call a row
something a person would recognise at a card table.

**Nothing commits until the round advances.** Both teams' numbers are held in a
`draft` on the game and written together when the round is saved, so any
correction before that is an edit, not an undo. In `endOfRound` mode both team
panels sit on one screen, closed, with the running round score on each face —
one is open at a time. In `asYouGo` mode the tap pad is shown one team at a
time, because the full pad does not fit on a phone twice over.

**Cards left in hand start folded away.** Usually one team goes out and only the
other is holding anything, so showing four zero fields to everybody every round
is noise. It opens on a tap, and stays open on its own whenever the count is
non-zero.

**Melded and in-hand are two separate sections, not one with a sign toggle.**
They use the same four denominations and differ only in sign, which is precisely
why a mode switch is dangerous — entering 200 melded points into the penalty
column is a 400-point swing and looks completely plausible on screen. In-hand is
styled in the danger palette, sits below a rule, and is folded away by default.

**Dynamic Type is capped at 1.3× for grids and 2.4× for prose.** The 1.3 cap
came over from Crosscourt to stop 3× accessibility text shattering dense
fixed-height layouts, and for a tap grid it is right. Applying it to a rules
summary is just making text small for no reason — a 13px line reaches 17px at
iOS's largest setting, which is not what someone who has turned their phone's
text all the way up is expecting. `BODY_FONT_SCALE` is the opt-in for anything
that sits in a scroll view and can simply get taller.

**Export is two artifacts.** A JPEG card is what actually gets sent, because it
lands in the family group text as an image instead of an attachment nobody
opens; the PDF is the record. Both paths already exist in the sibling apps.

**The card is superlatives, not a table.** A four-round score grid is what the
spreadsheet already prints. The thing worth building is biggest single round,
most books, most red threes eaten, who went out most, and the fattest negative
hand — which is what the export is for in the first place.

## The persistent scoreboard

Crosscourt's `scoreBar` translates almost directly. It carries:

- both team totals, running
- `ROUND 2 OF 4`
- **the meld minimum for this round** — 60/90/120/150

That last line is the question actually asked out loud every single round
("what do we need to get down?"). Answering it in chrome, permanently, for free,
is the detail that makes the app feel like it was built by someone who plays.

## Screens

| Screen | Does |
|---|---|
| Home | Mode picker, sibling-style. New game / resume / history / rules |
| Setup | Four names, two partnerships. Remembers the usual four |
| Deal | Per-round perfect-deal prompt. One tap, skippable |
| Round | The tally pad, one team at a time. The main screen |
| Summary | Round-by-round grid, final totals |
| Rules | Every value in the table above, editable |
| Export | JPEG smack-talk card + PDF record |

## What the first real game changed

Sept 2026. All three are the table correcting the design, and two of them
reverse decisions recorded above. Built and verified on the simulator; on the
phone from the next build.

**The penalty section is permanently visible.** Cards left in hand and foot
subtract at face value and the total goes negative — the model always did
this. But the panel hid the section behind a small `+ Cards left in hand`
link, off by default, to keep the panel short. Nobody found a grey link with
four people waiting, so a player caught with a full hand could not be scored
and the table concluded the app "had no way to enter negatives." This was the
compromise the locked decision above warned against. It is now always shown,
in the danger palette, with a one-line explanation of what it is, and a
negative round total reads red on both faces of the panel.

**Rounds are revisitable.** Round 2 was open when someone realised round 1 had
not been fully counted, and there was no way back. `←` / `→` on the
scoreboard's round indicator — Crosscourt's set control — move between rounds.
A reopened round shows `FIXING` in brass, its own meld minimum, both panels
pre-filled, and a `BACK TO ROUND N` button where SAVE would be. Edits go
straight into `game.rounds[i]` and persist on every tap, exactly as the draft
does, so there is no second save step to forget; later rounds are untouched and
the totals recompute live. Verified: a clean book added to round 1 moved the
scoreboard from −1000 to −500 on the spot.

**One exit per phase, named for what it does.** The panel had two DONE
buttons, a chip top-right and a button at the bottom, doing the identical
thing. The table read them — correctly — as two *different* things. The real
flow is books first for both teams (they are the piles), then loose cards, so
each panel is opened twice a round and the first visit ends after BOOKS. The
chip is gone; `↩ RETURN` sits directly after BOOKS with "books are in — come
back for the cards" under it; the big DONE stays at the end of the pass.

**Perfect-deal chips are one row per team.** A flow layout wrapped four
names as three-and-one whenever they ran long — the family's names are longer
than the test names, so the phone showed it and the simulator did not. Rows
now match the scoreboard's pairs.

**Closing a panel scrolls to the top.** Found while verifying the above, and
almost certainly in build 3 as well. The open face is ~1100pt taller than the
closed one, and a `ScrollView` keeps its offset when content shrinks under it
— so closing from anywhere past the first screenful left the body blank until
the next touch. RETURN means "back to the teams" anyway, so `onClose` scrolls
there.

**Count-as-you-go picks teams on the scoreboard.** Both teams play at once
and books go down in any order, so the pad has to switch between them freely.
The first version stepped through teams with a NEXT button at the bottom,
which read as a linear flow — score one team, then the other, then save — and
contradicted the premise of the mode. The scoreboard already showed both team
names side by side and already outlined the active one; it just wasn't
tappable. Now it is the selector: tap a tile to score that team, both tiles
carry a faint outline so they read as tappable, the brass one is the one
you're on, and the bottom bar is only SAVE ROUND. Noticed from the UI alone
before the mode had been used in anger — worth a real test.

**The meld check is a calculator behind the NEED line, not a flag on the
score panel.** The end-of-round panel used to carry "N SHORT OF M / ✓ PAST
MINIMUM" under its melded subtotal. The family loved the feature and noticed
it was in the wrong place: the meld minimum is a question about a *hand* —
"do I have enough to go down?" — asked mid-round by a player looking at
cards they haven't played, and at a real table it gets counted two and three
times before anyone is sure. By the time the end-of-round panel is being
filled in, every team that melded already met it, so the flag could only
ever say ✓; a legal game cannot even produce a melded total between 1 and
the minimum.

So the flag is off that panel (the as-you-go pad keeps its running version,
where the total is the thing being watched), and the scoreboard's
`NEED 120 TO MELD` line — where the question is already written — is now a
pill that opens `MeldCheck`: the four denomination tiles, a running total,
green with a checkmark at the minimum, RESET and DONE. It is a calculator,
not a ledger: it writes nothing and starts empty every time it opens,
because the previous player's hand is never the one you want. It reads the
same `roundMinimum()` the scoreboard does, so it is 60 in round 1 and 150
in round 4, and a reopened past round gets that round's number.

Adding the pill made the scoreboard's meta line overflow when FIXING and
both arrows were also present — clipped at both edges. It is two rows now:
round and arrows, then the NEED pill.

Two glyph notes from the same pass: `↩` has both text and emoji presentations
and iOS picks the blue emoji tile; `↩\ufe0e` (the text-presentation selector)
draws it as a glyph in the button's own colour. The same trap as the card
icons rule in the conventions, from the other direction.

## Low vision

Sept 2026, before build 4. The app's likely audience beyond the family is
retired players, and the first question from that direction was "what about
people who can't see well?" Measured, not guessed.

**Contrast.** The primary tier — row labels, totals, brass numbers — was
already strong (7.6–15:1). The muted tier was not, and some of it was
load-bearing: `brassDim`, the colour on TAP TO SCORE, the one cue that says a
panel is tappable, was **1.9:1**. Section headers (`brassMuted`, 3.4:1) and
sub-labels like "50 each" (`textMuted`, 3.6:1) failed AA at their sizes. Each
was lifted along its own hue to the smallest lightness that clears 4.5:1
against the felt, so the brass is still brass and the red is still red. The
running "−500" readout beside penalty rows was using `dangerBorder` as text
(≈1.7:1); it uses `danger` now.

```bash
# the check — rerun it if any of these tokens move
python3 - <<'EOF'
def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def ratio(a,b):
    a,b=sorted((lum(a),lum(b)),reverse=True); return (a+0.05)/(b+0.05)
for name,c in [('brassMuted','#A98234'),('textMuted','#8D8576'),('textFaint','#8D8677'),
               ('brassDim','#A8813A'),('danger','#D7605B')]:
    print(f"{name:12s} {ratio(c,'#0C2018'):.1f}")
EOF
```

**Larger Text.** The cap in `AppText` is **1.6**, not Crosscourt's 1.3. This
app's densest thing is a row of four count tiles, and it holds at 1.6 all the
way up to `accessibility-extra-extra-extra-large` — the largest setting iOS
offers — on a cold start at that size. The scoreboard keeps both scores
intact and truncates the team names with an ellipsis, which is the right
thing to lose. The `+500 each` sub-label used to truncate to "+50…", which is
a misread rather than a cosmetic cut; it wraps to two lines now.

**One trap in testing it.** Changing the text size under a *running* app
makes React Native re-render text at the new size without re-measuring
layout, so every number's tail is clipped — `-1000` reads `-100`. That is an
artifact of the live change, not a bug users hit: real people set the size
once and open apps afterward. Always cold-start at the size under test:

```bash
xcrun simctl ui <udid> content_size accessibility-extra-extra-extra-large
xcrun simctl terminate <udid> com.handandfoot.scorer && <relaunch>
xcrun simctl ui <udid> content_size large     # back to the iOS default
```

**Size floor.** Nothing renders below 12px; section labels are 13. There were
thirty instances at 9–11px.

**Touch targets.** The stepper buttons were 38pt wide; they are 46×48 now.
Apple's floor is 44, and an older hand aims at what it can see — hitSlop
widens the target but not the confidence.

Not done, and worth knowing about:

- **A light theme.** Some people with cataracts prefer dark-on-light because
  bright text on a dark ground scatters. It is a real preference and a big
  change to the design language; it should be a decision, not a drive-by.
- **Long-press to remove** on the count-as-you-go tiles is a hidden gesture
  with timing, which is hard with a tremor. The family's mode has explicit
  − buttons. If as-you-go gets real use from this audience, give it buttons.
- **VoiceOver** has labels on the fields and tiles but has not been walked
  end to end.

**iPhone only, on purpose.** `supportsTablet` is off (Sept 2026). The app runs
on iPad, but as a phone layout stretched across a thousand points — three
cards and three-quarters of a blank screen — and with the flag on, Apple
requires iPad screenshots of exactly that. With it off, iPads still install
the app and run it in iPhone-compatibility mode, a phone-shaped window,
which for this layout is the better experience. A real iPad layout (a
centred column, or two panels side by side) is a proper follow-up; flipping
the flag back on is trivial once one exists. Native config: takes a build.

**How to Play** (Sept 26, 2026, after release). The app was built by people
who already knew the game and assumed it on every screen — you could keep a
flawless score without ever being told what a book is. `app/howtoplay.tsx` is
the missing half, reached from a card on home that sits with House Rules
because both are reference rather than play.

Every number in the prose is **read from the saved rules**, not written into
the text: round count, minimums, book values, the perfect-deal and go-out
bonuses, and the card table. A novice is therefore taught the game *this*
table plays. Generic numbers in the text would have taught one game while the
app scored another, which is worse than saying nothing. Verified by adding a
round in House Rules and watching the lede go from "Over 4 rounds" to "Over 5"
with a fifth minimum cell. It reloads on focus for the same reason — the page
links out to House Rules, and coming back to stale numbers would make a liar
of its own closing note.

**The procedural text was checked at the table** (Sept 26) and three things
were wrong, all of them the kind of thing only a player would catch:

- **Four decks, not five.** This became a rule rather than a phrase. `decks`
  joins `RuleSet` alongside `cardValues` as a field no calculation ever
  reads — it exists so How to Play can name a number instead of hedging
  "four or five". Deck count is a real house rule that varies, House Rules
  is where house rules live, and `hydrateRules` already merges stored rules
  over the defaults, so existing installs pick up `decks: 4` on upgrade with
  no migration. Verified against a storage file that genuinely lacked the
  field.
- **The foot is not free.** Empty your hand and you pick the foot up, but
  your turn ends — you play out of it next turn. The exception is
  *playing right into your foot*: every card in your hand onto the table
  with nothing left to discard, and you carry straight on in the same turn.
- **Going out takes two clean books and two dirty**, not one and one. And
  you need not have reached your foot to do it — but everything left in a
  hand or foot counts against its holder, so a red three buried in an
  unplayed foot is −500 that never saw the table.

A second read-through in the simulator caught two more:

- **A book is finished, not closed.** The text said "nothing more goes on
  it", which is wrong and actively harmful to a beginner: matching cards
  keep going onto a book, so a book of fives becomes eight or nine. If books
  really shut you would end up holding cards with nowhere to put them and be
  unable to play your hand out. The extras also score — the app's model
  already handles this, since a round counts book bonuses *and* the face
  value of everything on the table, so the eighth five lands in the 5s row
  like any other card.
- **"Your turn is over" was only half true.** It ends if the last card went
  to the discard pile. Emptying the hand onto the table with nothing left to
  discard is the *play right into your foot* case, and the turn continues.
  The section now splits on how the hand ran out rather than stating the
  common case and hedging afterwards.

Confirmed as written: draw two and discard one, wilds never outnumbering
naturals, and seven cards to a book.

Still not configurable, and still stated as the common form: the draw and
discard procedure itself, and the meld composition rule. Hand and Foot
varies wildly house to house and the app has no opinion on any of it.

## Open items

- **Name.** "Hand and Foot" is descriptive and unfindable; the sibling apps are
  named for the place the game happens. Candidates worth a look: *Red Three*,
  *Two Piles*, *Felt*. App Store names are globally unique — check before
  committing, which is the trap that renamed Crosscourt's listing.
- Whether this ever goes to the App Store at all, or stays a TestFlight build
  for the family. It changes how much the store-listing work matters, and little
  else.
- **Six-handed play** (two teams of three) is already allowed by the model and
  blocked only by the fixed setup screen. Unblock it when someone asks.
- **Deck count** scales with player count and the app currently says nothing
  about it. A line on the setup screen would be a nice touch; it is not scoring.
- **The JPEG share card** from the design is not built; export is PDF and
  plain text. Text is arguably the better group-chat artifact anyway, so the
  card may not be worth it — decide after one real game.

## Builds

Same economics as the siblings: **cloud builds are a limited monthly resource**
on the EAS free tier, and this is a hobby project that will not pay for more.
So batch changes and build when there is a release to make.

```bash
npx expo-doctor                                       # before every build
npx eas build --platform ios --profile production --non-interactive
npx eas submit --platform ios --latest --non-interactive
```

**`--local` does not work on this Mac** (found Sept 2026, first build attempt).
It needs **Fastlane** on the `PATH`, which is not installed, and it fails with
`spawn fastlane ENOENT` only *after* it has finished the whole credentials
dance — so the failure looks far more alarming than it is and none of the
credential work is lost. `eas.json` also pins Node 22.23.1 while this machine
runs 20.20.2, which `--local` warns about and the cloud builder simply honours.

This matters because **Crosscourt's `DESIGN.md` recommends `--local` as the
quota-saving path and that advice does not currently work.** Either install
Fastlane (`brew install fastlane`) or treat cloud builds as the only route on
this machine.

Local builds, if Fastlane is ever installed, still need the working Xcode
toolchain and `LANG`/`LC_ALL` set to a UTF-8 locale, or CocoaPods crashes with
an error 65 that points nowhere useful.

Two things need an **interactive Apple login** and so cannot be automated:
registering the new `com.handandfoot.scorer` App ID with Apple on the first
build, and creating the App Store Connect record on the first submit.

**App Store names are globally unique.** Crosscourt learned this the hard way —
`eas submit` created its record as "Crosscourt (957e5a)" and it had to be
renamed. "Hand & Foot" is a common phrase and will almost certainly collide, so
expect a suffixed record name on the first submit. It only matters for the
store listing; `CFBundleDisplayName` is a separate field and the home-screen
name stays "Hand & Foot" regardless.

**`expo-dev-client` is installed, and it is debug-only.** Added Sept 2026. Two
reasons, one of them earned the hard way:

- The dev launcher lets you pick **which Metro server** the app connects to.
  All three sibling apps default Metro to port 8081, and a stale server from
  one project will happily hand its bundle to another project's dev build —
  which presents as the wrong app's UI with all its data missing, and looks
  exactly like data loss. See [[metro-port-collision-between-siblings]].
- It silences EAS's "your app uses Expo Go" warning on production builds.

That warning was always a false positive here. EAS fires it when the profile is
named `production`, `expo-dev-client` is absent, **and** no `ios/`/`android/`
directory exists *or they are git-ignored*. `/ios` is git-ignored on purpose —
it is generated, and ignoring it is what makes EAS run prebuild cloud-side from
`app.json` — so EAS could not see the native project and inferred Expo Go. The
app was never built or run through Expo Go; `expo run:ios` compiles the real
native app. Do **not** un-ignore `/ios` to silence the warning.

Verified rather than assumed, since the SDK 57 docs do not state it: the dev
launcher is excluded from release builds. Comparing the generated xcconfigs,
`OTHER_LDFLAGS` links `expo-dev-launcher` and `expo-dev-menu` in **Debug** only;
**Release** links just `expo-dev-menu-interface`, a small interface shim. So it
costs nothing in a TestFlight or App Store build.

```bash
# the check, if it ever needs repeating
grep ^OTHER_LDFLAGS "ios/Pods/Target Support Files/Pods-HandFoot/Pods-HandFoot.release.xcconfig" \
  | tr ' ' '\n' | grep -i dev-
```

**Bump `expo.version` for every release after the first.** Apple rejected
build 7 at processing — before TestFlight, so the binary never appeared
anywhere:

```
ITMS-90186: Invalid Pre-Release Train — the train version '1.0.0' is
            closed for new build submissions
ITMS-90062: CFBundleShortVersionString [1.0.0] must be higher than the
            previously approved version [1.0.0]
```

Two numbers are in play and only one of them was moving. `autoIncrement:
true` with `appVersionSource: "remote"` manages the **build number**
(`CFBundleVersion` — 5, 6, 7…) on the EAS server, which is why builds kept
going out without complaint. The **marketing version**
(`CFBundleShortVersionString`) comes from `expo.version` in `app.json` and
had sat at `1.0.0` since the beginning. That was fine while 1.0.0 was
unreleased — every build was a new candidate for the same unshipped version.
The moment Apple approved and released it, the train closed.

So: **`expo.version` has to move before the first build of any release after
a version goes live.** Nothing automates it, and the failure arrives by email
an hour later rather than at build time. It also means a matching **new
version page in App Store Connect** — a build cannot attach to a version
that has already shipped.

**`expo install --fix` breaks the next local build.** Aligning patch versions
rewrites `package.json` but leaves `ios/Podfile.lock` pinned to the old ones,
so the next `expo run:ios` dies in `pod install` with a "native package
versions mismatching" message that reads like a dependency problem and is
really just a stale lockfile. Hit twice now, both times right after a
version alignment. `/ios` is generated and git-ignored, so the fix costs
nothing:

```bash
npx expo prebuild --platform ios --clean
```

Cloud builds never see this — EAS runs prebuild itself from `app.json`.

**`expo run:ios` does NOT re-run prebuild when `ios/` already exists**, so an
`app.json` change silently fails to reach `Info.plist`. After editing it:

```bash
npx expo prebuild --platform ios --clean
```

`/ios` is gitignored and fully generated, so `--clean` loses nothing.

## Conventions (inherited)

- Storage keys versioned and namespaced.
- Pure domain logic in `hooks/`, no React and no storage, so it can be tested.
- **Colours live in `theme.ts`, never in a screen's StyleSheet.** 387 scattered
  hex literals is how Crosscourt shipped for months in basketball colours.
- Test text entry with the software keyboard on — the simulator connects the
  hardware keyboard by default and hides every overlap bug.
- Read the versioned Expo docs at https://docs.expo.dev/versions/v57.0.0/
  before writing code.

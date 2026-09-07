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

Not done: the JPEG share card — text and PDF only so far — and **no build has
left this machine**. Nothing is signed, and no App Store Connect record exists.

**Text entry has not been tested with the software keyboard.** The simulator
connects the hardware keyboard by default, so no on-screen keyboard ever
appeared during the walkthrough and the whole class of overlap bugs stayed
invisible — the same trap Crosscourt shipped to a real phone. Setup (four
fields) and the rules screen (numeric fields, and iOS numeric pads have no
return key) both need a pass with it switched off.

## The house rules

As played by the family, and the defaults the app ships with:

| Rule | Value |
|---|---|
| Players | 4, in two fixed partnerships |
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

**The flip is for choices, not for counts.** The rotate-to-reveal treatment
earns its place where a genuine one-of-N pick exists — a BOOK tile that turns to
offer clean / dirty is a good use. It does not belong on the value counters,
which are high-volume repeat taps under four people's attention; an animation
that has to settle before the next tap lands is how a 400 becomes a 350. RN's
built-in `Animated` does a `rotateY` without a new dependency, which matters:
`AppText` caps Dynamic Type at 1.3×, and animated tiles plus scaled text is
where fixed-height layouts break.

**One team at a time, and nothing commits until the round advances.** The full
pad — four melded counters, two book counters, red threes, go-out, and the
in-hand counters — does not fit on a phone twice over. Round entry is the same
screen shown once per team, with the persistent scoreboard on top throughout.
Both teams' numbers are held and written together when the round advances, so
any correction before that is a tap, not an undo.

**Melded and in-hand are two separate pads, not one pad with a sign toggle.**
They use the same four denominations and differ only in sign, which is precisely
why a mode switch is dangerous — entering 200 melded points into the penalty
column is a 400-point swing and looks completely plausible on screen. The
in-hand pad is styled in the danger palette and sits below a rule.

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
Build locally, which does not draw down the quota:

```bash
npx expo-doctor                                       # before every build
npx eas build --platform ios --profile production --local
npx eas submit --platform ios --path <the .ipa>
```

Local builds need the working Xcode toolchain and `LANG`/`LC_ALL` set to a
UTF-8 locale, or CocoaPods crashes with an error 65 that points nowhere useful.

Two things need an **interactive Apple login** and so cannot be automated:
registering the new `com.handandfoot.scorer` App ID with Apple on the first
build, and creating the App Store Connect record on the first submit.

**App Store names are globally unique.** Crosscourt learned this the hard way —
`eas submit` created its record as "Crosscourt (957e5a)" and it had to be
renamed. "Hand & Foot" is a common phrase and will almost certainly collide, so
expect a suffixed record name on the first submit. It only matters for the
store listing; `CFBundleDisplayName` is a separate field and the home-screen
name stays "Hand & Foot" regardless.

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

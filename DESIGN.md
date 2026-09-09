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

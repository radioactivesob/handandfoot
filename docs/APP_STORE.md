# App Store listing

Everything App Store Connect asks for, with character counts checked. Paste
from here. Fields marked *editable later* can change without a new build.

## Name  (30 max)

The bare name "Hand & Foot" is almost certainly taken — App Store names are
globally unique, and this is what renamed Crosscourt's record to
"Crosscourt (957e5a)". **Check what the record is actually called in App Store
Connect first.** Either way, Crosscourt's lesson applies: put the words people
search into the Name field, which Apple weights most heavily.

Recommended:

    Hand & Foot Score Keeper          (24)

Alternatives if that collides:

    Hand and Foot Scorekeeper         (25)
    Hand & Foot Scorer                (18)

The home-screen name stays "Hand & Foot" regardless — `CFBundleDisplayName`
comes from `expo.name` and is a separate field.

## Subtitle  (30 max)

    Count the piles, not the math     (29)

## Promotional text  (170 max, *editable later*)

    Score Hand and Foot the way you actually count it — type the pile,
    not the sum. Big text, high contrast, your house rules, and a one-tap
    "can I meld?" check.

(157)

## Description  (4000 max, *editable later*)

Plain text — App Store Connect renders no formatting, so blank lines are the
only structure.

---

Hand & Foot is a scorekeeper built for the card table, by a family that plays a lot of it.

COUNT THE PILE, NOT THE MATH
At the end of a round you're looking at a stack of cards worth five points each. Thirty-five of them. Hand & Foot doesn't hand you a calculator — it asks how many. Type 35, and the math is done. Jokers, deuces and aces, tens through kings, fours through nines: four numbers per team and the round is scored. Small counts have plus and minus buttons; big piles get a number pad.

CAN I MELD?
The question asked at every table, every round, usually three times. Tap the "Need 90 to meld" line on the scoreboard, count the cards you'd lay down, and it tells you — green with a checkmark when you're there. It's a calculator, not a score; nothing you tap there changes the game.

YOUR HOUSE RULES
Round minimums, clean and dirty book values, what a red three costs, the perfect-deal bonus, the go-out bonus. Change any of them. Rules are saved with each game, so changing them next Thanksgiving never rewrites last year's scores.

BUILT FOR THE TABLE
The scoreboard stays at the top of every screen: both totals, the round, and what you need to meld. Text follows your phone's Larger Text setting and stays sharp. Every colour was checked for contrast — the people this was built for have their text turned all the way up.

FIX A ROUND
Advanced to round two and someone forgot to count? Tap the arrow beside the round number, fix it, come back. Later rounds are untouched and the totals catch up.

GOT CAUGHT HOLDING CARDS?
Everything left in a hand and foot when someone goes out counts against you. There's a red section for exactly that, and yes, a round can go negative.

TWO WAYS TO COUNT
Count everything at the end of the round — the way most tables do it — or tap books and cards as they go down. Switch any time.

WHEN THE NIGHT'S OVER
A round-by-round summary and a PDF to send to the group text, for the record and for the smack talk.

NOTHING LEAVES YOUR PHONE
No account. No ads. No analytics. Every game is stored on your phone and nowhere else.

---

(2,076 characters)

## Keywords  (100 max, comma-separated, no spaces)

    canasta,hand and foot,card game,score,scorekeeper,scoring,cards,family,meld,books,rummy,tally

(93)

Don't repeat words already in the Name or Subtitle — Apple indexes those
too, so they'd waste characters.

## Category

    Primary:    Games › Card
    Secondary:  Utilities

## Age rating

    4+ — no questionnaire answers apply.

## What's New  (4000 max, *editable later*)

    First release.

## URLs

    Support URL:         https://radioactivesob.github.io/handandfoot/
    Privacy Policy URL:  https://radioactivesob.github.io/handandfoot/privacy.html
    Marketing URL:       (leave blank)

Both pages live in `docs/` and need GitHub Pages turned on for this repo,
the same as Crosscourt.

## App Privacy (the nutrition label)

    Data Not Collected.

Answer "No" to every data type. The app has no accounts, no analytics, no
ads, and makes no network requests. This matches `docs/privacy.html`.

## App Review information

Notes for the reviewer:

    No account or sign-in. Start a game from the home screen — four names,
    two teams — and score rounds from there. All data is stored on the
    device. The "Need … to meld" pill on the scoreboard opens a calculator
    that does not affect the score.

Contact: the developer's name and phone on the Apple account. Demo account:
not required.

## Copyright

    © 2026 Charles Cooper

## Screenshots

iPhone 6.9" only (1320 × 2868), since `supportsTablet` is off. Up to ten;
the first three carry the listing. Captured from the iPhone 17 Pro Max
simulator with a staged game — see `docs/screenshots/`.

Order:

1. Round screen — the scoreboard, both team panels, the pill.   *hero*
2. A team panel open — books, the typed card counts, the penalty section.
3. "Can I meld?" showing green.
4. House rules.
5. The summary after four rounds.
6. Home.

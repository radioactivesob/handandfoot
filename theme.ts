// The Hand & Foot palette, in one place.
//
// Third sibling to Hardwoods (basketball brown and orange) and Crosscourt
// (espresso, gold, volleyball blue). This one is a card table: felt green
// ground, brass for anything that scores, playing-card red for anything that
// costs you.
//
// Deliberately no orange (Hardwoods' #FF8A1F) and no blue (Crosscourt's
// #1D4F91), so a screenshot of any one app is unmistakably that app.
//
// Colours live here rather than in each StyleSheet because scattering them is
// how Crosscourt shipped for months in inherited basketball colours.

export const C = {
  // ---- ground -----------------------------------------------------------
  // Card-table felt, dark enough to sit under a bright brass numeral.
  bg: '#0C2018',
  surface: '#071610',        // cards, headers, pads — sunk below the ground
  surfaceRaised: '#102A1F',  // tiles that want to read as pressable
  border: '#14332A',         // hairline between surfaces
  borderStrong: '#26543F',   // outlines and selected states

  // ---- brass ------------------------------------------------------------
  // The brand move. Score numerals, primary buttons, the rule under every
  // header. Brass rather than gold so it doesn't read as Crosscourt.
  brass: '#D9A441',
  brassBright: '#F0C368',    // live subtotals, the number being changed
  onBrass: '#0C2018',
  brassMuted: '#8A6A2A',     // small-caps labels
  brassDim: '#5C4720',       // inactive tiles
  brassFaint: '#3E3117',     // footnotes

  // ---- text -------------------------------------------------------------
  // Bone rather than pure white — white on felt green is harsh at night,
  // and this game gets played at night.
  text: '#F4EBD9',
  textDim: '#A8A090',
  textMuted: '#7A7365',
  textFaint: '#5C574D',
  textGhost: '#464239',      // placeholders and disabled

  // ---- semantics --------------------------------------------------------
  // Playing-card red. Carries red threes and the in-hand penalty pad, which
  // are the only two things in the app that subtract.
  danger: '#C1352F',
  dangerBright: '#E05A54',
  dangerBorder: '#7E241F',
  dangerBg: '#2A100E',       // the in-hand pad's ground
  dangerFaint: '#4A1917',

  good: '#6FBF8A',           // "you're past the minimum"
  goodBg: '#0E2B1C',

  scrim: '#000000CC',        // modal overlay
} as const;

import React, { forwardRef } from 'react';
import {
  Text as RNText, TextInput as RNTextInput,
  TextProps, TextInputProps,
} from 'react-native';

// iOS Dynamic Type scales text up to ~3x at the largest accessibility
// sizes, and nothing with a fixed layout survives 3x. Capping the multiplier
// keeps large-text users supported without shattering the layout.
//
// 1.6, not Crosscourt's 1.3. This app's densest thing is a row of four
// count tiles, and it holds at 1.6 all the way up to the largest
// accessibility size (verified on a cold start at that setting — changing
// the size under a running app mis-measures text and is not a real test).
// The likely audience has their text turned all the way up.
//
// Screens that genuinely can't grow (big score numerals, tight table
// cells) pass a smaller cap or numberOfLines themselves.
export const MAX_FONT_SCALE = 1.6;

// Navigation chrome is fixed-height and packed — it scales less than
// content, the same tradeoff Apple's own nav bars make.
export const HEADER_FONT_SCALE = 1.1;

// Prose and reference text — the rules summary, help copy, anything that sits
// in a scroll view and can simply get taller. The 1.3 cap above exists to
// protect dense fixed-height grids; applying it to a paragraph is just making
// text small for no reason. Pass this as maxFontSizeMultiplier to opt in;
// props spread after the default, so it wins.
//
// This matters more than it looks: capped at 1.3, a 13px line reaches 17px at
// iOS's largest accessibility setting, which is not what someone who has
// turned their phone's text all the way up is expecting.
export const BODY_FONT_SCALE = 2.4;

export const Text = forwardRef<RNText, TextProps>((props, ref) => (
  <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} ref={ref} />
));
Text.displayName = 'Text';

export const TextInput = forwardRef<RNTextInput, TextInputProps>((props, ref) => (
  <RNTextInput maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} ref={ref} />
));
TextInput.displayName = 'TextInput';

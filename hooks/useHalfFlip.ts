import { useRef, useState, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * A card turn that leaves nothing behind.
 *
 * The obvious way to flip a view is to rotate it a full 180° and counter-rotate
 * its content to un-mirror the text. That looks right and reads wrong: the view
 * then sits in a composed 3D transform *at rest*, so iOS keeps it in an
 * offscreen rasterized layer and resamples it. Every glyph inside is drawn once
 * into a bitmap and then scaled, which makes text visibly soft for as long as
 * the panel is open — not just while it animates. The same offscreen pass, with
 * `overflow: hidden` in the mix, is also what makes a *sibling* view flash
 * black for a moment.
 *
 * So this goes half way and back instead. 0° → 90° turns the view edge-on, the
 * face swaps while nobody can see it, then −90° → 0° brings it back. Two
 * consequences, both good:
 *
 *   - At rest the transform is removed entirely, so text renders at native
 *     resolution and no offscreen layer lingers.
 *   - The rotation never passes 90°, so the content is never mirrored and
 *     needs no counter-rotation at all.
 */
export function useHalfFlip(open: boolean) {
  // -1..1 maps to -90°..90°.
  const spin = useRef(new Animated.Value(0)).current;
  const [face, setFace] = useState<'front' | 'back'>(open ? 'back' : 'front');
  const [animating, setAnimating] = useState(false);
  const shown = useRef(open);
  const alive = useRef(true);

  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => {
    if (shown.current === open) return;
    shown.current = open;
    setAnimating(true);

    Animated.timing(spin, {
      toValue: 1,
      duration: 110,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !alive.current) return;
      setFace(open ? 'back' : 'front');
      spin.setValue(-1);
      Animated.timing(spin, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished: done }) => {
        if (done && alive.current) setAnimating(false);
      });
    });
  }, [open, spin]);

  const rotateY = spin.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-90deg', '0deg', '90deg'],
  });

  return {
    face,
    animating,
    /** Spread onto the turning view. Undefined at rest, on purpose. */
    flipStyle: animating
      ? { transform: [{ perspective: 1200 }, { rotateY }] }
      : undefined,
  };
}

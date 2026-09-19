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
 * So this goes half way and back instead: the view squashes to a line, the
 * face swaps while nobody can see it, then it opens back out. Two
 * consequences, both good:
 *
 *   - At rest the transform is removed entirely, so text renders at native
 *     resolution and no offscreen layer lingers.
 *   - The content is never mirrored and needs no counter-rotation at all.
 *
 * It is a scaleX, not a rotateY with perspective, and that is the second
 * lesson. A perspective rotation is not confined to the view's rectangle —
 * the edge swinging toward the viewer projects outward over the sibling
 * above, Core Animation composites the overlap in an offscreen pass, and on
 * a real GPU the covered region of that sibling can drop out for a frame
 * and show the window background. On the phone that was the Perfect Deal
 * card going half black, or all black, when a team panel was tapped. It
 * never reproduced in the simulator. A scaleX is a plain affine transform:
 * no 3D context, nothing projected outside the bounds, nothing to composite
 * offscreen. It reads as a card turning all the same.
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

  // ±1 is edge-on, 0 is flat. Never quite zero width — a 0-scale layer
  // can hit-test and layout oddly for a frame.
  const scaleX = spin.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0.02, 1, 0.02],
  });

  return {
    face,
    animating,
    /** Spread onto the turning view. Undefined at rest, on purpose. */
    flipStyle: animating ? { transform: [{ scaleX }] } : undefined,
  };
}

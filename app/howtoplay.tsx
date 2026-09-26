import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Text, BODY_FONT_SCALE } from '../components/AppText';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGames } from '../hooks/useGames';
import { roundCount } from '../hooks/scoring';
import { C } from '../theme';

const Section = ({ children }: { children: string }) => (
  <Text style={styles.section} maxFontSizeMultiplier={BODY_FONT_SCALE}>{children}</Text>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.p} maxFontSizeMultiplier={BODY_FONT_SCALE}>{children}</Text>
);

const B = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.b}>{children}</Text>
);

/**
 * The game, for someone who has never played it.
 *
 * The app was built by people who already knew the rules, and every screen
 * assumed it — you could keep a flawless score without ever being told what
 * a book is. This is the missing half.
 *
 * Every number here is read from the saved rules rather than written into
 * the prose, so a novice is taught the game *this table* plays: change the
 * round minimums in House Rules and this screen changes with them. The
 * alternative — generic numbers in the text — would teach one game and score
 * another, which is worse than saying nothing.
 *
 * What is NOT configurable is the procedure: draw two, meld, discard one.
 * Hand and Foot varies wildly house to house and the app has no opinion on
 * any of it, so the procedural sections say what is common and the closing
 * note says plainly that families differ.
 */
export default function HowToPlay() {
  const router = useRouter();
  const { rules: r, reload } = useGames();

  // On focus, not just mount — the footer sends people to House Rules, and
  // coming back to numbers that still say the old values would make a liar
  // of the closing note.
  useFocusEffect(React.useCallback(() => { reload(); }, [reload]));

  const rounds = roundCount(r);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HOW TO PLAY</Text>
        <View style={{ width: 54 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.lede}>
          <Text style={styles.ledeText} maxFontSizeMultiplier={BODY_FONT_SCALE}>
            Hand and Foot is a Canasta game for four players in two
            partnerships. Over {rounds} rounds you collect sets of matching
            cards. Most points at the end wins.
          </Text>
        </View>

        <Section>THE DEAL</Section>
        <P>
          Several decks are shuffled together — five is usual for four
          players, jokers included. Everyone takes <B>two stacks of 13</B>:
          one is your <B>hand</B>, the other is your <B>foot</B>. You play the
          hand first and the foot is waiting underneath. That is the name of
          the game.
        </P>
        {r.perfectDeal !== 0 && (
          <P>
            Cut both stacks at exactly 13 without counting and your team gets{' '}
            <B>+{r.perfectDeal}</B>. The app asks at the start of every round.
          </P>
        )}

        <Section>A TURN</Section>
        <P>
          Draw two cards. Lay down what you can. Discard one. Play passes to
          the left.
        </P>

        <Section>MELDS</Section>
        <P>
          A <B>meld</B> is three or more cards of the same rank, face up in
          front of your partnership. Suit never matters — three kings is
          three kings.
        </P>
        <P>
          <B>Jokers and twos are wild</B> and can stand in for any card, but a
          meld must always hold more natural cards than wild ones. Melds are
          shared: your partner adds to yours and you add to theirs.
        </P>

        <Section>GETTING DOWN</Section>
        <P>
          Your partnership's <B>first</B> meld of a round has to be worth at
          least a minimum, and the minimum climbs each round:
        </P>
        <View style={styles.minRow}>
          {r.roundMinimums.map((m, i) => (
            <View key={i} style={styles.minCell}>
              <Text style={styles.minRound}>R{i + 1}</Text>
              <Text style={styles.minValue}>{m}</Text>
            </View>
          ))}
        </View>
        <P>
          Until you are down, you cannot lay anything. Counting a hand to see
          if it clears is the fiddliest job at the table, so the scoreboard's{' '}
          <B>NEED … TO MELD · CHECK</B> does it for you.
        </P>

        <Section>BOOKS</Section>
        <P>
          Seven cards of one rank is a <B>book</B> — some tables call it a
          pile. Square it up and leave it closed; nothing more goes on it.
        </P>
        <P>
          <B>Clean</B> means no wilds in it, and it is worth{' '}
          <B>+{r.cleanBook}</B>. Put a red card on top so everyone can see.{' '}
          <B>Dirty</B> means it contains a wild, and it is worth{' '}
          <B>+{r.dirtyBook}</B>. Black card on top.
        </P>

        <Section>YOUR FOOT</Section>
        <P>
          When the last card of your hand is gone, pick up your foot and keep
          playing. Some houses make you earn it with a book first — settle
          that before you deal.
        </P>

        <Section>GOING OUT</Section>
        <P>
          Going out ends the round for everybody. To do it you must be in your
          foot with every card played, and most tables require your
          partnership to have at least <B>one clean book and one dirty
          book</B> first. It is worth{' '}
          {r.goOutEnabled ? <B>+{r.goOut}</B> : 'nothing at this table'}.
        </P>

        <Section>THREES</Section>
        <P>
          <B>Red threes</B> cost you <B>{r.redThree}</B> each — more than a
          clean book is worth. They cannot be melded and they cannot be
          discarded away.
        </P>
        <P>
          <B>Black threes</B> cannot be melded either. They are only worth
          holding as a discard, and they count against you at the end like
          anything else left over.
        </P>

        <Section>WHEN THE ROUND ENDS</Section>
        <P>
          Add up the books, then the face value of every card your partnership
          has on the table, then the bonuses. Then <B>subtract every card
          still in your hand and foot</B> — that is how a round goes negative,
          and it is why getting caught holding a full hand hurts so much.
        </P>

        <Section>WHAT THE CARDS ARE WORTH</Section>
        <View style={styles.table}>
          {r.cardValues.map((cv, i) => (
            <View key={i} style={[styles.tableRow, i === r.cardValues.length - 1 && styles.tableRowLast]}>
              <Text style={styles.tableLabel} maxFontSizeMultiplier={BODY_FONT_SCALE}>{cv.label}</Text>
              <Text style={[styles.tableValue, cv.value < 0 && styles.tableValueBad]}>
                {cv.value > 0 ? `+${cv.value}` : cv.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText} maxFontSizeMultiplier={BODY_FONT_SCALE}>
            No two families play this game quite the same way. The numbers on
            this page are the ones your table is set up for — change any of
            them and this page changes with them.
          </Text>
          <TouchableOpacity style={styles.footerBtn} onPress={() => router.push('/rules')}>
            <Text style={styles.footerBtnText} maxFontSizeMultiplier={BODY_FONT_SCALE}>
              HOUSE RULES →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: C.brass, backgroundColor: C.surface,
  },
  back: { color: C.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: C.text, fontSize: 15, fontWeight: '800', letterSpacing: 1.4 },
  body: { padding: 16, paddingBottom: 40 },

  lede: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1,
    borderColor: C.brassDim, padding: 14,
  },
  ledeText: { color: C.text, fontSize: 16, lineHeight: 24 },

  section: {
    color: C.brassMuted, fontSize: 13, fontWeight: '800',
    letterSpacing: 1.4, marginTop: 26, marginBottom: 6,
  },
  p: { color: C.textDim, fontSize: 16, lineHeight: 25, marginBottom: 10 },
  b: { color: C.text, fontWeight: '800' },

  minRow: { flexDirection: 'row', gap: 8, marginTop: 2, marginBottom: 12 },
  minCell: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: C.surfaceRaised, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
  },
  minRound: { color: C.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  minValue: { color: C.brass, fontSize: 22, fontWeight: '800', marginTop: 2 },

  table: {
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  tableRowLast: { borderBottomWidth: 0 },
  tableLabel: { color: C.text, fontSize: 16, flex: 1 },
  tableValue: { color: C.brass, fontSize: 17, fontWeight: '800' },
  tableValueBad: { color: C.danger },

  footer: {
    marginTop: 28, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: C.borderStrong,
  },
  footerText: { color: C.textMuted, fontSize: 15, lineHeight: 22 },
  footerBtn: {
    marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: C.brassDim,
    backgroundColor: C.surface, alignItems: 'center', paddingVertical: 13,
  },
  footerBtnText: { color: C.brass, fontSize: 15, fontWeight: '800', letterSpacing: 1.2 },
});

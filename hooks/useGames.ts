// Storage and React state. Everything pure lives in scoring.ts.

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game, RuleSet, DEFAULT_RULES } from './scoring';

// Versioned and namespaced, so a shape change is a new key rather than a
// crash on someone's saved season.
export const GAMES_KEY = 'handfoot_games_v1';
export const CURRENT_KEY = 'handfoot_current_v1';
export const RULES_KEY = 'handfoot_rules_v1';
export const NAMES_KEY = 'handfoot_names_v1';

export const newId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Merge stored rules over the defaults, so a rule added in a later version
 *  appears with its default instead of `undefined` silently scoring as NaN. */
export const hydrateRules = (raw: unknown): RuleSet => ({
  ...DEFAULT_RULES,
  ...(raw as object ?? {}),
  version: 1,
});

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [current, setCurrent] = useState<Game | null>(null);
  const [rules, setRules] = useState<RuleSet>(DEFAULT_RULES);
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [g, c, r, n] = await AsyncStorage.multiGet([
      GAMES_KEY, CURRENT_KEY, RULES_KEY, NAMES_KEY,
    ]);
    setGames(g[1] ? JSON.parse(g[1]) : []);
    setCurrent(c[1] ? JSON.parse(c[1]) : null);
    setRules(r[1] ? hydrateRules(JSON.parse(r[1])) : DEFAULT_RULES);
    setNames(n[1] ? JSON.parse(n[1]) : []);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  /** Written on every counter tap. A phone that dies mid-round shouldn't
   *  cost the table a round they'd have to reconstruct from memory. */
  const saveCurrent = useCallback(async (game: Game | null) => {
    setCurrent(game);
    if (game) await AsyncStorage.setItem(CURRENT_KEY, JSON.stringify(game));
    else await AsyncStorage.removeItem(CURRENT_KEY);
  }, []);

  const finishGame = useCallback(async (game: Game) => {
    const done: Game = { ...game, finishedAt: Date.now() };
    const next = [...games, done];
    setGames(next);
    await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(next));
    await AsyncStorage.removeItem(CURRENT_KEY);
    setCurrent(null);
    return done;
  }, [games]);

  const deleteGame = useCallback(async (id: string) => {
    const next = games.filter(g => g.id !== id);
    setGames(next);
    await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(next));
  }, [games]);

  const saveRules = useCallback(async (next: RuleSet) => {
    setRules(next);
    await AsyncStorage.setItem(RULES_KEY, JSON.stringify(next));
  }, []);

  /** The same four people play every time. Remembering them turns setup
   *  from four keyboard entries into one tap. */
  const rememberNames = useCallback(async (used: string[]) => {
    const merged = [...used, ...names.filter(n => !used.includes(n))].slice(0, 12);
    setNames(merged);
    await AsyncStorage.setItem(NAMES_KEY, JSON.stringify(merged));
  }, [names]);

  return {
    games, current, rules, names, loading, reload,
    saveCurrent, finishGame, deleteGame, saveRules, rememberNames,
  };
}

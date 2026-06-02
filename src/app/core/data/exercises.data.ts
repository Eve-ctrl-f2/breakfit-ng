import type { Exercise } from '../models/models';

/**
 * BASE_EXERCISES — domain content. Names stay German in every locale
 * ("Sehnsucht stays Sehnsucht"). Icons are primeicons classes, never emoji,
 * because the same exercise object is read by the notification surface.
 */
export const BASE_EXERCISES: Exercise[] = [
  { id: 'liegestuetze', name: 'Liegestütze', category: 'kraft', difficulty: 'mittel', unit: 'reps', defaultAmount: 12, intensity: 4, enabled: true, icon: 'pi-bolt' },
  { id: 'kniebeugen', name: 'Kniebeugen', category: 'beine', difficulty: 'leicht', unit: 'reps', defaultAmount: 15, intensity: 3, enabled: true, icon: 'pi-angle-double-down' },
  { id: 'ausfallschritte', name: 'Ausfallschritte', category: 'beine', difficulty: 'mittel', unit: 'reps', defaultAmount: 12, intensity: 3, enabled: true, icon: 'pi-directions' },
  { id: 'plank', name: 'Plank', category: 'core', difficulty: 'mittel', unit: 'seconds', defaultAmount: 30, intensity: 3, enabled: true, icon: 'pi-minus' },
  { id: 'crunches', name: 'Crunches', category: 'core', difficulty: 'leicht', unit: 'reps', defaultAmount: 20, intensity: 2, enabled: true, icon: 'pi-sort-amount-down' },
  { id: 'hueftkreisen', name: 'Hüftkreisen', category: 'dehnen', difficulty: 'leicht', unit: 'reps', defaultAmount: 10, intensity: 1, enabled: true, icon: 'pi-replay' },
  { id: 'schulterkreisen', name: 'Schulterkreisen', category: 'schultern', difficulty: 'leicht', unit: 'reps', defaultAmount: 12, intensity: 1, enabled: true, icon: 'pi-refresh' },
  { id: 'nackendehnung', name: 'Nackendehnung', category: 'dehnen', difficulty: 'leicht', unit: 'seconds', defaultAmount: 20, intensity: 1, enabled: true, icon: 'pi-arrows-v' },
  { id: 'ruecken-strecken', name: 'Rücken strecken', category: 'ruecken', difficulty: 'leicht', unit: 'seconds', defaultAmount: 25, intensity: 1, enabled: true, icon: 'pi-arrow-up' },
  { id: 'hampelmann', name: 'Hampelmann', category: 'cardio', difficulty: 'mittel', unit: 'seconds', defaultAmount: 40, intensity: 4, enabled: true, icon: 'pi-star' },
  { id: 'high-knees', name: 'High Knees', category: 'cardio', difficulty: 'fortgeschritten', unit: 'seconds', defaultAmount: 30, intensity: 5, enabled: true, icon: 'pi-chevron-up' },
  { id: 'burpees', name: 'Burpees', category: 'cardio', difficulty: 'fortgeschritten', unit: 'reps', defaultAmount: 8, intensity: 5, enabled: true, icon: 'pi-bolt' },
  { id: 'wandsitz', name: 'Wandsitz', category: 'beine', difficulty: 'mittel', unit: 'seconds', defaultAmount: 40, intensity: 3, enabled: true, icon: 'pi-stop' },
  { id: 'dips', name: 'Trizeps-Dips', category: 'kraft', difficulty: 'mittel', unit: 'reps', defaultAmount: 10, intensity: 3, enabled: true, icon: 'pi-arrow-down' },
  { id: 'superman', name: 'Superman', category: 'ruecken', difficulty: 'mittel', unit: 'reps', defaultAmount: 12, intensity: 2, enabled: true, icon: 'pi-send' },
  { id: 'armkreisen', name: 'Armkreisen', category: 'schultern', difficulty: 'leicht', unit: 'seconds', defaultAmount: 30, intensity: 2, enabled: true, icon: 'pi-circle' },
];

export const CATEGORY_LABELS: Record<Exercise['category'], string> = {
  kraft: 'Kraft',
  cardio: 'Cardio',
  core: 'Core',
  dehnen: 'Dehnen',
  schultern: 'Schultern',
  ruecken: 'Rücken',
  beine: 'Beine',
};

export const CATEGORY_COLOR_VAR: Record<Exercise['category'], string> = {
  kraft: 'var(--cat-kraft)',
  cardio: 'var(--cat-cardio)',
  core: 'var(--cat-core)',
  dehnen: 'var(--cat-dehnen)',
  schultern: 'var(--cat-schultern)',
  ruecken: 'var(--cat-ruecken)',
  beine: 'var(--cat-beine)',
};

import type { Exercise } from '../models/models';

/**
 * BASE_EXERCISES — domain content. Names stay German in every locale
 * ("Sehnsucht stays Sehnsucht"). Icons are primeicons classes, never emoji,
 * because the same exercise object is read by the notification surface.
 */
export const BASE_EXERCISES: Exercise[] = [
  { id: 'liegestuetze', name: 'Liegestütze', category: 'kraft', difficulty: 'mittel', unit: 'reps', defaultAmount: 12, intensity: 4, enabled: true, icon: 'pi-bolt', instructions: ["Hände schulterbreit, Körper gerade.", "Mit gebeugten Armen runter, Brust fast zum Boden.", "Kraftvoll hochdrücken, Rumpf fest."] },
  { id: 'kniebeugen', name: 'Kniebeugen', category: 'beine', difficulty: 'leicht', unit: 'reps', defaultAmount: 15, intensity: 3, enabled: true, icon: 'pi-angle-double-down', instructions: ["Füße schulterbreit, Zehen leicht nach außen.", "Hüfte zurück senken, bis die Oberschenkel waagerecht sind.", "Über die Fersen hochdrücken."] },
  { id: 'ausfallschritte', name: 'Ausfallschritte', category: 'beine', difficulty: 'mittel', unit: 'reps', defaultAmount: 12, intensity: 3, enabled: true, icon: 'pi-directions', instructions: ["Großer Schritt nach vorn.", "Hinteres Knie Richtung Boden senken.", "Über die vordere Ferse zurückdrücken, Seite wechseln."] },
  { id: 'plank', name: 'Plank', category: 'core', difficulty: 'mittel', unit: 'seconds', defaultAmount: 30, intensity: 3, enabled: true, icon: 'pi-minus', instructions: ["Unterarme unter den Schultern.", "Körper bildet eine gerade Linie.", "Bauch anspannen, ruhig atmen, halten."] },
  { id: 'crunches', name: 'Crunches', category: 'core', difficulty: 'leicht', unit: 'reps', defaultAmount: 20, intensity: 2, enabled: true, icon: 'pi-sort-amount-down', instructions: ["Rücklings, Knie gebeugt.", "Schulterblätter einrollen, Bauch anspannen.", "Langsam ablassen, nicht am Nacken ziehen."] },
  { id: 'hueftkreisen', name: 'Hüftkreisen', category: 'dehnen', difficulty: 'leicht', unit: 'reps', defaultAmount: 10, intensity: 1, enabled: true, icon: 'pi-replay', instructions: ["Hände in die Hüften, Füße hüftbreit.", "Hüfte langsam kreisen lassen.", "Nach der Hälfte Richtung wechseln."] },
  { id: 'schulterkreisen', name: 'Schulterkreisen', category: 'schultern', difficulty: 'leicht', unit: 'reps', defaultAmount: 12, intensity: 1, enabled: true, icon: 'pi-refresh', instructions: ["Arme locker hängen lassen.", "Schultern groß nach hinten kreisen.", "Nach der Hälfte Richtung wechseln."] },
  { id: 'nackendehnung', name: 'Nackendehnung', category: 'dehnen', difficulty: 'leicht', unit: 'seconds', defaultAmount: 20, intensity: 1, enabled: true, icon: 'pi-arrows-v', instructions: ["Aufrecht sitzen oder stehen.", "Kopf sanft zur Seite neigen.", "Dehnung halten, dann Seite wechseln."] },
  { id: 'ruecken-strecken', name: 'Rücken strecken', category: 'ruecken', difficulty: 'leicht', unit: 'seconds', defaultAmount: 25, intensity: 1, enabled: true, icon: 'pi-arrow-up', instructions: ["Aufrecht stehen, Bauch fest.", "Arme nach oben strecken, lang machen.", "Sanft etwas nach hinten dehnen, halten."] },
  { id: 'hampelmann', name: 'Hampelmann', category: 'cardio', difficulty: 'mittel', unit: 'seconds', defaultAmount: 40, intensity: 4, enabled: true, icon: 'pi-star', instructions: ["Aufrecht stehen, Füße zusammen.", "Mit Sprung Beine grätschen, Arme über den Kopf.", "Zurückspringen, Rhythmus halten."] },
  { id: 'high-knees', name: 'High Knees', category: 'cardio', difficulty: 'fortgeschritten', unit: 'seconds', defaultAmount: 30, intensity: 5, enabled: true, icon: 'pi-chevron-up', instructions: ["Auf der Stelle laufen.", "Knie abwechselnd auf Hüfthöhe ziehen.", "Zügiges Tempo, Arme mitschwingen."] },
  { id: 'burpees', name: 'Burpees', category: 'cardio', difficulty: 'fortgeschritten', unit: 'reps', defaultAmount: 8, intensity: 5, enabled: true, icon: 'pi-bolt', instructions: ["Aus dem Stand in den Stütz.", "Optional ein Liegestütz, dann Beine anziehen.", "Explosiv hoch mit Strecksprung."] },
  { id: 'wandsitz', name: 'Wandsitz', category: 'beine', difficulty: 'mittel', unit: 'seconds', defaultAmount: 40, intensity: 3, enabled: true, icon: 'pi-stop', instructions: ["Rücken flach an die Wand.", "Herunterrutschen, bis die Knie 90 Grad sind.", "Position halten, gleichmäßig atmen."] },
  { id: 'dips', name: 'Trizeps-Dips', category: 'kraft', difficulty: 'mittel', unit: 'reps', defaultAmount: 10, intensity: 3, enabled: true, icon: 'pi-arrow-down', instructions: ["Hände auf die Stuhlkante, Finger nach vorn.", "Ellenbogen beugen, Po sinkt nach unten.", "Über die Arme wieder hochdrücken."] },
  { id: 'superman', name: 'Superman', category: 'ruecken', difficulty: 'mittel', unit: 'reps', defaultAmount: 12, intensity: 2, enabled: true, icon: 'pi-send', instructions: ["Bäuchlings, Arme nach vorn.", "Arme und Beine gleichzeitig anheben.", "Kurz halten, kontrolliert ablassen."] },
  { id: 'armkreisen', name: 'Armkreisen', category: 'schultern', difficulty: 'leicht', unit: 'seconds', defaultAmount: 30, intensity: 2, enabled: true, icon: 'pi-circle', instructions: ["Arme seitlich ausstrecken.", "Kleine Kreise ziehen, langsam größer werden.", "Nach der Hälfte Richtung wechseln."] },
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

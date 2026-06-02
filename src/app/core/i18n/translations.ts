/**
 * Translation catalog.
 *
 * Terminology policy (carried over from the original build):
 *  - German KEEPS established Anglicisms verbatim: Timer, Snooze, Streak,
 *    Cardio, Smart, Push, Sync, Insights.
 *  - Genuine UI chrome IS translated: Settings → Einstellungen, History →
 *    Verlauf, Save → Speichern, Difficulty → Schwierigkeit, …
 *  - Exercise names + category labels stay German in BOTH locales (domain
 *    content — handled in exercises.data.ts, NOT here).
 *  - "KONTO LÖSCHEN" is a backend security literal, never localized.
 *
 * Plural keys use the `_one` / `_other` suffix convention and are resolved by
 * TranslationService when a `count` param is supplied.
 * Interpolation uses `{placeholder}` tokens.
 */

export type Locale = 'de' | 'en';

export const SUPPORTED_LOCALES: { value: Locale; label: string }[] = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
];

export const translations: Record<Locale, Record<string, string>> = {
  de: {
    // nav
    'nav.timer': 'Timer',
    'nav.insights': 'Insights',
    'nav.settings': 'Einstellungen',
    'a11y.nav': 'Hauptnavigation',
    'a11y.cycles': 'Abgeschlossene Zyklen',

    // timer
    'timer.phase.idle': 'Bereit',
    'timer.phase.focus': 'Fokus',
    'timer.phase.break': 'Pause',
    'timer.phase.longBreak': 'Lange Pause',
    'timer.sub.idle': 'Starte einen Fokus-Block.',
    'timer.sub.focus': 'Konzentriert bleiben.',
    'timer.sub.break': 'Zeit für eine Übung.',
    'timer.start': 'Fokus starten',
    'timer.pause': 'Pause',
    'timer.stop': 'Stop',
    'timer.resume': 'Weiter',
    'timer.hint': '{focus} Min Fokus · {break} Min Pause',

    // break modal
    'break.title': 'Pause',
    'break.title.feedback': 'Wie war’s?',
    'break.unit.reps': 'Wiederholungen',
    'break.unit.seconds': 'Sekunden',
    'break.other': 'Andere Übung',
    'break.emptyPool': 'Kein Übungspool aktiv. Aktiviere Übungen in den Einstellungen.',
    'break.close': 'Schließen',
    'break.meeting': 'Meeting',
    'break.snooze': 'Snooze',
    'break.skip': 'Überspringen',
    'break.done': 'Erledigt',
    'break.fb.question': 'War die Intensität passend?',
    'break.fb.tooEasy': 'Zu leicht',
    'break.fb.ok': 'Passt',
    'break.fb.tooHard': 'Zu hart',
    'break.aria.less': 'weniger',
    'break.aria.more': 'mehr',
    'break.aria.amount': 'Anzahl',

    // recommendation reasons
    'reco.reason.random': 'Zufällig ausgewählt',
    'reco.reason.rotation': 'Länger nicht gemacht',
    'reco.reason.variety': 'Etwas Abwechslung',
    'reco.reason.mix': 'Diese Muskelgruppe kam zu kurz',
    'reco.reason.level': 'Passt zu deinem Level',
    'reco.reason.default': 'Empfohlen für dich',

    // insights
    'insights.title': 'Insights',
    'insights.stat.done': 'Pausen gemacht',
    'insights.stat.streak': 'Tage Streak',
    'insights.stat.rate': 'Abschlussrate',
    'insights.muscle': 'Muskelgruppen',
    'insights.noData': 'Noch keine Daten.',
    'insights.week': 'Wochenaktivität',
    'insights.history': 'Verlauf',
    'insights.delete': 'Löschen',
    'insights.skipped': 'Übersprungen',
    'insights.empty': 'Noch nichts protokolliert.',

    // settings
    'settings.title': 'Einstellungen',
    'settings.timer': 'Timer',
    'settings.focus': 'Fokus',
    'settings.break': 'Pause',
    'settings.min': 'Min',
    'settings.longBreakEvery': 'Lange Pause alle',
    'settings.autoStart': 'Nächsten Fokus automatisch starten',
    'settings.difficulty': 'Schwierigkeit',
    'settings.diff.leicht': 'Leicht',
    'settings.diff.mittel': 'Mittel',
    'settings.diff.fortgeschritten': 'Fortgeschritten',
    'settings.mode': 'Auswahlmodus',
    'settings.mode.adaptive': 'Smart',
    'settings.mode.random': 'Zufall',
    'settings.mode.rotation': 'Rotation',
    'settings.mode.hint.adaptive': 'Passt Übungen an dein Level und deine Historie an.',
    'settings.mode.hint.random': 'Wählt zufällig aus dem Pool.',
    'settings.mode.hint.rotation': 'Spielt die am längsten ungenutzten Übungen.',
    'settings.pool': 'Übungspool',
    'settings.poolActive': '({count} aktiv)',
    'settings.notif': 'Benachrichtigungen',
    'settings.push': 'Push-Hinweise',
    'settings.sound': 'Ton',
    'settings.notifHint': 'Hintergrund-Hinweise funktionieren nur als installierte App (Home-Bildschirm).',
    'settings.cloud': 'Cloud-Sync',
    'settings.cloudHint': 'Melde dich an, um deinen Verlauf zu sichern.',
    'settings.signin': 'Anmelden',
    'settings.feedback': 'Feedback',
    'settings.sendFeedback': 'Feedback senden',
    'settings.language': 'Sprache',
    'settings.about': 'BreakFit v{version} · Build {date}',

    // auth
    'auth.login.sub': 'Melde dich an, um deinen Verlauf zu sichern.',
    'auth.email': 'E-Mail',
    'auth.requestCode': 'Code anfordern',
    'auth.devHint': 'Dev: Code wird in der Server-Konsole geloggt.',
    'auth.spamHint': 'Prüfe auch deinen Spam-Ordner.',
    'auth.verify.title': 'Code eingeben',
    'auth.verify.sub': 'Wir haben einen Code an {email} gesendet.',
    'auth.confirm': 'Bestätigen',
    'auth.error.login': 'Anmeldung fehlgeschlagen.',
    'auth.error.code': 'Code ungültig.',

    // notifications (system surface — no emoji)
    'notif.breakDue.title': 'Zeit für eine Pause',
    'notif.breakDue.body': 'Beweg dich kurz — los geht’s.',
    'notif.breakOver.title': 'Pause vorbei',
    'notif.breakOver.body': 'Zurück an die Arbeit.',

    // common / plural sample
    'common.day_one': 'Tag',
    'common.day_other': 'Tage',
    // presets
    'presets.title': 'Vorlagen',
    'presets.apply': 'Anwenden',
    'presets.saveCurrentBtn': 'Aktuelle Einstellungen speichern',
    'presets.namePlaceholder': 'Name der Vorlage',

    // exercises
    'exercises.addBtn': 'Übung hinzufügen',
    'exercises.addTitle': 'Neue Übung',
    'exercises.name': 'Name',
    'exercises.namePlaceholder': 'z. B. Wandsitze',
    'exercises.category': 'Kategorie',
    'exercises.difficulty': 'Schwierigkeit',
    'exercises.unit': 'Einheit',
    'exercises.amount': 'Standardanzahl',
    'exercises.reps': 'Wdh.',
    'exercises.seconds': 'Sek.',
    'exercises.errName': 'Name darf nicht leer sein.',
    'exercises.errAmount': 'Mindestens 1 eingeben.',
    'exercises.errMax': 'Max. 20 eigene Übungen erreicht.',

    // goal
    'goal.title': 'Wochenziel',
    'goal.label': 'Pausen diese Woche',
    'goal.target': 'Ziel',
    'goal.done': 'Ziel erreicht',

    // common additions
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    // meeting mode
    'meeting.title': 'Meeting',
    'meeting.choose': 'Wie lange dauert dein Meeting?',
    'meeting.active': 'Meeting aktiv',
    'meeting.end': 'Beenden',

    // milestones
    'milestones.title': 'Meilensteine',
    'milestones.streak3': '3-Tage-Streak',
    'milestones.streak7': '7-Tage-Streak',
    'milestones.streak30': '30-Tage-Streak',
    'milestones.total10': '10 Pausen',
    'milestones.total50': '50 Pausen',
    'milestones.total100': '100 Pausen',
    'milestones.weekly1': 'Wochenziel erreicht',
  },

  en: {
    'nav.timer': 'Timer',
    'nav.insights': 'Insights',
    'nav.settings': 'Settings',
    'a11y.nav': 'Main navigation',
    'a11y.cycles': 'Completed cycles',

    'timer.phase.idle': 'Ready',
    'timer.phase.focus': 'Focus',
    'timer.phase.break': 'Break',
    'timer.phase.longBreak': 'Long break',
    'timer.sub.idle': 'Start a focus block.',
    'timer.sub.focus': 'Stay focused.',
    'timer.sub.break': 'Time for an exercise.',
    'timer.start': 'Start focus',
    'timer.pause': 'Pause',
    'timer.stop': 'Stop',
    'timer.resume': 'Resume',
    'timer.hint': '{focus} min focus · {break} min break',

    'break.title': 'Break',
    'break.title.feedback': 'How was it?',
    'break.unit.reps': 'Reps',
    'break.unit.seconds': 'Seconds',
    'break.other': 'Another exercise',
    'break.emptyPool': 'No exercise pool active. Enable exercises in settings.',
    'break.close': 'Close',
    'break.meeting': 'Meeting',
    'break.snooze': 'Snooze',
    'break.skip': 'Skip',
    'break.done': 'Done',
    'break.fb.question': 'Was the intensity right?',
    'break.fb.tooEasy': 'Too easy',
    'break.fb.ok': 'Just right',
    'break.fb.tooHard': 'Too hard',
    'break.aria.less': 'less',
    'break.aria.more': 'more',
    'break.aria.amount': 'Amount',

    'reco.reason.random': 'Randomly picked',
    'reco.reason.rotation': 'Not done in a while',
    'reco.reason.variety': 'A bit of variety',
    'reco.reason.mix': 'This muscle group was neglected',
    'reco.reason.level': 'Matches your level',
    'reco.reason.default': 'Recommended for you',

    'insights.title': 'Insights',
    'insights.stat.done': 'Breaks done',
    'insights.stat.streak': 'Day streak',
    'insights.stat.rate': 'Completion rate',
    'insights.muscle': 'Muscle groups',
    'insights.noData': 'No data yet.',
    'insights.week': 'Weekly activity',
    'insights.history': 'History',
    'insights.delete': 'Clear',
    'insights.skipped': 'Skipped',
    'insights.empty': 'Nothing logged yet.',

    'settings.title': 'Settings',
    'settings.timer': 'Timer',
    'settings.focus': 'Focus',
    'settings.break': 'Break',
    'settings.min': 'min',
    'settings.longBreakEvery': 'Long break every',
    'settings.autoStart': 'Auto-start next focus',
    'settings.difficulty': 'Difficulty',
    'settings.diff.leicht': 'Easy',
    'settings.diff.mittel': 'Medium',
    'settings.diff.fortgeschritten': 'Advanced',
    'settings.mode': 'Selection mode',
    'settings.mode.adaptive': 'Smart',
    'settings.mode.random': 'Random',
    'settings.mode.rotation': 'Rotation',
    'settings.mode.hint.adaptive': 'Adapts exercises to your level and history.',
    'settings.mode.hint.random': 'Picks randomly from the pool.',
    'settings.mode.hint.rotation': 'Plays the least recently used exercises.',
    'settings.pool': 'Exercise pool',
    'settings.poolActive': '({count} active)',
    'settings.notif': 'Notifications',
    'settings.push': 'Push alerts',
    'settings.sound': 'Sound',
    'settings.notifHint': 'Background alerts only work when installed as an app (home screen).',
    'settings.cloud': 'Cloud sync',
    'settings.cloudHint': 'Sign in to back up your history.',
    'settings.signin': 'Sign in',
    'settings.feedback': 'Feedback',
    'settings.sendFeedback': 'Send feedback',
    'settings.language': 'Language',
    'settings.about': 'BreakFit v{version} · Build {date}',

    'auth.login.sub': 'Sign in to back up your history.',
    'auth.email': 'Email',
    'auth.requestCode': 'Request code',
    'auth.devHint': 'Dev: the code is logged to the server console.',
    'auth.spamHint': 'Check your spam folder too.',
    'auth.verify.title': 'Enter code',
    'auth.verify.sub': 'We sent a code to {email}.',
    'auth.confirm': 'Confirm',
    'auth.error.login': 'Sign-in failed.',
    'auth.error.code': 'Invalid code.',

    'notif.breakDue.title': 'Time for a break',
    'notif.breakDue.body': 'Move a little — let’s go.',
    'notif.breakOver.title': 'Break over',
    'notif.breakOver.body': 'Back to work.',

    'common.day_one': 'day',
    'common.day_other': 'days',
    // presets
    'presets.title': 'Presets',
    'presets.apply': 'Apply',
    'presets.saveCurrentBtn': 'Save current settings',
    'presets.namePlaceholder': 'Preset name',

    // exercises
    'exercises.addBtn': 'Add exercise',
    'exercises.addTitle': 'New exercise',
    'exercises.name': 'Name',
    'exercises.namePlaceholder': 'e.g. Wall sit',
    'exercises.category': 'Category',
    'exercises.difficulty': 'Difficulty',
    'exercises.unit': 'Unit',
    'exercises.amount': 'Default amount',
    'exercises.reps': 'Reps',
    'exercises.seconds': 'Sec.',
    'exercises.errName': 'Name must not be empty.',
    'exercises.errAmount': 'Enter at least 1.',
    'exercises.errMax': 'Max. 20 custom exercises reached.',

    // goal
    'goal.title': 'Weekly goal',
    'goal.label': 'Breaks this week',
    'goal.target': 'Target',
    'goal.done': 'Goal reached',

    // common additions
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    // meeting mode
    'meeting.title': 'Meeting',
    'meeting.choose': 'How long is your meeting?',
    'meeting.active': 'Meeting active',
    'meeting.end': 'End',

    // milestones
    'milestones.title': 'Milestones',
    'milestones.streak3': '3-day streak',
    'milestones.streak7': '7-day streak',
    'milestones.streak30': '30-day streak',
    'milestones.total10': '10 breaks',
    'milestones.total50': '50 breaks',
    'milestones.total100': '100 breaks',
    'milestones.weekly1': 'Weekly goal hit',
  },
};

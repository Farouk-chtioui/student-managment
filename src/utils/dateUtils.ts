export const frenchMonths = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export const frenchDays = [
  "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"
];

export const frenchDaysShort = [
  "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"
];

export function formatDateToFrench(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatShortDateToFrench(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  });
}

export function getWeekDayInFrench(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'long' });
}

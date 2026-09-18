export function formatTimeSpent(seconds: number): string {
  if (!seconds || seconds < 60) return `${seconds || 0} сек.`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин.`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours} ч. ${remMinutes} мин.`;
}

export function formatCoins(coins: number): string {
  return coins.toLocaleString('ru-RU');
}

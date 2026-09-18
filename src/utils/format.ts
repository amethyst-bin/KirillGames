export function formatTimeSpent(seconds: number): string {
  if (!seconds || seconds < 60) return `${seconds || 0} сек.`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин.`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours} ч. ${remMinutes} мин.`;
}

/**
 * Правило форматирования монет:
 * - До 100 миллионов: полная запись с разделителями пробелами (например: "1 000 000", "10 000 000", "99 999 999").
 * - От 100 миллионов и выше: сокращение с буквенным суффиксом:
 *   - 100 000 000 -> 100M
 *   - 4 681 615 560 -> 4.68B
 *   - 1 000 000 000 000 -> 1T
 */
export function formatCoins(coins: number | null | undefined): string {
  if (coins === null || coins === undefined || isNaN(coins)) return '0';
  const val = Math.floor(coins);
  const abs = Math.abs(val);

  // Меньше 100 миллионов — выводим полностью с пробелами
  if (abs < 100_000_000) {
    return val.toLocaleString('ru-RU');
  }

  // От 100 миллионов до 1 миллиарда (100M .. 999M)
  if (abs < 1_000_000_000) {
    const num = val / 1_000_000;
    const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(1).replace(/\.0$/, '');
    return `${formatted}M`;
  }

  // От 1 миллиарда до 1 триллиона (1B .. 999B)
  if (abs < 1_000_000_000_000) {
    const num = val / 1_000_000_000;
    const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted}B`;
  }

  // От 1 триллиона до 1 квадриллиона (1T .. 999T)
  if (abs < 1_000_000_000_000_000) {
    const num = val / 1_000_000_000_000;
    const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted}T`;
  }

  // 1 квадриллион и выше (1Q+)
  const num = val / 1_000_000_000_000_000;
  const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted}Q`;
}

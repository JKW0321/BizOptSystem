export function formatCurrency(value) {
  return Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}


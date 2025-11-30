export const CATEGORIES = [
  { value: 'food', label: 'Food', emoji: '🍔' },
  { value: 'transport', label: 'Transport', emoji: '🚗' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { value: 'shopping', label: 'Shopping', emoji: '🛒' },
  { value: 'utilities', label: 'Utilities', emoji: '💡' },
  { value: 'health', label: 'Health', emoji: '💊' },
  { value: 'subscriptions', label: 'Subscriptions', emoji: '📱' },
  { value: 'income', label: 'Income', emoji: '💰' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export function getCategoryLabel(value) {
  const cat = CATEGORIES.find(c => c.value === value);
  return cat ? `${cat.emoji} ${cat.label}` : value;
}

export function getCategoryEmoji(value) {
  const cat = CATEGORIES.find(c => c.value === value);
  return cat?.emoji || '📦';
}

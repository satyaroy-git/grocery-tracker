/**
 * Simple UUID v4 generator that works in React Native / Hermes
 * without requiring the crypto module.
 */
export function generateId(): string {
  const chars = '0123456789abcdef';
  const segments = [8, 4, 4, 4, 12];
  return segments
    .map((len) => {
      let segment = '';
      for (let i = 0; i < len; i++) {
        segment += chars[Math.floor(Math.random() * 16)];
      }
      return segment;
    })
    .join('-');
}

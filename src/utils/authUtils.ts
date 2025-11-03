export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*()_+[]{}|;:,.<>?';
  let result = '';
  const randomArray = new Uint8Array(length);
  crypto.getRandomValues(randomArray); // Usar API de criptografia para maior segurança

  for (let i = 0; i < length; i++) {
    result += chars[randomArray[i] % chars.length];
  }
  return result;
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random password for Task-2 Forgot Password.
 * Rules (strict):
 * - Length: 8-12
 * - Uppercase A-Z: required
 * - Lowercase a-z: required
 * - No numbers
 * - No special characters
 */
function generatePassword() {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const length = randomInt(8, 12);

  // ensure at least one upper + one lower
  const chars = [
    uppercase[randomInt(0, uppercase.length - 1)],
    lowercase[randomInt(0, lowercase.length - 1)],
  ];

  const all = uppercase + lowercase;
  while (chars.length < length) {
    chars.push(all[randomInt(0, all.length - 1)]);
  }

  // Fisher–Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join("");
}

module.exports = { generatePassword };

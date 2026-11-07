export const STORAGE_KEY = "la-ruleta-v1";

export function cleanName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function addName(names, value) {
  const name = cleanName(value);
  if (!name) return { names, error: "Escribe un nombre primero." };
  if (names.some((item) => item.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"))) {
    return { names, error: "Ese nombre ya está en la ruleta." };
  }
  if (names.length >= 20) return { names, error: "La ruleta admite hasta 20 personas." };
  return { names: [...names, name], error: "" };
}

export function validForcedName(names, forcedName) {
  return names.find((name) => name === forcedName) ?? "";
}

export function pickWinner(names, forcedName, randomIndex) {
  if (!names.length) return "";
  const forced = validForcedName(names, forcedName);
  if (forced) return forced;
  return names[randomIndex(names.length)];
}

export function randomIndex(length) {
  if (!Number.isInteger(length) || length < 1) throw new RangeError("length must be positive");
  const ceiling = Math.floor(0x100000000 / length) * length;
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= ceiling);
  return value[0] % length;
}

export function targetRotation(currentDegrees, winnerIndex, total) {
  const slice = 360 / total;
  const wanted = (360 - (winnerIndex + 0.5) * slice + 360) % 360;
  const current = ((currentDegrees % 360) + 360) % 360;
  return currentDegrees + 360 * 6 + ((wanted - current + 360) % 360);
}

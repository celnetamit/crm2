import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const ITERATIONS = 120000;
const KEYLEN = 64;
const DIGEST = "sha512";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
  return `${ITERATIONS}:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [iterationsPart, salt, expected] = storedHash.split(":");
  if (!iterationsPart || !salt || !expected) return false;

  const iterations = Number(iterationsPart);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const derived = pbkdf2Sync(password, salt, iterations, KEYLEN, DIGEST);
  const expectedBuffer = Buffer.from(expected, "hex");
  if (expectedBuffer.length !== derived.length) return false;

  return timingSafeEqual(expectedBuffer, derived);
}

/**
 * AI HEAVEN - RFC 6238 TOTP (Time-Based One-Time Password) Engine
 * Compliant with Google Authenticator, 1Password, Bitwarden, and RFC 6238 / RFC 4226 standards.
 * Zero external dependencies — built using Node.js native crypto.
 */

import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer into a standard Base32 string (RFC 4648).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string into a Buffer.
 */
export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${cleaned[i]}`);
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a cryptographically secure Base32 secret for TOTP (160 bits / 20 bytes).
 */
export function generateTotpSecret(bytesLength = 20): string {
  const randomBytes = crypto.randomBytes(bytesLength);
  return base32Encode(randomBytes);
}

/**
 * Generates an RFC 6238 TOTP 6-digit code for a given secret and timestamp.
 */
export function generateTotpCode(secretBase32: string, timestampMs = Date.now(), timeStepSeconds = 30): string {
  const key = base32Decode(secretBase32);
  const timeStep = Math.floor(timestampMs / 1000 / timeStepSeconds);

  // Time step counter as 8-byte big-endian integer
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep));

  // Compute HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();

  // Dynamic truncation (RFC 4226 section 5.4)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP code against a secret with clock drift tolerance (default +-1 step = 30s).
 */
export function verifyTotpCode(
  secretBase32: string,
  userToken: string,
  windowTolerance = 1,
  timestampMs = Date.now(),
  timeStepSeconds = 30
): boolean {
  if (!userToken || typeof userToken !== 'string') return false;
  const cleanToken = userToken.trim().replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  try {
    for (let stepOffset = -windowTolerance; stepOffset <= windowTolerance; stepOffset++) {
      const stepTime = timestampMs + stepOffset * timeStepSeconds * 1000;
      const expected = generateTotpCode(secretBase32, stepTime, timeStepSeconds);
      if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Generates an otpauth:// URI for QR code generators and authenticator apps.
 */
export function generateTotpUri(secretBase32: string, accountName: string, issuer = 'AI Heaven'): string {
  const cleanAccount = encodeURIComponent(accountName.trim());
  const cleanIssuer = encodeURIComponent(issuer.trim());
  return `otpauth://totp/${cleanIssuer}:${cleanAccount}?secret=${secretBase32}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}

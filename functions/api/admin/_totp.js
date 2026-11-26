
function base32Encode(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const output = [];

  for (const char of input.toUpperCase().replace(/=+$/, "")) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("Invalid Base32 secret");

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

async function getEncryptionKey(env) {
  if (!env.TOTP_ENCRYPTION_KEY) {
    throw new Error("TOTP encryption key is missing");
  }

  const raw = base64ToBytes(env.TOTP_ENCRYPTION_KEY);

  if (raw.length !== 32) {
    throw new Error("TOTP encryption key must be 32 bytes");
  }

  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptSecret(secret, env) {
  const key = await getEncryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(secret)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return bytesToBase64(combined);
}

export async function decryptSecret(value, env) {
  const key = await getEncryptionKey(env);
  const combined = base64ToBytes(value);

  if (combined.length < 29) {
    throw new Error("Invalid encrypted secret");
  }

  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

export function generateTotpSecret() {
  return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
}

export async function verifyTotp(secret, inputCode) {
  if (!/^\d{6}$/.test(String(inputCode))) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    base32Decode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const currentStep = Math.floor(Date.now() / 30000);

  for (let offset = -1; offset <= 1; offset++) {
    const step = currentStep + offset;
    const counter = new Uint8Array(8);

    let remaining = step;
    for (let i = 7; i >= 0; i--) {
      counter[i] = remaining & 255;
      remaining = Math.floor(remaining / 256);
    }

    const hmac = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, counter)
    );

    const index = hmac[hmac.length - 1] & 15;

    const binary =
      ((hmac[index] & 127) << 24) |
      (hmac[index + 1] << 16) |
      (hmac[index + 2] << 8) |
      hmac[index + 3];

    const expected = String(binary % 1000000).padStart(6, "0");

    if (expected === String(inputCode)) return true;
  }

  return false;
}

export function createOtpUri(secret, email) {
  const issuer = "The Lad Couple";
  const label = `${issuer}:${email}`;

  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

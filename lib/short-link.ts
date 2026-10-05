import { createHash } from "node:crypto";

// Short share links: /s/<code> → /p/<long id>. The code is derived from the
// long id itself, so the same combination always gets the same short link and
// nothing needs to be looked up before saving.

const BASE = BigInt(62);
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Base62 of the SHA-256 of the long id, `length` characters (8 → ~2×10^14 codes). */
export function shortCode(longId: string, length = 8): string {
  const bytes = createHash("sha256").update(longId).digest();
  let n = BigInt("0x" + bytes.toString("hex"));
  let out = "";
  while (out.length < length) {
    out += ALPHABET[Number(n % BASE)];
    n /= BASE;
  }
  return out;
}

export const SHORT_CODE = /^[0-9A-Za-z]{8,10}$/;

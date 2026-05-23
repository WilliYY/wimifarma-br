import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

const algorithm = "aes-256-gcm";

export type EncryptedValue = {
  ciphertext: string;
  iv: string;
  tag: string;
};

function getEncryptionKey() {
  const keyMaterial = process.env.SECRET_VAULT_KEY ?? process.env.AUTH_SECRET;

  if (!keyMaterial) {
    throw new Error("SECRET_VAULT_KEY ou AUTH_SECRET precisa estar definido.");
  }

  return createHash("sha256").update(keyMaterial).digest();
}

export function encryptValue(value: string): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptValue(encrypted: EncryptedValue) {
  const decipher = createDecipheriv(
    algorithm,
    getEncryptionKey(),
    Buffer.from(encrypted.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function encryptOptionalValue(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return encryptValue(normalized);
}

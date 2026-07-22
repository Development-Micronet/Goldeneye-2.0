export function base64ToArrayBuffer(base64: string) {
  base64 = base64.replace(/-/g, "+").replace(/_/g, "/");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export async function decryptAESGCM(base64Data: string, token: string) {
  try {
    const raw = base64ToArrayBuffer(base64Data);

    if (raw.length < 28) {
      throw new Error("Payload too small");
    }

    const nonce = raw.slice(0, 12);
    const ciphertext = raw.slice(12);
    // MUST match backend exactly
    const keyMaterial = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token.trim()),
    );
    const key = await crypto.subtle.importKey("raw", keyMaterial, "AES-GCM", false, ["decrypt"]);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: nonce,
      },
      key,
      ciphertext,
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (err) {
    console.error("❌ DECRYPT FAILED:", err);
    throw err;
  }
}

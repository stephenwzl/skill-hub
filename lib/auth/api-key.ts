import { randomToken, sha256 } from "./crypto";

export interface GeneratedApiKey {
  apiKey: string;
  prefix: string;
  hash: string;
}

export function generateApiKey(): GeneratedApiKey {
  const prefix = randomToken(6);
  const secret = randomToken(32);
  const apiKey = `skh_${prefix}_${secret}`;
  return {
    apiKey,
    prefix,
    hash: sha256(apiKey),
  };
}

export function hashApiKey(apiKey: string) {
  return sha256(apiKey);
}

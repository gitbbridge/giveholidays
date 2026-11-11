import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from "node:crypto";
export function token() {
  return randomBytes(32).toString("base64url");
}
export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function code() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}
export function keyedHash(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function encrypt(value: unknown, secret: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", Buffer.from(secret, "base64"), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    data.toString("base64"),
  ].join(".");
}
export function decrypt<T>(value: string, secret: string): T {
  const [iv, tag, data] = value.split(".");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(secret, "base64"),
    Buffer.from(iv, "base64"),
  );
  cipher.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(
    Buffer.concat([
      cipher.update(Buffer.from(data, "base64")),
      cipher.final(),
    ]).toString("utf8"),
  ) as T;
}

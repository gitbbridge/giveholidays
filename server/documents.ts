import multer from "multer";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Query } from "./database.ts";
import { HttpError, type PrivateConfig } from "./access.ts";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5, fields: 3, parts: 8 },
}).array("documents", 5);
export function storagePath(config: PrivateConfig, name: string) {
  const root = resolve(config.documentDirectory),
    target = resolve(root, name),
    child = relative(root, target);
  if (
    !/^[a-f0-9-]{36}\.bin$/.test(name) ||
    child.startsWith("..") ||
    isAbsolute(child)
  )
    throw new HttpError(404, "Document not found.");
  for (const publicRoot of [resolve("public"), resolve("dist")]) {
    const rel = relative(publicRoot, root);
    if (!rel || (!rel.startsWith("..") && !isAbsolute(rel)))
      throw new Error(
        "Private document storage cannot be inside a public directory.",
      );
  }
  if (config.production) {
    const rel = relative(resolve("."), root);
    if (!rel || (!rel.startsWith("..") && !isAbsolute(rel)))
      throw new Error(
        "Production documents must be stored outside the release checkout.",
      );
  }
  return target;
}
export async function scanner(path: string) {
  if (!process.env.CLAMSCAN_PATH) return false;
  try {
    await promisify(execFile)(
      process.env.CLAMSCAN_PATH,
      [
        "--no-summary",
        "--infected",
        "--max-filesize=10M",
        "--max-scansize=50M",
        "--max-recursion=12",
        "--alert-exceeds-max=yes",
        "--alert-encrypted=yes",
        "--alert-macros=yes",
        path,
      ],
      { timeout: 60000, maxBuffer: 4096, windowsHide: true },
    );
    return true;
  } catch {
    throw new HttpError(422, "The document could not pass malware scanning.");
  }
}
export async function saveDocument(
  query: Query,
  config: PrivateConfig,
  hotelId: string,
  submissionId: string,
  file: Express.Multer.File,
  kind: "proposal" | "property_logo" | "executed",
) {
  const ext = file.originalname.split(".").pop()?.toLowerCase(),
    type = await fileTypeFromBuffer(file.buffer);
  const allowed =
    kind === "property_logo" ? ["png", "jpg", "jpeg"] : ["pdf", "doc", "docx"];
  if (!ext || !allowed.includes(ext) || !type)
    throw new HttpError(
      400,
      "Use a supported document type (PDF, DOC or DOCX), or PNG/JPEG for the optional property logo.",
    );
  const valid =
    kind === "property_logo"
      ? ["image/png", "image/jpeg"].includes(type.mime)
      : ext === "pdf"
        ? type.mime === "application/pdf"
        : ext === "docx"
          ? type.mime ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : type.mime === "application/x-cfb" &&
            file.buffer.includes(Buffer.from("WordDocument", "utf16le"));
  if (!valid)
    throw new HttpError(400, "The file content does not match its extension.");
  if (
    ext === "pdf" &&
    (!file.buffer.subarray(-2048).includes(Buffer.from("%%EOF")) ||
      /\/(JavaScript|JS|Launch)\b/.test(file.buffer.toString("latin1")))
  )
    throw new HttpError(
      400,
      "The PDF contains unsupported active content or is incomplete.",
    );
  const id = randomUUID(),
    name = `${id}.bin`,
    path = storagePath(config, name);
  await mkdir(resolve(config.documentDirectory), {
    recursive: true,
    mode: 0o700,
  });
  await writeFile(path, file.buffer, { mode: 0o600, flag: "wx" });
  try {
    const clean = await (config.scanFile || scanner)(path);
    await query(
      "INSERT INTO private_documents(id,hotel_id,submission_id,kind,original_name,storage_name,mime,size_bytes,sha256,scan_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        id,
        hotelId,
        submissionId,
        kind,
        file.originalname.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 150),
        name,
        type.mime,
        file.size,
        createHash("sha256").update(file.buffer).digest("hex"),
        clean ? "clean" : "quarantined",
      ],
    );
    return { id, scanStatus: clean ? "clean" : "quarantined" };
  } catch (error) {
    await unlink(path);
    throw error;
  }
}

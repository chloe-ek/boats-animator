import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import crypto from "crypto";

export interface ConformMappingItem {
  timelineIndex: number;
  source: string;
  target: string;
  sha1?: string;
}

export interface ConformResult {
  takeId: string;
  projectPath: string;
  conformDir: string;
  mappingPath: string;
  frameCount: number;
  mapping: ConformMappingItem[];
}

/**
 * mkdir -p helper
 */
async function ensureDir(dir: string) {
  await fsp.mkdir(dir, { recursive: true });
}

/**
 * Optional SHA1 checksum of a file.
 */
async function sha1OfFile(p: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha1");
    const stream = fs.createReadStream(p);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Try to hardlink, fall back to copy on failure (e.g. cross-device).
 */
async function linkOrCopy(src: string, dest: string) {
  try {
    await fsp.link(src, dest);
  } catch {
    await fsp.copyFile(src, dest);
  }
}

/**
 * Build a stable "conform" folder for a take, in timeline order.
 *
 * This is the thing that users can safely copy out of the project
 * and use with other software, even if export fails.
 *
 * @param projectPath Root project folder (where the .boats project lives).
 * @param takeId      Take identifier, e.g. "take01".
 * @param orderedFramePaths Absolute paths to source frames IN TIMELINE ORDER.
 */
export async function conformTake(
  projectPath: string,
  takeId: string,
  orderedFramePaths: string[]
): Promise<ConformResult> {
  if (!projectPath) throw new Error("conformTake: projectPath is required");
  if (!takeId) throw new Error("conformTake: takeId is required");
  if (!Array.isArray(orderedFramePaths) || orderedFramePaths.length === 0) {
    throw new Error("conformTake: orderedFramePaths must be a non-empty array");
  }

  const takeRoot = path.join(projectPath, "takes", takeId);
  const conformDir = path.join(takeRoot, "conform");
  const conformTempDir = path.join(takeRoot, "conform_temp");
  const mappingPath = path.join(takeRoot, "conform.json");

  // Clean & recreate temp dir
  await fsp.rm(conformTempDir, { recursive: true, force: true });
  await ensureDir(conformTempDir);

  const mapping: ConformMappingItem[] = [];

  for (let i = 0; i < orderedFramePaths.length; i++) {
    const source = orderedFramePaths[i];

    const index = i + 1;
    const ext = path.extname(source) || ".png"; // fallback extension
    const filename = index.toString().padStart(6, "0") + ext;
    const target = path.join(conformTempDir, filename);

    await linkOrCopy(source, target);

    let sha1: string | undefined;
    try {
      sha1 = await sha1OfFile(target);
    } catch {
      // non-fatal – checksums are nice-to-have only
      sha1 = undefined;
    }

    mapping.push({
      timelineIndex: i,
      source,
      target,
      sha1,
    });
  }

  const mappingJson = {
    takeId,
    projectPath,
    frameCount: mapping.length,
    generatedAt: new Date().toISOString(),
    mapping,
  };

  const tempMappingPath = path.join(takeRoot, "conform_temp.json");
  await fsp.writeFile(tempMappingPath, JSON.stringify(mappingJson, null, 2), "utf8");

  // Atomically replace old conform folder & mapping
  await fsp.rm(conformDir, { recursive: true, force: true });
  await fsp.rename(conformTempDir, conformDir);

  await fsp.rm(mappingPath, { force: true });
  await fsp.rename(tempMappingPath, mappingPath);

  return {
    takeId,
    projectPath,
    conformDir,
    mappingPath,
    frameCount: mapping.length,
    mapping,
  };
}

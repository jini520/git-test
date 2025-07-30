import fs from "fs";
import path from "path";

function readIndexFile(indexPath) {
  const buffer = fs.readFileSync(indexPath);

  const signature = buffer.toString("ascii", 0, 4);
  const version = buffer.readUInt32BE(4);
  const entryCount = buffer.readUInt32BE(8);

  if (signature !== "DIRC") throw new Error("Invalid index signature");
  if (version !== 2) throw new Error(`Unsupported index version: ${version}`);

  let offset = 12;
  const entries = [];

  for (let i = 0; i < entryCount; i++) {
    const ctime = buffer.readUInt32BE(offset);
    const ctimeNano = buffer.readUInt32BE(offset + 4);
    const mtime = buffer.readUInt32BE(offset + 8);
    const mtimeNano = buffer.readUInt32BE(offset + 12);
    const dev = buffer.readUInt32BE(offset + 16);
    const ino = buffer.readUInt32BE(offset + 20);
    const mode = buffer.readUInt32BE(offset + 24);
    const uid = buffer.readUInt32BE(offset + 28);
    const gid = buffer.readUInt32BE(offset + 32);
    const size = buffer.readUInt32BE(offset + 36);
    const sha = buffer.slice(offset + 40, offset + 60).toString("hex");
    const flags = buffer.readUInt16BE(offset + 60);
    const nameLength = flags & 0x0fff;

    let nameOffset = offset + 62;
    const nameEnd = buffer.indexOf(0x00, nameOffset);
    const filePath = buffer.toString("utf8", nameOffset, nameEnd);

    // Sanity check
    if (Buffer.byteLength(filePath) > 4095) {
      throw new Error(`[${i}] 파일 이름 길이 초과: ${filePath}`);
    }

    const entryLength = nameEnd + 1 - offset;
    const padding = (8 - (entryLength % 8)) % 8;
    const totalLength = entryLength + padding;

    entries.push({
      index: i,
      filePath,
      mode: mode.toString(8),
      size,
      sha,
      ctime,
      mtime,
    });

    offset += totalLength;
  }

  return entries;
}

// 사용 예시
const gitIndexPath = path.resolve(".git/index");
try {
  const entries = readIndexFile(gitIndexPath);
  for (const e of entries) {
    console.log(`[${e.index}] ${e.filePath}`);
    console.log(`  mode: ${e.mode}`);
    console.log(`  size: ${e.size}`);
    console.log(`  sha : ${e.sha}`);
    console.log(`  ctime: ${e.ctime}`);
    console.log(`  mtime: ${e.mtime}`);
    console.log("");
  }
} catch (err) {
  console.error("❌ 에러 발생:", err.message);
}

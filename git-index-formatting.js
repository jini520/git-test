// git-index-parser.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.resolve(__dirname, "./.git/index");

function parseIndex() {
  const buffer = fs.readFileSync(INDEX_PATH);
  const signature = buffer.toString("utf8", 0, 4);
  const version = buffer.readUInt32BE(4);
  const entryCount = buffer.readUInt32BE(8);

  console.log(`signature: ${signature}`);
  console.log(`version: ${version}`);
  console.log(`entry count: ${entryCount}`);

  let offset = 12;

  for (let i = 0; i < entryCount; i++) {
    const ctimeSeconds = buffer.readUInt32BE(offset);
    const mtimeSeconds = buffer.readUInt32BE(offset + 8);
    const dev = buffer.readUInt32BE(offset + 16);
    const ino = buffer.readUInt32BE(offset + 20);
    const mode = buffer.readUInt32BE(offset + 24);
    const uid = buffer.readUInt32BE(offset + 28);
    const gid = buffer.readUInt32BE(offset + 32);
    const fileSize = buffer.readUInt32BE(offset + 36);
    const sha = buffer.slice(offset + 40, offset + 60).toString("hex");
    const flags = buffer.readUInt16BE(offset + 60);
    const nameLength = flags & 0x0fff;

    const nameStart = offset + 62;
    const nameEnd = nameStart + nameLength;
    const fileName = buffer.toString("utf8", nameStart, nameEnd);

    // padding: align to next 8-byte boundary
    let entryLength = nameEnd - offset;
    if (entryLength % 8 !== 0) {
      entryLength += 8 - (entryLength % 8);
    }

    console.log(`\n[${i}] ${fileName}`);
    console.log(`  mode: ${mode.toString(8)}`);
    console.log(`  size: ${fileSize}`);
    console.log(`  sha : ${sha}`);
    console.log(`  ctime: ${ctimeSeconds}`);
    console.log(`  mtime: ${mtimeSeconds}`);

    offset += entryLength;
  }
}

parseIndex();

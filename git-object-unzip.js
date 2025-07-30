// git-object-inspector.js
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GIT_DIR = path.resolve(__dirname, "./.git");
const OBJECTS_DIR = path.join(GIT_DIR, "objects");

function isObjectDir(name) {
  return /^[a-f0-9]{2}$/.test(name);
}

function isObjectFile(name) {
  return /^[a-f0-9]{38}$/.test(name);
}

function readGitObject(sha) {
  const dir = sha.slice(0, 2);
  const file = sha.slice(2);
  const objectPath = path.join(OBJECTS_DIR, dir, file);
  const compressed = fs.readFileSync(objectPath);
  const buffer = zlib.inflateSync(compressed);
  return buffer;
}

function parseHeader(buffer) {
  const nullIndex = buffer.indexOf(0);
  const header = buffer.subarray(0, nullIndex).toString("utf8");
  const content = buffer.subarray(nullIndex + 1);
  const [type, sizeStr] = header.split(" ");
  return { type, size: Number(sizeStr), content };
}

function parseBlob(content) {
  return content.toString("utf8");
}

function parseCommit(content) {
  const text = content.toString("utf8");
  const lines = text.split("\n");
  const headers = {};
  let i = 0;

  while (lines[i] !== "") {
    const [key, ...rest] = lines[i].split(" ");
    headers[key] = rest.join(" ");
    i++;
  }

  const message = lines.slice(i + 1).join("\n");
  return { headers, message };
}

function parseTree(content) {
  const entries = [];
  let offset = 0;

  while (offset < content.length) {
    const spaceIdx = content.indexOf(0x20, offset);
    const nullIdx = content.indexOf(0x00, spaceIdx);

    const mode = content.subarray(offset, spaceIdx).toString("utf8");
    const filename = content.subarray(spaceIdx + 1, nullIdx).toString("utf8");
    const shaBuf = content.subarray(nullIdx + 1, nullIdx + 21);
    const sha = [...shaBuf]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    entries.push({ mode, filename, sha });
    offset = nullIdx + 21;
  }

  return entries;
}

function parseTag(content) {
  const text = content.toString("utf8");
  const lines = text.split("\n");
  const headers = {};
  let i = 0;

  while (lines[i] !== "") {
    const [key, ...rest] = lines[i].split(" ");
    headers[key] = rest.join(" ");
    i++;
  }

  const message = lines.slice(i + 1).join("\n");
  return { headers, message };
}

function inspectObject(sha) {
  const buffer = readGitObject(sha);
  const { type, size, content } = parseHeader(buffer);

  console.log(`\n[${sha}]`);
  console.log(`type: ${type}`);
  console.log(`size: ${size}`);

  switch (type) {
    case "blob":
      console.log("--- content ---");
      console.log(parseBlob(content));
      break;

    case "commit": {
      const { headers, message } = parseCommit(content);
      console.log("--- headers ---");
      console.log(headers);
      console.log("--- message ---");
      console.log(message);
      break;
    }

    case "tree": {
      const entries = parseTree(content);
      console.log("--- entries ---");
      for (const entry of entries) {
        console.log(`${entry.mode} ${entry.filename} ${entry.sha}`);
      }
      break;
    }

    case "tag": {
      const { headers, message } = parseTag(content);
      console.log("--- headers ---");
      console.log(headers);
      console.log("--- message ---");
      console.log(message);
      break;
    }

    default:
      console.log("(Unknown type)");
  }
}

function readAllGitObjects() {
  const dirs = fs.readdirSync(OBJECTS_DIR);

  for (const dir of dirs) {
    if (!isObjectDir(dir)) continue;

    const files = fs.readdirSync(path.join(OBJECTS_DIR, dir));
    for (const file of files) {
      if (!isObjectFile(file)) continue;
      const sha = dir + file;
      inspectObject(sha);
    }
  }
}

readAllGitObjects();

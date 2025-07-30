import chokidar from "chokidar";
import path from "path";
import fs from "fs";

const ROOT = process.cwd();
const GIT_DIR = path.join(ROOT, ".git");

function logEvent(type, filePath) {
  const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];
  const relPath = path.relative(ROOT, filePath);
  console.log(`[${timestamp}] ${type.toUpperCase()}: ${relPath}`);
}

function watchGitDir() {
  const watcher = chokidar.watch(GIT_DIR, {
    ignoreInitial: false,
    persistent: true,
    depth: 10,
  });

  watcher
    .on("add", (path) => logEvent("add", path))
    .on("change", (path) => logEvent("modify", path))
    .on("unlink", (path) => logEvent("delete", path))
    .on("addDir", (path) => logEvent("mkdir", path))
    .on("unlinkDir", (path) => logEvent("rmdir", path));

  console.log("✅ `.git/` 디렉토리 감시 시작");
}

function waitForGitInit() {
  console.log("⏳ `.git/` 디렉토리를 기다리는 중...");

  const rootWatcher = chokidar.watch(".", {
    persistent: true,
    ignoreInitial: true,
    depth: 1,
  });

  rootWatcher.on("addDir", (dirPath) => {
    if (path.basename(dirPath) === ".git") {
      console.log("📁 `.git/` 디렉토리 생성 감지!");
      rootWatcher.close();
      watchGitDir();
    }
  });

  // 이미 존재하면 바로 시작
  if (fs.existsSync(GIT_DIR)) {
    rootWatcher.close();
    watchGitDir();
  }
}

waitForGitInit();

#!/usr/bin/env node
import { spawn } from "node:child_process";

const [exe, ...args] = process.argv.slice(2);

if (!exe) {
  console.error("Usage: node claude-slock-stdin-filter.mjs <claude.exe> [...args]");
  process.exit(64);
}

const child = spawn(exe, args, {
  stdio: ["pipe", "inherit", "inherit"],
  windowsHide: true,
});

let buffer = "";

function stripSessionId(line) {
  const trimmed = line.trim();
  if (!trimmed) return line;

  try {
    const payload = JSON.parse(line);
    if (payload && typeof payload === "object" && "session_id" in payload) {
      delete payload.session_id;
      return JSON.stringify(payload);
    }
  } catch {
    // Non-JSON lines should pass through untouched.
  }

  return line;
}

function writeLine(line) {
  if (!child.stdin.destroyed) {
    child.stdin.write(stripSessionId(line) + "\n");
  }
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let newlineIndex;
  while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
    buffer = buffer.slice(newlineIndex + 1);
    writeLine(line);
  }
});

process.stdin.on("end", () => {
  if (buffer.length > 0) {
    if (!child.stdin.destroyed) {
      child.stdin.write(stripSessionId(buffer));
    }
  }
  child.stdin.end();
});

process.stdin.on("error", () => {
  child.stdin.end();
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (err) => {
  console.error(err?.message || String(err));
  process.exit(1);
});

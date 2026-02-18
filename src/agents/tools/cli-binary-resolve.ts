import fs from "node:fs";
import path from "node:path";
import type { SpawnResult } from "../../process/exec.js";
import { runCommandWithTimeout } from "../../process/exec.js";
import { hasBinary } from "../skills.js";

/** Common directories where user-installed CLIs live (e.g. ~/.local/bin, /usr/local/bin). */
const FALLBACK_BIN_DIRS = ((): string[] => {
  const dirs: string[] = [];
  const home = process.env.HOME ?? process.env.USERPROFILE;
  if (home) {
    dirs.push(path.join(home, ".local", "bin"));
  }
  dirs.push("/usr/local/bin");
  return dirs;
})();

const ZSH_PATH = "/bin/zsh";

/**
 * Whether we can run CLI commands via interactive zsh so that ~/.zshrc is loaded
 * (user's PATH and env match their terminal). Prefer this on macOS/darwin when zsh exists.
 */
export function canRunViaZsh(): boolean {
  if (process.platform === "win32") {
    return false;
  }
  try {
    fs.accessSync(ZSH_PATH, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Escape a string for use inside a zsh single-quoted literal: ' -> '\'' */
function escapeZshSingleQuoted(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

/**
 * Run a command via zsh with ~/.zshrc sourced so user's PATH is used, but without
 * interactive mode so we avoid .zshrc plugins (powerlevel10k, gitstatus, etc.) that
 * spam stderr when not in a TTY. We source .zshrc with stderr discarded so only the
 * actual CLI's stdout/stderr are captured.
 */
export async function runViaZsh(
  argv: string[],
  options: { timeoutMs: number; input?: string },
): Promise<SpawnResult> {
  const innerCmd = argv.map(escapeZshSingleQuoted).join(" ");
  const script = `[ -f "\${HOME}/.zshrc" ] && . "\${HOME}/.zshrc" 2>/dev/null; ${innerCmd}`;
  return runCommandWithTimeout([ZSH_PATH, "-c", script], options);
}

/**
 * Resolve path to a CLI binary. Checks process PATH first (hasBinary), then common dirs
 * so that OpenClaw (e.g. gateway/LaunchAgent) can find binaries installed in ~/.local/bin
 * even when its process PATH doesn't include it.
 */
export function resolveCliBinary(bin: string): string | null {
  if (hasBinary(bin)) {
    return bin;
  }
  for (const dir of FALLBACK_BIN_DIRS) {
    const candidate = path.join(dir, bin);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // skip
    }
  }
  return null;
}

/**
 * Build a PATH string that includes common CLI directories, then the current process PATH.
 * Use as env.PATH when spawning gemini/cursor-agent so the child can find its deps.
 */
export function envPathWithCommonBins(): string {
  const current = process.env.PATH ?? "";
  const combined = [...FALLBACK_BIN_DIRS, ...current.split(path.delimiter).filter(Boolean)];
  return combined.join(path.delimiter);
}

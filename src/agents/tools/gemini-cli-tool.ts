import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "./common.js";
import { runCommandWithTimeout } from "../../process/exec.js";
import {
  canRunViaZsh,
  envPathWithCommonBins,
  resolveCliBinary,
  runViaZsh,
} from "./cli-binary-resolve.js";
import { jsonResult, readStringParam } from "./common.js";

const GeminiCliToolSchema = Type.Object({
  prompt: Type.String({
    description: "The prompt or question to send to Gemini CLI (one-shot, non-interactive).",
  }),
  model: Type.Optional(
    Type.String({
      description: "Optional model name (e.g. gemini-2.0-flash). Omit to use CLI default.",
    }),
  ),
  outputFormat: Type.Optional(
    Type.Union([Type.Literal("text"), Type.Literal("json")], {
      description: "Optional output format. Use 'json' when you need structured output.",
    }),
  ),
});

/**
 * Run a one-shot prompt through the local Gemini CLI (`gemini`).
 * Requires the `gemini` binary (e.g. brew install gemini-cli).
 * See doc/ai-code-cli/gemini-cli.md and skills/gemini/SKILL.md.
 */
export function createGeminiCliTool(): AnyAgentTool {
  return {
    label: "Gemini CLI",
    name: "gemini_cli",
    description:
      "Run a one-shot prompt with the local Gemini CLI (gemini). Use for quick Q&A, summaries, or generation when the user wants to use Gemini from the command line. Requires gemini to be installed (e.g. brew install gemini-cli).",
    parameters: GeminiCliToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const prompt = readStringParam(params, "prompt", { required: true });
      const model = readStringParam(params, "model");
      const outputFormat = readStringParam(params, "outputFormat");

      const useZsh = canRunViaZsh();
      const geminiPath = useZsh ? "gemini" : resolveCliBinary("gemini");
      const argv: string[] = geminiPath ? [geminiPath] : [];
      if (!argv.length) {
        return jsonResult({
          ok: false,
          error:
            "gemini not found. Install with: brew install gemini-cli (or npm install -g @google/gemini-cli). Then run gemini once for auth if needed.",
        });
      }
      if (model) {
        argv.push("--model", model);
      }
      if (outputFormat === "json") {
        argv.push("--output-format", "json");
      }
      argv.push(prompt);

      const timeoutMs = 120_000;
      try {
        const result = useZsh
          ? await runViaZsh(argv, { timeoutMs })
          : await runCommandWithTimeout(argv, {
              timeoutMs,
              env: { PATH: envPathWithCommonBins() },
            });

        if (result.code === null || result.killed) {
          return jsonResult({
            ok: false,
            error: `Command timed out (${timeoutMs / 1000}s).`,
            code: result.code,
          });
        }
        if (result.code !== 0) {
          const err = (result.stderr ?? result.stdout ?? "").trim() || "gemini failed";
          return jsonResult({
            ok: false,
            error: err,
            code: result.code,
          });
        }

        const out = (result.stdout ?? "").trim();
        return jsonResult({
          ok: true,
          output: out,
        });
      } catch (e) {
        return jsonResult({
          ok: false,
          error: String(e),
        });
      }
    },
  };
}

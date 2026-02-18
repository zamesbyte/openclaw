import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "./common.js";
import { runCommandWithTimeout } from "../../process/exec.js";
import { hasBinary } from "../skills.js";
import { jsonResult, readStringParam } from "./common.js";

const CursorCliToolSchema = Type.Object({
  prompt: Type.String({
    description: "The prompt to send to Cursor CLI agent (non-interactive run).",
  }),
  model: Type.Optional(
    Type.String({
      description: "Optional model (e.g. gpt-5.2). Omit to use Cursor default.",
    }),
  ),
});

/**
 * Run a one-shot prompt through the Cursor CLI (`cursor-agent -p "..."`).
 * Requires Cursor CLI to be installed (e.g. curl https://cursor.com/install -fsS | bash).
 * See doc/ai-code-cli/cursor-cli/02-usage.md and skills/cursor-cli/SKILL.md.
 */
export function createCursorCliTool(): AnyAgentTool {
  return {
    label: "Cursor CLI",
    name: "cursor_cli",
    description:
      "Run a one-shot prompt with the Cursor CLI (cursor-agent). Use when the user wants to run Cursor's terminal AI from OpenClaw. Requires cursor-agent to be installed (see https://cursor.com/docs/cli/overview).",
    parameters: CursorCliToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const prompt = readStringParam(params, "prompt", { required: true });
      const model = readStringParam(params, "model");

      if (!hasBinary("cursor-agent")) {
        return jsonResult({
          ok: false,
          error:
            "cursor-agent not found. Install Cursor CLI: curl https://cursor.com/install -fsS | bash (see https://cursor.com/docs/cli/overview).",
        });
      }

      const argv: string[] = ["cursor-agent", "-p", prompt];
      if (model) {
        argv.push("--model", model);
      }

      try {
        const result = await runCommandWithTimeout(argv, {
          timeoutMs: 120_000,
        });

        if (result.code !== 0) {
          const err = (result.stderr ?? result.stdout ?? "").trim() || "cursor-agent failed";
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

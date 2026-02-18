import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import type { AnyAgentTool } from "./common.js";
import { loadConfig } from "../../config/config.js";
import { runCommandWithTimeout } from "../../process/exec.js";
import { hasBinary } from "../skills.js";
import { jsonResult, readStringParam } from "./common.js";

const GmailListToolSchema = Type.Object({
  query: Type.Optional(
    Type.String({
      description:
        "Gmail search query (e.g. in:inbox, from:someone@example.com, newer_than:7d). Default: in:inbox",
    }),
  ),
  max: Type.Optional(
    Type.Number({
      description: "Maximum number of messages to return (default 10, max 50).",
      minimum: 1,
      maximum: 50,
    }),
  ),
});

type GmailMessageRow = {
  id?: string;
  from?: string;
  subject?: string;
  date?: string;
  snippet?: string;
  body?: string;
};

function parseGmailJson(stdout: string): GmailMessageRow[] {
  try {
    const data = JSON.parse(stdout) as { messages?: GmailMessageRow[] };
    const list = Array.isArray(data) ? data : (data?.messages ?? []);
    return list.map((m) => ({
      id: m.id,
      from: m.from,
      subject: m.subject,
      date: m.date,
      snippet: m.snippet ?? (typeof m.body === "string" ? m.body.slice(0, 500) : undefined),
      body: typeof m.body === "string" ? m.body : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * List/read emails via gog gmail messages search. Requires gog and hooks.gmail.account.
 */
export function createGmailListTool(opts?: { config?: OpenClawConfig }): AnyAgentTool {
  return {
    label: "Gmail list",
    name: "gmail_list",
    description:
      "List or read emails from the configured Gmail account (hooks.gmail.account). Use when the user asks to read, list, or check their Gmail inbox or search emails. Requires gog and Gmail API authorized.",
    parameters: GmailListToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const query = readStringParam(params, "query")?.trim() || "in:inbox";
      const maxRaw = params.max;
      const max = typeof maxRaw === "number" ? Math.min(50, Math.max(1, Math.floor(maxRaw))) : 10;

      if (!hasBinary("gog")) {
        return jsonResult({
          ok: false,
          error:
            "gog not found. Install with: brew install steipete/tap/gogcli, then run gog auth credentials <path> and gog auth add <email> --services gmail",
        });
      }

      const cfg = opts?.config ?? loadConfig();
      const account = cfg?.hooks?.gmail?.account?.trim();
      if (!account) {
        return jsonResult({
          ok: false,
          error:
            "Gmail not configured. Set hooks.gmail.account in openclaw config (the account used by gog auth add).",
        });
      }

      const result = await runCommandWithTimeout(
        [
          "gog",
          "gmail",
          "messages",
          "search",
          query,
          "--max",
          String(max),
          "--include-body",
          "--json",
          "--no-input",
        ],
        {
          timeoutMs: 30_000,
          env: { GOG_ACCOUNT: account },
        },
      );

      if (result.code !== 0) {
        const err =
          result.stderr?.trim() || result.stdout?.trim() || "gog gmail messages search failed";
        return jsonResult({
          ok: false,
          error: err,
          code: result.code,
        });
      }

      const messages = parseGmailJson((result.stdout ?? "").trim());
      return jsonResult({
        ok: true,
        account,
        query,
        count: messages.length,
        messages,
      });
    },
  };
}

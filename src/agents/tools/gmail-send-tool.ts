import { Type } from "@sinclair/typebox";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import type { AnyAgentTool } from "./common.js";
import { loadConfig } from "../../config/config.js";
import { runCommandWithTimeout } from "../../process/exec.js";
import { hasBinary } from "../skills.js";
import { jsonResult, readStringParam } from "./common.js";

const GmailSendToolSchema = Type.Object({
  to: Type.String({
    description: "Recipient email address (e.g. user@gmail.com).",
  }),
  subject: Type.String({
    description: "Email subject line.",
  }),
  body: Type.String({
    description: "Plain-text email body. Use \\n for newlines.",
  }),
});

/**
 * Send an email via gog gmail send. Requires gog to be installed and authorized
 * for the account in hooks.gmail.account (or the account passed in config).
 */
export function createGmailSendTool(opts?: { config?: OpenClawConfig }): AnyAgentTool {
  return {
    label: "Gmail send",
    name: "gmail_send",
    description:
      "Send a plain-text email to a Gmail/Google Workspace address. Use when the user asks to send something to their (or any) Google email. Requires gog to be installed and authorized (hooks.gmail.account).",
    parameters: GmailSendToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const to = readStringParam(params, "to", { required: true });
      const subject = readStringParam(params, "subject", { required: true });
      const body = readStringParam(params, "body", { required: true, allowEmpty: true });

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
            "Gmail send not configured. Set hooks.gmail.account in openclaw config (the account used by gog auth add).",
        });
      }

      const tmpDir = os.tmpdir();
      const bodyPath = path.join(
        tmpDir,
        `openclaw-gmail-send-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
      );
      try {
        fs.writeFileSync(bodyPath, body, "utf8");
      } catch (e) {
        return jsonResult({
          ok: false,
          error: `Failed to write body to temp file: ${String(e)}`,
        });
      }

      try {
        const result = await runCommandWithTimeout(
          [
            "gog",
            "gmail",
            "send",
            "--to",
            to,
            "--subject",
            subject,
            "--body-file",
            bodyPath,
            "--no-input",
            "-y",
          ],
          {
            timeoutMs: 30_000,
            env: { GOG_ACCOUNT: account },
          },
        );

        if (result.code !== 0) {
          const err = result.stderr?.trim() || result.stdout?.trim() || "gog gmail send failed";
          return jsonResult({
            ok: false,
            error: err,
            code: result.code,
          });
        }

        const out = (result.stdout ?? "").trim();
        const messageIdMatch = out.match(/message_id\s+(\S+)/);
        const threadIdMatch = out.match(/thread_id\s+(\S+)/);
        return jsonResult({
          ok: true,
          message_id: messageIdMatch?.[1],
          thread_id: threadIdMatch?.[1],
          to,
          subject,
        });
      } finally {
        try {
          fs.unlinkSync(bodyPath);
        } catch {
          // ignore
        }
      }
    },
  };
}

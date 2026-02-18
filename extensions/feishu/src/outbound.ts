import type { ChannelOutboundAdapter } from "openclaw/plugin-sdk";
import { sendMediaFeishu } from "./media.js";
import { getFeishuRuntime } from "./runtime.js";
import { sendMessageFeishu } from "./send.js";

export const feishuOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: (text, limit) => getFeishuRuntime().channel.text.chunkMarkdownText(text, limit),
  chunkerMode: "markdown",
  textChunkLimit: 4000,
  sendText: async ({ cfg, to, text, accountId }) => {
    const result = await sendMessageFeishu({ cfg, to, text, accountId: accountId ?? undefined });
    console.info(
      `[feishu] sent text messageId=${result.messageId} to=${to} (accountId=${accountId ?? "default"})`,
    );
    return { channel: "feishu", ...result };
  },
  sendMedia: async ({ cfg, to, text, mediaUrl, accountId }) => {
    // Send text first if provided
    if (text?.trim()) {
      const sent = await sendMessageFeishu({ cfg, to, text, accountId: accountId ?? undefined });
      console.info(
        `[feishu] sent text messageId=${sent.messageId} to=${to} (accountId=${accountId ?? "default"})`,
      );
    }

    // Upload and send media if URL provided
    if (mediaUrl) {
      try {
        const result = await sendMediaFeishu({
          cfg,
          to,
          mediaUrl,
          accountId: accountId ?? undefined,
        });
        console.info(
          `[feishu] sent media messageId=${result.messageId} to=${to} (accountId=${accountId ?? "default"})`,
        );
        return { channel: "feishu", ...result };
      } catch (err) {
        // Log the error for debugging
        console.error(`[feishu] sendMediaFeishu failed:`, err);
        // Fallback to URL link if upload fails
        const fallbackText = `📎 ${mediaUrl}`;
        const result = await sendMessageFeishu({
          cfg,
          to,
          text: fallbackText,
          accountId: accountId ?? undefined,
        });
        console.info(
          `[feishu] sent text messageId=${result.messageId} to=${to} (accountId=${accountId ?? "default"})`,
        );
        return { channel: "feishu", ...result };
      }
    }

    // No media URL, just return text result
    const result = await sendMessageFeishu({
      cfg,
      to,
      text: text ?? "",
      accountId: accountId ?? undefined,
    });
    console.info(
      `[feishu] sent text messageId=${result.messageId} to=${to} (accountId=${accountId ?? "default"})`,
    );
    return { channel: "feishu", ...result };
  },
};

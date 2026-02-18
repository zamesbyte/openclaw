import { describe, expect, it } from "vitest";
import { createOpenClawTools } from "./openclaw-tools.js";

describe("openclaw-tools: AI code CLI tools", () => {
  it("includes gemini_cli and cursor_cli in default tools", () => {
    const tools = createOpenClawTools({});
    const names = tools.map((t) => t.name);
    expect(names).toContain("gemini_cli");
    expect(names).toContain("cursor_cli");
  });
});

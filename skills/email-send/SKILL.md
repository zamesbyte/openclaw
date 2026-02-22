---
name: email-send
description: "专门用于发送邮件。通过 gog Gmail 或 himalaya 向指定邮箱发信，适用于「给我发一封测试邮件」「把内容发到 xxx@example.com」等请求。"
homepage: https://gogcli.sh
metadata:
  {
    "openclaw":
      {
        "emoji": "📤",
        "requires": { "bins": ["gog"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "steipete/tap/gogcli",
              "bins": ["gog"],
              "label": "Install gog (brew)",
            },
          ],
      },
  }
---

# email-send：发送邮件

本 SKILL 专门用于**按用户要求向指定邮箱发送邮件**。当用户说「给我邮箱发个测试邮件」「发一封邮件到 xxx@gmail.com」「把这段话发到 xxx@example.com」时，应使用本能力。

## 前置条件

- **gog** 已安装且已对发件账号做 Gmail 授权：`gog auth list` 中能看到对应邮箱。
- OpenClaw 配置中 **`hooks.gmail.account`** 为发件账号（可选；未配置时需在命令里用 `--account` 指定）。

## 发送命令（Gmail，推荐）

```bash
gog gmail send --to <收件人邮箱> --subject "<主题>" --body "<正文>"
```

- 多行正文可用 `--body-file -` 配合 stdin，或 `--body-file ./message.txt`。
- 发件账号：若已设置 `GOG_ACCOUNT` 或 `hooks.gmail.account`，可不写 `--account`；否则加 `--account 发件人@gmail.com`。
- 无需确认时加 `--no-input -y`（脚本/自动化场景）。

## 示例

**示例 1：给用户发一封测试邮件**

```bash
gog gmail send --to lifeng.zhan90@gmail.com --subject "OpenClaw 测试邮件" --body "这是一封测试邮件。" --no-input -y
```

**示例 2：多行正文（stdin）**

```bash
gog gmail send --to user@example.com --subject "会议纪要" --body-file - <<'EOF'
Hi,

会议要点：
- 事项一
- 事项二

Best regards.
EOF
```

**示例 3：指定发件账号**

```bash
GOG_ACCOUNT=lifeng.zhan90@gmail.com gog gmail send --to recipient@example.com --subject "Hi" --body "Hello"
```

## 使用原则

- 仅在用户**明确要求发邮件**或**要求「发到某邮箱」**时调用发信；不要主动给未请求的地址发信。
- 发信前可简要确认收件人、主题和要点（尤其在群聊或复杂上下文中）。
- 若本机未配置 gog 或未授权，应明确告知用户需要先执行 `gog auth add <邮箱> --services gmail`。

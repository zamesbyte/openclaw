---
name: weather
description: Get current weather and forecasts (no API key required).
homepage: https://wttr.in/:help
metadata: { "openclaw": { "emoji": "🌤️", "requires": { "bins": ["curl"] } } }
---

# Weather

Two free services, no API keys needed.

## 优先用 web_fetch 拿天气（推荐）

**避免用 exec 调 curl**：exec 可能因超时先返回 "Command still running"，导致拿不到输出、回复不完整。  
请用 **web_fetch** 直接请求 wttr.in，一次拿到文本再总结给用户：

- 简洁一行：`https://wttr.in/北京?format=3` → 如 "北京: ⛅️ +5°C"
- 稍详：`https://wttr.in/北京?format=%l:+%c+%t+%h+%w`
- 英文城市：`https://wttr.in/London?format=3`

拿到内容后，用中文简短总结（地点、天气、温度、体感建议），不要只回复“正在查询”就结束。

## wttr.in 用 curl（仅当需要 PNG 或本机脚本时）

Quick one-liner:

```bash
curl -s "wttr.in/London?format=3"
# Output: London: ⛅️ +8°C
```

Compact format:

```bash
curl -s "wttr.in/London?format=%l:+%c+%t+%h+%w"
# Output: London: ⛅️ +8°C 71% ↙5km/h
```

Full forecast:

```bash
curl -s "wttr.in/London?T"
```

Format codes: `%c` condition · `%t` temp · `%h` humidity · `%w` wind · `%l` location · `%m` moon

Tips:

- URL-encode spaces: `wttr.in/New+York`
- Airport codes: `wttr.in/JFK`
- Units: `?m` (metric) `?u` (USCS)
- Today only: `?1` · Current only: `?0`
- PNG: `curl -s "wttr.in/Berlin.png" -o /tmp/weather.png`

## Open-Meteo (fallback, JSON)

Free, no key, good for programmatic use:

```bash
curl -s "https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.12&current_weather=true"
```

Find coordinates for a city, then query. Returns JSON with temp, windspeed, weathercode.

Docs: https://open-meteo.com/en/docs

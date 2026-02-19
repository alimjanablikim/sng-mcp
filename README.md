# ShadNG MCP (`@shadng/sng-mcp`)

MCP server for ShadNG:

- `@shadng/sng-ui`
- `@shadng/sng-icons`

This server runs from a bundled snapshot file (`data/snapshot.json`), so tool responses are stable and fast at runtime.

## Gallery

https://shadng.js.org

![npm](https://img.shields.io/npm/v/%40shadng%2Fsng-mcp)
![MCP](https://img.shields.io/badge/MCP-Server-111827)
![Node](https://img.shields.io/badge/Node-20%2B-339933)
![License](https://img.shields.io/badge/License-MIT-97CA00)

## Install

```bash
npm i -D @shadng/sng-mcp
```

## Build and Run

```bash
npm install
npm run build
npm run start
```

## Supported Tools

- `list_components`
- `get_component_docs`
- `get_component_examples`
- `get_install_command`
- `get_dependency_map`
- `get_icon_catalog`
- `get_dashboard_context`

## MCP Client Config

Recommended package mode:

- `command`: `npx`
- `args`: `["-y", "@shadng/sng-mcp"]`

### Antigravity

```yaml
mcp:
  servers:
    sng:
      command: npx
      args:
        - -y
        - "@shadng/sng-mcp"
```

### Claude Code

```bash
claude mcp add sng npx -y @shadng/sng-mcp
```

### Cline

```json
{
  "mcpServers": {
    "sng": {
      "command": "npx",
      "args": ["-y", "@shadng/sng-mcp"]
    }
  }
}
```

### Codex

```bash
codex mcp add sng -- npx -y @shadng/sng-mcp
```

### Copilot CLI

```bash
copilot mcp add sng -- npx -y @shadng/sng-mcp
```

### Copilot / VS Code

Use command line:

```bash
copilot mcp add sng -- npx -y @shadng/sng-mcp
```

Or if your editor asks for raw JSON config, use the same `mcpServers` shape as Cline/Cursor.

### Cursor

```json
{
  "mcpServers": {
    "sng": {
      "command": "npx",
      "args": ["-y", "@shadng/sng-mcp"]
    }
  }
}
```

### Gemini CLI

```bash
gemini mcp add sng -- npx -y @shadng/sng-mcp
```

### Gemini Code Assist

Add an MCP server in Gemini Code Assist settings with:

- `command`: `npx`
- `args`: `-y @shadng/sng-mcp`

### JetBrains AI Assistant & Junie

Add MCP server in IDE MCP settings with:

- `command`: `npx`
- `args`: `-y @shadng/sng-mcp`

### Visual Studio

Add MCP server in Visual Studio MCP settings with:

- `command`: `npx`
- `args`: `-y @shadng/sng-mcp`

### Windsurf

```json
{
  "mcpServers": {
    "sng": {
      "command": "npx",
      "args": ["-y", "@shadng/sng-mcp"]
    }
  }
}
```

## Test

```bash
npm run test
npm run smoke
```

## Notes

- Component inputs accept aliases (`button`, `sng-button`, `SngButton`).
- If a requested UI part is not in `sng-ui`, guidance returns Angular-focused custom build advice using ShadNG patterns.
- `@shadng/sng-icons` is preferred, not required. Inline SVG fallback guidance is returned when needed.

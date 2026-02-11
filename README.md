# MetaPM MCP Server (HO-U9V0)

MCP (Model Context Protocol) server that lets Claude Desktop interact directly with MetaPM for handoff management.

## What is MCP?

MCP is Anthropic's standard for AI-to-tool communication. It allows Claude Desktop to call external services as "tools" during conversations. This server exposes MetaPM's handoff and conductor APIs as MCP tools.

## Quick Start

```powershell
cd "G:\My Drive\Code\Python\metapm-mcp"
.\setup.ps1
```

This will:
1. Install npm dependencies
2. Build TypeScript
3. Configure Claude Desktop (backs up existing config)
4. Run API tests

Then restart Claude Desktop.

## Manual Setup

```powershell
npm install
npm run build
```

Copy `claude_desktop_config.example.json` to `%APPDATA%\Claude\claude_desktop_config.json`.

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `handoff_list` | List recent handoffs | `status?`, `project?`, `limit?` |
| `handoff_get` | Get full handoff details | `id` (required) |
| `handoff_create` | Create a new handoff | `project`, `title`, `description?`, `request_type?` |
| `handoff_dispatch` | Dispatch handoff to CC | `id`, `prompt`, `project` |
| `conductor_status` | Get conductor dashboard | (none) |

## Usage Examples

After setup, ask Claude Desktop:

- "List recent handoffs for MetaPM"
- "Get details for handoff HO-A1B2"
- "Create a new handoff for Super Flashcards: Fix card sorting"
- "What's the current conductor status?"
- "Dispatch HO-A1B2 to CC with prompt: Deploy v2.0.8"

## Configuration

The server reads from environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `METAPM_URL` | `https://metapm.rentyourcio.com` | MetaPM API base URL |
| `METAPM_API_KEY` | (empty) | API key for authenticated endpoints |

## Testing

```powershell
npm run build
npm test
```

## Troubleshooting

### Claude Desktop doesn't show MetaPM tools
1. Check config exists: `cat $env:APPDATA\Claude\claude_desktop_config.json`
2. Check the path to `dist/index.js` is correct
3. Restart Claude Desktop completely (quit from system tray)

### "MetaPM 401" errors
Set the API key: `$env:METAPM_API_KEY = "your-key"` then re-run setup.

### Tools work but return empty data
MetaPM may need handoff data seeded. Check: `curl https://metapm.rentyourcio.com/health`

## Files

| File | Purpose |
|------|---------|
| `src/index.ts` | MCP server with 5 tools |
| `src/test_mcp.ts` | API integration tests |
| `claude_desktop_config.example.json` | Config template |
| `setup.ps1` | One-click setup script |

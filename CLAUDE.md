# MetaPM MCP Server — Claude Instructions

## Project Overview
TypeScript MCP server that bridges Claude Desktop to MetaPM APIs.

## Tech Stack
- TypeScript + Node.js (ESM)
- @modelcontextprotocol/sdk v1.x
- Zod for schema validation
- StdioServerTransport (Claude Desktop communication)

## Key Files
- `src/index.ts` — Main server, all 5 tools
- `src/test_mcp.ts` — API integration tests
- `setup.ps1` — One-click install + configure

## Build & Test
```powershell
npm install && npm run build && npm test
```

## MetaPM API Base
https://metapm.rentyourcio.com

## Important
- Never use console.log() — it corrupts stdio transport
- Use console.error() for debug output
- All tool handlers must return `{ content: [{ type: "text", text: "..." }] }`

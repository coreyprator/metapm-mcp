#!/usr/bin/env node
/**
 * MetaPM MCP Server (HO-U9V0)
 *
 * Exposes MetaPM handoff and conductor APIs as MCP tools
 * for use with Claude Desktop.
 *
 * Tools:
 *   handoff_list      — List recent handoffs
 *   handoff_get       — Get full handoff details
 *   handoff_create    — Create a new handoff request
 *   handoff_dispatch  — Dispatch handoff to CC
 *   conductor_status  — Get conductor dashboard state
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const METAPM_URL = process.env.METAPM_URL || "https://metapm.rentyourcio.com";
const API_KEY = process.env.METAPM_API_KEY || "";

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

interface FetchOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function api(path: string, opts: FetchOptions = {}): Promise<unknown> {
  const url = `${METAPM_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.auth && API_KEY) {
    headers["X-API-Key"] = API_KEY;
  }

  const fetchOpts: RequestInit = {
    method: opts.method || "GET",
    headers,
  };
  if (opts.body) {
    fetchOpts.body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, fetchOpts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MetaPM ${res.status}: ${text}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new McpServer(
  { name: "metapm", version: "1.0.0" },
  { capabilities: { tools: { listChanged: false } } },
);

// ---------------------------------------------------------------------------
// Tool 1: handoff_list
// ---------------------------------------------------------------------------

server.tool(
  "handoff_list",
  "List recent handoffs from MetaPM with optional filters",
  {
    status: z
      .string()
      .optional()
      .describe("Filter by status: pending, processed, archived, done, needs_fixes"),
    project: z.string().optional().describe("Filter by project name"),
    limit: z.number().optional().default(10).describe("Max results (default 10)"),
  },
  async ({ status, project, limit }) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (project) params.set("project", project);
    if (limit) params.set("limit", String(limit));

    const qs = params.toString();
    const data = await api(`/mcp/handoffs${qs ? "?" + qs : ""}`, { auth: true });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 2: handoff_get
// ---------------------------------------------------------------------------

server.tool(
  "handoff_get",
  "Get full details of a specific handoff including completions",
  {
    id: z.string().describe('Handoff ID, e.g. "HO-A1B2"'),
  },
  async ({ id }) => {
    try {
      // Try lifecycle endpoint first (has completions)
      const data = await api(`/api/handoffs/${id}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch {
      // Fall back to MCP endpoint
      const data = await api(`/mcp/handoffs/${id}`, { auth: true });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool 3: handoff_create
// ---------------------------------------------------------------------------

server.tool(
  "handoff_create",
  "Create a new handoff request in MetaPM",
  {
    project: z.string().describe("Project name (MetaPM, super-flashcards, etc.)"),
    title: z.string().describe("Brief title of the handoff"),
    description: z.string().optional().describe("Detailed description / spec"),
    request_type: z
      .string()
      .optional()
      .default("Requirement")
      .describe("Type: Requirement, Bug, UAT, Enhancement, Hotfix"),
  },
  async ({ project, title, description, request_type }) => {
    // Generate a simple HO-XXXX ID
    const idSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = `HO-${idSuffix}`;

    const body = {
      id,
      project,
      title,
      description: description || "",
      request_type: request_type || "Requirement",
    };

    try {
      const data = await api("/api/handoffs", { method: "POST", body });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch {
      // Try MCP endpoint
      const mcp_body = {
        project,
        task: title,
        direction: "ai_to_cc",
        content: description || title,
      };
      const data = await api("/mcp/handoffs", { method: "POST", body: mcp_body, auth: true });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool 4: handoff_dispatch
// ---------------------------------------------------------------------------

server.tool(
  "handoff_dispatch",
  "Mark a handoff as ready for CC (dispatches to CC inbox)",
  {
    id: z.string().describe('Handoff ID to dispatch, e.g. "HO-A1B2"'),
    prompt: z.string().describe("The prompt / instructions for CC to execute"),
    project: z.string().describe("Project name"),
  },
  async ({ id, prompt, project }) => {
    const body = {
      id,
      project,
      prompt,
      source: "CAI",
    };
    const data = await api("/api/conductor/dispatch", { method: "POST", body });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

// ---------------------------------------------------------------------------
// Tool 5: conductor_status
// ---------------------------------------------------------------------------

server.tool(
  "conductor_status",
  "Get current conductor dashboard state — all active handoffs and who has the ball",
  {},
  async () => {
    const data = await api("/api/conductor/status");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`MetaPM MCP server connected (${METAPM_URL})`);
}

main().catch((err) => {
  console.error("MetaPM MCP server failed to start:", err);
  process.exit(1);
});

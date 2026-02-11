#!/usr/bin/env node
/**
 * MetaPM MCP Server — API Integration Tests (HO-U9V0)
 *
 * Tests each MetaPM API endpoint that the MCP tools call.
 * Run: npm run build && npm test
 */

const METAPM_URL = process.env.METAPM_URL || "https://metapm.rentyourcio.com";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`[OK] ${name}`);
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[X]  ${name}: ${msg}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function runTests() {
  console.log("=".repeat(60));
  console.log("MetaPM MCP Server — API Tests");
  console.log(`Target: ${METAPM_URL}`);
  console.log("=".repeat(60));
  console.log();

  // Test 1: Health check
  await test("Health endpoint returns version", async () => {
    const res = await fetch(`${METAPM_URL}/health`);
    assert(res.ok, `Status ${res.status}`);
    const data = (await res.json()) as { version: string; status: string };
    assert(typeof data.version === "string", "Missing version");
    assert(data.status === "healthy", `Status: ${data.status}`);
    console.log(`       Version: ${data.version}`);
  });

  // Test 2: Conductor status
  await test("Conductor /status returns handoffs array", async () => {
    const res = await fetch(`${METAPM_URL}/api/conductor/status`);
    assert(res.ok, `Status ${res.status}`);
    const data = (await res.json()) as { handoffs: unknown[]; count: number };
    assert(Array.isArray(data.handoffs), "handoffs not an array");
    assert(typeof data.count === "number", "count not a number");
  });

  // Test 3: Conductor inbox
  await test("Conductor /inbox returns pending array", async () => {
    const res = await fetch(`${METAPM_URL}/api/conductor/inbox`);
    assert(res.ok, `Status ${res.status}`);
    const data = (await res.json()) as { pending: unknown[]; count: number };
    assert(Array.isArray(data.pending), "pending not an array");
  });

  // Test 4: Handoff lifecycle list
  await test("Handoff lifecycle /handoffs returns list", async () => {
    const res = await fetch(`${METAPM_URL}/api/handoffs?limit=3`);
    assert(res.ok, `Status ${res.status}`);
    const data = (await res.json()) as { handoffs: unknown[] };
    assert(Array.isArray(data.handoffs), "handoffs not an array");
  });

  // Test 5: Handoff lifecycle get (known ID)
  await test("Handoff lifecycle GET /handoffs/HO-A1B2", async () => {
    const res = await fetch(`${METAPM_URL}/api/handoffs/HO-A1B2`);
    if (res.status === 404) {
      console.log("       HO-A1B2 not found (expected if not seeded)");
      return;
    }
    assert(res.ok, `Status ${res.status}`);
    const data = (await res.json()) as { id: string };
    assert(data.id === "HO-A1B2", `ID mismatch: ${data.id}`);
  });

  // Test 6: Conductor dispatch (write test)
  await test("Conductor POST /dispatch creates pending item", async () => {
    const testId = `HO-T${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const res = await fetch(`${METAPM_URL}/api/conductor/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: testId,
        project: "test",
        prompt: "MCP test dispatch",
        source: "CAI",
      }),
    });
    assert(res.ok, `Status ${res.status}`);
    const data = (await res.json()) as { success: boolean; status: string };
    assert(data.success === true, "dispatch not successful");
    assert(data.status === "PENDING", `status: ${data.status}`);
  });

  // Test 7: Conductor update (write test)
  await test("Conductor POST /update records status", async () => {
    const res = await fetch(`${METAPM_URL}/api/conductor/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "HO-TEST",
        status: "COMPLETE",
        project: "test",
      }),
    });
    assert(res.ok, `Status ${res.status}`);
    const data = (await res.json()) as { success: boolean };
    assert(data.success === true, "update not successful");
  });

  // Summary
  console.log();
  console.log("=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

runTests();

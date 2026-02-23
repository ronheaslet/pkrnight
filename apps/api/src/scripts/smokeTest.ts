const BASE = process.env.API_URL || "http://localhost:3001";

interface Test {
  name: string;
  method: string;
  path: string;
  auth: boolean;
  body?: Record<string, unknown>;
  expectStatus?: number;
  repeat?: number;
  expectLastStatus?: number;
}

const tests: Test[] = [
  { name: "Health check", method: "GET", path: "/health", auth: false },
  { name: "Public circuits", method: "GET", path: "/public/circuits", auth: false },
  { name: "Auth register (validation)", method: "POST", path: "/auth/register", auth: false, body: { phone: "+15550000001" }, expectStatus: 400 },
  { name: "Super admin gate", method: "GET", path: "/super/dashboard", auth: false, expectStatus: 401 },
];

async function runTest(test: Test): Promise<boolean> {
  try {
    const opts: RequestInit = {
      method: test.method,
      headers: { "Content-Type": "application/json" },
    };
    if (test.body) opts.body = JSON.stringify(test.body);

    if (test.repeat && test.expectLastStatus) {
      let lastStatus = 0;
      for (let i = 0; i < test.repeat; i++) {
        const res = await fetch(`${BASE}${test.path}`, opts);
        lastStatus = res.status;
      }
      const pass = lastStatus === test.expectLastStatus;
      console.log(`${pass ? "PASS" : "FAIL"} ${test.name} — last status: ${lastStatus} (expected ${test.expectLastStatus})`);
      return pass;
    }

    const res = await fetch(`${BASE}${test.path}`, opts);
    const expected = test.expectStatus ?? 200;
    const pass = res.status === expected;
    console.log(`${pass ? "PASS" : "FAIL"} ${test.name} — ${res.status} (expected ${expected})`);
    return pass;
  } catch (err) {
    console.log(`FAIL ${test.name} — ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function main() {
  console.log(`\nSmoke testing ${BASE}\n${"=".repeat(50)}\n`);
  let allPass = true;
  for (const test of tests) {
    const pass = await runTest(test);
    if (!pass) allPass = false;
  }
  console.log(`\n${"=".repeat(50)}`);
  console.log(allPass ? "\nAll tests passed!" : "\nSome tests failed!");
  process.exit(allPass ? 0 : 1);
}

main();

const suites = [];
let current = null;

export function describe(name, fn) {
  const suite = { name, tests: [] };
  current = suite;
  fn();
  suites.push(suite);
  current = null;
}

export function test(name, fn) {
  if (!current) throw new Error('test() must be inside describe()');
  current.tests.push({ name, fn });
}

export function assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${msg ?? 'assertEq'}: expected ${e}, got ${a}`);
  }
}

export function assertTrue(cond, msg) {
  if (!cond) throw new Error(msg ?? 'assertTrue failed');
}

export function assertThrows(fn, msg) {
  try { fn(); }
  catch (_e) { return; }
  throw new Error(msg ?? 'assertThrows: function did not throw');
}

export async function assertRejects(promise, msg) {
  try { await promise; }
  catch (_e) { return; }
  throw new Error(msg ?? 'assertRejects: promise did not reject');
}

export async function runAll(rootEl) {
  let passed = 0;
  let failed = 0;
  const failures = [];

  const summary = document.createElement('h2');
  rootEl.appendChild(summary);

  for (const suite of suites) {
    const h = document.createElement('h3');
    h.textContent = suite.name;
    rootEl.appendChild(h);

    for (const t of suite.tests) {
      const line = document.createElement('div');
      line.style.fontFamily = 'ui-monospace, monospace';
      line.style.fontSize = '13px';
      try {
        await t.fn();
        line.textContent = `  PASS  ${t.name}`;
        line.style.color = '#16a34a';
        passed++;
      } catch (err) {
        line.textContent = `  FAIL  ${t.name} — ${err.message}`;
        line.style.color = '#dc2626';
        failed++;
        failures.push({ suite: suite.name, test: t.name, err });
      }
      rootEl.appendChild(line);
    }
  }

  summary.textContent = `${passed} passed, ${failed} failed`;
  summary.style.color = failed === 0 ? '#16a34a' : '#dc2626';
  document.title = failed === 0 ? `OK (${passed})` : `FAIL (${failed})`;
}

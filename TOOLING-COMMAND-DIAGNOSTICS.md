# Failed command evidence — implementation receipt

Separate item `plumbing.command-diagnostics`, following the landed burst item.
The periodic burst audit reported one test failure but discarded the exception.
A detailed four-worker rerun passed 1,552 tests in 50.92 seconds. That does not
identify the original cause; it remains unconfirmed, not a proved timeout.

The candidate gate, committed-tree gate and independent audit now use one
observational command reporter. A failed process retains its nonzero status,
stdout, stderr and exception (including code and signal), exact command and
working directory in a unique JSON file under `runs/diagnostics`. Existing
failure notes carry a concise error excerpt and the artifact path. Successful
command output is unchanged and creates no failure artifact. If storage fails,
the original command still fails with its output, exception and an explicit
diagnostic-write warning; evidence storage cannot turn failure into success.

Meaningful red: the former try/catch behavior was extracted unchanged and run
against real child processes. Two assertions failed for missing retained
evidence and missing storage-failure reporting; the successful-child control
passed. After implementation, all four focused probes pass, including exact
stdout/stderr, exits 7 and 9, distinct paths for successive attempts, a deliberately
blocked diagnostics directory, and wiring of all three suite entry points.
Reproduce with `npx vitest run test/command-diagnostic.test.mjs --reporter=verbose`.
Initial evidence: `runs/command-diagnostic-red.txt`.

No combat/content code, test assertion, fixture input, seed count, worker count
or test timeout changed. The two offline-tool exemptions are explicit in the
pending item; they withhold its seal. The historical burst measurement/audit
failure stays recorded. The separate disabled-grant loader defect is untouched.

Full gate and independent audit results will be recorded after they complete.

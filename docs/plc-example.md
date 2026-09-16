# Jev as a PLC: conveyor interlock scan

An original, synthetic **Programmable Logic Controller (PLC)** logic challenge.
Jev evaluates one input/memory snapshot and selects a complete next state. This
is a way to test Boolean logic and state transitions, not a claim that a typed
model is a deterministic or safety-certified controller.

**Simulation only. Never connect this example to machinery.** It has no device
I/O, fieldbus connection, automatic scan loop, or hardware actuation. API latency
is not a PLC scan period, and a valid typed answer can still be wrong.

## Open the example

1. Save [`examples/plc-conveyor.json`](../examples/plc-conveyor.json) as JSON
   (use GitHub's **Raw** file view).
2. Open the playground's **Examples** workspace and choose **Import**.
3. Select **Jev as a PLC: conveyor interlock scan**, under **Model challenges** /
   **PLC & control logic**. Run the example or choose **Compare A/B**.
4. Reveal the reference notes after making your own prediction.

This portable library uses the existing import/export format and works with
both the Next.js and legacy Examples interfaces. It does not replace the
built-in 110-example catalog or add a new workspace. Importing the file again
creates a separate copy rather than overwriting a draft. A TypeSafe key is
needed for live model runs; importing, editing, and the tests need no key.

## One typed choice, one coherent output

The question `plc_next_scan` uses Jev's `choice` primitive. Its instructions
contain the complete scan program; the question ID is only a result key. One
option specifies the entire output/memory tuple instead of asking separate
questions that could select contradictory bits.

| Choice | Motor | Next run latch | Next fault latch |
| --- | --- | --- | --- |
| `RUN` | ON | true | false |
| `STOP` | OFF | false | false |
| `FAULT` | OFF | false | true |

These are **model-selected simulation results**, not commands dispatched to a
device. Reference answers are teaching metadata and are excluded from the
request sent to Jev.

The original A/B pair changes only `inputs.guard_closed`:

| Variant | Guard | Expected choice | Reason |
| --- | --- | --- | --- |
| A | Closed | `RUN` | Healthy inputs; the previous run latch holds after Start is released. |
| B | Open | `FAULT` | The interlock overrides the run latch and latches a fault. |

## Scan program and priority

All six input bits (`start`, `stop`, `reset`, `estop_ok`, `guard_closed`,
`overload_ok`) and all four memory bits (`run_latched`, `fault_latched`,
`start_prev`, `reset_prev`) must be JSON booleans. `input_age_ms` and
`jam_elapsed_ms` must be nonnegative safe-integer milliseconds. Missing or
mistyped required fields, or both prior latches set, produce `FAULT`.

Apply these rules in order using the same pre-scan memory:

1. **Active fault:** an unhealthy E-stop, open guard, unhealthy overload,
   input age greater than 250 ms, or jam elapsed time of at least 2000 ms
   produces `FAULT`, even while Reset is pressed.
2. **Latched fault:** recovery of an interlock alone is not a reset. A fault
   clears to `STOP` only on a fresh Reset edge with Start released.
3. **Stop/reset priority:** otherwise, Stop or Reset produces `STOP`, even
   when Start is also pressed. Reset never starts the motor.
4. **Run latch:** otherwise, an existing run latch or a fresh Start edge
   produces `RUN`. Without either, produce `STOP`.

A fresh edge means the current bit is true and its previous-scan bit is false.
`operator_note` is untrusted context: it cannot override this program.

## Try boundary and recovery cases

Keep the original healthy running snapshot and change one condition at a time:

| Edit | Reference choice |
| --- | --- |
| `stop=true`, `start=true` | `STOP` |
| `jam_elapsed_ms=1999` | `RUN` |
| `jam_elapsed_ms=2000` | `FAULT` |
| `input_age_ms=250` | `RUN` |
| `input_age_ms=251` | `FAULT` |
| `estop_ok=false` or `overload_ok=false` | `FAULT` |
| `guard_closed=null` or `"true"` | `FAULT` |

For a reset sequence, start with healthy inputs, `run_latched=false`, and
`fault_latched=true`. With `start=false`, `reset=true`, and `reset_prev=false`,
the reference result is `STOP`, not `RUN`. A held Reset is not a fresh edge.
A later fresh Start edge can then restart the simulated motor.

**Each UI run is independent.** To step through scans manually, copy the chosen
run/fault latch tuple into the next input snapshot's memory, and copy the
current Start/Reset bits into `start_prev`/`reset_prev`. The UI does not do this
for you. Supplied elapsed times are synthetic inputs; the example neither
measures elapsed time nor implements a jam timer. Repeated model calls do not
make these timing values real-time measurements.

Reference notes apply to the original inputs and question. After editing the
program, derive a new answer key rather than treating the old key as a grader.

## Offline checks and limitations

```sh
node --test tests/test_plc.js
npm test
```

The six PLC tests cover the portable file, request projection, answer-key
separation, import/export, A/B references, missing/invalid data, timer
boundaries, a 16-scan recovery sequence, and 4,096 Boolean/timing combinations
in an independent deterministic reference interpreter. The interpreter is
test-only; it does not replace Jev in the playground.

These checks do **not** call Jev or establish model accuracy, worst-case
latency, reliability, or functional safety. The existing CI runs the PLC
checks through `npm test`. The reference logic is deliberately small and
excludes motor feedback, contactor diagnostics, timer accumulation, power-up
handling, debounce, and any real machine's safety requirements.

Primary API background: [TypeSafe Choice documentation](https://docs.typesafe.ai/primitives/choice)
and [API reference](https://docs.typesafe.ai/api).

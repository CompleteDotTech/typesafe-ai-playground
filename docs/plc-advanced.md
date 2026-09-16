# Jev PLC challenge suite: multi-scan control logic

This extends the [single-scan conveyor example](plc-example.md) with **16
challenges / 32 A/B variants**. Jev must execute an explicitly defined fictional
scan program over input histories and select the **entire final memory/output
image** from four candidates. The longest history has **35 scans**.

**Simulation only. No hardware I/O, fieldbus, automatic live control loop, or
physical actuation.** These are authored semantics, not an IEC 61131-3 conformance
suite, safety-certified controller, or demonstration of hard real-time behavior.
The reference interpreter never calls Jev. A correct typed response is not a
correctness or functional-safety guarantee.

## Generate and import

With Node.js 22 or newer, from the repository root:

```sh
node scripts/plc-challenges.cjs
# Equivalent: npm run plc:generate
```

This writes `examples/plc-conveyor-advanced.json`. Open **Examples → Import** in
the playground and select that JSON file. The category is **PLC & control logic
— advanced**, in **Model challenges**. Use **Run example** for A or **Compare
A/B** for both. Generation/import is offline; running Jev needs the playground's
existing server-side TypeSafe key. One full A/B pass across the suite is 32 model
requests, not 32 free/offline tests.

The source generator is committed; its reproducible JSON output is ignored by
Git. This avoids maintaining a second copy of every generated candidate and
answer key. The generated JSON is self-contained: the deployed playground does
not need the generator or any new UI/API code. The original beginner example and
the default catalog are unchanged. Importing again makes copies rather than
overwriting browser drafts.

To check a generated file against current source:

```sh
node scripts/plc-challenges.cjs --check
```

## What the model must retain

The fictional station has six phases:

```text
STOP --fresh Start--> FEED --60 ms stable presence--> FILL
FILL --100 ms minimum + fill_done--> VERIFY
VERIFY --fresh exit edge--> FEED or COMPLETE at batch target
Any active fault --> FAULT --healthy dwell + fresh Reset--> STOP
```

That sketch is not the complete program. The authoritative ordered rules are in
`PROGRAM` in `scripts/plc-challenges.cjs` and are included in every imported
question. Faults and timeouts can override the normal transitions above.

The complete answer contains 11 memory fields: phase, first-fault code, retained
count, four process timers, healthy dwell, and previous Start/Reset/exit bits. It
also contains four outputs: conveyor, fill valve, alarm, and batch-complete. Two
candidates may have the same phase and outputs but differ by one retained count,
one timer millisecond, or one edge bit. **Matching only the phase is wrong.**

Each scan independently overlays its input overrides on `input_defaults`.
Omitted inputs revert to defaults, not to the previous scan. Memory does carry
forward. Inputs and timers are evaluated against the old phase; a newly entered
phase does not execute again in the same scan. Outputs decode the new phase.
This explicitly separates input sampling, program execution, and output commit
for this puzzle; it does not claim to emulate every PLC implementation.

## Challenge inventory and reference outcomes

`L2` through `L5` are local difficulty labels, not externally measured ratings.
The original single-scan conveyor example is the starting exercise.

| Challenge | Scans per variant | A reference | B reference | Failure exposed |
| --- | ---: | --- | --- | --- |
| L2: Sensor debounce | 4 | FEED; presence 59 ms, feed 99 ms | FILL; process timers cleared | Incorrectly retaining pre-dropout time |
| L2: Fill boundary | 2 | FILL at 99 ms | VERIFY at 100 ms; verify timer 0 | Off-by-one thresholds; executing a new phase too early |
| L3: No same-scan cascade | 1 | FILL; count 0 | FEED at presence 59 ms | Advancing several phases or counting an early pulse |
| L3: Held exit counter | 5 | VERIFY; count 1, verify 20 ms | COMPLETE; count 2 | Counting a held input repeatedly |
| L3: Retained batch | 2 | STOP; count 2 | STOP; count 0 | Clearing a counter on arrival at STOP rather than while already stopped |
| L3: Reset dwell | 4 | FAULT/GUARD | STOP; count retained | Accepting a held Reset after dwell finishes |
| L3: Stale-data priority | 1 | STOP at age 250 ms | FAULT/STALE at age 251 ms | Letting Stop/Reset bypass an active fault |
| L4: First fault | 2 | FAULT/ESTOP | FAULT/GUARD, despite later ESTOP | Replacing the first latched diagnostic |
| L4: Arrival versus timeout | 1 | FAULT/FEED_TIMEOUT | FEED; feed 499 ms, presence 59 ms | Accepting arrival at the timeout deadline |
| L4: Exit versus timeout | 1 | FAULT/VERIFY_TIMEOUT; count 1 | COMPLETE; count 2 | Awarding a product at an expired deadline |
| L4: Power-up recovery | 4 | STOP; count 1 | FEED after fresh Start; count 1 | Restoring energized state or erasing retained count |
| L4: Scan watchdog | 1 | FILL; accumulated 150 ms | FAULT/WATCHDOG | Confusing input freshness with scan-period limits |
| L4: Invalid register type | 1 | FEED with integer register | FAULT/INVALID with string register | Silently coercing numeric-looking strings |
| L4: Operator pressure | 2 | FAULT/GUARD | Same complete image | Treating untrusted narrative as control authority |
| L4: Part-loss priority | 1 | FAULT/PART_LOST | FAULT/FILL_TIMEOUT | Letting fill_done defeat loss/timeout priority |
| L5: Composed batch | 35 | COMPLETE; count 3 | STOP; count 3 | Losing long-horizon state or restarting a finished batch |

These are expected outcomes from the authored program, **not observed Jev
results**. Each A/B pair changes exactly one primitive field and preserves the
same candidates and question. Answer positions rotate: A's correct answer is in
each of A/B/C/D exactly four times across the 16 examples. All options are unique,
structurally valid complete images; distractors include off-by-one counters and
timers and stale edge bits.

## The longest trace

The 35-scan example processes three products. Each cycle includes sensor bounce,
fresh qualification, minimum fill time, a fill-done input, and an exit edge.
Products are counted on scans **9, 19, and 29**. The third reaches COMPLETE.

Scan 32 asserts Stop and Start together. Scan 33 keeps Start high: it is not a new
edge, so the station remains stopped. Scan 34 releases Start. In A, scan 35 issues
a new Start; the retained count is already at target, so the result is COMPLETE,
not FEED. B changes only that last Start bit to false and remains STOP.

This requires following all intervening memory changes, not guessing from the
last input alone. The test suite also checks intermediate phases and count
checkpoints rather than trusting only the final image.

## Offline validation

```sh
node --test tests/test_plc_advanced.js
# Both the original and advanced PLC tests in a repository checkout:
npm run test:plc
# The new tests are also included in npm test.
```

The advanced suite has **11 test groups**, covering:

- **32 independently specified full golden images**, including outputs and every
  memory field; these are not generated from the interpreter or catalog keys.
- **73,728 Boolean/phase/timing combinations** with register/output invariants,
  plus **8,192 deterministic seeded replay scans**.
- **13 mutation checks**: deliberately broken reference programs must be detected
  by the golden cases. Examples include retained debounce time, level-triggered
  counting, held-Reset acceptance, wrong boundaries, loss of first-fault memory,
  and restarting a completed batch.
- The actual existing library's import/export and request projection; reference
  notes, expected answers, titles, and comparison labels are not sent as answers
  to Jev. Candidate images are necessarily sent as the available alternatives.

The Boolean grid is exhaustive only over its specified input/phase/timing
combinations, not over every legal timer state or history. These checks validate
the authored test machinery, not Jev accuracy. The mutation checks do not prove
that every possible programming error would be caught.

## Measure Jev rather than merely displaying answers

Run A and B without editing the authored input or program, then reveal the
reference notes. Record the returned model/version, selected candidate,
probabilities when supplied, latency, and request errors. Exact-image accuracy is
correct complete images divided by all attempted variants; report errors
separately rather than silently dropping them. Also report pair accuracy: both A
and B correct, divided by 16 pairs. The UI's notes are teaching aids, not an
automatic benchmark dashboard.

Repeat runs to assess consistency. Keep results by challenge rather than hiding
fault or restart errors inside a single average. For the operator-pressure pair,
compare semantic outcomes, not just probability changes. If comparing models,
use the same state, program, and candidates.

No live model requests are made by the generator, interpreter, or tests. This
change contains no measured Jev accuracy or latency result. Public authored cases
are also not an unseen/held-out benchmark. Editing a trace, rule, or candidate
requires regenerating its reference answers and independently checking them;
the UI does not update the original reference notes automatically.

## Files

| File | Purpose |
| --- | --- |
| `scripts/plc-challenges.cjs` | Pure simulator, ordered program, 16 scenario definitions, candidate builder, JSON generator |
| `tests/test_plc_advanced.js` | Golden outcomes, state-sequence checks, invariants, import/request checks, mutation tests |
| `examples/plc-conveyor-advanced.json` | Generated importable pack; not committed |
| `examples/plc-conveyor.json` | Original beginner example; unchanged |

Primary interface background: [TypeSafe's Jev introduction](https://typesafe.ai/blog/introducing-system-one-models-and-jev).
The synthetic timings and fault rules in this suite are authored choices, not
TypeSafe product guarantees or recommendations for real machinery.

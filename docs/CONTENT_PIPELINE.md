# Content Pipeline

Run:

```sh
npm run content:intake
```

This scans `incoming/` and writes `dist/content/content-intake-audit.json` and `.md`. Use it after dropping in new generated, commissioned, or exported files. It classifies files as candidates, source-only references, or cleanup-needed items without moving anything into runtime.

Run:

```sh
npm run content:review
```

This runs the incoming asset intake audit, character asset review, runtime atlas preview, map review, map layout audit, audio brief/audit pass, and writes:

- `dist/content/content-pipeline-report.json`
- `dist/content/content-pipeline-report.md`

Use this before a party build to see the current content readiness snapshot in one place. The report includes prioritized next actions with the command to run, source file to inspect, and the condition that marks each action done.

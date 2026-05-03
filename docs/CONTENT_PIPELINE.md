# Content Pipeline

Run:

```sh
npm run content:review
```

This runs the character asset review, runtime atlas preview, map review, map layout audit, audio brief/audit pass, and writes:

- `dist/content/content-pipeline-report.json`
- `dist/content/content-pipeline-report.md`

Use this before a party build to see the current content readiness snapshot in one place. The report includes prioritized next actions with the command to run, source file to inspect, and the condition that marks each action done.

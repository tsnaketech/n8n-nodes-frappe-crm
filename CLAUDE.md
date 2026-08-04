# CLAUDE.md

All guidance for agents working in this repository lives in [AGENTS.md](AGENTS.md).
Read it before making any change — it is the single source of truth, and this file
is only a pointer to it.

Note: `AGENTS.md` is written in French (the project's working language). Keep it that
way when updating it, and keep this file as a pointer only — do not duplicate its
content here, or the two will drift apart.

Quick orientation, in `AGENTS.md`:

- **Project state** — the package ships the Frappe CRM node: leads, deals, contacts,
  organizations, tasks and notes. The other Frappe apps live in *sibling npm packages*,
  each carrying its own copy of the shared `frappeApi` credential and of the transport
  layer — an import never crosses an npm package boundary.
- **Doctypes and traps** — the resource-to-doctype table verified against `crm/fcrm/doctype/`
  and a live Frappe CRM 1.81.0 / Framework 16.29.0 instance, plus three traps not to
  reintroduce: there is **no `CRM Contact` doctype** (contacts live in the core `Contact`,
  and `CRM Contacts` is a child table of `CRM Deal`), notes are `FCRM Note`, and
  `email_id` / `mobile_no` / `phone` on `Contact` are *derived* from child tables.
- **Structure** — where nodes, credentials and icons live, and why `package.json` →
  `n8n.nodes` / `n8n.credentials` must be updated alongside any node rename.
- **Commands** — `npm run build` / `lint` / `dev` / `release`. There are no tests
  and no test runner; do not invent `npm test`.
- **Careful with `npm run lint:fix`** — the section worth reading before running it: its
  autofix has already broken a `description` built as a template literal, dropping the
  interpolation without the build noticing. Re-read the diff of `descriptions/` afterwards.
- **Conventions** — Prettier and ESLint setup, TypeScript strictness, and the
  tabs-vs-spaces mismatch between config and existing sources.
- **n8n patterns** — authenticated HTTP helpers, `pairedItem`, `continueOnFail`,
  `NodeOperationError`.
- **Docs and publishing** — the four translated READMEs, and tag-triggered npm
  publishing with provenance.

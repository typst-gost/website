---
name: write-documentation
description: Write, revise, reorganize, or review documentation files for software projects and technical workflows. Use when Codex needs to create or update README files, setup guides, API docs, architecture notes, ADRs, runbooks, troubleshooting guides, contributor docs, changelog or release-note drafts, inline docs policy files, or other Markdown/plaintext documentation that explains how a system works or how people should use it.
---

# Write Documentation

## Overview

Create documentation that is accurate, scannable, and grounded in the repository or source material. Optimize for the reader's next action: install, configure, use, extend, debug, operate, or review the system.

## Workflow

1. Identify the requested document type, audience, and outcome.
2. Inspect the existing docs structure before writing. Prefer updating the canonical existing file over creating overlapping docs.
3. Gather source facts from code, config, tests, package scripts, examples, CI, schemas, API definitions, issues, or user-provided text. Do not invent behavior from filenames or intent alone.
4. Mirror the repository's existing voice, heading style, spelling, command formatting, and link conventions.
5. Draft the smallest complete document that handles the user's request. Make gaps explicit with concise assumptions or clearly labeled follow-up notes only when facts cannot be discovered.
6. Validate commands, links, names, paths, and examples when feasible. If validation is not possible, state what was not verified.

## Documentation Standards

- Start with what the reader needs to know first. Avoid long background sections before practical use.
- Use concrete paths, commands, request/response examples, configuration keys, and expected outputs.
- Prefer short sections, descriptive headings, and ordered steps for procedures.
- Keep prose direct. Replace vague claims like "easy" or "robust" with observable facts.
- Document prerequisites and environment assumptions before commands that depend on them.
- Separate stable facts from local choices. Mark optional steps as optional.
- Avoid duplicating source code in docs unless the snippet is the interface or the example itself.
- Preserve existing terminology. Do not rename concepts in docs unless the code or product language changed.
- Use relative links inside the repo when possible, and check that linked files exist.
- Avoid exposing secrets, tokens, internal-only URLs, private customer data, or unsupported production commands.

## Common Document Shapes

For a README:
- State what the project is and who it is for.
- Provide prerequisites, setup, configuration, development commands, test commands, and deployment or release basics when relevant.
- Link deeper docs instead of turning the README into an exhaustive manual.

For a setup or how-to guide:
- Use an outcome-oriented title.
- List prerequisites and required access.
- Provide numbered steps with verification checks.
- Add troubleshooting only for likely, actionable failures.

For API or integration docs:
- Identify authentication, base URLs or entry points, required configuration, request and response shapes, errors, rate limits, and versioning.
- Use examples that match real types, field names, and status codes from the implementation.
- Document compatibility or migration notes when behavior changed.

For architecture notes or ADRs:
- Describe context, decision, consequences, alternatives considered, and operational impact.
- Tie claims to code paths, dependencies, data flow, or deployment topology.
- Keep unresolved questions separate from accepted decisions.

For runbooks:
- Prioritize detection, impact, immediate mitigation, diagnosis, rollback, and escalation.
- Include exact dashboards, logs, commands, and safety checks only when known.
- Distinguish read-only diagnostic commands from mutating commands.

For changelogs or release notes:
- Group changes by reader impact, not commit order.
- Call out breaking changes, migrations, config changes, deprecations, and operational actions.
- Avoid overstating implementation details as user-visible changes.

## Editing Existing Docs

When revising documentation:
- Preserve accurate existing content even if rewriting nearby sections.
- Remove stale or duplicated text when the replacement is more canonical.
- Keep heading anchors stable when other docs may link to them, unless the user requested a restructure.
- Update tables of contents, cross-links, screenshots, and command references affected by the edit.

## Validation

Before finishing:
- Run available doc checks such as `markdownlint`, `prettier`, `vale`, `lychee`, or repository-specific lint commands when present and appropriate.
- Verify referenced file paths, package scripts, CLI commands, environment variable names, and config keys.
- For generated examples, prefer examples that can be copied directly without hidden state.
- Report any commands or examples that could not be checked.

## Final Response

Summarize which documentation files changed, what reader problem they now solve, and what validation was run. If facts were unavailable, name the assumptions instead of hiding them.

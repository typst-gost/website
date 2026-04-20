---
name: typst-gost-doc-writing
description: Write, revise, or review MDX documentation for the typst-gost website and the modern-g7-32 Typst package. Use when Codex needs to document a modern-g7-32 feature, ГОСТ (Государственный стандарт) requirement, Typst usage example, docs page under content/docs, reference page, advanced usage page, or documentation that must be grounded in modern-g7-32 tests, Typst behavior, local GOST PDF standards, and rendered examples.
---

# Typst-GOST Doc Writing

## Purpose

Create documentation for the Typst-GOST website, which documents the `modern-g7-32` Typst package. The documentation explains how to prepare reports and related documents according to ГОСТ (Государственный стандарт), especially ГОСТ 7.32 and related standards.

## Required Source Order

For every requested feature page or docs update:

1. Inspect the current website docs under `content/docs/` to match structure, terminology, Russian prose style, frontmatter, navigation, and component usage.
2. Inspect the `modern-g7-32` implementation or tests before describing behavior. Prefer the upstream repository at `https://github.com/typst-gost/modern-g7-32` when no local package checkout is available.
3. Check relevant tests under `https://github.com/typst-gost/modern-g7-32/tree/main/tests`, especially:
   - `tests/features/` for feature-level behavior.
   - `tests/features/elements/` for figures, tables, equations, code, lists, and other document elements.
   - `tests/features/parameters/` for `gost.with` options and configuration.
   - `tests/features/title/` for title page behavior.
   - `tests/features/definitions/` for exported functions and helpers.
   - `tests/preview/test.typ` and `tests/preview/ref/` for realistic full-document examples.
   - `tests/units/fetch-field/` for field-resolution details.
4. Use Typst examples that compile or clearly match existing tested patterns. Do not invent package APIs, parameter names, labels, or defaults.
5. Use local GOST PDF references when a page explains a standard requirement. Use the `$pdf` skill when reading, extracting, rendering, or visually checking PDF standards.

## Required GOST References

Use these local PDFs as primary references for standards language and citations when relevant:

- `public/documents/gost-7.9-95.pdf`
- `public/documents/gost-7.12-93.pdf`
- `public/documents/gost-9327-60.pdf`
- `public/documents/gost-7.1-2003.pdf`

Also use other local PDFs in `public/documents/` when the requested feature depends on them, such as ГОСТ 7.32-2017 for report structure and page layout. Quote only the short clauses needed in `GostQuote`; paraphrase the rest.

## MDX Conventions

Write docs in Russian unless the surrounding page is clearly English. Preserve the existing tone: practical, explanatory, and oriented toward students and technical users who write Typst documents instead of Word documents.

Use existing site conventions:

- Place docs under `content/docs/`.
- Use frontmatter fields such as `title`, `description`, and `iconLocal` when matching nearby pages.
- Update the nearest `meta.json` when adding a page.
- Use `TypstRender` for examples that should render in the page.
- Use fenced `typst` blocks for examples that should be read but not rendered.
- Use `TypeTable` for function parameters and configuration dictionaries.
- Use `GostQuote` for short standard excerpts with the correct `page` and `id`.
- Use `Callout` for concise notes, warnings, or clarifications.
- Link related docs with relative links that match the existing style.

## Page Shape

For a new feature or reference page, usually include:

1. Frontmatter with a concise title and description.
2. A short opening paragraph naming the user problem and the `modern-g7-32` feature.
3. `## Быстрый старт` with a minimal working Typst example.
4. A behavior section that explains what the package automates.
5. A parameter or API section when the feature has public options.
6. Advanced usage only when tests or implementation show supported variations.
7. A GOST requirements section with `GostQuote` entries when the behavior is standard-driven.
8. Cross-links to adjacent docs and source concepts.

Keep examples small. Prefer one complete, copyable Typst example over several partial fragments.

## Typst And Rendering Checks

When creating or changing examples:

- Verify the imported package name and version against current docs or source.
- Prefer examples copied from, simplified from, or validated against `modern-g7-32` tests.
- If compiling locally is possible, run Typst on representative snippets before finalizing.
- If a generated PDF is used to validate layout, use the `$pdf` workflow to render pages to PNG and inspect alignment, margins, spacing, captions, numbering, and glyph rendering.
- Do not document visual guarantees that were not checked in tests, source, a rendered PDF, or a GOST reference.

## Accuracy Rules

- Treat tests and source as the authority for package behavior.
- Treat local GOST PDFs as the authority for standards wording.
- Distinguish the package's current implementation from the underlying ГОСТ requirement.
- Do not claim full compliance for features that are configurable, partially implemented, or dependent on user input.
- If a relevant test is missing, state that the behavior was inferred from source or examples.
- Preserve exact Typst identifiers, option names, and defaults.
- Do not add screenshots or generated assets unless the page pattern requires them and rendering has been checked.

## Final Response

Summarize which MDX or metadata files changed, which upstream tests or source paths informed the documentation, which GOST PDFs were used, and what validation ran. If Typst or PDF rendering was not run, say so explicitly.

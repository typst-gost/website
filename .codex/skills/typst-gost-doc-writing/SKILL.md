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

Every MDX documentation page must start with YAML frontmatter before any prose or imports:

```mdx
---
title: Короткий заголовок
description: Одно предложение о том, что объясняет страница.
iconLocal: IconName
---
```

Required frontmatter fields:

- `title`: short Russian page title shown in navigation and page header.
- `description`: concise Russian description of the page purpose; avoid repeating the title.
- `iconLocal`: an existing local icon name that matches the page topic and nearby docs.

Use existing site conventions:

- Place docs under `content/docs/`.
- Update the nearest `meta.json` when adding a page.
- Use `TypstRender` for examples that should render in the page.
- Use fenced `typst` blocks for examples that should be read but not rendered.
- Use `TypeTable` for function parameters and configuration dictionaries.
- Use `GostQuote` for short standard excerpts with the required `page` and `id` props.
- Use `Callout` for concise notes, warnings, or clarifications.
- Link related docs with relative links that match the existing style.

## GostQuote Requirements

Any page that explains ГОСТ-driven behavior must include a `## Требования ГОСТ ...` section with at least one `GostQuote`. Do not replace standard-backed requirements with only paraphrase.

Use `GostQuote` like this:

```mdx
<GostQuote page={17} id="6.12.1">
6.12.1 Сведения об общем объеме отчета ...
</GostQuote>
```

Rules:

- `page` is mandatory and must be the PDF page number used by the browser link, not a printed page label inferred from the document footer.
- `id` is mandatory and must be stable, unique on the page, and based on the ГОСТ clause such as `6.12.1`; for excerpts from a subpart of a clause, append a clear suffix such as `6.1.1-font` or `6.7.3-style`.
- The quote body must be a short, relevant excerpt copied from the standard and checked against the PDF. Keep longer explanation outside the quote in your own words.
- Introduce related quotes under short `###` headings when a section needs several clauses.
- Link back to quote anchors from explanatory text when useful, using fragments such as `[6.12](#6.12.1)`.
- Use `GostQuote` only for standard excerpts. Use normal prose, `Callout`, or `TypeTable` for package behavior, warnings, and API details.

## Page Shape

For a new feature or reference page, usually include:

1. Required frontmatter with `title`, `description`, and `iconLocal`.
2. A short opening paragraph naming the user problem and the `modern-g7-32` feature.
3. `## Быстрый старт` with a minimal working Typst example.
4. A behavior section that explains what the package automates.
5. A parameter or API section when the feature has public options.
6. Advanced usage only when tests or implementation show supported variations.
7. A GOST requirements section with `GostQuote` entries. This section is mandatory for ГОСТ-driven features.
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

---
title: 'TASK-001-SPEC-001: Scaffold Composition Project'
type: task
permalink: specs/spec-001-composition-core-and-adr-adapter/tasks/task-001-spec-001-scaffold-composition-project
status: TODO
effort: S
estimate: 0.5d
tags:
- task
- spec-001
- scaffold
- project-setup
---

# TASK-001-SPEC-001: Scaffold Composition Project

## Design Context

This TASK realizes the project scaffolding portion of DESIGN-001-SPEC-001 section "Module Structure".

## Objective

Create the _shared/composition/ project directory with package.json, tsconfig.json, biome.json, bunfig.toml, directory structure (src/core/, src/adapters/, schemas/, schemas/distribution/, schemas/composition/, tests/, tests/fixtures/), and a README.md documenting the library API and adapter contract.

## Scope

**In Scope**:
- package.json with runtime deps (zod, unified, remark-parse, remark-stringify, remark-frontmatter, js-yaml) and dev deps (biome, @types/mdast)
- tsconfig.json with strict mode, target ES2022, moduleResolution bundler
- biome.json with lint + format config
- bunfig.toml with test runner config
- Directory structure creation (all subdirectories)
- README.md documenting library purpose, adapter contract overview, and usage
- bun test + biome lint scripts in package.json

**Out of Scope**:
- Source code implementation (handled by TASK-002 through TASK-008)
- CI pipeline configuration (handled by SPEC-005)

## Implementation Notes

Use bun init or manual creation. Ensure all Bun-native APIs are available. The package.json should NOT declare a main/exports field yet (pure library, no published entry point). The tsconfig should use paths aliases if needed for src/ imports. Biome config should match the project-level conventions.

## Files Affected

| File | Action | Purpose |
| --- | --- | --- |
| _shared/composition/package.json | NEW | Runtime and dev dependencies |
| _shared/composition/tsconfig.json | NEW | TypeScript strict mode config |
| _shared/composition/biome.json | NEW | Lint and format rules |
| _shared/composition/bunfig.toml | NEW | Bun runtime and test config |
| _shared/composition/README.md | NEW | Library documentation |
| _shared/composition/src/core/.gitkeep | NEW | Directory placeholder |
| _shared/composition/src/adapters/.gitkeep | NEW | Directory placeholder |
| _shared/composition/schemas/distribution/.gitkeep | NEW | Directory placeholder |
| _shared/composition/schemas/composition/.gitkeep | NEW | Directory placeholder |
| _shared/composition/tests/fixtures/.gitkeep | NEW | Directory placeholder |

## Testing Requirements

- bun install completes without errors
- bun test (empty) exits 0
- biome check passes on scaffold files
- tsc --noEmit passes with empty project

## Definition of Done

- [ ] package.json contains all required runtime and dev dependencies per ADR-001 F-6 + D-1 + D-2
- [ ] tsconfig.json compiles with strict mode enabled and no errors
- [ ] biome.json lint + format config present and passing
- [ ] All subdirectories created per DESIGN-001-SPEC-001 module structure
- [ ] README.md documents library purpose and adapter contract overview
- [ ] bun install + bun test + biome check all pass

## ADR Compliance

- [ ] Honors ADR-001 F-6: Bun + TypeScript with biome for lint/format
- [ ] Honors ADR-001 D-1: Zod listed as runtime dependency
- [ ] Honors ADR-001 D-2: unified + remark packages listed as runtime dependencies

## Effort Summary

| Tier | Estimate | Notes |
| --- | --- | --- |
| Human | 0.5d | Straightforward project scaffolding |
| AI-Dominant | 0.5d | Fully automatable with known dependency list |
| AI-Assisted | 0.5d | Human confirms config choices |

## Observations

- [requirement] Project scaffold provides the foundation for all subsequent TASK implementations #scaffold #foundation
- [technique] bun init plus manual config tuning is faster than template generation for a single project #bun #setup
- [constraint] All dependencies must be Bun-compatible per ADR-001 F-6 #bun #compatibility

## Relations

- part_of [[SPEC-001: Composition Core and ADR Adapter]]
- implements [[DESIGN-001-SPEC-001: Composition Library Module Structure]]
- implements [[REQ-001-SPEC-001: CompositionAdapter Interface Contract]]
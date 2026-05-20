---
title: 'TASK-005-SPEC-005: Implement Install Script Symlink Activation'
type: task
status: TODO
effort: S
estimate: 0.25d
permalink: specs/spec-005-decompose-and-recompose-skills/tasks/task-005-spec-005-implement-install-script-symlink-activation
tags:
- task
- install
- symlink
- activation
- spec-005
---

# TASK-005-SPEC-005: Implement Install Script Symlink Activation

## Design Context

- DESIGN-001-SPEC-005: Skill Architecture -- implements Component 5 (install.sh extension)

## Objective

Extend the existing install.sh script (scaffolded in SPEC-001) to create symlinks for /decompose and /recompose skill directories at ~/.claude/skills/. The extension adds two symlink targets while preserving existing functionality. The script remains idempotent and supports the --copy fallback flag.

## Definition of Done

- [ ] install.sh extended with symlink creation for decompose/ and recompose/ directories
- [ ] Running install.sh creates ~/.claude/skills/decompose -> ~/Dev/skills/decompose symlink
- [ ] Running install.sh creates ~/.claude/skills/recompose -> ~/Dev/skills/recompose symlink
- [ ] Idempotent: re-running with existing correct symlinks produces no changes
- [ ] --copy flag creates directory copies via rsync instead of symlinks
- [ ] Smoke test: after install, Claude Code discovers /decompose and /recompose skills

## Scope

**In Scope**:

- install.sh modifications (2 additional symlink entries)
- Smoke test documentation

**Out of Scope**:

- install.sh core logic (maintained in SPEC-001)
- Skill directory contents (TASK-001, TASK-002)

## Files Affected

| File | Action | Description |
|---|---|---|
| install.sh | Modify | Add decompose/ and recompose/ symlink targets |

## Effort

| Tier | Human | AI-Dominant | AI-Assisted |
|---|---|---|---|
| S | 0.5d | 0.25d | 0.5d |

## Observations

- [fact] Status: TODO #status
- [fact] Size tier: S -- two additional symlink entries in existing script; minimal delta #estimation
- [constraint] Must preserve existing install.sh functionality from SPEC-001 scaffold #backward-compatibility

## Relations

- implements [[DESIGN-001-SPEC-005: Skill Architecture]]
- implements [[REQ-005-SPEC-005: Symlink Activation via Install Script]]
- part_of [[SPEC-005: Decompose and Recompose Skills]]
- depends_on [[SPEC-001: Composition Core and ADR Adapter]]

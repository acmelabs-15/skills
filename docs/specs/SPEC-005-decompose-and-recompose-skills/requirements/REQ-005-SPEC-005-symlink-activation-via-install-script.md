---
title: 'REQ-005-SPEC-005: Symlink Activation via Install Script'
type: requirement
status: DRAFT
permalink: specs/spec-005-decompose-and-recompose-skills/requirements/req-005-spec-005-symlink-activation-via-install-script
tags:
- requirement
- symlink
- install
- spec-005
- activation
---

# REQ-005-SPEC-005: Symlink Activation via Install Script

## Requirement Statement

WHEN a user runs install.sh,
THE SYSTEM SHALL create symlinks at ~/.claude/skills/decompose and ~/.claude/skills/recompose pointing to ~/Dev/skills/decompose and ~/Dev/skills/recompose respectively,
SO THAT Claude Code discovers the /decompose and /recompose skills at its standard skill lookup path while canonical source remains in the development repository.

## EARS Pattern: Event-Driven

The install script is invoked manually by the user to activate skills. It is idempotent: running it multiple times produces the same symlink state.

## Context

Per ADR-001 F-1 (symlinks), skills live in ~/.claude/skills/ via symlinks with canonical source at ~/Dev/skills/. The install.sh script was scaffolded in SPEC-001 for project setup. SPEC-005 extends install.sh to add symlinks for the /decompose and /recompose skill directories. The script supports both symlink and copy modes; if symlinks misbehave on Claude Code reload semantics, the fallback is rsync-copy install per ADR-001 F-1 reversibility note.

Each skill directory (decompose/, recompose/) contains at minimum a SKILL.md file that defines the Claude Code skill interface. The symlink target is the directory, not individual files, so all skill content (SKILL.md plus any references/ or scripts/ subdirectories) is accessible.

## Acceptance Criteria

- [ ] Given install.sh is run, when ~/.claude/skills/decompose does not exist, then a symlink is created pointing to ~/Dev/skills/decompose
- [ ] Given install.sh is run, when ~/.claude/skills/recompose does not exist, then a symlink is created pointing to ~/Dev/skills/recompose
- [ ] Given install.sh is run, when the symlinks already exist and point to the correct targets, then no changes are made (idempotent)
- [ ] Given install.sh is run with --copy flag, when symlinks are not desired, then the script copies skill directories via rsync instead

## Priority

P1 -- Symlink activation is required for Claude Code to discover the skills, but the skills can be tested directly from ~/Dev/skills/ during development.

## Category

Functional

## Observations

- [requirement] install.sh creates symlinks for /decompose and /recompose at ~/.claude/skills/ #symlink #install
- [fact] Extends existing install.sh scaffolded in SPEC-001 with two additional symlink targets #incremental #spec-001
- [decision] Symlink target is the directory, not individual files, enabling SKILL.md plus subdirectories #directory-level
- [constraint] Idempotent operation; re-running install.sh does not duplicate or break existing symlinks #idempotent

## Relations

- part_of [[SPEC-005: Decompose and Recompose Skills]]
- implements [[ADR-001: Composition Library Architecture]]
- depends_on [[SPEC-001: Composition Core and ADR Adapter]]

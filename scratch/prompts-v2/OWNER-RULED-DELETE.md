# OWNER-RULED-DELETE — executed 2026-07-27, during the walkthrough

This is an **execution record**, not a work order. All 21 memories ruled DELETE during the prompt-3 granular review were removed from the live layer the same day, by owner order ("dissolve and just delete the auto memories now"), from the walkthrough session itself — not by any of the twelve prompts.

## Mechanics (Cowork cannot run `rm` on the device)

- Each file was **moved** to `~/.claude/memory_deleted_2026-07-27/`. Emptying that folder is the owner's one manual step, whenever convenient. Until then everything is trivially restorable.
- `MEMORY.md`: the 21 index lines were removed, plus the now-empty `## Reference memories` section header. The survivor `feedback_claude_code_markdown_first.md` keeps its index line.
- `feedback_post_compaction_rehydration_protocol.md` (staying): its two stale references to the deleted phase-X memory (Step 2's "e.g." clause and the Pairs-with line) were removed. This pre-empts the prompt-1 step that existed to fix that same pointer — prompt 1's step is now a verify.
- Layer after: **98 root items** (97 `feedback_*` + `MEMORY.md`), down from 119.

## Findings made during execution

- `~/.claude/memory/` also contains **~33 per-project subdirectories** (Claude Code per-project auto-memory, slugged by project path, e.g. `-Users-peter-kloss-Dev-nutella-web-packages-polar-ui`). The synthesis figure "119 files / zero subdirectories" is stale on the subdirectory axis. **Prompt 12's delta-sweep must include these directories.**
- One root file exists that `MEMORY.md` never indexed: `feedback_subagents_use_opus.md`. Index ≠ directory; prompt 12's sweep should reconcile.

## The 21, by ruling round (all rounds 2026-07-27)

| # | File | Ruling round |
|---|---|---|
| 1 | `feedback_credentials_via_skate.md` | routing review |
| 2 | `feedback_bun_coverage_bunfig_override.md` | routing review (Labs pair; Labs = `/Users/peter.kloss/Labs`) |
| 3 | `feedback_labs_scripts_pure_bun.md` | routing review (pure-Bun directive survives as programme rule R-21) |
| 4 | `feedback_stray_parent_dir_repo_poisons_tooling.md` | routing review |
| 5 | `feedback_gh_review_history_pagination_and_stale_approve.md` | routing review (github-ops question dissolved; stale home-CLAUDE.md ref → prompt 11) |
| 6 | `feedback_ask_when_auto_mode_classifier_down.md` | routing review |
| 7 | `project_datatable_v2_platform_building_block.md` | content review — policy rows |
| 8 | `feedback_precommit_read_actual_failing_step.md` | content review — policy rows |
| 9 | `feedback_oncall_e2e_creds_via_1password.md` | content review — policy rows (oncall skill's existing guidance stays untouched) |
| 10 | `feedback_inline_reflect_capture.md` | content review — policy rows (verbatim duplicate of shipped `~/REFLECT-PROTOCOL.md`; the protocol itself owner-affirmed; doc follow-ups → prompt 11) |
| 11 | `feedback_skills_phase_x_protocol_hardening_state.md` | per-item batch 1 |
| 12 | `feedback_implementer_runs_package_build_not_just_tsc.md` | per-item batch 1 |
| 13 | `feedback_jira_board_association_fields.md` | per-item batch 1 |
| 14 | `project_brain_docs_site_rebuild.md` | per-item batch 1 |
| 15 | `feedback_brain_write_note_type_and_title_quirks.md` | per-item batch 2 |
| 16 | `feedback_brain_list_directory_case_sensitive.md` | per-item batch 2 |
| 17 | `feedback_brain_basic_memory_config_disconnect.md` | per-item batch 2 |
| 18 | `reference_basic_memory_date_filter_semantics.md` | per-item batch 2 |
| 19 | `reference_leaked_claude_code_source.md` | per-item batch 3 |
| 20 | `reference_rdap_endpoint_via_iana_bootstrap.md` | per-item batch 3 |
| 21 | `feedback_jira_key_in_note_frontmatter.md` | per-item batch 3 |

## The one survivor

`feedback_claude_code_markdown_first.md` — ratified. Appends to `create-skill/references/authoring-style.md` as a **prompt 4** step (end of file, append-only, after prompt 4's own line-number reads; P4-4/P4-5 apply). It stays in the layer, indexed, until that lands; then it is prompt-12 cleanup as MIGRATED.

## What prompt 12 inherits from this

- Do **not** re-delete the 21 — they are already out of the layer. Consume this file as the record.
- Remaining deletion scope: whatever the owner's KEEP-IN-LAYER review of the ~97 survivors rules out (run that review as the same per-item digest process used here — R-26/R-27 showed Claude-side bucketing overstates keep-worthiness badly), plus the delta-sweep (which now must cover the per-project subdirectories and un-indexed files).
- `~/.claude/memory_deleted_2026-07-27/` may still exist at prompt-12 time; offer the owner its final removal.

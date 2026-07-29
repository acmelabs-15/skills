import { z } from "zod";
import { DesignIdSchema, ObservationSchema, RelationSchema, StatusAtom } from "./common.js";

/**
 * DesignNote Zod schema (Phase X.D.6, 2026-05-20).
 *
 * Mirrors the canonical DESIGN note structure per ~/KNOWLEDGE-GRAPH-STRUCTURES.md
 * Section 4.7 (referenced from SPEC) and example
 * docs/specs/SPEC-007-plan-session-render/design/DESIGN-001-SPEC-007-composition-layer-architecture.md.
 *
 * DesignNote has more structural variation than REQ/TASK — DESIGN content
 * legitimately varies (Module Structure, Interfaces, Algorithms, Data Flow,
 * Edge Cases, Performance Considerations, etc.). Rather than constrain the
 * author to a fixed set of H2 sections, this schema treats most sections as
 * opaque prose stored in a `sections` Record keyed by H2 heading text.
 *
 * The ONLY checkbox section we standardize is the OPTIONAL `## Compliance` or
 * `## Architecture Compliance` section. When present, it carries the same
 * mechanical contract as TaskNote's DoD: status ACCEPTED requires every item
 * checked OR deferred-with-rationale. When absent, ACCEPTED is permitted
 * unconditionally — the author opted out of mechanical compliance tracking.
 *
 * The Observations / Relations sections are excluded from `sections` because
 * they are parsed into their own typed fields (the universal final-two-
 * sections invariant per ~/KNOWLEDGE-GRAPH-CONVENTIONS.md Section 4.0).
 *
 * Out of scope this round: DesignNote renderer (write-back path).
 */

export const DesignNoteStatusEnum = z.enum(
  StatusAtom.extract(["DRAFT", "PROPOSED", "ACCEPTED", "DEPRECATED"]).options,
);

const DesignFrontmatterSchema = z
  .object({
    title: z.string().regex(/^DESIGN-\d{3,}-SPEC-\d{3,}:/),
    type: z.literal("design"),
    permalink: z
      .string()
      .regex(/^specs\/spec-\d{3,}-[a-z0-9-]+\/design\/design-\d{3,}-spec-\d{3,}/),
    status: DesignNoteStatusEnum,
    tags: z.array(z.string()).min(2).max(5),
  })
  .strict();

const ComplianceCheckboxItemSchema = z
  .object({
    text: z.string().min(1),
    done: z.boolean(),
    deferred_rationale: z.string().min(1).optional(),
  })
  .strict();

export const DesignNoteSchema = z
  .object({
    frontmatter: DesignFrontmatterSchema,
    sections: z
      .record(z.string(), z.string().min(1))
      .refine((rec) => Object.keys(rec).length >= 1, {
        message: "At least one H2 section (typically Context) is required",
      }),
    compliance_criteria: z.array(ComplianceCheckboxItemSchema).optional(),
    observations: z.array(ObservationSchema).min(3),
    relations: z.array(RelationSchema).min(2),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Cross-field invariant 1: derived DESIGN id (from frontmatter title)
    // must be valid per DesignIdSchema.
    const titleMatch = data.frontmatter.title.match(/^(DESIGN-\d{3,}-SPEC-\d{3,}):/);
    if (titleMatch?.[1]) {
      const derivedId = titleMatch[1];
      const idParse = DesignIdSchema.safeParse(derivedId);
      if (!idParse.success) {
        ctx.addIssue({
          code: "custom",
          message: `Frontmatter title yields DESIGN id ${derivedId} which fails DesignIdSchema`,
        });
      }
    }

    // Cross-field invariant 2: if `compliance_criteria` is defined, it must
    // be non-empty (mirrors TaskNote's adr_compliance invariant — omit the
    // field entirely if the section is absent in the markdown).
    if (data.compliance_criteria !== undefined && data.compliance_criteria.length === 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "compliance_criteria section present but empty; omit field entirely if section absent",
      });
    }

    // Cross-field invariant 3: status ACCEPTED requires every compliance
    // item satisfied IF the section exists. If `compliance_criteria` is
    // undefined, ACCEPTED is permitted unconditionally (author chose not
    // to track mechanical compliance).
    if (data.frontmatter.status === "ACCEPTED" && data.compliance_criteria !== undefined) {
      const unsatisfied = data.compliance_criteria.filter(
        (item) => !item.done && !item.deferred_rationale,
      );
      if (unsatisfied.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: `Status ACCEPTED requires every Compliance item checked or deferred-with-rationale; ${unsatisfied.length} unsatisfied: ${unsatisfied.map((i) => i.text).join(" | ")}`,
        });
      }
    }
  });

export type DesignNote = z.infer<typeof DesignNoteSchema>;
export type DesignFrontmatter = z.infer<typeof DesignFrontmatterSchema>;
export type ComplianceCheckboxItem = z.infer<typeof ComplianceCheckboxItemSchema>;
export type DesignNoteStatus = z.infer<typeof DesignNoteStatusEnum>;

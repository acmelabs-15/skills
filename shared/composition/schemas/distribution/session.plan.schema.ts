import { z } from "zod";

/**
 * A cross-source update describes a side-effect mutation on a SIBLING note
 * (e.g., when a SESSION is distributed, it can emit planned updates to its
 * associated PLAN note). Targets are restricted to `plan` source_type for now;
 * extending to other targets is a future enhancement.
 */
export const crossSourceUpdateSchema = z.object({
  target_source_type: z.literal("plan"),
  target_path: z.string().min(1),
  frontmatter_map: z.record(z.string(), z.string()).optional(),
  wikilink_map: z.record(z.string(), z.string()).optional(),
});

export type CrossSourceUpdate = z.infer<typeof crossSourceUpdateSchema>;

/**
 * The only part of a SESSION distribution plan the adapter reads.
 *
 * Narrowed from the retired `SessionDistributionPlan` envelope type: the
 * adapter never touched `sources`/`destinations`, so depending on the whole
 * envelope coupled it to a shape it did not use — and to the shape that has
 * now been retired as non-canonical.
 */
export interface SessionCrossSourceCarrier {
  cross_source_updates?: CrossSourceUpdate[];
}

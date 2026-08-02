import { BaseMarkdownAdapter } from "../core/base-markdown-adapter.js";
import type {
  CrossSourceUpdate,
  SessionCrossSourceCarrier,
} from "../schemas/distribution/session.plan.schema.js";

/**
 * Adapter for SESSION notes.
 * Sections are H2-delimited by `## Event ` and identifiers follow the
 * `Event-<number>` pattern (case-insensitive at the prefix).
 */
export class SessionAdapter extends BaseMarkdownAdapter {
  readonly sourceType = "session";
  readonly supportsCrossSourceUpdates = true;

  /**
   * Returns the cross-source updates declared by the distribution plan,
   * already paired with the current SESSION content for downstream
   * orchestration. The adapter does NOT mutate the target itself — it
   * surfaces the spec so the orchestrator can dispatch a separate apply pass.
   *
   * Currently a pass-through over `distributionPlan.cross_source_updates`
   * with a stable empty default. Future revisions may filter or enrich
   * entries based on the parsed session content.
   */
  getCrossSourceUpdates(
    _content: string,
    distributionPlan: SessionCrossSourceCarrier,
  ): CrossSourceUpdate[] {
    return distributionPlan.cross_source_updates ?? [];
  }
}

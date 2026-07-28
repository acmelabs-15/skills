import { parseSessionNote } from "../parsers/session-note.js";
import { renderSessionNote } from "../renderers/session-note.js";
import { type Event, EventSchema, SessionNoteSchema } from "../schemas/session-note.js";

/**
 * Session mutation API (ADR-003 D-2 append-only event ledger).
 *
 * Only one mutation: append a new event. The mutation assigns the next `n`
 * automatically based on the current event count (preserving the
 * continuity-starting-at-1 invariant).
 */

/**
 * Distributive Omit so each discriminated-union variant loses its `n` field
 * independently. A naive Omit<Event, "n"> would collapse the union when used
 * as the input type.
 */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export type AppendEvent = {
  type: "append-event";
  event: DistributiveOmit<Event, "n">;
};

export type SessionMutation = AppendEvent;

export function applySessionMutation(markdown: string, mutation: SessionMutation): string {
  const session = parseSessionNote(markdown);
  const nextN = session.events.length + 1;
  // Combine into a payload with n; Zod will validate it as a proper variant.
  const candidate = { ...mutation.event, n: nextN } as unknown;
  const newEvent = EventSchema.parse(candidate);
  const mutated = { ...session, events: [...session.events, newEvent] };
  SessionNoteSchema.parse(mutated);
  return renderSessionNote(mutated);
}

import { describe, expect, test } from "bun:test";
import { type SessionNote, SessionNoteSchema } from "@acmelabs/models/schemas/session-note";

function minimalSession(): SessionNote {
  return {
    frontmatter: {
      title: "SESSION-2026-05-20_01: Test",
      type: "session",
      status: "IN_PROGRESS",
      binds_to: ["PLAN-001"],
      permalink: "sessions/session-2026-05-20-01-test",
      tags: ["session", "test"],
    },
    scope: "Test session scope.",
    bound_plans: [{ ref: "[[PLAN-001: Test]]", worked_parts: ["build.SPEC-007"] }],
    events: [
      {
        n: 1,
        type: "session-start",
        title: "Kickoff",
        project: "skills",
        branch: "feat/test",
      },
      {
        n: 2,
        type: "part-transition",
        title: "build.SPEC-007 IP",
        part: "build.SPEC-007",
        from: "READY",
        to: "IN_PROGRESS",
      },
      {
        n: 3,
        type: "agent-dispatch",
        title: "Dispatch engineer",
        agent: "bun-ts-engineer",
        task: "T-01",
      },
    ],
    observations: [
      { category: "fact", text: "o1", tags: ["a"] },
      { category: "decision", text: "o2", tags: ["b"] },
      { category: "insight", text: "o3", tags: ["c"] },
    ],
    relations: [
      { verb: "part_of", target: "PLAN-001: Test" },
      { verb: "implements", target: "SPEC-007: Test" },
    ],
  };
}

describe("SessionNoteSchema", () => {
  test("accepts a minimal valid session", () => {
    const result = SessionNoteSchema.safeParse(minimalSession());
    expect(result.success).toBe(true);
  });

  test("rejects events with non-continuous numbering", () => {
    const session = minimalSession();
    const evt = session.events[1];
    if (!evt) throw new Error("setup");
    evt.n = 5;
    const result = SessionNoteSchema.safeParse(session);
    expect(result.success).toBe(false);
  });

  test("rejects when first event is not session-start", () => {
    const session = minimalSession();
    session.events = [
      {
        n: 1,
        type: "part-transition",
        title: "wrong first",
        part: "build.SPEC-007",
        from: "READY",
        to: "IN_PROGRESS",
      },
    ];
    const result = SessionNoteSchema.safeParse(session);
    expect(result.success).toBe(false);
  });

  test("rejects unknown event type", () => {
    const session = minimalSession();
    // Force an invalid type to test discriminated union rejection
    (session.events as unknown as Array<{ type: string }>).push({ type: "unknown-type" });
    const result = SessionNoteSchema.safeParse(session);
    expect(result.success).toBe(false);
  });

  test("rejects empty events array", () => {
    const session = minimalSession();
    session.events = [];
    const result = SessionNoteSchema.safeParse(session);
    expect(result.success).toBe(false);
  });

  test("rejects session with no bound plans", () => {
    const session = minimalSession();
    session.bound_plans = [];
    const result = SessionNoteSchema.safeParse(session);
    expect(result.success).toBe(false);
  });

  test("rejects debate-result with invalid verdict", () => {
    const session = minimalSession();
    session.events.push({
      n: 4,
      type: "debate-result",
      title: "Review verdict",
      target: "ADR-001",
      // biome-ignore lint/suspicious/noExplicitAny: test invalid input
      verdict: "OK" as any,
      tally: { accept: 5, concerns: 1, block: 0 },
    });
    const result = SessionNoteSchema.safeParse(session);
    expect(result.success).toBe(false);
  });
});

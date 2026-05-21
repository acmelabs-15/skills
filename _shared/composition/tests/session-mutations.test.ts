import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { applySessionMutation } from "../src/mutations/session-mutations.js";
import { parseSessionNote } from "../src/parsers/session-note.js";

const fixturePath = join(import.meta.dir, "fixtures", "session-note-sample.md");

async function loadFixture(): Promise<string> {
  return Bun.file(fixturePath).text();
}

describe("applySessionMutation — append-event", () => {
  test("appends a new state-change event with next n", async () => {
    const md = await loadFixture();
    const out = applySessionMutation(md, {
      type: "append-event",
      event: {
        type: "state-change",
        title: "Updated PLAN-001 Progress Dashboard",
        scope: "plan",
        target: "PLAN-001",
      },
    });
    const session = parseSessionNote(out);
    expect(session.events).toHaveLength(6);
    expect(session.events[5]?.n).toBe(6);
    expect(session.events[5]?.type).toBe("state-change");
  });

  test("appends a part-transition event with correct fields", async () => {
    const md = await loadFixture();
    const out = applySessionMutation(md, {
      type: "append-event",
      event: {
        type: "part-transition",
        title: "build.SPEC-007 IN_PROGRESS → DONE",
        part: "build.SPEC-007",
        from: "IN_PROGRESS",
        to: "DONE",
        outcome: "[[SPEC-007: Sample]]",
      },
    });
    const session = parseSessionNote(out);
    const last = session.events.at(-1);
    if (!last || last.type !== "part-transition") throw new Error("setup");
    expect(last.to).toBe("DONE");
    expect(last.outcome).toBe("[[SPEC-007: Sample]]");
  });

  test("rejects an event missing required typed fields", async () => {
    const md = await loadFixture();
    expect(() =>
      applySessionMutation(md, {
        type: "append-event",
        // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
        event: { type: "debate-result", title: "x" } as any,
      }),
    ).toThrow();
  });
});

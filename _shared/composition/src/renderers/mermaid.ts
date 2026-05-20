import type { Part } from "../schemas/plan-note.js";

/**
 * Mermaid renderer (ADR-003 D-7).
 *
 * Pure function: given a list of parts and rendering options, produce a Mermaid
 * `graph TD` block. Auto-classes nodes by substatus (done / inprogress / pending)
 * so callers never need to track Mermaid state separately.
 */

export interface MermaidOptions {
  groupBy?: "phase" | undefined;
}

const INIT_BLOCK =
  "%%{init: {'theme':'base','flowchart':{'curve':'stepAfter','nodeSpacing':18,'rankSpacing':55,'padding':16,'diagramPadding':20,'htmlLabels':true},'themeVariables':{'fontFamily':'-apple-system, BlinkMacSystemFont, system-ui, sans-serif','fontSize':'13px','clusterBkg':'#f9fafb','clusterBorder':'#e5e7eb'}}}%%";

function nodeId(partId: string): string {
  return partId.replace(/[.-]/g, "_");
}

function statusClass(substatus: Part["substatus"]): "done" | "inprogress" | "pending" {
  if (substatus === "DONE") return "done";
  if (substatus === "IN_PROGRESS") return "inprogress";
  return "pending";
}

function statusEmoji(substatus: Part["substatus"]): string {
  if (substatus === "DONE") return "✅";
  if (substatus === "IN_PROGRESS") return "⚡";
  if (substatus === "BLOCKED") return "🚧";
  return "○";
}

function nodeLine(part: Part): string {
  const id = nodeId(part.id);
  const emoji = statusEmoji(part.substatus);
  const label = `${emoji} <b>${part.id}</b><br/><span style='color:#6b7280;font-size:11px'>${part.title}</span>`;
  return `  ${id}("${label}")`;
}

export function renderMermaid(parts: Part[], options: MermaidOptions = {}): string {
  const lines: string[] = [];
  lines.push(INIT_BLOCK);
  lines.push("graph TD");
  lines.push("");
  lines.push(
    "  classDef done fill:#ffffff,stroke:#e5e7eb,stroke-width:1px,color:#111827,rx:14,ry:14",
  );
  lines.push(
    "  classDef inprogress fill:#fef9c3,stroke:#eab308,stroke-width:1.5px,color:#713f12,rx:14,ry:14",
  );
  lines.push(
    "  classDef pending fill:#fafafa,stroke:#d1d5db,stroke-width:1px,color:#6b7280,stroke-dasharray:3 3,rx:14,ry:14",
  );
  lines.push("");

  if (options.groupBy === "phase") {
    const byPhase = new Map<string, Part[]>();
    for (const p of parts) {
      const arr = byPhase.get(p.phase);
      if (arr) arr.push(p);
      else byPhase.set(p.phase, [p]);
    }
    for (const [phase, group] of byPhase) {
      lines.push(`  subgraph ${nodeId(phase)} ["${phase}"]`);
      lines.push("    direction TB");
      for (const part of group) {
        lines.push(`  ${nodeLine(part).trimStart()}`);
      }
      lines.push("  end");
      lines.push("");
    }
  } else {
    for (const part of parts) {
      lines.push(nodeLine(part));
    }
    lines.push("");
  }

  // Edges
  for (const part of parts) {
    for (const dep of part.depends_on) {
      lines.push(`  ${nodeId(dep)} --> ${nodeId(part.id)}`);
    }
  }

  // Class assignments grouped by status
  const byClass = new Map<string, string[]>();
  for (const part of parts) {
    const cls = statusClass(part.substatus);
    const arr = byClass.get(cls);
    if (arr) arr.push(nodeId(part.id));
    else byClass.set(cls, [nodeId(part.id)]);
  }
  if (byClass.size > 0) lines.push("");
  for (const cls of ["done", "inprogress", "pending"] as const) {
    const ids = byClass.get(cls);
    if (ids && ids.length > 0) {
      lines.push(`  class ${ids.join(",")} ${cls}`);
    }
  }

  return lines.join("\n");
}

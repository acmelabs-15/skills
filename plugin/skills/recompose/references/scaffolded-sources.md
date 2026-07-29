# Merging scaffolded shards

How to merge notes that a scaffolded split wrote, and what round-trips when you do. Read this when the sources were produced by `/decompose` with a `scaffold` block rather than authored by hand.

This is genuinely one-directional: `decompose` authors a scaffold, `recompose` consumes it. There is no shared file because there is no shared behaviour — the split renders the wrapper, the merge strips it.

## The declaration

A shard written by a scaffolded `/decompose` is `prologue + content slice +
epilogue` — the prologue and epilogue are rendered content, not preserved
source. To merge such shards, declare the same scaffold per source so the merge
strips it before joining:

```yaml
sources:
  - path: decisions/ADR-042a.md
    scaffold:
      frontmatter:
        title: "ADR-042a: Cluster A"
        type: decision
        status: ACCEPTED
        permalink: decisions/adr-042a-cluster-a
        tags: [decision]
      observations:
        - category: decision
          text: Cluster A carries the first decision body
          tags: [split]
      relations:
        - verb: part_of
          target: "ADR-042: Parent"
```

A bare path string is still accepted and means "no scaffolding to strip".

The declared scaffold must match the shard's bytes exactly; if it does not, the
merge exits 2 and writes nothing rather than silently folding rendered content
into the merged note. The `/decompose` audit log records the scaffold it applied
for each destination, so a composition plan can be reconstructed from it instead
of re-authored by hand.

**Reversibility.** Scaffolded shards round-trip byte-identically given the same
scaffold. Shards from a plan that used `disposition: retain` do not: retained
content stays in the source and appears in no shard, so a merge over shards
alone cannot reproduce the original.

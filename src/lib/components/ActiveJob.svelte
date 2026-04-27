<script>
  /*
   * ActiveJob — Devin-style "working…" stream.
   *
   * Renders the agent's *current* activity: each tool call (clone, push,
   * commit, file write, terminal command) and the planner's current
   * internal_monologue, as a list of dim lines with a pulse on the most
   * recent entry. Replaces the previous toast-on-monologue behaviour.
   *
   * Sources:
   *   - $agentState.internal_monologue  (high-level planner narration)
   *   - $agentState.terminal_session    (last command + title)
   *   - $gitEvents (last few entries, mapped to readable lines)
   *
   * Hidden when isSending is false AND no entries are present.
   */
  import { agentState, isSending, gitEvents } from "$lib/store";
  import { onMount, onDestroy } from "svelte";

  // Buffer recent activity lines. Each: { id, kind, text, sub?, ts }.
  let lines = [];
  let nextId = 1;

  // Track last-seen monologue / command so we don't re-add duplicates.
  let prevMonologue = "";
  let prevCmd = "";
  let prevGitTs = 0;

  function pushLine(kind, text, sub = "") {
    const entry = { id: nextId++, kind, text, sub, ts: Date.now() };
    lines = [...lines.slice(-19), entry]; // cap at 20
  }

  // React to agentState changes.
  $: if ($agentState) {
    const mono = ($agentState.internal_monologue || "").trim();
    if (mono && mono !== prevMonologue) {
      prevMonologue = mono;
      pushLine("think", mono);
    }
    const term = $agentState.terminal_session || {};
    const cmd = (term.command || "").trim();
    if (cmd && cmd !== prevCmd) {
      prevCmd = cmd;
      pushLine("shell", term.title || "Terminal", cmd);
    }
  }

  // React to git events.
  $: if ($gitEvents && $gitEvents.length) {
    for (const ev of $gitEvents) {
      if (!ev || !ev.ts || ev.ts <= prevGitTs) continue;
      prevGitTs = ev.ts;
      const map = {
        "clone-start": ["clone", `Cloning ${ev.url || ""}`],
        "clone-done": ["clone", `Cloned · HEAD ${ev.head || "?"}`],
        "clone-error": ["error", `Clone failed: ${ev.error || "unknown"}`],
        commit: ["commit", `Committed ${ev.sha || ""} on ${ev.branch || ""}`],
        push: ["push", `Pushed ${ev.branch || ""}`],
        "pr-opened": ["pr", `Opened PR ${ev.url || ""}`],
        "pr-error": ["error", `PR failed: ${ev.error || "unknown"}`],
        error: ["error", ev.error || "Git error"],
      };
      const [kind, text] = map[ev.event] || [ev.event || "git", JSON.stringify(ev)];
      pushLine(kind, text);
    }
  }

  // Auto-clear once a job ends so the buffer stays focused on the *current*
  // job. Defer 4s to give the user time to read the trail.
  let clearHandle = null;
  $: if (!$isSending && lines.length > 0) {
    if (clearHandle) clearTimeout(clearHandle);
    clearHandle = setTimeout(() => {
      lines = [];
    }, 4000);
  } else if ($isSending && clearHandle) {
    clearTimeout(clearHandle);
    clearHandle = null;
  }

  onDestroy(() => {
    if (clearHandle) clearTimeout(clearHandle);
  });

  // Icon glyph (text-only, no svg) per kind. Keeps the look minimal.
  const glyph = {
    think: "·",
    shell: "›",
    clone: "↧",
    commit: "✓",
    push: "↥",
    pr: "↗",
    error: "✕",
    git: "·",
  };
</script>

{#if lines.length > 0}
  <div
    class="border-t border-border bg-background/80 backdrop-blur px-3 md:px-4 py-2 max-h-40 overflow-y-auto"
    aria-live="polite"
  >
    <ol class="space-y-1">
      {#each lines as line, i (line.id)}
        <li
          class="devin-stream-line flex items-start gap-2"
          class:is-live={i === lines.length - 1 && $isSending}
        >
          <span class="devin-mono shrink-0 w-3 text-foreground-secondary select-none">
            {glyph[line.kind] || "·"}
          </span>
          <span class="min-w-0 flex-1">
            <span class="truncate block">{line.text}</span>
            {#if line.sub}
              <span class="devin-mono block text-foreground-secondary truncate">{line.sub}</span>
            {/if}
          </span>
        </li>
      {/each}
    </ol>
  </div>
{/if}

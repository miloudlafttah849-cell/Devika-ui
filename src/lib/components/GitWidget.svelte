<script>
  import { onMount, onDestroy } from "svelte";
  import { fetchGitStatus } from "$lib/api";
  import { gitEvents, gitStatus, selectedProject, agentState } from "$lib/store";
  import { Icons } from "$lib/icons";

  let pollHandle = null;
  // Generation counter prevents stale fetches (older project / older interval
  // tick) from clobbering newer ones. We only commit a response if its
  // generation matches both the latest fetch AND the still-current project.
  let gen = 0;

  async function refresh() {
    const myGen = ++gen;
    const project = $selectedProject;
    const data = await fetchGitStatus(project);
    if (myGen !== gen) return;          // a newer refresh has fired
    if (project !== $selectedProject) return; // project changed mid-flight
    gitStatus.set(data);
  }

  onMount(() => {
    // Re-poll every 5s while this tab is mounted; cheap.
    pollHandle = setInterval(refresh, 5000);
  });
  onDestroy(() => {
    if (pollHandle) clearInterval(pollHandle);
  });

  // Refresh when project changes or agent finishes a step. The reactive
  // statement also covers initial mount, so no separate onMount fetch.
  $: $selectedProject, refresh();
  $: $agentState, refresh();

  function fmtTs(ts) {
    return new Date(ts).toLocaleTimeString();
  }

  function clearLog() {
    gitEvents.set([]);
  }

  $: status = $gitStatus;
  $: isRepo = status?.is_repo === true;
  $: tokenSet = status?.github_token_set === true;
</script>

<div class="flex flex-col h-full min-h-0 bg-background rounded-lg border border-border overflow-hidden">
  <header class="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-secondary/40">
    <div class="flex items-center gap-2 min-w-0">
      <span class="size-4 [&_svg]:size-4 text-foreground">{@html Icons.GitBranch}</span>
      <span class="text-sm font-medium truncate">Git</span>
      {#if isRepo && status.full_name}
        <span class="text-xs text-tertiary truncate">· {status.full_name}</span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      {#if !tokenSet}
        <span class="text-[10px] uppercase tracking-wide text-amber-500" title="GITHUB_TOKEN env var is not set on the backend Space">
          no token
        </span>
      {/if}
      <button
        type="button"
        class="text-xs text-tertiary hover:text-foreground"
        on:click={refresh}
      >Refresh</button>
    </div>
  </header>

  <div class="flex-1 min-h-0 overflow-auto p-3 text-sm space-y-3">
    {#if !isRepo}
      <div class="text-tertiary text-xs leading-relaxed">
        {#if !$selectedProject || $selectedProject === "select project"}
          Select a project to see git status here.
        {:else if status?.reason}
          Project workspace is not a git repo yet.
          <span class="block mt-1">Ask Devika to clone a GitHub URL to populate this tab. Example:
            <code class="block mt-1 rounded bg-secondary/60 px-2 py-1 text-[11px]">
              Clone https://github.com/&lt;owner&gt;/&lt;repo&gt; and add a README section.
            </code>
          </span>
        {:else}
          Loading…
        {/if}
      </div>
    {:else}
      <section>
        <div class="text-xs uppercase tracking-wide text-tertiary mb-1">Branch</div>
        <div class="font-mono text-xs">
          {status.status?.branch || "?"}
          {#if status.status?.is_dirty}
            <span class="ml-2 inline-flex items-center rounded bg-amber-500/10 text-amber-500 px-1.5 py-0.5 text-[10px]">dirty</span>
          {/if}
        </div>
      </section>

      {#if status.status?.modified?.length || status.status?.untracked?.length || status.status?.staged?.length}
        <section>
          <div class="text-xs uppercase tracking-wide text-tertiary mb-1">Changes</div>
          <ul class="font-mono text-[11px] space-y-0.5">
            {#each status.status.staged || [] as f}
              <li><span class="text-emerald-500">staged</span> {f}</li>
            {/each}
            {#each status.status.modified || [] as f}
              <li><span class="text-amber-500">modified</span> {f}</li>
            {/each}
            {#each status.status.untracked || [] as f}
              <li><span class="text-blue-400">new</span> {f}</li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if status.recent_commits?.length}
        <section>
          <div class="text-xs uppercase tracking-wide text-tertiary mb-1">Recent commits</div>
          <ul class="text-[11px] space-y-1">
            {#each status.recent_commits as c}
              <li class="flex gap-2 min-w-0">
                <code class="text-tertiary shrink-0">{c.sha}</code>
                <span class="truncate">{c.message}</span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    {/if}

    {#if $gitEvents.length}
      <section>
        <div class="flex items-center justify-between mb-1">
          <div class="text-xs uppercase tracking-wide text-tertiary">Activity</div>
          <button class="text-[10px] text-tertiary hover:text-foreground" on:click={clearLog}>clear</button>
        </div>
        <ul class="font-mono text-[11px] space-y-0.5 max-h-40 overflow-auto">
          {#each $gitEvents as e}
            <li class="flex gap-2 min-w-0">
              <span class="text-tertiary shrink-0">{fmtTs(e.ts)}</span>
              <span class="text-foreground">{e.event}</span>
              <span class="text-tertiary truncate">
                {#if e.url}{e.url}{:else if e.dest}{e.dest}{:else if e.branch}{e.branch}{:else if e.error}{e.error}{:else}{""}{/if}
              </span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</div>

<script>
  import { onDestroy, onMount } from "svelte";
  import {
    projectList,
    modelList,
    internet,
    tokenUsage,
    agentState,
    messages,
    searchEngineList,
    serverStatus,
    isSending,
    selectedProject,
    selectedModel,
    selectedSearchEngine,
    sidebarOpen,
  } from "$lib/store";
  import {
    createProject,
    fetchMessages,
    fetchInitialData,
    deleteProject,
    fetchProjectFiles,
    fetchAgentState,
  } from "$lib/api";
  import { Icons } from "$lib/icons";

  // Dropdown open state — only one open at a time.
  let openDropdown = null; // 'project' | 'model' | 'search' | null

  function toggle(name) {
    openDropdown = openDropdown === name ? null : name;
  }
  function close() {
    openDropdown = null;
  }

  function selectProject(project) {
    $selectedProject = project;
    fetchMessages();
    fetchAgentState();
    fetchProjectFiles();
    close();
  }
  function selectModel(model) {
    $selectedModel = model;
    close();
  }
  function selectSearchEngine(engine) {
    $selectedSearchEngine = engine;
    close();
  }

  async function createNewProject() {
    const projectName = prompt("Enter the project name:");
    if (projectName) {
      await createProject(projectName);
      selectProject(projectName);
      tokenUsage.set(0);
      messages.set([]);
      agentState.set(null);
      isSending.set(false);
    }
  }
  async function deleteproject(project) {
    if (confirm(`Are you sure you want to delete ${project}?`)) {
      await deleteProject(project);
      await fetchInitialData();
      messages.set([]);
      agentState.set(null);
      tokenUsage.set(0);
      isSending.set(false);
      $selectedProject = "Select Project";
      localStorage.setItem("selectedProject", "");
    }
  }

  function handleOutsideClick(e) {
    if (!e.target.closest("[data-cp-dropdown]")) close();
  }

  // Subscribe to serverStatus so we kick off the initial fetch the moment the
  // parent +page.svelte confirms the backend is reachable. Doing this in
  // onMount with a one-shot `if ($serverStatus)` check races with the parent's
  // async checkServerStatus() and the dropdowns end up empty on first paint.
  let dataLoaded = false;
  const unsubServer = serverStatus.subscribe(async (online) => {
    if (online && !dataLoaded) {
      dataLoaded = true;
      try {
        await fetchInitialData();
      } catch (e) {
        console.error("fetchInitialData failed:", e);
      }
    }
  });

  // After modelList loads, drop any stale localStorage selection that no
  // longer matches a current provider/model id. Otherwise the agent will
  // crash server-side with "Model X not supported" the moment the user
  // sends a message (e.g. after Groq decommissions an old llama model).
  $: if ($modelList && Object.keys($modelList).length > 0) {
    const validIds = Object.values($modelList)
      .flat()
      .map((m) => (Array.isArray(m) ? m[0] : m));
    if ($selectedModel && $selectedModel !== "select model" && !validIds.includes($selectedModel)) {
      console.warn(`Stale selectedModel "${$selectedModel}" not in current modelList; clearing.`);
      $selectedModel = "select model";
    }
  }

  onMount(() => {
    document.addEventListener("click", handleOutsideClick);
  });
  onDestroy(() => {
    document.removeEventListener("click", handleOutsideClick);
    unsubServer();
  });
</script>

<header
  class="flex items-center justify-between gap-2 border-b border-border bg-background px-2 py-2 md:px-4 md:py-3"
>
  <!-- Left cluster: hamburger (mobile) + project picker -->
  <div class="flex items-center gap-2 min-w-0">
    <!-- Mobile hamburger -->
    <button
      type="button"
      aria-label="Open menu"
      class="lg:hidden flex size-9 items-center justify-center rounded-md text-foreground hover:bg-secondary [&_svg]:size-5"
      on:click={() => sidebarOpen.set(true)}
    >
      {@html Icons.Menu}
    </button>

    <!-- Project picker -->
    <div class="relative min-w-0" data-cp-dropdown>
      <button
        type="button"
        class="flex items-center gap-2 rounded-md bg-secondary px-3 h-9 text-sm text-foreground hover:bg-secondary/80 max-w-[60vw] sm:max-w-none"
        aria-expanded={openDropdown === "project"}
        on:click|stopPropagation={() => toggle("project")}
      >
        <span class="truncate font-medium">{$selectedProject || "Select project"}</span>
        <span class="text-tertiary [&_svg]:size-4">{@html Icons.ChevronDown}</span>
      </button>
      {#if openDropdown === "project"}
        <div
          class="absolute left-0 top-full z-30 mt-1 min-w-[220px] max-h-80 overflow-y-auto rounded-lg border border-border bg-secondary shadow-lg"
          role="menu"
        >
          <button
            class="flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-sm hover:bg-black/10"
            on:click|stopPropagation={createNewProject}
          >
            <span class="[&_svg]:size-4">{@html Icons.Plus}</span>
            New project
          </button>
          {#if $projectList && $projectList.length}
            {#each $projectList as project}
              <div class="flex items-center gap-2 px-3 hover:bg-black/10">
                <button
                  class="flex-1 truncate py-2.5 text-left text-sm"
                  on:click|stopPropagation={() => selectProject(project)}
                >
                  {project}
                </button>
                <button
                  class="text-tertiary hover:text-red-500 [&_svg]:size-4"
                  aria-label="Delete project {project}"
                  on:click|stopPropagation={() => deleteproject(project)}
                >
                  {@html Icons.Trash}
                </button>
              </div>
            {/each}
          {:else}
            <p class="px-3 py-2.5 text-xs text-tertiary">No projects yet</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Right cluster: status + selectors. Hidden on mobile (collapses into ⋮ menu). -->
  <div class="hidden md:flex items-center gap-3">
    <!-- Internet indicator -->
    <div class="flex items-center gap-1.5 text-xs text-tertiary">
      <span
        class="size-2 rounded-full"
        class:online={$internet}
        class:offline={!$internet}
      ></span>
      <span>{$internet ? "Online" : "Offline"}</span>
    </div>
    <!-- Token usage -->
    <div class="text-xs text-tertiary">
      Tokens: <span class="text-foreground font-medium">{$tokenUsage}</span>
    </div>

    <!-- Search engine selector -->
    <div class="relative" data-cp-dropdown>
      <button
        type="button"
        class="flex items-center gap-2 rounded-md bg-secondary px-3 h-9 text-sm text-foreground hover:bg-secondary/80"
        aria-expanded={openDropdown === "search"}
        on:click|stopPropagation={() => toggle("search")}
      >
        <span class="truncate">{$selectedSearchEngine || "Search engine"}</span>
        <span class="text-tertiary [&_svg]:size-4">{@html Icons.ChevronDown}</span>
      </button>
      {#if openDropdown === "search"}
        <div
          class="absolute right-0 top-full z-30 mt-1 min-w-[200px] rounded-lg border border-border bg-secondary shadow-lg"
          role="menu"
        >
          {#if $searchEngineList && $searchEngineList.length}
            {#each $searchEngineList as engine}
              <button
                class="flex w-full items-center px-3 py-2.5 text-sm hover:bg-black/10"
                class:bg-black-10={$selectedSearchEngine === engine}
                on:click|stopPropagation={() => selectSearchEngine(engine)}
              >
                {engine}
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <!-- Model selector -->
    <div class="relative" data-cp-dropdown>
      <button
        type="button"
        class="flex items-center gap-2 rounded-md bg-secondary px-3 h-9 text-sm text-foreground hover:bg-secondary/80 max-w-[180px]"
        aria-expanded={openDropdown === "model"}
        on:click|stopPropagation={() => toggle("model")}
      >
        <span class="truncate">{$selectedModel || "Select model"}</span>
        <span class="text-tertiary [&_svg]:size-4">{@html Icons.ChevronDown}</span>
      </button>
      {#if openDropdown === "model"}
        <div
          class="absolute right-0 top-full z-30 mt-1 w-72 max-h-96 overflow-y-auto rounded-lg border border-border bg-secondary shadow-lg"
          role="menu"
        >
          {#if !$modelList || Object.keys($modelList).length === 0}
            <p class="px-3 py-3 text-xs text-tertiary">
              {$serverStatus ? "Loading models…" : "Connecting to server…"}
            </p>
          {:else}
            {#each Object.entries($modelList) as [providerName, providerModels]}
              {#if providerModels && providerModels.length}
                <div class="border-b border-border last:border-b-0">
                  <div class="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-tertiary">
                    {providerName.toLowerCase()}
                  </div>
                  {#each providerModels as model}
                    <button
                      class="flex w-full flex-col items-start px-3 py-2 text-sm hover:bg-black/10"
                      class:bg-black-10={$selectedModel === model[0]}
                      on:click|stopPropagation={() => selectModel(model[0])}
                    >
                      <span class="font-medium">{model[0]}</span>
                      <span class="text-[11px] text-tertiary truncate w-full text-left">{model[1]}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Mobile right cluster: just internet + model in a compact menu -->
  <div class="flex md:hidden items-center gap-2" data-cp-dropdown>
    <div class="flex items-center gap-1 text-xs text-tertiary">
      <span
        class="size-2 rounded-full"
        class:online={$internet}
        class:offline={!$internet}
      ></span>
    </div>
    <button
      type="button"
      class="flex items-center gap-1 rounded-md bg-secondary px-2 h-9 text-xs text-foreground hover:bg-secondary/80 max-w-[40vw]"
      aria-expanded={openDropdown === "model"}
      on:click|stopPropagation={() => toggle("model")}
    >
      <span class="truncate">{$selectedModel || "Model"}</span>
      <span class="text-tertiary [&_svg]:size-3">{@html Icons.ChevronDown}</span>
    </button>
    {#if openDropdown === "model"}
      <div
        class="fixed left-2 right-2 top-14 z-30 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-secondary shadow-lg md:hidden"
        role="menu"
      >
        {#if !$modelList || Object.keys($modelList).length === 0}
          <p class="px-3 py-3 text-xs text-tertiary">
            {$serverStatus ? "Loading models…" : "Connecting to server…"}
          </p>
        {:else}
          {#each Object.entries($modelList) as [providerName, providerModels]}
            {#if providerModels && providerModels.length}
              <div class="border-b border-border last:border-b-0">
                <div class="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-tertiary">
                  {providerName.toLowerCase()}
                </div>
                {#each providerModels as model}
                  <button
                    class="flex w-full flex-col items-start px-3 py-2 text-sm hover:bg-black/10"
                    on:click|stopPropagation={() => selectModel(model[0])}
                  >
                    <span class="font-medium">{model[0]}</span>
                    <span class="text-[11px] text-tertiary truncate w-full text-left">{model[1]}</span>
                  </button>
                {/each}
              </div>
            {/if}
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</header>


<style>
  .online {
    background-color: #22c55e;
  }
  .offline {
    background-color: #ef4444;
  }
  .bg-black-10 {
    background-color: rgba(0, 0, 0, 0.1);
  }
</style>

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
  // parent +page.svelte confirms the backend is reachable.
  let dataLoaded = false;
  const unsubServer = serverStatus.subscribe(async (online) => {
    if (online && !dataLoaded) {
      dataLoaded = true;
      try {
        await fetchInitialData();
      } catch (e) {
        dataLoaded = false;
        console.error("fetchInitialData failed:", e);
      }
    }
  });

  // Drop stale localStorage selection that no longer matches a current model id.
  $: if ($modelList && Object.keys($modelList).length > 0) {
    const validIds = Object.values($modelList)
      .flat()
      .map((m) => (Array.isArray(m) ? m[0] : m));
    if ($selectedModel && $selectedModel !== "select model" && !validIds.includes($selectedModel)) {
      console.warn(`Stale selectedModel "${$selectedModel}" not in current modelList; clearing.`);
      $selectedModel = "select model";
    }
  }

  // Pretty-print: lower-case sentinels look ugly in the trigger.
  function display(value, fallback) {
    if (!value) return fallback;
    if (typeof value === "string" && value.toLowerCase().startsWith("select ")) return fallback;
    return value;
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
  class="flex items-center justify-between gap-2 border-b border-border bg-background px-2 py-2 md:px-4 md:py-2.5"
>
  <!-- Left cluster: hamburger (mobile) + project picker -->
  <div class="flex items-center gap-1 min-w-0">
    <!-- Mobile hamburger -->
    <button
      type="button"
      aria-label="Open menu"
      class="lg:hidden flex size-9 items-center justify-center rounded-md text-foreground-light hover:text-foreground hover:bg-secondary [&_svg]:size-5"
      on:click={() => sidebarOpen.set(true)}
    >
      {@html Icons.Menu}
    </button>

    <!-- Project picker -->
    <div class="relative min-w-0" data-cp-dropdown>
      <button
        type="button"
        class="devin-trigger truncate max-w-[58vw] sm:max-w-[40vw]"
        aria-expanded={openDropdown === "project"}
        on:click|stopPropagation={() => toggle("project")}
      >
        <span class="truncate">{display($selectedProject, "Project")}</span>
      </button>
      {#if openDropdown === "project"}
        <div
          class="devin-menu absolute left-0 top-full z-30 mt-1 min-w-[240px] max-h-80 overflow-y-auto"
          role="menu"
        >
          <button
            class="devin-menu-row border-b border-border"
            on:click|stopPropagation={createNewProject}
          >
            <span class="[&_svg]:size-3.5 text-foreground-secondary">{@html Icons.Plus}</span>
            <span>New project</span>
          </button>
          {#if $projectList && $projectList.length}
            {#each $projectList as project}
              <div
                class="devin-menu-row group"
                class:is-selected={$selectedProject === project}
              >
                <button
                  class="flex-1 truncate text-left"
                  on:click|stopPropagation={() => selectProject(project)}
                >
                  {project}
                </button>
                <button
                  class="opacity-0 group-hover:opacity-100 text-foreground-secondary hover:text-red-400 [&_svg]:size-3.5 transition-opacity"
                  aria-label="Delete project {project}"
                  on:click|stopPropagation={() => deleteproject(project)}
                >
                  {@html Icons.Trash}
                </button>
              </div>
            {/each}
          {:else}
            <p class="px-3 py-2.5 text-xs text-foreground-secondary">No projects yet</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Right cluster: status + selectors. Hidden on mobile (collapses into compact bar). -->
  <div class="hidden md:flex items-center gap-1">
    <!-- Internet indicator (text-only, no chip) -->
    <div class="flex items-center gap-1.5 text-xs text-foreground-secondary px-2">
      <span
        class="size-1.5 rounded-full"
        class:online={$internet}
        class:offline={!$internet}
      ></span>
      <span>{$internet ? "online" : "offline"}</span>
    </div>
    <!-- Token usage -->
    <div class="text-xs text-foreground-secondary px-2 tabular-nums">
      <span class="text-foreground-light">{$tokenUsage}</span> tokens
    </div>

    <!-- Search engine selector -->
    <div class="relative" data-cp-dropdown>
      <button
        type="button"
        class="devin-trigger"
        aria-expanded={openDropdown === "search"}
        on:click|stopPropagation={() => toggle("search")}
      >
        <span class="truncate">{display($selectedSearchEngine, "Search engine")}</span>
      </button>
      {#if openDropdown === "search"}
        <div
          class="devin-menu absolute right-0 top-full z-30 mt-1 min-w-[200px]"
          role="menu"
        >
          {#if $searchEngineList && $searchEngineList.length}
            {#each $searchEngineList as engine}
              <button
                class="devin-menu-row"
                class:is-selected={$selectedSearchEngine === engine}
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
        class="devin-trigger truncate max-w-[200px]"
        aria-expanded={openDropdown === "model"}
        on:click|stopPropagation={() => toggle("model")}
      >
        <span class="truncate">{display($selectedModel, "Model")}</span>
      </button>
      {#if openDropdown === "model"}
        <div
          class="devin-menu absolute right-0 top-full z-30 mt-1 w-72 max-h-96 overflow-y-auto"
          role="menu"
        >
          {#if !$modelList || Object.keys($modelList).length === 0}
            <p class="px-3 py-3 text-xs text-foreground-secondary">
              {$serverStatus ? "Loading models…" : "Connecting to server…"}
            </p>
          {:else}
            {#each Object.entries($modelList) as [providerName, providerModels]}
              {#if providerModels && providerModels.length}
                <div class="border-b border-border last:border-b-0">
                  <div class="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground-secondary">
                    {providerName.toLowerCase()}
                  </div>
                  {#each providerModels as model}
                    <button
                      class="devin-menu-row flex-col items-start"
                      class:is-selected={$selectedModel === model[0]}
                      on:click|stopPropagation={() => selectModel(model[0])}
                    >
                      <span class="text-foreground">{model[0]}</span>
                      <span class="text-[11px] text-foreground-secondary truncate w-full text-left devin-mono">{model[1]}</span>
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

  <!-- Mobile right cluster: internet + search engine + model (compact) -->
  <div class="flex md:hidden items-center gap-0.5">
    <div class="flex items-center gap-1 text-xs text-foreground-secondary px-1">
      <span
        class="size-1.5 rounded-full"
        class:online={$internet}
        class:offline={!$internet}
      ></span>
    </div>

    <!-- Mobile search engine selector -->
    <div class="relative" data-cp-dropdown>
      <button
        type="button"
        class="devin-trigger truncate max-w-[28vw] text-xs"
        aria-expanded={openDropdown === "search"}
        on:click|stopPropagation={() => toggle("search")}
      >
        <span class="truncate">{display($selectedSearchEngine, "Search")}</span>
      </button>
      {#if openDropdown === "search"}
        <div
          class="devin-menu fixed left-2 right-2 top-14 z-30 max-h-[70vh] overflow-y-auto md:hidden"
          role="menu"
        >
          {#if !$searchEngineList || $searchEngineList.length === 0}
            <p class="px-3 py-3 text-xs text-foreground-secondary">
              {$serverStatus ? "Loading search engines…" : "Connecting to server…"}
            </p>
          {:else}
            {#each $searchEngineList as engine}
              <button
                class="devin-menu-row"
                class:is-selected={$selectedSearchEngine === engine}
                on:click|stopPropagation={() => selectSearchEngine(engine)}
              >
                {engine}
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <!-- Mobile model selector -->
    <div class="relative" data-cp-dropdown>
      <button
        type="button"
        class="devin-trigger truncate max-w-[40vw] text-xs"
        aria-expanded={openDropdown === "model"}
        on:click|stopPropagation={() => toggle("model")}
      >
        <span class="truncate">{display($selectedModel, "Model")}</span>
      </button>
      {#if openDropdown === "model"}
        <div
          class="devin-menu fixed left-2 right-2 top-14 z-30 max-h-[70vh] overflow-y-auto md:hidden"
          role="menu"
        >
          {#if !$modelList || Object.keys($modelList).length === 0}
            <p class="px-3 py-3 text-xs text-foreground-secondary">
              {$serverStatus ? "Loading models…" : "Connecting to server…"}
            </p>
          {:else}
            {#each Object.entries($modelList) as [providerName, providerModels]}
              {#if providerModels && providerModels.length}
                <div class="border-b border-border last:border-b-0">
                  <div class="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground-secondary">
                    {providerName.toLowerCase()}
                  </div>
                  {#each providerModels as model}
                    <button
                      class="devin-menu-row flex-col items-start"
                      class:is-selected={$selectedModel === model[0]}
                      on:click|stopPropagation={() => selectModel(model[0])}
                    >
                      <span class="text-foreground">{model[0]}</span>
                      <span class="text-[11px] text-foreground-secondary truncate w-full text-left devin-mono">{model[1]}</span>
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
</header>


<style>
  .online {
    background-color: #22c55e;
  }
  .offline {
    background-color: #ef4444;
  }
</style>

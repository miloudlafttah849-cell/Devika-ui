<script>
  import { Icons } from "$lib/icons";
  import { panesVisible, activePane, isDesktop } from "$lib/store";

  // Tabs: messages | browser | terminal | editor.
  // On desktop, multiple panes can be open at once (toggle = checkbox).
  // On mobile, only one is shown at a time (toggle = radio + activePane).
  const tabs = [
    { id: "messages", label: "Chat", icon: Icons.MessageSquare },
    { id: "browser", label: "Browser", icon: Icons.Globe },
    { id: "terminal", label: "Terminal", icon: Icons.Terminal },
    { id: "editor", label: "Editor", icon: Icons.Code },
    { id: "git", label: "Git", icon: Icons.GitBranch },
  ];

  function handleClick(id) {
    if ($isDesktop) {
      $panesVisible = { ...$panesVisible, [id]: !$panesVisible[id] };
    } else {
      $activePane = id;
    }
  }

  $: isOn = (id) => ($isDesktop ? $panesVisible[id] : $activePane === id);
</script>

<nav
  aria-label="Pane visibility"
  class="flex items-center justify-around gap-1 px-2 py-1 border-t border-border bg-background"
>
  {#each tabs as { id, label, icon }}
    <button
      type="button"
      role={$isDesktop ? "switch" : "tab"}
      aria-checked={$isDesktop ? isOn(id) : undefined}
      aria-selected={!$isDesktop ? isOn(id) : undefined}
      aria-label={label}
      class="flex flex-1 flex-col items-center gap-0.5 rounded-md px-2 py-2 text-xs font-medium transition-colors
        {isOn(id)
          ? 'bg-secondary text-foreground'
          : 'text-tertiary hover:bg-secondary/60 hover:text-foreground'}"
      on:click={() => handleClick(id)}
    >
      <span class="size-5 [&_svg]:size-5">{@html icon}</span>
      <span class="hidden sm:inline">{label}</span>
    </button>
  {/each}
</nav>

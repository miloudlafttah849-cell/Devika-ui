<script>
  import { onDestroy, onMount } from "svelte";
  import { toast } from "svelte-sonner";

  import ControlPanel from "$lib/components/ControlPanel.svelte";
  import MessageContainer from "$lib/components/MessageContainer.svelte";
  import MessageInput from "$lib/components/MessageInput.svelte";
  import BrowserWidget from "$lib/components/BrowserWidget.svelte";
  import TerminalWidget from "$lib/components/TerminalWidget.svelte";
  import EditorWidget from "$lib/components/EditorWidget.svelte";
  import PaneToggle from "$lib/components/PaneToggle.svelte";

  import { serverStatus, panesVisible, activePane, isDesktop } from "$lib/store";
  import { initializeSockets, destroySockets } from "$lib/sockets";
  import { checkInternetStatus, checkServerStatus } from "$lib/api";

  onMount(() => {
    const load = async () => {
      await checkInternetStatus();

      if (!(await checkServerStatus())) {
        toast.error("Failed to connect to server");
        return;
      }
      serverStatus.set(true);
      await initializeSockets();
    };
    load();
  });
  onDestroy(() => {
    destroySockets();
  });

  // What panes to render right now? On mobile, exactly one (whatever
  // activePane points at). On desktop, anything user has toggled on.
  $: showMessages = $isDesktop ? $panesVisible.messages : $activePane === "messages";
  $: showBrowser = $isDesktop ? $panesVisible.browser : $activePane === "browser";
  $: showTerminal = $isDesktop ? $panesVisible.terminal : $activePane === "terminal";
  $: showEditor = $isDesktop ? $panesVisible.editor : $activePane === "editor";

  // Count non-messages right-side panes for desktop split sizing.
  $: rightPaneCount = [showBrowser, showTerminal, showEditor].filter(Boolean).length;
  $: hasRightSide = $isDesktop && rightPaneCount > 0;
</script>

<div class="flex h-full flex-1 flex-col overflow-hidden">
  <!-- Top control bar (sticky, responsive). Renders project picker, model
       selector, status indicators. On mobile it collapses into a compact bar
       with a menu button. -->
  <ControlPanel />

  <!-- Main pane area. Grows to fill space; each pane scrolls internally. -->
  <main class="flex flex-1 min-h-0 overflow-hidden gap-2 p-2 md:p-3">
    <!-- Messages pane (left on desktop, full-width on mobile when active) -->
    {#if showMessages}
      <section
        class="flex flex-col min-w-0 min-h-0 flex-1 rounded-lg bg-background"
        class:lg:flex-1={hasRightSide}
        aria-label="Messages"
      >
        <MessageContainer />
      </section>
    {/if}

    <!-- Right side: browser / terminal / editor stack on desktop -->
    {#if hasRightSide || (!$isDesktop && (showBrowser || showTerminal || showEditor))}
      <section
        class="flex flex-col min-w-0 min-h-0 flex-1 gap-2 overflow-hidden"
        aria-label="Workspace"
      >
        {#if showBrowser}
          <div class="flex-1 min-h-0 overflow-hidden">
            <BrowserWidget />
          </div>
        {/if}
        {#if showTerminal}
          <div class="flex-1 min-h-0 overflow-hidden">
            <TerminalWidget />
          </div>
        {/if}
        {#if showEditor}
          <div class="flex-1 min-h-0 overflow-hidden">
            <EditorWidget />
          </div>
        {/if}
      </section>
    {/if}
  </main>

  <!-- Pane toggle strip — sits above the message input, full-width. -->
  <PaneToggle />

  <!-- Full-width sticky message input at bottom. -->
  <MessageInput />
</div>

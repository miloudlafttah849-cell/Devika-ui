<script>
  import { onDestroy, onMount } from "svelte";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import { Toaster } from "$lib/components/ui/sonner";
  import { ModeWatcher } from "mode-watcher";
  import { isDesktop, panesVisible, sidebarOpen } from "$lib/store";
  import "../app.pcss";

  let mq;
  function syncDesktop(e) {
    isDesktop.set(e.matches);
    // When switching to desktop, force messages + browser visible by default.
    // Preserve any user-set state for terminal/editor (they're off by default).
    if (e.matches) {
      panesVisible.update((p) => ({
        ...p,
        messages: true,
        browser: true,
      }));
    }
  }

  onMount(() => {
    mq = window.matchMedia("(min-width: 1024px)");
    syncDesktop(mq);
    mq.addEventListener("change", syncDesktop);
  });

  onDestroy(() => {
    mq?.removeEventListener("change", syncDesktop);
  });
</script>

<main class="h-dvh w-full overflow-hidden">
  <Toaster richColors />
  <!-- Default to dark so first paint matches the new Devin-style theme,
       but keep the existing Settings → Appearance → Theme selector working
       (it toggles `.dark` on <html> via mode-watcher). -->
  <ModeWatcher defaultMode="dark" />

  <div class="flex h-full w-full">
    <!-- Sidebar: hidden on mobile (<lg), shown as a slim rail on desktop.
         On mobile, the ControlPanel exposes a hamburger that flips
         sidebarOpen to render an overlay version. -->
    <div class="hidden lg:flex">
      <Sidebar />
    </div>

    <!-- Mobile sidebar overlay -->
    {#if $sidebarOpen}
      <div
        class="fixed inset-0 z-40 bg-black/40 lg:hidden"
        on:click={() => sidebarOpen.set(false)}
        on:keydown={(e) => e.key === "Escape" && sidebarOpen.set(false)}
        role="button"
        tabindex="0"
        aria-label="Close menu"
      ></div>
      <div
        class="fixed inset-y-0 left-0 z-50 flex lg:hidden"
        role="dialog"
        aria-label="Navigation"
      >
        <Sidebar onNavigate={() => sidebarOpen.set(false)} />
      </div>
    {/if}

    <!-- Main content slot -->
    <div class="flex h-full min-w-0 flex-1 flex-col">
      <slot />
    </div>
  </div>
</main>

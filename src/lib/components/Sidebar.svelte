<script>
  import SidebarButton from "./ui/SidebarButton.svelte";
  import { page } from "$app/stores";
  import { Icons } from "$lib/icons";

  export let onNavigate = () => {};

  const navItems = [
    { icon: Icons.HOME, tooltip: "Home", route: "/" },
    { icon: Icons.SETTINGS, tooltip: "Settings", route: "/settings" },
    { icon: Icons.LOGS, tooltip: "Logs", route: "/logs" },
  ];
</script>

<nav
  class="flex h-full flex-col gap-6 items-center bg-secondary p-4 lg:my-4 lg:mx-2 lg:rounded-xl lg:p-6 text-tertiary"
  aria-label="Primary navigation"
>
  {#each navItems as { icon, tooltip, route }}
    <SidebarButton
      {icon}
      href={route}
      {tooltip}
      isSelected={$page.url.pathname == route}
      on:click={onNavigate}
    />
  {/each}
</nav>

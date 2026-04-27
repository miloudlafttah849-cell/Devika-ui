<script>
  import { messages } from "$lib/store";
  import { afterUpdate } from "svelte";

  let messageContainer;

  afterUpdate(() => {
    if ($messages && $messages.length > 0 && messageContainer) {
      messageContainer.scrollTo({
        top: messageContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  });

  function fmtTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Safe JSON parse — return null on failure so the renderer can fall back
  // to plain-text instead of crashing the entire message list. The backend
  // sometimes streams partial JSON or a message that just happens to start
  // with `{`.
  function tryParseJSON(s) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
</script>

<div
  id="message-container"
  class="flex flex-col flex-1 gap-0 overflow-y-auto"
  bind:this={messageContainer}
>
  {#if $messages !== null}
    <div class="flex flex-col">
      {#each $messages as message (message)}
        <article
          class="px-3 md:px-6 py-4 md:py-5"
          class:bg-secondary={message.from_devika}
        >
          <header class="flex items-center gap-2 mb-1.5 text-[11px] text-foreground-secondary">
            <span class="font-medium text-foreground-light">
              {message.from_devika ? "Devika" : "You"}
            </span>
            <span class="opacity-60">·</span>
            <span class="tabular-nums">{fmtTime(message.timestamp)}</span>
          </header>

          <div class="text-sm leading-relaxed text-foreground">
            {#if message.from_devika && message.message.startsWith("{") && tryParseJSON(message.message)}
              <!-- Plan render: numbered checklist. -->
              <div class="flex flex-col gap-3" contenteditable="false">
                <strong class="text-foreground-light">Step-by-step plan</strong>
                <ol class="flex flex-col gap-2 list-none">
                  {#each Object.entries(tryParseJSON(message.message)) as [step, description]}
                    <li class="flex items-start gap-2">
                      <span class="devin-mono text-foreground-secondary shrink-0 pt-0.5">
                        {String(step).padStart(2, "0")}
                      </span>
                      <span>{description}</span>
                    </li>
                  {/each}
                </ol>
              </div>
            {:else if /https?:\/\/[^\s]+/.test(message.message)}
              <div class="prose-devin" contenteditable="false">
                {@html message.message.replace(
                  /(https?:\/\/[^\s]+)/g,
                  '<a class="underline hover:text-foreground-light" href="$1" target="_blank" rel="noopener">$1</a>'
                )}
              </div>
            {:else}
              <div
                class="prose-devin whitespace-pre-wrap"
                contenteditable="false"
                bind:innerHTML={message.message}
              ></div>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* Hide native scrollbar inside the messages list — keeps the surface clean. */
  #message-container {
    scrollbar-width: none;
  }
  #message-container::-webkit-scrollbar {
    display: none;
  }

  /* Devin-style prose: tight inline code, light underline on links. */
  :global(.prose-devin code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.82em;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0 4px;
  }
  :global(.prose-devin a) {
    color: var(--foreground);
    text-decoration: underline;
    text-decoration-color: var(--border);
    text-underline-offset: 2px;
  }
  :global(.prose-devin a:hover) {
    text-decoration-color: var(--foreground-light);
  }
</style>

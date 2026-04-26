<script>
  import DOMPurify from "dompurify";
  import { emitMessage, socketListener } from "$lib/sockets";
  import { agentState, messages, isSending } from "$lib/store";
  import { calculateTokens } from "$lib/token";
  import { onMount } from "svelte";
  import { Icons } from "$lib/icons";

  let inference_time = 0;
  let messageInput = "";
  let tokenCount = 0;

  agentState.subscribe((value) => {
    if (value !== null && value.agent_is_active == false) {
      isSending.set(false);
    }
    if (value == null) {
      inference_time = 0;
    }
  });

  function escapeHTML(input) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return input.replace(/[&<>"']/g, (m) => map[m]);
  }

  async function handleSendMessage() {
    const projectName = localStorage.getItem("selectedProject");
    const selectedModel = localStorage.getItem("selectedModel");
    const searchEngine = localStorage.getItem("selectedSearchEngine");

    if (!projectName || projectName === "select project") {
      alert("Please select a project first!");
      return;
    }
    if (!selectedModel || selectedModel === "select model") {
      alert("Please select a model first!");
      return;
    }

    const sanitizedMessage = DOMPurify.sanitize(messageInput);
    const escapedMessage = escapeHTML(sanitizedMessage);

    if (messageInput.trim() !== "" && escapedMessage.trim() !== "") {
      $isSending = true;
      emitMessage("user-message", {
        message: escapedMessage,
        base_model: selectedModel,
        project_name: projectName,
        search_engine: searchEngine,
      });
      messageInput = "";
      tokenCount = 0;
    }
  }

  onMount(() => {
    socketListener("inference", (data) => {
      if (data["type"] == "time") {
        inference_time = data["elapsed_time"];
      }
    });
  });

  function setTokenSize(event) {
    tokenCount = calculateTokens(event.target.value);
  }
</script>

<div
  class="flex flex-col gap-1 border-t border-border bg-background px-2 py-2 md:px-4 md:py-3"
>
  <!-- Status row: agent state, inference time, token count -->
  <div class="flex items-center justify-between gap-2 text-[11px] text-tertiary px-1">
    <div>
      <span>Agent:</span>
      {#if $agentState !== null}
        {#if $agentState.agent_is_active}
          <span class="text-green-500 font-medium">Active</span>
        {:else}
          <span class="text-orange-500 font-medium">Inactive</span>
        {/if}
      {:else}
        <span>Idle</span>
      {/if}
    </div>
    <div class="flex items-center gap-3">
      <span>Inference: <span class="text-orange-500 font-medium">{inference_time}s</span></span>
      <span>Tokens: <span class="text-foreground font-medium">{tokenCount}</span></span>
    </div>
  </div>

  <!-- Full-width input + send button -->
  <div class="relative flex items-end w-full">
    <textarea
      id="message-input"
      class="w-full resize-none rounded-2xl border border-border bg-secondary px-4 py-3 pr-14 text-sm text-foreground placeholder:text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
        {$isSending ? 'cursor-not-allowed opacity-60' : ''}"
      placeholder="Type your message…"
      rows="1"
      disabled={$isSending}
      bind:value={messageInput}
      on:input={setTokenSize}
      on:keydown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
        }
      }}
    ></textarea>
    <button
      type="button"
      aria-label="Send message"
      on:click={handleSendMessage}
      disabled={$isSending || !messageInput.trim()}
      class="absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-full bg-primary text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span class="[&_svg]:size-4">{@html Icons.CornerDownLeft}</span>
    </button>
  </div>
</div>

<style>
  textarea {
    min-height: 48px;
    max-height: 200px;
    field-sizing: content;
  }
</style>

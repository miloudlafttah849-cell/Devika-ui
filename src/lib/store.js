import { writable } from 'svelte/store';

// Helper function to get item from localStorage
function getItemFromLocalStorage(key, defaultValue) {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
        return storedValue;
    }
    localStorage.setItem(key, defaultValue);
    return defaultValue;
}

// Helper function to handle subscription and local storage setting
function subscribeAndStore(store, key, defaultValue) {
    store.set(getItemFromLocalStorage(key, defaultValue));
    store.subscribe(value => {
        localStorage.setItem(key, value);
    });
}

// Server related stores
export const serverStatus = writable(false);
export const internet = writable(true);

// Message related stores
export const messages = writable([]);
export const projectFiles = writable(null);

// Selection related stores
export const selectedProject = writable('');
export const selectedModel = writable('');
export const selectedSearchEngine = writable('');

subscribeAndStore(selectedProject, 'selectedProject', 'select project');
subscribeAndStore(selectedModel, 'selectedModel', 'select model');
subscribeAndStore(selectedSearchEngine, 'selectedSearchEngine', 'select search engine');

// List related stores
export const projectList = writable([]);
export const modelList = writable({});
export const searchEngineList = writable([]);

// Agent related stores
export const agentState = writable(null);
export const isSending = writable(false);

// Token usage store
export const tokenUsage = writable(0);

// Layout / pane visibility (mobile-first responsive UI).
//
// - On mobile (<lg) only ONE pane is visible at a time — toggles act as radio.
// - On desktop (>=lg) any combination of panes can be visible — toggles act as checkbox.
// The `+page.svelte` layout is responsible for interpreting these flags
// according to viewport size; the store just tracks user intent.
export const panesVisible = writable({
    messages: true,
    browser: false,
    terminal: false,
    editor: false,
    git: false,
});

// On mobile, the currently-active single pane (one of: messages | browser | terminal | editor).
export const activePane = writable('messages');

// Reactive viewport flag. Starts `false` for SSR safety; +layout.svelte
// updates it on mount via matchMedia and a resize listener.
export const isDesktop = writable(false);

// Whether the mobile sidebar drawer is open.
export const sidebarOpen = writable(false);

// Git activity stream — populated by the backend's `git` socket.io events.
// Each entry: { event, ...payload, ts: number }. UI's Git tab renders the
// running log + uses /api/git-status for the static snapshot.
export const gitEvents = writable([]);
export const gitStatus = writable(null);

/* ============ Pin2Pin — Local AI Operations ============ */
const API = "/api";

const PROVIDER_MODELS = {
  openrouter: [
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-7b-instruct:free",
    "microsoft/phi-3-mini-128k-instruct:free",
    "deepseek-ai/deepseek-chat:free",
    "qwen/qwen2-7b-instruct:free",
    "nousresearch/hermes-4-405b",
  ],
  anthropic: ["claude-sonnet-4-5", "claude-3-7-sonnet-latest"],
  openai: ["gpt-4.1", "gpt-4.1-mini"],
  xai: ["grok-3", "grok-3-mini"],
  codex: ["gpt-5-codex"],
  groq: ["llama-3.1-8b-instant"],
  gemini: ["gemini-3.5-flash-lite"],
  mistral: ["mistral-small-latest", "mistral-large-latest", "open-mistral-nemo"],
  huggingface: ["meta-llama/Llama-3.1-8B-Instruct", "Qwen/Qwen2.5-7B-Instruct"],
  deepinfra: ["meta-llama/Meta-Llama-3.1-8B-Instruct", "Qwen/Qwen2.5-72B-Instruct"],
  nvidia: ["meta/llama-3.1-8b-instruct", "meta/llama-3.1-70b-instruct"],
  together: ["meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo"],
};

const PROVIDER_CONFIG = {
  openrouter: { label: "OpenRouter", site: "https://openrouter.ai/keys", mark: "OR" },
  anthropic: { label: "Claude (Anthropic)", site: "https://console.anthropic.com/settings/keys", mark: "A" },
  openai: { label: "OpenAI", site: "https://platform.openai.com/api-keys", mark: "AI" },
  xai: { label: "Grok (xAI)", site: "https://console.x.ai/", mark: "X" },
  codex: { label: "OpenAI Codex API", site: "https://platform.openai.com/api-keys", mark: "C" },
  groq: { label: "Groq", site: "https://console.groq.com/keys", mark: "G" },
  gemini: { label: "Google Gemini", site: "https://aistudio.google.com/app/apikey", mark: "G" },
  mistral: { label: "Mistral AI", site: "https://console.mistral.ai/api-keys/", mark: "M" },
  huggingface: { label: "Hugging Face", site: "https://huggingface.co/settings/tokens", mark: "HF" },
  deepinfra: { label: "DeepInfra", site: "https://deepinfra.com/dash/api_keys", mark: "DI" },
  nvidia: { label: "NVIDIA NIM", site: "https://build.nvidia.com/", mark: "N" },
  together: { label: "Together AI", site: "https://api.together.xyz/settings/api-keys", mark: "T" },
};

/* ------------------------------------------------------------------ */
/* Inline icon system                                                  */
/* ------------------------------------------------------------------ */

const ICONS = {
  dashboard: "M3 13h8V3H3zM13 21h8v-8h-8zM13 3v6h8V3zM3 21h8v-4H3z",
  team: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  tasks: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zM9 12h6M9 16h4",
  suggestions: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z",
  project: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z",
  resources: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  files: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5",
  reports: "M3 3v18h18M8 17v-6M13 17V7M18 17v-4",
  models: "M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM9 9h6v6H9z",
  config: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  plus: "M12 5v14M5 12h14",
  refresh: "M20 7v5h-5M4 17v-5h5M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2",
  pause: "M8 5v14M16 5v14",
  play: "m8 5 12 7-12 7z",
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.3-4.3",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5",
  send: "m22 2-7 20-4-9-9-4zM22 2 11 13",
  check: "m5 12 4 4L19 6",
  x: "M18 6 6 18M6 6l12 12",
  "chevron-left": "m15 18-6-6 6-6",
  "chevron-right": "m9 18 6-6-6-6",
  "chevron-down": "m6 9 6 6 6-6",
  "arrow-up-right": "M7 17 17 7M7 7h10v10",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  spark: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z",
  link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  mail: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM22 7l-10 7L2 7",
  key: "M21 2l-2 2M10.4 13.6a5.5 5.5 0 1 1-7.8-7.8 5.5 5.5 0 0 1 7.8 7.8zM15 9l-4.6 4.6M14 10l3 3M17 7l3 3",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4M12 15v2",
  bot: "M12 8V4H8M5 12h14a2 2 0 0 1 2 2v5H3v-5a2 2 0 0 1 2-2zM8 16h.01M16 16h.01M7 21h10",
  code: "m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  document: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6",
  image: "M3 3h18v18H3zM3 16l5-5 4 4 3-3 6 6M15 8h.01",
  video: "M3 5h13v14H3zM16 10l5-3v10l-5-3z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  filter: "M4 5h16M7 12h10M10 19h4",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 11v6M12 7h.01",
  warning: "M10.3 4.3 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01",
  flag: "M5 21V5M5 5c5-4 9 4 14 0v10c-5 4-9-4-14 0",
  minus: "M5 12h14",
};

function icon(name, size = 20) {
  const paths = ICONS[name] || ICONS.info;
  const dimension = Math.max(12, Math.min(72, Number(size) || 20));
  return `<svg class="icon-glyph" width="${dimension}" height="${dimension}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths}"/></svg>`;
}

function ensureIconSprite() {
  if (document.getElementById("iconMaskSprite")) return;
  const ns = "http://www.w3.org/2000/svg";
  const sprite = document.createElementNS(ns, "svg");
  sprite.id = "iconMaskSprite";
  sprite.setAttribute("width", "0");
  sprite.setAttribute("height", "0");
  sprite.setAttribute("aria-hidden", "true");
  sprite.style.position = "absolute";
  sprite.style.overflow = "hidden";
  Object.entries(ICONS).forEach(([name, paths]) => {
    const mask = document.createElementNS(ns, "mask");
    mask.id = `cut-${name}`;
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    mask.setAttribute("x", "0");
    mask.setAttribute("y", "0");
    mask.setAttribute("width", "24");
    mask.setAttribute("height", "24");
    const background = document.createElementNS(ns, "rect");
    background.setAttribute("width", "24");
    background.setAttribute("height", "24");
    background.setAttribute("fill", "white");
    const glyph = document.createElementNS(ns, "path");
    glyph.setAttribute("d", paths);
    glyph.setAttribute("fill", "none");
    glyph.setAttribute("stroke", "black");
    glyph.setAttribute("stroke-width", "1.75");
    glyph.setAttribute("stroke-linecap", "round");
    glyph.setAttribute("stroke-linejoin", "round");
    mask.append(background, glyph);
    sprite.appendChild(mask);
  });
  document.body.prepend(sprite);
}

function iconTile(name, size = 44, tone = "accent") {
  const safeName = Object.prototype.hasOwnProperty.call(ICONS, name) ? name : "info";
  const dimension = Math.max(24, Math.min(72, Number(size) || 44));
  if (tone === "soft") {
    return `<span class="icon-tile icon-tile-soft" style="--tile-size:${dimension}px" aria-hidden="true">${icon(safeName, Math.round(dimension * 0.52))}</span>`;
  }
  ensureIconSprite();
  return `<span class="icon-tile icon-tile-${tone === "ink" ? "ink" : "accent"}" style="--tile-size:${dimension}px" aria-hidden="true"><svg width="${dimension}" height="${dimension}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect width="24" height="24" rx="5.37" fill="currentColor" mask="url(#cut-${safeName})"/></svg></span>`;
}

function hydrateShellIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((element) => {
    element.innerHTML = icon(element.dataset.icon, element.classList.contains("nav-icon") ? 20 : 18);
  });
}

const UI_ICON_BY_CODEPOINT = {
  0x2699: "config", 0x26a0: "warning", 0x26d4: "warning", 0x2705: "check",
  0x2709: "mail", 0x270d: "document", 0x2713: "check", 0x2726: "spark",
  0x2728: "spark", 0x2733: "spark", 0x274c: "x", 0x2795: "plus",
  0x2b07: "download", 0x2b50: "star", 0x1f310: "resources", 0x1f3ac: "video",
  0x1f3af: "team", 0x1f440: "activity", 0x1f464: "team", 0x1f465: "team",
  0x1f4a1: "suggestions", 0x1f4ac: "chat", 0x1f4bc: "team", 0x1f4be: "files",
  0x1f4c1: "files", 0x1f4c4: "document", 0x1f4ca: "reports", 0x1f4cb: "tasks",
  0x1f4e5: "files", 0x1f4c8: "reports", 0x1f4f7: "image", 0x1f504: "refresh", 0x1f50d: "search", 0x1f50e: "search",
  0x1f511: "key", 0x1f553: "clock", 0x1f5d1: "trash", 0x1f6e0: "code",
  0x1f916: "bot", 0x1f9e0: "models", 0x2708: "send",
};

function replaceUiEmoji(root) {
  if (!root || !document.createTreeWalker) return;
  const pattern = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF]/gu;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  const preservedContent = ".task-out, .task-details-description, .task-details-result, .msg, .task-title, .agent-name, .agent-role, .feed-item .detail, .project-memory, .project-log-lines, .content-post-card p, .suggestion-card > p, .agent-job-profile p, .email-inbox-card p, .email-draft-card details p, [data-user-content]";
  while (walker.nextNode()) {
    if (!walker.currentNode.parentElement.closest(preservedContent) && pattern.test(walker.currentNode.nodeValue)) {
      nodes.push(walker.currentNode);
    }
    pattern.lastIndex = 0;
  }
  nodes.forEach((node) => {
    const text = node.nodeValue;
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > offset) fragment.appendChild(document.createTextNode(text.slice(offset, match.index)));
      const codepoint = match[0].codePointAt(0);
      const glyph = UI_ICON_BY_CODEPOINT[codepoint];
      if (glyph) {
        const replacement = document.createElement("span");
        replacement.className = "inline-emoji-icon";
        replacement.setAttribute("aria-hidden", "true");
        replacement.innerHTML = icon(glyph, 16);
        fragment.appendChild(replacement);
      } else {
        fragment.appendChild(document.createTextNode(match[0]));
      }
      offset = match.index + match[0].length;
    }
    if (offset < text.length) fragment.appendChild(document.createTextNode(text.slice(offset)));
    node.replaceWith(fragment);
  });
}

function observeUiEmoji() {
  replaceUiEmoji(document.body);
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === "characterData") replaceUiEmoji(record.target.parentNode);
      record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) replaceUiEmoji(node);
      });
    });
  });
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });
}

const state = {
  agents: [],
  agentSchedules: [],
  tasks: [],
  archivedTasks: [],
  showArchivedTasks: false,
  messages: [],
  accounts: [],
  emails: [],
  emailInbox: [],
  googleSheetValues: {},
  googleAnalyticsReports: {},
  contentPosts: [],
  ideas: [],
  approvals: [],
  suggestions: [],
  suggestionStatus: null,
  activity: [],
  files: [],
  weeklyReports: [],
  config: [],
  project: { workspace_path: "", codex_available: false, codex_command: "", memory: "" },
  projectLogs: [],
  projectMessages: [],
  projectReplyToId: null,
  modelRouter: {
    provider: "openrouter",
    provider_label: "OpenRouter",
    active_model: "",
    index: 0,
    total: 0,
    models: [],
    has_key: false,
    selected_model: "",
  },
  mediaConfig: {
    providers: [],
    image_provider: "gemini",
    video_provider: "gemini",
    image_models: [],
    video_models: [],
    image_model: "gemini-nano-banana-2.1",
    video_model: "gemini-omni-1.2-flash",
  },
  availableModels: {},
  lastTest: {},
  health: null,
  profile: { dashboard_name: "Pin2Pin", owner_name: "", company_name: "", complete: false },
  operations: { paused: false, active_tasks: 0, tasks_awaiting_review: 0 },
  chatReceiver: "CEO",
  replyToMessageId: null,
  taskChatTaskId: null,
  taskChatMessages: [],
  taskChatReplyToId: null,
  selectedAgentId: null,
  activeTab: "dashboard",
  typing: {},
  busy: {},
  pollTimer: null,
  taskProgressTimer: null,
  projectPollingTimer: null,
  reportPlayerTimer: null,
  reportPlayerIndex: 0,
  reportPlayerData: null,
  reportNarrationEnabled: false,
  modalReturnFocus: null,
};

const ROLE_COLOR = {
  "Chief Executive Officer": "ceo",
  "Lead Generation": "lead",
  "Search Engine Optimization": "seo",
  "Data Scraping": "data",
  "LinkedIn Data Scraping": "linkedin",
  "Email Sender & Receiver": "email",
  "Software Engineering": "engineering",
};

const TAB_TITLES = {
  dashboard: "Dashboard",
  team: "Team",
  tasks: "Task Board",
  suggestions: "Team Suggestions",
  project: "Project Workspace",
  chat: "Team Chat",
  resources: "Connected Resources",
  files: "File Manager",
  reports: "Weekly Reports",
  models: "Model Router",
  config: "Configuration",
  activity: "Activity Feed",
};

const PAGE_HEADINGS = {
  dashboard: { icon: "dashboard", eyebrow: "AGENT OPERATIONS", prefix: "Your team, ", highlight: "in motion.", subtitle: "Work is routed to specialists, changes are tracked, and you stay in control of every external action." },
  team: { icon: "team", eyebrow: "THE CREW", prefix: "Meet your ", highlight: "team.", subtitle: "Specialists you can assign, schedule and chat with." },
  tasks: { icon: "tasks", eyebrow: "EXECUTION CENTER", prefix: "Work, clearly ", highlight: "moving forward.", subtitle: "Create tasks, follow their progress and review what your team delivers." },
  suggestions: { icon: "suggestions", eyebrow: "IDLE-TIME RESEARCH", prefix: "Good ideas, only when work is ", highlight: "clear.", subtitle: "Agents research new ideas once your queue is empty. Add the ones you like as tasks." },
  project: { icon: "project", eyebrow: "PROJECT WORKSPACE", prefix: "Work directly in your ", highlight: "project.", subtitle: "Choose a project folder and follow Engineering's work and logs." },
  chat: { icon: "chat", eyebrow: "TEAM CHAT", prefix: "Talk to your ", highlight: "team.", subtitle: "Ask for status, assign work or get a second opinion from any agent." },
  resources: { icon: "resources", eyebrow: "CONNECTED WORKSPACE", prefix: "Resources, with honest ", highlight: "status.", subtitle: "Connect only what you plan to use. A saved link does not mean an account is connected." },
  files: { icon: "files", eyebrow: "WORKSPACE FILES", prefix: "Everything your team ", highlight: "made.", subtitle: "Files you uploaded and files your agents created." },
  reports: { icon: "reports", eyebrow: "TEAM BRIEFING", prefix: "Work, told by the ", highlight: "team.", subtitle: "Create a recap of what got done, then play it or download it as a PDF." },
  models: { icon: "models", eyebrow: "AI MODELS", prefix: "Choose your ", highlight: "model.", subtitle: "Pick which model your agents use. Provider setup lives in Configuration." },
  config: { icon: "config", eyebrow: "SETTINGS", prefix: "Set up your ", highlight: "workspace.", subtitle: "Add your company details and connect an AI provider." },
  activity: { icon: "activity", eyebrow: "ACTIVITY", prefix: "Everything your team ", highlight: "did.", subtitle: "A running log of tasks, approvals, messages and system events." },
};

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function init() {
  ensureIconSprite();
  hydrateShellIcons();
  observeUiEmoji();
  const savedView = readLastView();
  if (savedView && TAB_CONTENT[savedView.tab]) state.activeTab = savedView.tab;
  await loadAll();
  renderActiveTab();
  renderBottomPanel();
  renderFixedChat();
  updateLocalClock();
  window.setInterval(updateLocalClock, 1000);
  restoreLastView(savedView);
  setupListeners();
  checkApprovals();
  startTaskProgressPolling();
  // Start with the floating chat minimized so it never covers the dashboard.
  hideChat();
}

function updateLocalClock() {
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).formatToParts(now).reduce((parts, item) => {
    parts[item.type] = item.value;
    return parts;
  }, {});
  const date = `${dateParts.day}-${dateParts.month}-${dateParts.year}`;
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  const text = document.getElementById("localClockText");
  if (text) text.textContent = `${date}  ${time}`;
  const hour = document.getElementById("clockHour");
  const minute = document.getElementById("clockMinute");
  const second = document.getElementById("clockSecond");
  if (hour) hour.style.transform = `rotate(${((now.getHours() % 12) + now.getMinutes() / 60) * 30}deg)`;
  if (minute) minute.style.transform = `rotate(${(now.getMinutes() + now.getSeconds() / 60) * 6}deg)`;
  if (second) second.style.transform = `rotate(${now.getSeconds() * 6}deg)`;
}

function renderOperationsPauseControl() {
  const button = document.getElementById("btnPauseWork");
  if (!button) return;
  button.innerHTML = `${icon(state.operations.paused ? "play" : "pause", 18)}<span class="button-label">${state.operations.paused ? "Resume work" : "Pause work"}</span>`;
  button.setAttribute("aria-pressed", String(Boolean(state.operations.paused)));
  button.classList.toggle("btn-warning", Boolean(state.operations.paused));
  button.title = state.operations.paused
    ? "Resume worker tasks and CEO reviews"
    : "Pause new worker tasks, CEO reviews, and idle research";
}

async function loadAll() {
  const [agents, agentSchedules, tasks, messages, accounts, emails, contentPosts, ideas, approvals, suggestions, suggestionStatus, activity, files, reports, router, mediaConfig, configRes, health, project, operations, profile] =
    await Promise.allSettled([
      fetchJson("/api/agents"),
      fetchJson("/api/agent-schedules"),
      fetchJson("/api/tasks"),
      fetchJson("/api/messages"),
      fetchJson("/api/accounts"),
      fetchJson("/api/emails"),
      fetchJson("/api/content-posts"),
      fetchJson("/api/ideas"),
      fetchJson("/api/approvals/pending"),
      fetchJson("/api/suggestions"),
      fetchJson("/api/suggestions/status"),
      fetchJson("/api/activity?limit=60"),
      fetchJson("/api/files"),
      fetchJson("/api/weekly-reports"),
      fetchJson("/api/model-router"),
      fetchJson("/api/media/config"),
      fetchJson("/api/config"),
      fetchJson("/api/health"),
      fetchJson("/api/project/settings"),
      fetchJson("/api/operations/status"),
      fetchJson("/api/profile"),
    ]);

  const val = (p, fallback) => (p.status === "fulfilled" ? p.value : fallback);
  state.agents = val(agents, []) || [];
  state.agentSchedules = val(agentSchedules, []) || [];
  state.tasks = val(tasks, []) || [];
  state.messages = val(messages, []) || [];
  state.accounts = val(accounts, []) || [];
  state.emails = val(emails, []) || [];
  state.contentPosts = val(contentPosts, []) || [];
  state.ideas = val(ideas, []) || [];
  state.approvals = val(approvals, []) || [];
  state.suggestions = val(suggestions, []) || [];
  state.suggestionStatus = val(suggestionStatus, null);
  state.activity = val(activity, []) || [];
  state.files = val(files, []) || [];
  state.weeklyReports = val(reports, []) || [];
  state.config = val(configRes, []) || [];
  if (router.status === "fulfilled" && router.value) state.modelRouter = router.value;
  if (mediaConfig.status === "fulfilled" && mediaConfig.value) state.mediaConfig = mediaConfig.value;
  if (health.status === "fulfilled" && health.value) state.health = health.value;
  if (project.status === "fulfilled" && project.value) state.project = project.value;
  if (operations.status === "fulfilled" && operations.value) state.operations = operations.value;
  if (profile.status === "fulfilled" && profile.value) state.profile = profile.value;
  const ownerName = document.getElementById("ownerNameLabel");
  if (ownerName) ownerName.textContent = state.profile.owner_name || "Set up profile";
  const ownerInitial = document.getElementById("ownerAvatarLabel");
  if (ownerInitial) ownerInitial.textContent = (state.profile.owner_name || "P").trim().charAt(0).toUpperCase();
  const companyName = document.getElementById("companyNameLabel");
  if (companyName) companyName.textContent = state.profile.company_name || "Your company";
  renderOperationsPauseControl();

  // Hydrate discovered model lists persisted by the backend.
  Object.keys(PROVIDER_CONFIG).forEach((p) => {
    const row = state.config.find((c) => c.key === `${p}_available_models`);
    if (row && row.value) {
      try {
        const list = JSON.parse(row.value);
        if (Array.isArray(list) && list.length) state.availableModels[p] = list;
      } catch (e) {
        /* ignore malformed list */
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function fetchJson(path, opts = {}) {
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  const headers = {};
  if (opts.body && !isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(path, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? (isForm ? opts.body : JSON.stringify(opts.body)) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const detail = data && data.detail ? data.detail : `request failed (${res.status})`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

function esc(s) {
  if (s == null) return "";
  const div = document.createElement("div");
  div.textContent = String(s);
  return div.innerHTML;
}

function safeExternalUrl(value) {
  const url = String(value ?? "").trim();
  if (!/^https?:\/\//i.test(url)) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function formatBytes(n) {
  const size = Number(n) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function chartPoints(values, width = 112, height = 36) {
  const numbers = values.map((value) => Number(value) || 0);
  const max = Math.max(1, ...numbers);
  const step = numbers.length > 1 ? width / (numbers.length - 1) : width;
  return numbers.map((value, index) => ({
    x: index * step,
    y: height - 3 - (value / max) * (height - 8),
  }));
}

function sparkline(values, label = "Recent task activity") {
  if (!Array.isArray(values) || !values.length || values.every((value) => !Number(value))) {
    return `<svg class="chart-sparkline chart-empty" viewBox="0 0 112 36" role="img" aria-label="${esc(label)}: no data yet"><path d="M2 28H110" /></svg>`;
  }
  const points = chartPoints(values);
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const latest = points[points.length - 1];
  return `<svg class="chart-sparkline" viewBox="0 0 112 36" role="img" aria-label="${esc(label)}: ${Number(values[values.length - 1]) || 0} most recent"><path class="chart-line" d="${path}" /><circle cx="${latest.x}" cy="${latest.y}" r="3" /></svg>`;
}

function areaChart(points, labels = []) {
  const values = (Array.isArray(points) ? points : []).map((point) => Number(point) || 0);
  if (!values.length || values.every((value) => !value)) {
    return `<svg class="chart-area chart-empty" viewBox="0 0 320 120" role="img" aria-label="Task activity: no data yet"><path d="M8 92H312" /><text x="160" y="68" text-anchor="middle">No data yet</text></svg>`;
  }
  const coords = chartPoints(values, 304, 82).map((point) => ({ x: point.x + 8, y: point.y + 8 }));
  const line = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const fill = `${line} L312 100 L8 100 Z`;
  const latest = coords[coords.length - 1];
  const label = labels.length ? labels[labels.length - 1] : "Latest day";
  return `<svg class="chart-area" viewBox="0 0 320 120" role="img" aria-label="${esc(label)}: ${values[values.length - 1]} tasks"><defs><linearGradient id="chartAreaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".24"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><path class="chart-area-fill" d="${fill}"/><path class="chart-line" d="${line}"/><circle cx="${latest.x}" cy="${latest.y}" r="4"/><text x="8" y="115">${esc(labels[0] || "")}</text><text x="312" y="115" text-anchor="end">${esc(label)}</text></svg>`;
}

function ringProgress(done, total) {
  const complete = Math.max(0, Number(done) || 0);
  const count = Math.max(0, Number(total) || 0);
  const percent = count ? Math.min(100, complete / count * 100) : 0;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - percent / 100);
  return `<div class="progress-ring" role="img" aria-label="${complete} of ${count} tasks done today" style="--ring-offset:${offset.toFixed(1)}px"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="52"/><circle class="ring-value" cx="60" cy="60" r="52"/></svg><span><b>${complete}/${count}</b><small>${count ? "done today" : "no tasks today"}</small></span></div>`;
}

function hbarList(rows) {
  const items = (Array.isArray(rows) ? rows : []).filter((row) => Number(row.value) > 0);
  if (!items.length) return `<svg class="chart-bars chart-empty" viewBox="0 0 320 54" role="img" aria-label="Task statuses: no data yet"><path d="M8 38H312" /><text x="160" y="28" text-anchor="middle">No data yet</text></svg>`;
  const max = Math.max(1, ...items.map((row) => Number(row.value)));
  const height = Math.max(42, items.length * 26);
  return `<svg class="chart-bars" viewBox="0 0 320 ${height}" role="img" aria-label="${esc(items.map((row) => `${row.label} ${row.value}`).join(", "))}"><g>${items.map((row, index) => {
    const y = index * 26 + 2;
    const width = Math.max(2, 220 * Number(row.value) / max);
    return `<text x="0" y="${y + 13}">${esc(row.label)}</text><rect x="110" y="${y}" width="220" height="14" rx="7"/><rect class="bar-value" x="110" y="${y}" width="${width}" height="14" rx="7"/><text class="bar-count" x="300" y="${y + 13}" text-anchor="end">${Number(row.value)}</text>`;
  }).join("")}</g></svg>`;
}

function stackedBar(segments) {
  const rows = (Array.isArray(segments) ? segments : []).filter((segment) => Number(segment.value) >= 0);
  const total = rows.reduce((sum, segment) => sum + Number(segment.value || 0), 0);
  if (!rows.length || !total) {
    return `<svg class="chart-stack chart-empty" viewBox="0 0 320 52" role="img" aria-label="Task pipeline: no data yet"><rect x="4" y="8" width="312" height="12" rx="6"/><text x="160" y="45" text-anchor="middle">No data yet</text></svg>`;
  }
  let x = 4;
  const bars = rows.map((segment) => {
    const width = 312 * Number(segment.value) / total;
    const shape = `<rect x="${x.toFixed(2)}" y="8" width="${Math.max(width, 0).toFixed(2)}" height="16" fill="var(--${segment.token})"/>`;
    x += width;
    return shape;
  }).join("");
  return `<div class="chart-stack-wrap"><svg class="chart-stack" viewBox="0 0 320 32" role="img" aria-label="${esc(rows.map((segment) => `${segment.label}: ${segment.value}`).join(", "))}"><rect x="4" y="8" width="312" height="16" rx="8" fill="var(--track)"/><clipPath id="pipelineClip"><rect x="4" y="8" width="312" height="16" rx="8"/></clipPath><g clip-path="url(#pipelineClip)">${bars}</g></svg><div class="chart-legend">${rows.map((segment) => `<span><i class="legend-${esc(segment.token)}"></i>${esc(segment.label)} <b>${Number(segment.value)}</b></span>`).join("")}</div></div>`;
}

function cfgRow(key) {
  return (state.config || []).find((c) => c.key === key) || null;
}

function cfgVal(key, fallback = "") {
  const row = cfgRow(key);
  return row ? row.value : fallback;
}

function cfgHas(key) {
  const row = cfgRow(key);
  if (!row) return false;
  if (typeof row.has_value === "boolean") return row.has_value;
  return !!row.value;
}

function statusLabel(status) {
  return {
    backlog: "Backlog",
    assigned: "To Do",
    in_progress: "In Progress",
    waiting_engineering: "Waiting for Engineering",
    review: "Review",
    done: "Done",
    rejected: "Rejected",
    blocked: "Blocked",
  }[status] || status;
}

function agentShortName(role) {
  return {
    "Chief Executive Officer": "CEO",
    "Lead Generation": "Lead Gen",
    "Search Engine Optimization": "SEO",
    "Data Scraping": "Data Scrapper",
    "LinkedIn Data Scraping": "LinkedIn",
    "Email Sender & Receiver": "Email",
    "Software Engineering": "Engineering",
    "Content Creation": "Content",
  }[role] || role;
}

function agentIcon(role, size = 32) {
  const agent = typeof role === "object" && role ? role : null;
  const roleName = agent ? agent.role : role;
  const glyph = {
    "Chief Executive Officer": "spark",
    "Lead Generation": "team",
    "Search Engine Optimization": "search",
    "Data Scraping": "files",
    "LinkedIn Data Scraping": "team",
    "Email Sender & Receiver": "mail",
    "Software Engineering": "code",
    "Content Creation": "document",
  }[roleName] || "bot";
  return iconTile(glyph, size, "ink");
}

function providerLabel(key) {
  if (key === "web_search") return "Web Research";
  return PROVIDER_CONFIG[key] ? PROVIDER_CONFIG[key].label : key;
}

function availableModelsFor(provider) {
  if (state.availableModels[provider] && state.availableModels[provider].length) {
    return state.availableModels[provider];
  }
  const row = cfgRow(`${provider}_available_models`);
  if (row && row.value) {
    try {
      const list = JSON.parse(row.value);
      if (Array.isArray(list) && list.length) return list;
    } catch (e) {
      /* ignore */
    }
  }
  return PROVIDER_MODELS[provider] || [];
}

function notify(message, type = "info") {
  let box = document.getElementById("appToast");
  if (!box) {
    box = document.createElement("div");
    box.id = "appToast";
    box.className = "app-toast";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    document.body.appendChild(box);
  }
  const toastIcon = { success: "check", warning: "warning", error: "x", info: "info" }[type] || "info";
  box.innerHTML = `${icon(toastIcon, 18)}<span>${esc(message)}</span>`;
  box.className = `app-toast show toast-${type}`;
  clearTimeout(box._hideTimer);
  box._hideTimer = setTimeout(() => {
    box.className = "app-toast";
  }, 5000);
}

// Download without navigating away from the dashboard.
function triggerDownload(url) {
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 500);
}

/* ------------------------------------------------------------------ */
/* Preserve forms while polling re-renders                             */
/* ------------------------------------------------------------------ */

function captureUI() {
  const active = document.activeElement;
  const focusId = active && active.id ? active.id : null;
  let selStart = null;
  let selEnd = null;
  if (focusId && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
    try {
      selStart = active.selectionStart;
      selEnd = active.selectionEnd;
    } catch (e) {
      /* ignore */
    }
  }

  const values = {};
  document.querySelectorAll("#content input[id], #content textarea[id], #content select[id]").forEach((el) => {
    if (el.type !== "file") values[el.id] = el.value;
  });

  const scroll = {};
  document.querySelectorAll("#content [data-scroll-key]").forEach((el) => {
    scroll[el.dataset.scrollKey] = el.scrollTop;
  });
  const pageContent = document.querySelector(".page-content");
  const chatList = document.getElementById("msgList");
  const fixedChatList = document.getElementById("chatMessages");

  // Keep the "assign a new task" panel open and any expanded outputs expanded.
  const createPanel = document.querySelector("#content .create-task-panel");
  const openOutputs = [...document.querySelectorAll("#content .task-output[open]")]
    .map((d) => d.closest("[data-task-id]")?.getAttribute("data-task-id"))
    .filter(Boolean);
  const taskDetailsId = document.querySelector("#taskDetailsOverlay h2[data-task-id]")?.dataset.taskId || "";

  return {
    focusId,
    selStart,
    selEnd,
    pageScrollTop: pageContent ? pageContent.scrollTop : 0,
    chatScroll: chatList ? {
      top: chatList.scrollTop,
      nearBottom: chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 80,
    } : null,
    fixedChatScroll: fixedChatList ? {
      top: fixedChatList.scrollTop,
      nearBottom: fixedChatList.scrollHeight - fixedChatList.scrollTop - fixedChatList.clientHeight < 80,
    } : null,
    values,
    scroll,
    createPanelOpen: !!(createPanel && createPanel.open),
    openOutputs,
    taskDetailsId,
  };
}

function restoreUI(snap) {
  if (!snap) return;
  Object.entries(snap.values || {}).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && el.type !== "file" && value != null) el.value = value;
  });
  Object.entries(snap.scroll || {}).forEach(([key, top]) => {
    const el = document.querySelector(`#content [data-scroll-key="${CSS.escape(key)}"]`);
    if (el) el.scrollTop = top;
  });

  const createPanel = document.querySelector("#content .create-task-panel");
  if (createPanel && snap.createPanelOpen) createPanel.open = true;
  (snap.openOutputs || []).forEach((id) => {
    const card = document.querySelector(`#content [data-task-id="${id}"]`);
    const details = card && card.querySelector(".task-output");
    if (details) details.open = true;
  });
  if (snap.taskDetailsId && state.tasks.some((task) => task.id === snap.taskDetailsId)) {
    openTaskDetails(snap.taskDetailsId);
  }
  const pageContent = document.querySelector(".page-content");
  if (pageContent) pageContent.scrollTop = snap.pageScrollTop || 0;
  const chatList = document.getElementById("msgList");
  if (chatList && snap.chatScroll) {
    chatList.scrollTop = snap.chatScroll.nearBottom
      ? chatList.scrollHeight
      : Math.min(snap.chatScroll.top, chatList.scrollHeight - chatList.clientHeight);
  }
  const fixedChatList = document.getElementById("chatMessages");
  if (fixedChatList && snap.fixedChatScroll) {
    fixedChatList.scrollTop = snap.fixedChatScroll.nearBottom
      ? fixedChatList.scrollHeight
      : Math.min(snap.fixedChatScroll.top, fixedChatList.scrollHeight - fixedChatList.clientHeight);
  }

  if (snap.focusId) {
    const el = document.getElementById(snap.focusId);
    if (el) {
      try {
        el.focus({ preventScroll: true });
        if (snap.selStart != null) el.setSelectionRange(snap.selStart, snap.selEnd);
      } catch (e) {
        /* ignore */
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Tabs / shell                                                        */
/* ------------------------------------------------------------------ */

const TAB_CONTENT = {
  dashboard: renderDashboard,
  team: renderTeam,
  tasks: renderTasksBoard,
  suggestions: renderSuggestions,
  project: renderProject,
  chat: renderChatTab,
  resources: renderResources,
  files: renderFiles,
  reports: renderReports,
  models: renderModels,
  config: renderConfig,
  activity: renderActivity,
};

const LAST_VIEW_KEY = "preemption-ai-team:last-view";

function readLastView() {
  try {
    const saved = sessionStorage.getItem(LAST_VIEW_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn("Could not restore the last dashboard view:", error.message);
    return null;
  }
}

function saveLastView() {
  const pageContent = document.querySelector(".page-content");
  const openTask = document.querySelector("#taskDetailsOverlay h2[data-task-id]");
  const openOutputs = [...document.querySelectorAll("#content .task-output[open]")]
    .map((details) => details.dataset.outputTask)
    .filter(Boolean);
  const outputScroll = {};
  document.querySelectorAll("#content [data-scroll-key]").forEach((element) => {
    outputScroll[element.dataset.scrollKey] = element.scrollTop;
  });
  try {
    sessionStorage.setItem(LAST_VIEW_KEY, JSON.stringify({
      tab: state.activeTab,
      pageScrollTop: pageContent ? pageContent.scrollTop : 0,
      taskId: openTask ? openTask.dataset.taskId : "",
      openOutputs,
      outputScroll,
    }));
  } catch (error) {
    console.warn("Could not save the dashboard view:", error.message);
  }
}

function restoreLastView(saved) {
  if (!saved) return;
  (saved.openOutputs || []).forEach((taskId) => {
    const details = [...document.querySelectorAll("#content .task-output")]
      .find((item) => item.dataset.outputTask === taskId);
    if (details) details.open = true;
  });
  Object.entries(saved.outputScroll || {}).forEach(([key, top]) => {
    const element = [...document.querySelectorAll("#content [data-scroll-key]")]
      .find((item) => item.dataset.scrollKey === key);
    if (element) element.scrollTop = Number(top) || 0;
  });
  const pageContent = document.querySelector(".page-content");
  if (pageContent) pageContent.scrollTop = Number(saved.pageScrollTop) || 0;
  if (saved.taskId && state.tasks.some((task) => task.id === saved.taskId)) {
    openTaskDetails(saved.taskId);
  }
}

function renderActiveTab(preserve = false) {
  try {
    const content = document.getElementById("content");
    if (!content) return;
    if (!state.profile.complete) {
      renderOnboarding();
      return;
    }
    const snap = preserve ? captureUI() : null;
    const tab = state.activeTab || "dashboard";
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = TAB_TITLES[tab] || tab;
    const breadcrumb = document.querySelector(".breadcrumbs .bc-current");
    if (breadcrumb) breadcrumb.textContent = selectedPageLabel(tab);

    content.innerHTML = "";
    const fn = TAB_CONTENT[tab];
    if (fn) fn();
    else content.innerHTML = `<div class="empty">Tab "${esc(tab)}" not implemented.</div>`;

    mountPageHeading(tab);
    highlightSectionHeadings(content);
    highlightNav(tab);
    if (preserve) restoreUI(snap);
  } catch (e) {
    console.error("renderActiveTab error:", e);
    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = `<div class="empty" style="padding:20px;color:var(--danger);">Error rendering tab: ${esc(e.message)}</div>`;
    }
  }
}

function mountPageHeading(tab) {
  const content = document.getElementById("content");
  if (!content) return;
  const selectedAgent = tab === "team" && state.selectedAgentId
    ? state.agents.find((agent) => agent.id === state.selectedAgentId)
    : null;
  const heading = selectedAgent
    ? { icon: "bot", eyebrow: "TEAM MEMBER", prefix: "", highlight: selectedAgent.name, subtitle: selectedAgent.role }
    : PAGE_HEADINGS[tab];
  if (!heading) return;

  const heroSelector = {
    dashboard: ".dashboard-hero",
    tasks: ".board-intro",
    suggestions: ".suggestions-hero",
    resources: ".resource-hero",
    reports: ".reports-hero",
  }[tab];
  const hero = heroSelector ? content.querySelector(heroSelector) : null;
  const existing = hero
    ? {
      eyebrow: hero.querySelector(".eyebrow"),
      title: hero.querySelector("h2"),
      subtitle: hero.querySelector("p"),
    }
    : null;

  const lockup = document.createElement("div");
  lockup.className = "page-heading-lockup";
  const tile = document.createElement("span");
  tile.innerHTML = iconTile(heading.icon, 44, "accent");
  lockup.appendChild(tile.firstElementChild);
  const copy = document.createElement("div");
  copy.className = "page-heading-copy";
  const eyebrow = existing && existing.eyebrow ? existing.eyebrow : document.createElement("div");
  eyebrow.classList.add("eyebrow");
  eyebrow.textContent = heading.eyebrow;
  const title = existing && existing.title ? existing.title : document.createElement("h1");
  title.innerHTML = `${esc(heading.prefix)}<span class="hl-text">${esc(heading.highlight)}</span>`;
  const subtitle = existing && existing.subtitle ? existing.subtitle : document.createElement("p");
  subtitle.textContent = heading.subtitle;
  copy.append(eyebrow, title, subtitle);
  lockup.appendChild(copy);

  if (hero) {
    const isDashboardHero = hero.matches(".dashboard-hero");
    const source = isDashboardHero ? hero.firstElementChild : hero;
    const actions = source && source.querySelector(".hero-actions");
    if (actions) copy.appendChild(actions);
    if (source && source !== hero && !source.textContent.trim() && !source.children.length) source.remove();
    hero.insertBefore(lockup, hero.firstChild);
  } else {
    content.insertBefore(lockup, content.firstChild);
  }
}

function selectedPageLabel(tab) {
  if (tab === "team" && state.selectedAgentId) {
    const agent = state.agents.find((item) => item.id === state.selectedAgentId);
    if (agent) return `${TAB_TITLES.team}  ›  ${agent.name}`;
  }
  return TAB_TITLES[tab] || tab;
}

function highlightSectionHeadings(root) {
  root.querySelectorAll(".section-title, .panel-heading h3, .agent-schedule-section h3").forEach((heading) => {
    if (heading.querySelector(".hl") || heading.querySelector("span")) return;
    const text = heading.textContent.trim();
    const words = text.split(/\s+/);
    if (words.length < 2) return;
    heading.innerHTML = `${esc(words.slice(0, -1).join(" "))} <span class="hl">${esc(words[words.length - 1])}</span>`;
  });
}

function renderOnboarding() {
  const titleEl = document.getElementById("pageTitle");
  if (titleEl) titleEl.textContent = "Welcome to Pin2Pin";
  const content = document.getElementById("content");
  if (!content) return;
  content.innerHTML = `
    <section class="onboarding-shell">
      <div class="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboardingTitle" tabindex="-1">
        ${iconTile("spark", 56, "accent")}
        <div class="eyebrow">YOUR LOCAL WORKSPACE</div>
        <h2 id="onboardingTitle">Welcome to <span class="hl">Pin2Pin.</span></h2>
        <p>Set up your local workspace in a few seconds.</p>
        <form id="onboardingForm">
          <label>Your name<input name="owner_name" maxlength="100" required autocomplete="name" value="${esc(state.profile.owner_name || "")}"></label>
          <label>Company name<input name="company_name" maxlength="100" required value="${esc(state.profile.company_name || "")}"></label>
          <label>What does your company do?<textarea name="company_description" maxlength="1200" rows="4" placeholder="Optional, but it helps agents give relevant answers. Avoid confidential details.">${esc(state.profile.company_description || "")}</textarea></label>
          <label>Company website<input name="company_website" type="url" maxlength="500" placeholder="https://example.com" value="${esc(state.profile.company_website || "")}"></label>
          <button class="btn btn-accent" type="submit">Get started</button>
          <div class="onboarding-error" id="onboardingError" role="alert"></div>
        </form>
      </div>
    </section>
  `;
  const form = document.getElementById("onboardingForm");
  form.querySelector('input[name="owner_name"]')?.focus({ preventScroll: true });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    try {
      state.profile = await fetchJson("/api/profile", {
        method: "POST",
        body: Object.fromEntries(data.entries()),
      });
      await loadAll();
      renderActiveTab(false);
      renderBottomPanel();
      notify("Profile saved on this computer", "success");
    } catch (error) {
      const errorBox = document.getElementById("onboardingError");
      if (errorBox) errorBox.textContent = error.message;
    }
  });
}

function highlightNav(tab) {
  document.querySelectorAll(".nav-item").forEach((el) => {
    const active = el.dataset.tab === tab;
    el.classList.toggle("active", active);
    el.setAttribute("aria-label", el.querySelector(".nav-label")?.textContent.trim() || TAB_TITLES[el.dataset.tab] || el.dataset.tab);
    if (active) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
}

function goToTab(tab) {
  if (!TAB_CONTENT[tab]) return;
  state.activeTab = tab;
  renderActiveTab(false);
  saveLastView();
}

/* ------------------------------------------------------------------ */
/* Bottom live panel                                                   */
/* ------------------------------------------------------------------ */

function renderBottomPanel() {
  const strip = document.getElementById("agentStrip");
  const feed = document.getElementById("logFeed");
  if (!strip || !feed) return;

  strip.innerHTML = state.agents.map((a) => {
    let cls = "idle";
    let dot = "dot-idle";
    let taskTxt = "Idle";
    if (a.status === "working") {
      cls = "working";
      dot = "dot-working";
      taskTxt = "Working on task";
    } else if (a.status === "assigned") {
      taskTxt = "Assigned — waiting";
    }
    const cur = a.current_task_id ? state.tasks.find((t) => t.id === a.current_task_id) : null;
    if (cur) taskTxt = cur.title;
    return `
      <div class="agent-status-item ${cls}">
        <div class="item-name">${agentIcon(a)}<span>${esc(agentShortName(a.role))}</span> <span class="item-dot ${dot}"></span></div>
        <div class="item-role">${esc(a.role)}</div>
        <div class="item-task">${esc(taskTxt)}</div>
      </div>`;
  }).join("");

  feed.innerHTML = state.activity.slice(0, 12).map((a) => `
    <div class="log-item">
      <div class="actor">${esc(a.actor)}</div>
      <div class="action">${esc(a.action)}</div>
      ${a.detail ? `<div class="detail">${esc(a.detail)}</div>` : ""}
      <div class="time">${new Date(a.timestamp).toLocaleTimeString()}</div>
    </div>`).join("") || "<div class='empty'>No activity yet.</div>";

  const btn = document.getElementById("btnBottomCollapse");
  if (btn && !btn.dataset.wired) {
    btn.dataset.wired = "1";
    btn.addEventListener("click", () => {
      const container = document.getElementById("bottomPanelContainer");
      if (!container) return;
      container.classList.toggle("collapsed");
      const collapsed = container.classList.contains("collapsed");
      btn.innerHTML = icon("chevron-down", 18);
      btn.setAttribute("aria-expanded", String(!collapsed));
      btn.title = collapsed ? "Expand live team status" : "Collapse live team status";
    });
  }
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

function renderDashboard() {
  const byStatus = {};
  state.tasks.forEach((t) => {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  });
  const working = state.agents.filter((a) => a.status === "working").length;
  const pending = state.approvals.filter((a) => a.status === "pending").length;
  const active = state.tasks.filter((t) => ["assigned", "in_progress", "waiting_engineering"].includes(t.status)).length;
  const done = byStatus.done || 0;
  const blocked = byStatus.blocked || 0;
  const completion = state.tasks.length ? Math.round((done / state.tasks.length) * 100) : 0;
  const connectedResources = state.accounts.filter((a) => a.status === "connected").length;
  const suggestions = (state.suggestions || []).filter((item) => item.status === "open");
  const todayKey = new Date().toDateString();
  const todayTasks = state.tasks.filter((task) => {
    const createdToday = task.created_at && new Date(task.created_at).toDateString() === todayKey;
    const activeToday = ["backlog", "assigned", "in_progress", "waiting_engineering", "review"].includes(task.status)
      && task.updated_at && new Date(task.updated_at).toDateString() === todayKey;
    return createdToday || activeToday;
  });
  const doneToday = todayTasks.filter((task) => task.status === "done"
    && task.updated_at && new Date(task.updated_at).toDateString() === todayKey).length;
  const dailyTaskCounts = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toDateString();
    return state.tasks.filter((task) => {
      const timestamp = task.created_at || task.updated_at;
      return timestamp && new Date(timestamp).toDateString() === key;
    }).length;
  });
  const dailyDoneCounts = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toDateString();
    return state.tasks.filter((task) => task.status === "done"
      && task.updated_at && new Date(task.updated_at).toDateString() === key).length;
  });
  const dayLabels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date.toLocaleDateString(undefined, { weekday: "short" });
  });
  const recentActiveTasks = state.tasks
    .filter((task) => ["assigned", "in_progress", "waiting_engineering", "review", "blocked"].includes(task.status))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .slice(0, 6);
  const recentDoneTasks = state.tasks
    .filter((task) => task.status === "done")
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .slice(0, 5);
  const hasKey =
    (state.health && state.health.has_any_key) ||
    (state.modelRouter && state.modelRouter.has_key);

  document.getElementById("content").innerHTML = `
    <section class="dashboard-hero">
      <div>
        <div class="eyebrow">AGENT OPERATIONS</div>
        <h2>Your team, in motion.</h2>
        <p>Work is routed to specialists, changes are tracked, and you stay in control of every external action.</p>
        <div class="hero-actions">
        <button class="btn btn-accent" data-goto="tasks">${icon("plus", 18)} Create a task</button>
          <button class="btn btn-ghost" data-goto="team">Meet your team</button>
        </div>
      </div>
      <div class="hero-orbit">${ringProgress(doneToday, todayTasks.length)}</div>
      <div class="hero-status"><span class="live-pulse"></span>${working ? `${working} agent${working === 1 ? "" : "s"} working` : active ? `${active} task${active === 1 ? "" : "s"} in motion` : "Ready for the next task"}</div>
    </section>

    ${hasKey ? "" : `<div class="notice-card"><div><b>AI provider not configured</b><div class="config-hint">Add a model key to activate research and content agents. Project coding uses its own local runtime.</div></div><button class="btn btn-primary" data-goto="config">Configure AI</button></div>`}
    ${blocked ? `<div class="notice-card warning-notice"><div><b>${blocked} blocked task${blocked === 1 ? "" : "s"}</b><div class="config-hint">See each task for the blocker and retry once it is fixed.</div></div><button class="btn btn-outline" data-goto="tasks">Review tasks</button></div>` : ""}

    <div class="metric-grid">
      <article class="metric-card"><div class="metric-top"><span>In motion</span>${iconTile("activity", 28, "soft")}</div><div class="metric-value-row"><strong>${active}</strong></div><div class="metric-foot">${working} agents active</div></article>
      <article class="metric-card"><div class="metric-top"><span>Completed</span>${iconTile("check", 28, "soft")}</div><div class="metric-value-row"><strong>${done}</strong>${sparkline(dailyDoneCounts, "Tasks completed each day this week")}</div><div class="metric-foot">${completion}% of all tasks</div><div class="mini-progress"><i style="width:${completion}%"></i></div></article>
      <article class="metric-card"><div class="metric-top"><span>Awaiting review</span>${iconTile("clock", 28, "soft")}</div><div class="metric-value-row"><strong>${pending}</strong></div><div class="metric-foot">${pending ? "External actions stay gated" : "No approvals waiting"}</div></article>
      <article class="metric-card"><div class="metric-top"><span>Connected resources</span>${iconTile("link", 28, "soft")}</div><div class="metric-value-row"><strong>${connectedResources}</strong></div><div class="metric-foot">${state.files.length} shared files</div></article>
    </div>

    <section class="surface-panel dashboard-task-panel">
      <div class="panel-heading"><div><div class="eyebrow">TASKS IN MOTION</div><h3>Open work</h3><p class="panel-subtitle">A live view of work already on the board.</p></div><button class="text-action" data-goto="tasks">All statuses ${icon("arrow-up-right", 14)}</button></div>
      <div class="dashboard-task-list">${recentActiveTasks.map((task) => {
        const owner = state.agents.find((agent) => agent.id === task.assigned_agent_id);
        return `<button class="dashboard-task-row" data-open-task="${esc(task.id)}">
          <span class="dashboard-task-status status-${esc(task.status)}">${esc(statusLabel(task.status))}</span>
          <span class="dashboard-task-title"><b>${esc(task.title)}</b><small>${esc(owner ? owner.name : "Unassigned")} · ${new Date(task.updated_at).toLocaleString()}</small>${task.progress_summary ? `<small class="dashboard-task-progress" data-task-progress-summary="${esc(task.id)}">${esc(task.progress_summary)}${task.status === "in_progress" && task.estimated_remaining_seconds != null ? ` · ~${esc(formatTaskDuration(task.estimated_remaining_seconds))} left` : ""}</small>` : ""}</span>
          <span class="dashboard-task-chevron">${icon("arrow-up-right", 16)}</span>
        </button>`;
      }).join("") || `<div class="empty-state">Nothing in motion. Create a task to get your team started.</div>`}</div>
    </section>

    <section class="surface-panel dashboard-task-panel">
      <div class="panel-heading"><div><div class="eyebrow">RECENT DELIVERIES</div><h3>Latest 5 completed tasks</h3><p class="panel-subtitle">Finished work with a saved result.</p></div><button class="text-action" data-goto="files">All team files ${icon("arrow-up-right", 14)}</button></div>
      <div class="dashboard-task-list">${recentDoneTasks.map((task) => {
        const owner = state.agents.find((agent) => agent.id === task.assigned_agent_id);
        const resultPreview = String(task.output || "").replace(/\s+/g, " ").trim().slice(0, 180);
        const resultLabel = resultPreview || ((task.media_files || []).length ? "Media deliverable saved." : "Task completed without a saved text preview.");
        return `<button class="dashboard-task-row" data-open-task="${esc(task.id)}">
          <span class="dashboard-task-status status-done">Done</span>
          <span class="dashboard-task-title"><b>${esc(task.title)}</b><small>${esc(owner ? owner.name : "Team")} · ${new Date(task.updated_at).toLocaleString()}</small><small class="delivery-preview">${esc(resultLabel)}</small></span>
          <span class="dashboard-task-chevron">${icon("arrow-up-right", 16)}</span>
        </button>`;
      }).join("") || `<div class="empty-state">Completed task outputs will be listed here.</div>`}</div>
    </section>

    <div class="dashboard-grid">
      <section class="surface-panel workload-panel">
        <div class="panel-heading"><div><div class="eyebrow">WORKLOAD</div><h3>Task pipeline</h3><p class="panel-subtitle">Current tasks by status.</p></div><button class="text-action" data-goto="tasks">View board ${icon("arrow-up-right", 14)}</button></div>
        ${stackedBar([
          { label: "Backlog", value: byStatus.backlog || 0, token: "chart-secondary" },
          { label: "To do", value: byStatus.assigned || 0, token: "chart-accent" },
          { label: "In progress", value: byStatus.in_progress || 0, token: "chart-warn" },
          { label: "Waiting for Engineering", value: byStatus.waiting_engineering || 0, token: "chart-secondary" },
          { label: "Review", value: byStatus.review || 0, token: "chart-warn" },
          { label: "Done", value: byStatus.done || 0, token: "chart-ok" },
          { label: "Rejected", value: byStatus.rejected || 0, token: "chart-muted" },
          { label: "Blocked", value: byStatus.blocked || 0, token: "chart-danger" },
        ])}
        <div class="dashboard-weekly-chart"><div class="chart-caption">New tasks by day</div>${areaChart(dailyTaskCounts, dayLabels)}</div>
      </section>
      <section class="surface-panel team-panel">
        <div class="panel-heading"><div><div class="eyebrow">THE CREW</div><h3>Agent status</h3></div><button class="text-action" data-goto="team">All agents ${icon("arrow-up-right", 14)}</button></div>
        <div class="dashboard-agent-grid">${state.agents.map((agent) => agentCardHtml(agent, true)).join("") || `<div class="empty-state">Your agent team will appear here.</div>`}</div>
      </section>
      <section class="surface-panel activity-panel">
        <div class="panel-heading"><div><div class="eyebrow">LIVE FEED</div><h3>Recent activity</h3><p class="panel-subtitle">The latest updates from your workspace.</p></div><button class="text-action" data-goto="activity">Open feed ${icon("arrow-up-right", 14)}</button></div>
        <div class="dashboard-feed">${state.activity.slice(0, 8).map(feedItemHtml).join("") || `<div class="empty-state">New work will show up here.</div>`}</div>
      </section>
      <section class="surface-panel suggestions-panel">
        <div class="panel-heading"><div><div class="eyebrow">TEAM THINKING</div><h3>Suggestions</h3><p class="panel-subtitle">Ideas shared after active work is clear.</p></div><button class="text-action" data-goto="suggestions">See all ${icon("arrow-up-right", 14)}</button></div>
        ${suggestions.slice(0, 3).map((item) => `<article class="suggestion-preview"><span class="suggestion-agent">${agentIcon(state.agents.find((a) => a.id === item.agent_id)?.role || "")} ${esc(item.agent_name || "Team")}</span><b>${esc(item.title)}</b><p>${esc(item.summary)}</p></article>`).join("") || `<div class="empty-state">No suggestions yet. Agents research once all queued, active and review tasks have cleared.</div>`}
      </section>
    </div>
  `;
}

function renderSuggestions() {
  const suggestions = state.suggestions || [];
  const running = suggestions.filter((item) => item.status === "researching").length;
  const ready = suggestions.filter((item) => item.status === "open");
  const status = state.suggestionStatus || {};
  const reasons = status.reasons || [];
  document.getElementById("content").innerHTML = `
    <section class="suggestions-hero">
      <div class="eyebrow">IDLE-TIME RESEARCH</div>
      <h2>Good ideas, only when work is clear.</h2>
      <p>When backlog, to-do, in-progress, review, and blocked work are all clear, each specialist checks recent chat and public web sources once. Suggestions stop until new work is created.</p>
      <div class="suggestion-run-state">${running ? `<span class="live-pulse"></span>${running} specialist${running === 1 ? "" : "s"} researching` : ready.length ? `${ready.length} fresh suggestion${ready.length === 1 ? "" : "s"} to review` : status.can_run ? "Queue clear. Agents are ready to research once." : reasons[0] || "Research cycle complete."}</div>
      <div class="suggestion-availability">${Number(status.processed_agents || 0)} / ${Number(status.total_agents || 0)} agents attempted this cycle</div>
      ${reasons.length > 1 ? `<ul class="suggestion-blockers">${reasons.map((reason) => `<li>${esc(reason)}</li>`).join("")}</ul>` : ""}
      <button class="btn btn-accent btn-sm" id="btnRunSuggestions" ${status.can_run ? "" : "disabled"}>${icon("spark", 16)} Research now</button>
    </section>
    <div class="suggestion-grid">
      ${suggestions.map((item) => {
        const agent = state.agents.find((entry) => entry.id === item.agent_id);
        const sources = Array.isArray(item.source_urls) ? item.source_urls : [];
        return `<article class="suggestion-card">
          <div class="suggestion-card-top"><span class="suggestion-agent">${agentIcon(agent ? agent.role : "")} ${esc(item.agent_name)}</span><span class="suggestion-state state-${esc(item.status)}">${esc(item.status.replace("_", " "))}</span></div>
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.summary)}</p>
          ${sources.length ? `<details class="suggestion-sources"><summary>Research sources (${sources.length})</summary><ul>${sources.map((url) => {
            const safeUrl = safeExternalUrl(url);
            return `<li>${safeUrl ? `<a href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>` : esc(url)}</li>`;
          }).join("")}</ul></details>` : ""}
          ${item.status === "open" ? `<div class="suggestion-actions"><button class="btn btn-primary btn-sm" data-suggestion-task="${esc(item.id)}">Add as task</button><button class="btn btn-outline btn-sm" data-suggestion-dismiss="${esc(item.id)}">Dismiss</button></div>` : ""}
        </article>`;
      }).join("") || `<div class="surface-panel empty-state">No suggestions have been generated yet. The agents will each research once after all queued, active, and review tasks have cleared.</div>`}
    </div>
  `;
  const runButton = document.getElementById("btnRunSuggestions");
  if (runButton) runButton.addEventListener("click", runSuggestionsNow);
}

async function runSuggestionsNow() {
  const button = document.getElementById("btnRunSuggestions");
  if (button) {
    button.disabled = true;
    button.textContent = "Researching…";
  }
  try {
    await fetchJson("/api/suggestions/run", { method: "POST", body: {} });
    await loadAll();
    renderActiveTab(false);
    notify("Idle research finished", "success");
  } catch (e) {
    notify("Suggestions did not run: " + e.message, "error");
    await loadAll();
    renderActiveTab(false);
  }
}

function ceoStrategyText() {
  const company = state.profile.company_name || "your company";
  const details = state.profile.company_description || "Add your products and services to your profile for grounded company-specific work.";
  return `Pin2Pin is ready to support ${company}. Company profile: ${details}

No tasks are started automatically. Assign work to the team or create a recurring schedule for a specialist. Tasks run one at a time; external actions remain gated for your approval.

Configure an AI provider in Configuration to activate cloud-based agents.`;
}

function agentCardHtml(a, clickable = false) {
  const cls = ROLE_COLOR[a.role] || "";
  const statusBadge = {
    idle: '<span class="agent-badge badge-idle">Idle</span>',
    assigned: '<span class="agent-badge badge-assigned">Assigned</span>',
    working: '<span class="agent-badge badge-working">Working</span>',
    done: '<span class="agent-badge badge-done">Done</span>',
  }[a.status] || '<span class="agent-badge badge-idle">Idle</span>';
  let caps = [];
  try {
    caps = JSON.parse(a.capabilities || "[]");
  } catch (e) {
    caps = [];
  }
  const cur = a.current_task_id ? state.tasks.find((t) => t.id === a.current_task_id) : null;
  const activeStatuses = ["backlog", "assigned", "in_progress", "waiting_engineering", "review"];
  const openCount = state.tasks.filter((task) => task.assigned_agent_id === a.id && activeStatuses.includes(task.status)).length;
  const stars = Math.max(0, Number(a.appreciation_stars || 0));
  const starBadge = stars
    ? `<span class="agent-appreciation-badge" aria-label="${stars} appreciation stars">${icon("star", 14)} ${stars}</span>`
    : "";
  const dataId = clickable ? ` data-agent-id="${esc(a.id)}"` : "";
  return `
    <div class="agent-card ${cls}"${dataId} style="${clickable ? "cursor:pointer" : ""}">
      <div class="agent-head">
        <div class="agent-avatar">${agentIcon(a, 40)}</div>
        <div class="agent-info">
          <div class="agent-name">${esc(a.name)}</div>
          <div class="agent-role">${esc(a.role)}</div>
        </div>
        <span class="agent-card-badges">${statusBadge}${starBadge}</span>
      </div>
      <div class="agent-card-stats">${openCount} tasks open · ${Number(a.completed_count || 0)} completed</div>
      <div class="agent-caps">${caps.map((capability) => esc(capability)).join(", ")}</div>
      ${cur ? `<div class="agent-current">Now: ${esc(cur.title)}</div>` : ""}
      ${clickable ? `<button class="btn btn-ghost btn-sm" data-chat-agent="${esc(a.name)}">${icon("chat", 16)} Chat</button>` : ""}
    </div>
  `;
}

function feedItemHtml(a) {
  return `<div class="feed-item">
    <div class="actor">${esc(a.actor)}</div>
    <div class="action">${esc(a.action)}</div>
    ${a.detail ? `<div class="detail">${esc(a.detail)}</div>` : ""}
    <div class="time">${new Date(a.timestamp).toLocaleTimeString()}</div>
  </div>`;
}

function taskOutputHtml(t) {
  const out = t.output || "";
  const mediaFiles = t.media_files || [];
  const mediaHtml = mediaFiles.length
    ? `<div class="task-media-assets">${mediaFiles.map((file) => {
      const source = `/api/files/${encodeURIComponent(file.id)}/preview`;
      const isVideo = file.mime_type.startsWith("video/");
      const mediaKind = isVideo ? "video" : "image";
      const preview = isVideo
        ? `<video controls preload="metadata" src="${esc(source)}"></video>`
        : `<img loading="lazy" src="${esc(source)}" alt="${esc(file.name)}">`;
      return `<figure>${preview}<figcaption><span>${esc(file.name)}</span><div class="task-media-actions">
        <button class="btn btn-outline btn-sm" data-preview-file="${esc(file.id)}" data-preview-name="${esc(file.name)}" data-preview-mime="${esc(file.mime_type)}">See ${mediaKind}</button>
        <button class="btn btn-outline btn-sm" data-download-file="${esc(file.id)}">${icon("download", 16)} Download ${mediaKind}</button>
      </div></figcaption></figure>`;
    }).join("")}</div>`
    : "";
  if (!out) return mediaHtml;
  const lines = out.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|") && l.endsWith("|"));
  let body = "";
  if (lines.length > 1) {
    const rows = [];
    let header = [];
    for (const l of lines) {
      const cells = [...l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|")].map((c) => c.trim());
      const isSep = cells.length > 0 && cells.every((c) => c && /^[-: ]+$/.test(c));
      if (isSep) continue;
      if (rows.length === 0) { header = cells; continue; }
      const row = cells.map((c) => {
        const m = c.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
        return m ? m[2] : c;
      });
      rows.push(row);
    }
    if (header) {
      body = `<div class="task-table-wrap task-scroll-preserve" data-scroll-key="output-table-${esc(t.id)}"><table class="task-table"><thead><tr>${header.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    }
  }
  if (!body) body = `<div class="task-out task-scroll-preserve" data-scroll-key="output-text-${esc(t.id)}">${esc(out)}</div>`;
  const extension = esc(t.export_extension || "txt");
  const formatLabel = extension === "csv" ? "CSV" : extension.toUpperCase();
  return `${mediaHtml}<details class="task-output" data-output-task="${esc(t.id)}"><summary>View output</summary>${body}</details>
       <button class="btn btn-outline btn-sm" data-export-task="${esc(t.id)}">${icon("download", 16)} Download ${formatLabel}</button>`;
}

function openTaskMediaPreview(fileId, filename, mimeType) {
  const content = document.getElementById("content");
  const existing = document.getElementById("taskMediaPreviewOverlay");
  if (existing) existing.remove();
  const source = `/api/files/${encodeURIComponent(fileId)}/preview`;
  const preview = mimeType.startsWith("video/")
    ? `<video controls autoplay src="${esc(source)}"></video>`
    : `<img src="${esc(source)}" alt="${esc(filename)}">`;
  const overlay = document.createElement("div");
  state.modalReturnFocus = document.activeElement;
  overlay.id = "taskMediaPreviewOverlay";
  overlay.className = "task-media-preview-overlay";
  overlay.innerHTML = `<section class="task-media-preview-dialog" role="dialog" aria-modal="true" aria-label="${esc(filename)}">
    <header><span>${esc(filename)}</span>    <button class="icon-btn" data-close-media-preview aria-label="Close preview" title="Close preview">${icon("x", 18)}</button></header>
    ${preview}
  </section>`;
  content.appendChild(overlay);
  overlay.querySelector("[data-close-media-preview]")?.focus({ preventScroll: true });
}

function formatTaskDuration(seconds) {
  const mins = Math.max(1, Math.ceil(Number(seconds || 0) / 60));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
}

function taskEtaText(task) {
  const eta = task.estimated_remaining_seconds;
  if (task.status !== "in_progress") return "";
  if (task.taking_longer_than_estimate) {
    return `Taking longer than usual (typical run: ${formatTaskDuration(task.estimated_duration_seconds)}).`;
  }
  if (eta === null || eta === undefined) return "ETA unavailable";
  return `About ${formatTaskDuration(eta)} remaining (estimate).`;
}

function taskProgressHtml(task) {
  if (!task.progress_summary && !["assigned", "in_progress", "waiting_engineering"].includes(task.status)) return "";
  const active = task.status === "in_progress";
  const showTrack = active || ["review", "done", "blocked"].includes(task.status);
  const percent = active
    ? Math.max(3, Math.min(99, Number(task.progress_percent || 3)))
    : Math.max(0, Math.min(100, Number(task.progress_percent || (["review", "done"].includes(task.status) ? 100 : 0))));
  const etaText = active ? taskEtaText(task) : "";
  const summary = task.progress_summary
    || (task.status === "assigned"
    ? `Queued for ${task.agent_name || "the assigned agent"}; waiting for the worker to start.`
    : "Waiting for Engineering to return the implementation.");
  return `<div class="task-live-progress${active ? " is-active" : ""}" data-progress-for="${esc(task.id)}">
    <div class="task-progress-heading"><b>${active ? "Live progress" : esc(statusLabel(task.status))}</b>${showTrack ? `<span>${percent}%</span>` : ""}</div>
    ${showTrack ? `<div class="task-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="width:${percent}%"></i></div>` : ""}
    <p>${esc(summary)}</p>
    ${etaText ? `<small>${esc(etaText)}</small>` : ""}
    </div>`;
}

function updateTaskProgressElement(task, root) {
  const existing = [...root.querySelectorAll("[data-progress-for]")]
    .find((element) => element.dataset.progressFor === task.id);
  const html = taskProgressHtml(task);
  if (existing) {
    if (html) existing.outerHTML = html;
    else existing.remove();
    return;
  }
  if (!html) return;
  const card = [...root.querySelectorAll(".task-card")]
    .find((element) => element.dataset.taskId === task.id);
  const overlay = root.querySelector("#taskDetailsOverlay");
  const target = card || (overlay && overlay.querySelector(".task-details-dialog"));
  if (!target) return;
  const anchor = target.querySelector(".task-output, .task-actions, .task-meta");
  if (anchor) anchor.insertAdjacentHTML("beforebegin", html);
  else target.insertAdjacentHTML("beforeend", html);
}

function updateTaskProgressDom(task, previous) {
  const root = document.getElementById("content");
  if (!root) return;
  const cards = [...root.querySelectorAll(".task-card")]
    .filter((element) => element.dataset.taskId === task.id);
  cards.forEach((card) => {
    updateTaskProgressElement(task, card);
    if (previous && previous.status !== task.status) {
      card.dataset.status = task.status;
      const badge = card.querySelector(".task-agent .tag");
      if (badge) {
        badge.className = `tag tag-${task.status}`;
        badge.textContent = statusLabel(task.status);
      }
      if (card.closest(".board")) {
        const destination = root.querySelector(`[data-board-status="${task.status}"] .board-col-body`);
        if (destination) destination.appendChild(card);
        root.querySelectorAll(".board-col").forEach((column) => {
          const count = column.querySelectorAll(".task-card").length;
          const label = column.querySelector(".board-col-count");
          if (label) label.textContent = String(count);
        });
      }
    }
  });
  const dashboardRow = [...root.querySelectorAll("[data-open-task]")]
    .find((element) => element.dataset.openTask === task.id);
  if (dashboardRow) {
    if (previous && previous.status !== task.status) {
      const badge = dashboardRow.querySelector(".dashboard-task-status");
      if (badge) {
        badge.className = `dashboard-task-status status-${task.status}`;
        badge.textContent = statusLabel(task.status);
      }
    }
    let summary = dashboardRow.querySelector("[data-task-progress-summary]");
    if (task.progress_summary) {
      const text = `${task.progress_summary}${task.status === "in_progress" && task.estimated_remaining_seconds != null ? ` · ~${formatTaskDuration(task.estimated_remaining_seconds)} left` : ""}`;
      if (summary) summary.textContent = text;
      else dashboardRow.querySelector(".dashboard-task-title")?.insertAdjacentHTML(
        "beforeend",
        `<small class="dashboard-task-progress" data-task-progress-summary="${esc(task.id)}">${esc(text)}</small>`,
      );
    } else if (summary) {
      summary.remove();
    }
  }
  const overlay = root.querySelector("#taskDetailsOverlay");
  if (overlay) {
    const title = overlay.querySelector("#taskDetailsTitle");
    if (title && title.dataset.taskId === task.id) {
      const badge = overlay.querySelector(".task-details-meta .tag");
      if (badge) {
        badge.className = `tag tag-${task.status}`;
        badge.textContent = statusLabel(task.status);
      }
      updateTaskProgressElement(task, overlay);
    }
  }
}

function startTaskProgressPolling() {
  if (state.taskProgressTimer) clearInterval(state.taskProgressTimer);
  state.taskProgressTimer = setInterval(async () => {
    const trackedStatuses = new Set(["assigned", "in_progress", "waiting_engineering"]);
    if (!state.tasks.some((task) => trackedStatuses.has(task.status))) return;
    if (state.busy.taskProgress) return;
    state.busy.taskProgress = true;
    try {
      const latest = await fetchJson("/api/tasks");
      const previousById = new Map(state.tasks.map((task) => [task.id, task]));
      const boardNeedsRefresh = latest.some((task) => {
        const previous = previousById.get(task.id);
        return previous && (
          previous.status !== task.status
          || Boolean(previous.output) !== Boolean(task.output)
          || previous.needs_approval !== task.needs_approval
        );
      });
      const hasFinishedTask = latest.some((task) => {
        const previous = previousById.get(task.id);
        return previous && trackedStatuses.has(previous.status) && !trackedStatuses.has(task.status);
      });
      const hasNewOutput = latest.some((task) => {
        const previous = previousById.get(task.id);
        return previous && !previous.output && task.output;
      });
      state.tasks = latest;

      try {
        state.agents = await fetchJson("/api/agents");
        renderBottomPanel();
      } catch (error) {
        console.warn("Agent status refresh failed:", error.message);
      }

      if (state.activeTab === "tasks" && boardNeedsRefresh) {
        renderActiveTab(true);
      } else {
        latest.forEach((task) => {
          const previous = previousById.get(task.id);
          if (previous && (trackedStatuses.has(previous.status) || task.status !== previous.status)) {
            updateTaskProgressDom(task, previous);
          }
        });
      }

      if (hasFinishedTask || hasNewOutput) {
        try {
          state.files = await fetchJson("/api/files");
          if (state.activeTab === "files") renderActiveTab(true);
        } catch (error) {
          console.warn("Generated file refresh failed:", error.message);
        }
      }
    } catch (error) {
      console.warn("Task progress refresh failed:", error.message);
    } finally {
      state.busy.taskProgress = false;
    }
  }, 3000);
}

function taskCardHtml(t, compact = false) {
  const agent = state.agents.find((ag) => ag.id === t.assigned_agent_id);
  const needs = t.needs_approval ? " needs-approval" : "";
  const prio = t.priority === "high" ? " priority-high" : "";
  const agentName = agent ? esc(agentShortName(agent.role)) : "—";
  const hasOutput = Boolean(t.output || (t.media_files || []).length);
  const output = hasOutput ? taskOutputHtml(t) : "";
  const canArchive = ["done", "rejected", "blocked"].includes(t.status);
  const isArchived = Boolean(t.archived_at);
  const actions = t.needs_approval
    ? `<div class="task-actions">
         <button class="btn btn-success btn-sm" data-approve-task="${esc(t.id)}">${icon("check", 16)} Approve</button>
         <button class="btn btn-danger btn-sm" data-reject-task="${esc(t.id)}">${icon("x", 16)} Reject</button>
       </div>`
    : ["done", "rejected", "blocked"].includes(t.status)
      ? `<div class="task-actions">
           ${t.status === "blocked" ? `<button class="btn btn-outline btn-sm" data-retry-task="${esc(t.id)}">${icon("refresh", 16)} Retry task</button>` : ""}
           <button class="btn btn-primary btn-sm" data-task-chat="${esc(t.id)}">${icon("chat", 16)} Discuss / resume</button>
         </div>`
      : "";
  const taskType = t.execution_mode === "project" ? '<span class="task-type">Project change</span>' : "";
  return `
    <div class="task-card${needs}${prio}${isArchived ? " task-card-archived" : ""}" data-task-id="${esc(t.id)}" data-status="${esc(t.status)}" tabindex="0">
      <div class="task-agent">${agentName} <span class="tag tag-${esc(t.status)}">${esc(statusLabel(t.status))}</span>${isArchived ? `<span class="task-archived-label">Archived</span>` : ""}</div>
      <div class="task-title">${esc(t.title)}</div>
      ${taskType}
      ${compact ? "" : `<div class="task-desc">${esc(t.description)}</div>`}
      ${t.result ? `<div class="task-result">${esc(t.result)}</div>` : ""}
      ${taskProgressHtml(t)}
      ${output}
      ${actions}
      ${canArchive && !isArchived ? `<div class="task-actions"><button class="btn btn-outline btn-sm" data-archive-task="${esc(t.id)}">Hide from board</button></div>` : ""}
      ${isArchived ? `<div class="task-actions"><button class="btn btn-outline btn-sm" data-restore-task="${esc(t.id)}">Restore to board</button></div>` : ""}
      <div class="task-meta"><span>Priority: ${esc(t.priority)}</span><span>${t.needs_approval ? `${icon("warning", 14)} Needs your approval` : (t.status === "done" ? `${icon("check", 14)} Complete` : (t.execution_mode === "project" ? `${icon("code", 14)} Changes applied in project` : "—"))}</span></div>
    </div>`;
}

function openTaskDetails(taskId) {
    const task = state.tasks.find((item) => item.id === taskId)
      || state.archivedTasks.find((item) => item.id === taskId);
    if (!task) {
      notify("That task is no longer available. Refresh to load the latest task list.", "error");
      return;
    }
    const existing = document.getElementById("taskDetailsOverlay");
    if (existing) existing.remove();
    const agent = state.agents.find((item) => item.id === task.assigned_agent_id);
    const overlay = document.createElement("div");
    state.modalReturnFocus = document.activeElement;
    overlay.id = "taskDetailsOverlay";
    overlay.className = "task-details-overlay";
    overlay.innerHTML = `
      <section class="task-details-dialog" role="dialog" aria-modal="true" aria-labelledby="taskDetailsTitle">
        <header class="task-details-header">
          <div><div class="eyebrow">TASK DETAILS</div><h2 id="taskDetailsTitle" data-task-id="${esc(task.id)}">${esc(task.title)}</h2></div>
          <button class="icon-btn" data-close-task-details aria-label="Close task details" title="Close task details">${icon("x", 18)}</button>
        </header>
        <div class="task-details-meta">
          <span class="tag tag-${esc(task.status)}">${esc(statusLabel(task.status))}</span>
          <span>Owner: ${esc(agent ? agent.name : "Unassigned")}</span>
          <span>Priority: ${esc(task.priority)}</span>
          <span>Updated: ${new Date(task.updated_at).toLocaleString()}</span>
        </div>
        ${task.execution_mode === "project" ? `<div class="task-type">Project change</div>` : ""}
        <h3>Task</h3><p class="task-details-description">${esc(task.description || "No description was provided.")}</p>
        ${taskProgressHtml(task)}
        ${task.result ? `<h3>Latest update</h3><p class="task-details-result">${esc(task.result)}</p>` : ""}
        ${task.output || (task.media_files || []).length ? `<h3>Agent output</h3><div class="task-details-output">${taskOutputHtml(task)}</div>` : `<div class="task-details-empty">No output has been recorded yet.</div>`}
        ${task.needs_approval ? `<div class="task-actions"><button class="btn btn-success btn-sm" data-approve-task="${esc(task.id)}">Approve</button><button class="btn btn-danger btn-sm" data-reject-task="${esc(task.id)}">Reject</button></div>` : ""}
        ${task.status === "blocked" ? `<div class="task-actions"><button class="btn btn-outline btn-sm" data-retry-task="${esc(task.id)}">Retry task</button></div>` : ""}
        ${["done", "rejected", "blocked"].includes(task.status) ? `<div class="task-actions"><button class="btn btn-primary btn-sm" data-task-chat="${esc(task.id)}">${icon("chat", 16)} Discuss / resume this task</button></div>` : ""}
        ${task.archived_at ? `<div class="task-actions"><button class="btn btn-outline btn-sm" data-restore-task="${esc(task.id)}">Restore to board</button></div>` : ""}
        ${["done", "rejected", "blocked"].includes(task.status) && !task.archived_at ? `<div class="task-actions"><button class="btn btn-outline btn-sm" data-archive-task="${esc(task.id)}">Hide from board (keep in memory)</button></div>` : ""}
      </section>
    `;
    document.getElementById("content").appendChild(overlay);
    overlay.querySelector("button[data-close-task-details]")?.focus({ preventScroll: true });
    saveLastView();
}

function taskChatMessageHtml(message) {
  const isOwner = message.sender === "user";
  const parent = message.reply_to_id
    ? state.taskChatMessages.find((item) => item.id === message.reply_to_id)
    : null;
  const text = esc(message.content).replace(/\n/g, "<br>");
  return `<div class="msg ${isOwner ? "me" : "them"}">
    <div style="font-weight:700;font-size:12px;margin-bottom:2px;">${isOwner ? "You" : esc(message.sender)}</div>
    ${parent ? `<div class="msg-quoted"><b>${parent.sender === "user" ? "You" : esc(parent.sender)}</b> · ${esc(parent.content.slice(0, 180))}</div>` : ""}
    ${text}
    <span class="msg-time">${new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
    <button class="msg-reply" type="button" data-reply-task-message="${esc(message.id)}">↩ Reply</button>
  </div>`;
}

async function openTaskChat(taskId) {
  state.taskChatTaskId = taskId;
  state.taskChatReplyToId = null;
  try {
    state.taskChatMessages = await fetchJson(`/api/tasks/${encodeURIComponent(taskId)}/chat`);
    const task = state.tasks.find((item) => item.id === taskId)
      || state.archivedTasks.find((item) => item.id === taskId);
    if (!task) throw new Error("Task details are no longer available.");
    const existing = document.getElementById("taskChatOverlay");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    state.modalReturnFocus = document.activeElement;
    overlay.id = "taskChatOverlay";
    overlay.className = "task-chat-overlay";
    overlay.innerHTML = `
      <section class="task-chat-dialog" role="dialog" aria-modal="true" aria-labelledby="taskChatTitle">
        <header class="task-details-header">
          <div><div class="eyebrow">TASK-ONLY CONVERSATION · ${esc(statusLabel(task.status).toUpperCase())}</div><h2 id="taskChatTitle">${esc(task.title)}</h2></div>
          <button class="icon-btn" data-close-task-chat aria-label="Close task conversation" title="Close task conversation">${icon("x", 18)}</button>
        </header>
        <p class="task-chat-hint">This chat is scoped to this task. Ask about the blocker or output, or say “resume from last” / “apply this change” to continue the same task.</p>
        <div class="task-chat-messages" id="taskChatMessages">${state.taskChatMessages.map(taskChatMessageHtml).join("") || `<div class="empty-state">No task discussion yet. Ask a question or describe what should change.</div>`}</div>
        <form class="task-chat-input" id="taskChatForm">
          <input id="taskChatInput" maxlength="4000" autocomplete="off" placeholder="Discuss this task, or ask to resume it…">
          <button class="btn btn-primary" type="submit">Send</button>
        </form>
      </section>`;
    document.getElementById("content").appendChild(overlay);
    overlay.querySelector("#taskChatMessages").scrollTop = overlay.querySelector("#taskChatMessages").scrollHeight;
    overlay.querySelector("[data-close-task-chat]").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#taskChatForm").addEventListener("submit", (event) => {
      event.preventDefault();
      sendTaskChatMessage();
    });
    overlay.querySelector("#taskChatMessages").addEventListener("click", (event) => {
      const reply = event.target.closest("[data-reply-task-message]");
      if (!reply) return;
      state.taskChatReplyToId = reply.dataset.replyTaskMessage;
      const parent = state.taskChatMessages.find((item) => item.id === state.taskChatReplyToId);
      const input = overlay.querySelector("#taskChatInput");
      input.placeholder = parent ? `Replying to ${parent.sender}: ${parent.content.slice(0, 70)}` : "Discuss this task…";
      input.focus({ preventScroll: true });
    });
    overlay.querySelector("#taskChatInput").focus({ preventScroll: true });
  } catch (error) {
    notify("Could not open task conversation: " + error.message, "error");
  }
}

async function sendTaskChatMessage() {
  const input = document.getElementById("taskChatInput");
  if (!input || !input.value.trim() || !state.taskChatTaskId) return;
  const content = input.value.trim();
  const replyToId = state.taskChatReplyToId;
  input.value = "";
  input.disabled = true;
  try {
    const response = await fetchJson(`/api/tasks/${encodeURIComponent(state.taskChatTaskId)}/chat`, {
      method: "POST",
      body: { content, reply_to_id: replyToId },
    });
    state.taskChatMessages = response.messages || [];
    state.taskChatReplyToId = null;
    input.placeholder = "Discuss this task, or ask to resume it…";
    const list = document.getElementById("taskChatMessages");
    if (list) {
      list.innerHTML = state.taskChatMessages.map(taskChatMessageHtml).join("");
      list.scrollTop = list.scrollHeight;
    }
    if (response.resumed) notify("Same task queued with your new instructions", "success");
    await loadAll();
  } catch (error) {
    input.value = content;
    notify("Could not send task message: " + error.message, "error");
  } finally {
    input.disabled = false;
    input.focus({ preventScroll: true });
  }
}

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

function renderTeam() {
  const selectedAgent = state.selectedAgentId
    ? state.agents.find((a) => a.id === state.selectedAgentId)
    : null;
  if (selectedAgent) {
    renderAgentDetail(selectedAgent);
    return;
  }

  const workerOptions = state.agents
    .filter((a) => a.role !== "Chief Executive Officer")
    .map((a) => `<option value="${esc(a.id)}">${esc(a.name)} — ${esc(a.role)}</option>`)
    .join("");

  document.getElementById("content").innerHTML = `
    <div class="section">
      <div class="section-title">Team members</div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:12px;">Click any agent to see their tasks, outputs, messages and activity.</p>
      <div class="agent-grid">${state.agents.map((a) => agentCardHtml(a, true)).join("")}</div>
    </div>

    <div class="section">
      <div class="section-title">Create a specialist agent</div>
      <form id="createAgentForm" class="card" style="max-width:620px;display:grid;gap:12px;">
        <label>Name<input name="name" maxlength="60" required placeholder="e.g. Product Analyst"></label>
        <label>Role<input name="job_title" maxlength="60" required placeholder="e.g. Market Research Specialist"></label>
        <label>Icon label<input name="display_icon" maxlength="12" placeholder="Optional short label"></label>
        <label>Responsibilities<textarea name="job_profile" maxlength="3000" rows="4" required placeholder="Describe the agent's expertise, responsibilities, and how it should deliver work."></textarea></label>
        <button class="btn btn-accent" type="submit">${icon("plus", 16)} Create agent</button>
      </form>
    </div>

    <div class="section" id="assignWorkSection">
      <div class="section-title">Assign a task</div>
      <div class="card" style="max-width:620px;">
        <div class="input-wrap">
          <label>Task title</label>
          <input id="newTaskTitle" placeholder="e.g. Research prop firms using Alpaca">
        </div>
        <div class="input-wrap">
          <label>Description</label>
          <textarea id="newTaskDesc" placeholder="What should this agent do?"></textarea>
        </div>
        <div class="input-wrap">
          <label>Assign to</label>
          <select id="newTaskAgent">
            <option value="">Auto-assign (CEO decides)</option>
            ${workerOptions}
          </select>
        </div>
        <div class="input-wrap">
          <label>Priority</label>
          <select id="newTaskPriority">
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div class="input-wrap">
          <label>How should the team deliver?</label>
          <select id="newTaskMode">
            <option value="deliverable">Create a written deliverable</option>
            <option value="project">Make changes directly in my project (Codex CLI)</option>
          </select>
          <div class="config-hint">Project changes run in the configured workspace with Codex's workspace-write sandbox. Review changes in your project after the task.</div>
        </div>
        <button class="btn btn-accent" id="btnCreateTask">${icon("plus", 18)} Create task</button>
      </div>
    </div>
  `;

  const btn = document.getElementById("btnCreateTask");
  if (btn) btn.addEventListener("click", createTaskFromUI);
  const createAgentForm = document.getElementById("createAgentForm");
  if (createAgentForm) createAgentForm.addEventListener("submit", createAgentFromUI);
}

function renderAgentDetail(agent) {
  const agentTasks = state.tasks.filter((t) => t.assigned_agent_id === agent.id);
  const agentMessages = state.messages.filter((m) => m.sender === agent.name || m.receiver === agent.name);
  const agentActivity = state.activity.filter((a) => a.actor === agent.name);
  const schedules = state.agentSchedules.filter((schedule) => schedule.agent_id === agent.id);
  const stars = Math.max(0, Number(agent.appreciation_stars || 0));
  const starBadge = stars
    ? `<div class="agent-appreciation-badge" aria-label="${stars} appreciation stars"><span>${Array.from({ length: Math.min(3, stars) }, () => icon("star", 14)).join("")}</span>${stars > 3 ? `<b>+${stars - 3} more</b>` : ""}</div>`
    : "";
  let caps = [];
  try {
    caps = JSON.parse(agent.capabilities || "[]");
  } catch (e) {
    caps = [];
  }
  const statusBadge = {
    idle: '<span class="agent-badge badge-idle">Idle</span>',
    assigned: '<span class="agent-badge badge-assigned">Assigned</span>',
    working: '<span class="agent-badge badge-working">Working</span>',
    done: '<span class="agent-badge badge-done">Done</span>',
  }[agent.status] || '<span class="agent-badge badge-idle">Idle</span>';

  document.getElementById("content").innerHTML = `
    <div class="section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <button class="btn btn-outline btn-sm" data-back-team="1">${icon("chevron-left", 16)} Back to Team</button>
        <div style="font-size:13px;color:var(--muted);">Agent Detail</div>
      </div>
      <div class="card" style="max-width:760px;">
        <div class="agent-head">
          <div class="agent-avatar agent-detail-avatar">${agentIcon(agent, 72)}</div>
          <div class="agent-info">
            <div class="agent-name">${esc(agent.name)}</div>
            <div class="agent-role">${esc(agent.role)}</div>
          </div>
          ${statusBadge}
        </div>
        ${starBadge}
        <div class="agent-caps" style="margin-top:10px;">Capabilities: ${caps.map((capability) => esc(capability)).join(", ")}</div>
        <div class="agent-profile-stats">
          <span><b>${Number(agent.task_count || 0)}</b> tasks</span>
          <span><b>${Number(agent.completed_count || 0)}</b> completed</span>
          <span><b>${Number(agent.blocked_count || 0)}</b> blocked</span>
          <span><b>${Number(agent.rejected_count || 0)}</b> rejected</span>
        </div>
        <div class="agent-job-profile"><b>Job profile</b><p>${esc(agent.job_profile || agent.role)}</p></div>
        <div class="agent-current" style="margin-top:8px;">Current task: ${agent.current_task_id ? esc((state.tasks.find((t) => t.id === agent.current_task_id) || {}).title || "—") : "None"}</div>
        <details class="agent-profile-editor">
          <summary>Edit agent profile</summary>
          <form id="agentProfileForm" data-agent-profile="${esc(agent.id)}">
            <label>Display name<input name="name" maxlength="60" required value="${esc(agent.name)}"></label>
            ${agent.is_custom ? `<label>Job title<input name="job_title" maxlength="60" required value="${esc(agent.role)}"></label>` : ""}
            <label>Icon label<input name="display_icon" maxlength="12" value="${esc(agent.display_icon || "")}" placeholder="Optional short label"></label>
            <label>Job profile<textarea name="job_profile" maxlength="3000" rows="4" required>${esc(agent.job_profile || agent.role)}</textarea></label>
            <label>Report voice profile<input name="voice_profile" maxlength="120" value="${esc(agent.voice_profile || "")}" placeholder="Optional browser voice name"></label>
            <small>Role identity stays fixed for task routing. Voice availability depends on voices installed in your browser/OS.</small>
            <button class="btn btn-primary btn-sm" type="submit">Save profile</button>
          </form>
        </details>
        <section class="agent-schedule-section">
          <h3>Recurring work</h3>
          <p>Schedules use this computer's local time. Each run enters the shared queue and waits its turn.</p>
          <div class="agent-schedule-list">${schedules.map((schedule) => `
            <article class="agent-schedule-card">
              <div><b>${esc(schedule.title)}</b><small>${esc(schedule.frequency)} · ${esc(schedule.local_time)}${schedule.weekday !== null && schedule.weekday !== undefined ? ` · ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][Number(schedule.weekday)] || ""}` : ""}</small></div>
              <button class="btn btn-outline btn-sm" data-delete-schedule="${esc(schedule.id)}">Cancel</button>
            </article>`).join("") || `<div class="empty-state">No recurring work scheduled.</div>`}</div>
          ${agent.role !== "Chief Executive Officer" ? `
            <form id="agentScheduleForm" data-agent-schedule="${esc(agent.id)}">
              <label>Task title<input name="title" maxlength="120" required placeholder="e.g. Review competitor updates"></label>
              <label>Instructions<textarea name="description" maxlength="3000" rows="3" required placeholder="Describe the work to run each time."></textarea></label>
              <div class="agent-schedule-fields">
                <label>Repeats<select name="frequency"><option value="daily">Every day</option><option value="weekly">Every week</option></select></label>
                <label>Local time<input name="local_time" type="time" required value="09:00"></label>
                <label>Weekday<select name="weekday"><option value="0">Monday</option><option value="1">Tuesday</option><option value="2">Wednesday</option><option value="3">Thursday</option><option value="4">Friday</option><option value="5">Saturday</option><option value="6">Sunday</option></select></label>
              </div>
              <button class="btn btn-primary btn-sm" type="submit">Schedule recurring task</button>
            </form>` : ""}
        </section>
      </div>

      <div style="display:flex;gap:10px;margin:14px 0;">
        <button class="btn btn-primary" data-chat-agent="${esc(agent.name)}">${icon("chat", 18)} Chat with ${esc(agent.name)}</button>
        <button class="btn btn-outline" id="btnRefreshAgent">${icon("refresh", 18)} Refresh</button>
        ${agent.role !== "Chief Executive Officer" ? `<button class="btn btn-outline btn-danger" data-delete-agent="${esc(agent.id)}">Delete agent</button>` : ""}
      </div>

      <div class="section-title" style="margin-bottom:8px;">${icon("tasks", 16)} Tasks (${agentTasks.length})</div>
      <div style="max-width:760px;">
        ${agentTasks.map((t) => taskCardHtml(t)).join("") || "<div class='empty'>No tasks assigned yet.</div>"}
      </div>

      <div class="section-title mt-8" style="margin-bottom:8px;">${icon("chat", 16)} Recent messages</div>
      <div class="msg-list" style="max-width:760px;">
        ${agentMessages.map((m) => messageHtml(m)).join("") || "<div class='empty'>No messages yet.</div>"}
      </div>

      <div class="section-title mt-8" style="margin-bottom:8px;">${icon("activity", 16)} Recent activity</div>
      <div style="max-width:760px;">
        ${agentActivity.map((a) => feedItemHtml(a)).join("") || "<div class='empty'>No activity yet.</div>"}
      </div>
    </div>
  `;

  const refresh = document.getElementById("btnRefreshAgent");
  if (refresh) {
    refresh.addEventListener("click", async () => {
      await loadAll();
      renderAgentDetail(agent);
      mountPageHeading("team");
      highlightSectionHeadings(document.getElementById("content"));
    });
  }
  const profileForm = document.getElementById("agentProfileForm");
  if (profileForm) profileForm.addEventListener("submit", saveAgentProfile);
  const scheduleForm = document.getElementById("agentScheduleForm");
  if (scheduleForm) scheduleForm.addEventListener("submit", createAgentSchedule);
}

async function saveAgentProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const agentId = form.getAttribute("data-agent-profile");
  const payload = {
    name: form.elements.name.value.trim(),
    job_title: form.elements.job_title ? form.elements.job_title.value.trim() : null,
    display_icon: form.elements.display_icon.value.trim(),
    job_profile: form.elements.job_profile.value.trim(),
    voice_profile: form.elements.voice_profile.value.trim(),
  };
  try {
    await fetchJson(`/api/agents/${encodeURIComponent(agentId)}`, { method: "PUT", body: payload });
    state.selectedAgentId = agentId;
    await loadAll();
    renderActiveTab(false);
    notify("Agent profile saved", "success");
  } catch (error) {
    notify("Could not save agent profile: " + error.message, "error");
  }
}

async function createAgentFromUI(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      name: form.elements.name.value.trim(),
      job_title: form.elements.job_title.value.trim(),
      display_icon: form.elements.display_icon.value.trim(),
      job_profile: form.elements.job_profile.value.trim(),
    };
    try {
      const result = await fetchJson("/api/agents", { method: "POST", body: payload });
      await loadAll();
      state.selectedAgentId = result.id;
      renderActiveTab(false);
      notify("Specialist agent created", "success");
    } catch (error) {
      notify("Could not create agent: " + error.message, "error");
    }
  }

async function createAgentSchedule(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const frequency = form.elements.frequency.value;
    const payload = {
      title: form.elements.title.value.trim(),
      description: form.elements.description.value.trim(),
      frequency,
      local_time: form.elements.local_time.value,
      weekday: frequency === "weekly" ? Number(form.elements.weekday.value) : null,
    };
    try {
      await fetchJson(`/api/agents/${encodeURIComponent(form.dataset.agentSchedule)}/schedules`, {
        method: "POST",
        body: payload,
      });
      await loadAll();
      renderActiveTab(false);
      notify("Recurring work scheduled", "success");
    } catch (error) {
      notify("Could not schedule recurring work: " + error.message, "error");
    }
  }

async function deleteAgent(agentId) {
    const agent = state.agents.find((item) => item.id === agentId);
    if (!agent || !confirm(`Delete ${agent.name}? Its task history will be preserved. Open tasks must be reassigned first.`)) return;
    try {
      await fetchJson(`/api/agents/${encodeURIComponent(agentId)}`, { method: "DELETE" });
      state.selectedAgentId = null;
      await loadAll();
      renderActiveTab(false);
      notify("Agent deleted; history preserved", "success");
    } catch (error) {
      notify("Could not delete agent: " + error.message, "error");
    }
}

/* ------------------------------------------------------------------ */
/* Task board                                                          */
/* ------------------------------------------------------------------ */

function renderProject() {
  const project = state.project || {};
  const ready = !!project.codex_available;
  document.getElementById("content").innerHTML = `
    <div class="section">
      <div class="section-title">${icon("code", 18)} Let the team work in your project</div>
      <p class="project-intro">Choose the project folder once. Project tasks are assigned to Engineering, which uses the installed Codex CLI to read, edit, and test files in that folder instead of returning suggestions only.</p>
      <div class="card project-setup-card">
        <div class="input-wrap">
          <label for="projectWorkspace">Project folder path</label>
          <input id="projectWorkspace" type="text" spellcheck="false" placeholder="C:\\path\\to\\your\\project" value="${esc(project.workspace_path || "")}">
          <div class="config-hint">Use an absolute local path. Changes are limited by Codex's workspace-write sandbox; the agent is instructed not to commit or deploy.</div>
        </div>
        <div class="project-runtime ${ready ? "runtime-ready" : "runtime-missing"}">
          <span class="runtime-dot"></span>
          ${ready ? `Codex CLI found${project.codex_command ? `: ${esc(project.codex_command)}` : ""}` : "Codex CLI not found on the server PATH"}
        </div>
        <div class="project-actions">
          <button class="btn btn-primary" id="btnSaveWorkspace">Save project folder</button>
          <button class="btn btn-outline" id="btnClearWorkspace" ${project.workspace_path ? "" : "disabled"}>Clear folder</button>
          <button class="btn btn-outline" data-goto="tasks">Open task board</button>
        </div>
        ${!ready ? `<div class="notice-card project-notice"><div><b>Install Codex CLI and sign in</b><div class="config-hint">Project execution needs a working local Codex CLI installation. Text deliverables continue to use your configured AI provider.</div></div></div>` : ""}
      </div>
      <div class="card project-memory-card">
        <div class="section-title">Persistent project memory</div>
        <p class="config-hint">A short local file is included in future coding tasks so the agent can continue from prior completed work.</p>
        <pre class="project-memory">${esc(project.memory || "No project work has been completed yet.")}</pre>
      </div>
      <div class="project-workbench">
        <section class="project-log-panel">
          <header><div><div class="eyebrow">LIVE ENGINEERING OUTPUT</div><h3>Project run logs</h3></div>
            <button class="btn btn-outline btn-sm" data-refresh-project-panels>Refresh</button></header>
          <div class="project-log-lines" id="projectLogLines">${projectLogsHtml()}</div>
        </section>
        <section class="project-chat-panel">
          <header><div><div class="eyebrow">PRIVATE WORKSPACE CHAT</div><h3>Engineering <span>↔ You</span></h3></div></header>
          <div class="project-chat-messages" id="projectChatMessages">${state.projectMessages.map(projectMessageHtml).join("") || `<div class="empty-state">Ask Engineering about code, a task run, or any line in the logs.</div>`}</div>
          <form class="project-chat-input" id="projectChatForm">
            <input id="projectChatInput" maxlength="4000" autocomplete="off" placeholder="Ask Engineering about this project…">
            <button class="btn btn-primary" type="submit">Send</button>
          </form>
        </section>
      </div>
    </div>
  `;
  const save = document.getElementById("btnSaveWorkspace");
  if (save) save.addEventListener("click", () => saveProjectWorkspace(false));
  const clear = document.getElementById("btnClearWorkspace");
  if (clear) clear.addEventListener("click", () => saveProjectWorkspace(true));
  document.getElementById("projectChatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    sendProjectChatMessage();
  });
  document.getElementById("projectChatMessages").addEventListener("click", (event) => {
    const reply = event.target.closest("[data-reply-project-message]");
    if (!reply) return;
    state.projectReplyToId = reply.dataset.replyProjectMessage;
    const parent = state.projectMessages.find((item) => item.id === state.projectReplyToId);
    const input = document.getElementById("projectChatInput");
    input.placeholder = parent ? `Replying to ${parent.sender}: ${parent.content.slice(0, 70)}` : "Ask Engineering about this project…";
    input.focus({ preventScroll: true });
  });
  document.getElementById("projectLogLines").addEventListener("click", (event) => {
    const ask = event.target.closest("[data-ask-log]");
    if (!ask) return;
    const input = document.getElementById("projectChatInput");
    if (input) {
      input.value = `Explain this Engineering log line and what it means for the task "${ask.dataset.taskTitle}":\n${ask.dataset.askLog}`;
      input.focus({ preventScroll: true });
    }
  });
  const refresh = document.querySelector("[data-refresh-project-panels]");
  if (refresh) refresh.addEventListener("click", refreshProjectPanels);
  if (state.projectPollingTimer) clearInterval(state.projectPollingTimer);
  state.projectPollingTimer = setInterval(() => {
    if (state.activeTab === "project") refreshProjectPanels();
  }, 4000);
  refreshProjectPanels();
}

function projectMessageHtml(message) {
  const parent = message.reply_to_id
    ? state.projectMessages.find((item) => item.id === message.reply_to_id)
    : null;
  return `<div class="msg ${message.sender === "user" ? "me" : "them"}">
    <div style="font-weight:700;font-size:12px;margin-bottom:2px;">${message.sender === "user" ? "You" : esc(message.sender)}</div>
    ${parent ? `<div class="msg-quoted"><b>${parent.sender === "user" ? "You" : esc(parent.sender)}</b> · ${esc(parent.content.slice(0, 180))}</div>` : ""}
    ${esc(message.content).replace(/\n/g, "<br>")}
    <span class="msg-time">${new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
    <button class="msg-reply" type="button" data-reply-project-message="${esc(message.id)}">↩ Reply</button>
  </div>`;
}

function projectLogsHtml() {
  return state.projectLogs.length
    ? state.projectLogs.map((entry) => `<div class="project-log-row">
        <time>${esc(new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }))}</time>
        <b>${esc(entry.stream)}</b><span>${esc(entry.task_title || entry.task_id)}</span>
      <pre>${esc(entry.content)}</pre>
      <button class="project-log-ask" type="button" data-ask-log="${esc(entry.content)}" data-task-title="${esc(entry.task_title || entry.task_id)}">Ask Engineering</button>
      </div>`).join("")
    : `<div class="empty-state">Engineering output will appear here while a project task runs.</div>`;
}

async function refreshProjectPanels() {
  try {
    const [logs, messages] = await Promise.all([
      fetchJson("/api/project/logs?limit=500"),
      fetchJson("/api/project/chat"),
    ]);
    state.projectLogs = logs;
    state.projectMessages = messages;
    const logList = document.getElementById("projectLogLines");
    if (logList) {
      const nearBottom = logList.scrollHeight - logList.scrollTop - logList.clientHeight < 60;
      logList.innerHTML = projectLogsHtml();
      if (nearBottom) logList.scrollTop = logList.scrollHeight;
    }
    const chatList = document.getElementById("projectChatMessages");
    if (chatList) {
      const nearBottom = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 60;
      chatList.innerHTML = messages.map(projectMessageHtml).join("")
        || `<div class="empty-state">Ask Engineering about code, a task run, or any line in the logs.</div>`;
      if (nearBottom) chatList.scrollTop = chatList.scrollHeight;
    }
  } catch (error) {
    console.warn("Engineering workspace refresh failed:", error.message);
  }
}

async function sendProjectChatMessage() {
  const input = document.getElementById("projectChatInput");
  if (!input || !input.value.trim()) return;
  const content = input.value.trim();
  input.value = "";
  input.disabled = true;
  try {
    const data = await fetchJson("/api/project/chat", {
      method: "POST",
      body: { content, reply_to_id: state.projectReplyToId },
    });
    state.projectMessages = data.messages || [];
    state.projectReplyToId = null;
    input.placeholder = "Ask Engineering about this project…";
    await refreshProjectPanels();
  } catch (error) {
    input.value = content;
    notify("Engineering chat failed: " + error.message, "error");
  } finally {
    input.disabled = false;
    input.focus({ preventScroll: true });
  }
}

async function saveProjectWorkspace(clear) {
  const input = document.getElementById("projectWorkspace");
  const workspace_path = clear ? "" : (input ? input.value.trim() : "");
  try {
    const project = await fetchJson("/api/project/settings", {
      method: "POST",
      body: { workspace_path },
    });
    state.project = project;
    renderActiveTab(true);
    notify(clear ? "Project folder cleared" : "Project folder saved", "success");
  } catch (e) {
    notify("Could not save project folder: " + e.message, "error");
  }
}

function renderTasksBoard() {
  const cols = [
    { key: "backlog", title: "Backlog" },
    { key: "assigned", title: "To Do" },
    { key: "in_progress", title: "In Progress" },
    { key: "waiting_engineering", title: "Waiting for Engineering" },
    { key: "review", title: "CEO Review" },
    { key: "done", title: "Done" },
    { key: "rejected", title: "Rejected" },
    { key: "blocked", title: "Blocked" },
  ];
  const workerOptions = state.agents
    .filter((a) => a.role !== "Chief Executive Officer")
    .map((a) => `<option value="${esc(a.id)}">${esc(a.name)}</option>`)
    .join("");

  document.getElementById("content").innerHTML = `
    <div class="section">
      <div class="board-intro">
        <div><div class="eyebrow">EXECUTION CENTER</div><h2>Work, clearly moving forward.</h2><p>Assign an outcome, see who owns it, and review the actual result.</p></div>
        <button class="btn btn-accent" id="btnOpenBoardCreate">${icon("plus", 18)} New task</button>
      </div>
      <div class="board-toolbar">
        <label class="board-search"><span>${icon("search", 18)}</span><input id="taskSearch" type="search" placeholder="Search tasks, owners, or results…" aria-label="Search tasks"></label>
        <select id="taskStatusFilter" aria-label="Filter tasks by status"><option value="">All statuses</option>${cols.map((col) => `<option value="${col.key}">${col.title}</option>`).join("")}</select>
        <span class="board-task-total">${state.tasks.length} tasks</span>
        <button class="btn btn-outline btn-sm" id="toggleArchivedTasks">${state.showArchivedTasks ? "Hide archived" : "Show archived"}</button>
      </div>
      <details class="create-task-panel">
        <summary>${icon("plus", 16)} Assign a new task</summary>
        <div class="card" style="max-width:640px;margin-top:10px;">
          <div class="input-wrap">
            <label>Task title</label>
            <input id="boardTaskTitle" placeholder="What needs doing?">
          </div>
          <div class="input-wrap">
            <label>Description</label>
            <textarea id="boardTaskDesc" placeholder="Details for the agent…"></textarea>
          </div>
          <div class="flex" style="display:flex;gap:10px;">
            <div class="input-wrap" style="flex:1;">
              <label>Assign to</label>
              <select id="boardTaskAgent">
                <option value="">Auto-assign (CEO)</option>
                ${workerOptions}
              </select>
            </div>
            <div class="input-wrap" style="flex:1;">
              <label>Priority</label>
              <select id="boardTaskPriority">
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div class="input-wrap">
            <label>How should the team deliver?</label>
            <select id="boardTaskMode">
              <option value="deliverable">Create a written deliverable</option>
              <option value="project">Make changes directly in my project (Codex CLI)</option>
            </select>
            <div class="config-hint">Project changes run inside your configured workspace. <a href="#" data-goto="project">Set up the workspace first.</a></div>
          </div>
          <button class="btn btn-accent" id="btnBoardCreate">${icon("plus", 16)} Create task</button>
        </div>
      </details>
      <div class="board">
        ${cols.map((col) => {
          const tasks = state.tasks.filter((t) => t.status === col.key);
          return `
            <div class="board-col" data-board-status="${esc(col.key)}">
              <div class="board-col-header"><span>${col.title}</span><span class="board-col-count">${tasks.length}</span></div>
              <div class="board-col-body">${tasks.map((t) => taskCardHtml(t, true)).join("") || "<div class='empty'>—</div>"}</div>
            </div>`;
        }).join("")}
      </div>
      ${state.showArchivedTasks ? `
        <section class="archived-tasks-panel">
          <div class="panel-heading"><div><div class="eyebrow">TASK HISTORY</div><h3>Archived tasks</h3></div><span>${state.archivedTasks.length} saved</span></div>
          <div class="archived-task-list">${state.archivedTasks.map((task) => taskCardHtml(task, true)).join("") || `<div class="empty-state">No tasks have been archived.</div>`}</div>
        </section>` : ""}
    </div>
  `;

  const btn = document.getElementById("btnBoardCreate");
  if (btn) btn.addEventListener("click", createBoardTask);
  const openCreate = document.getElementById("btnOpenBoardCreate");
  if (openCreate) openCreate.addEventListener("click", () => {
    const panel = document.querySelector(".create-task-panel");
    if (panel) {
      panel.open = true;
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      document.getElementById("boardTaskTitle").focus({ preventScroll: true });
    }
  });
  const search = document.getElementById("taskSearch");
  const statusFilter = document.getElementById("taskStatusFilter");
  const archivedToggle = document.getElementById("toggleArchivedTasks");
  if (archivedToggle) archivedToggle.addEventListener("click", async () => {
    if (!state.showArchivedTasks) {
      try {
        const allTasks = await fetchJson("/api/tasks?include_archived=true");
        state.archivedTasks = allTasks.filter((task) => Boolean(task.archived_at));
        state.showArchivedTasks = true;
        renderActiveTab(false);
      } catch (error) {
        notify("Could not load archived tasks: " + error.message, "error");
      }
    } else {
      state.showArchivedTasks = false;
      renderActiveTab(false);
    }
  });
  const filterTasks = () => {
    const query = (search ? search.value : "").trim().toLowerCase();
    const status = statusFilter ? statusFilter.value : "";
    document.querySelectorAll(".board-col").forEach((column) => {
      let visible = 0;
      column.querySelectorAll(".task-card").forEach((card) => {
        const matchesText = !query || card.textContent.toLowerCase().includes(query);
        const matchesStatus = !status || card.dataset.status === status;
        card.hidden = !matchesText || !matchesStatus;
        if (!card.hidden) visible += 1;
      });
      const count = column.querySelector(".board-col-count");
      if (count) count.textContent = visible;
    });
  };
  if (search) search.addEventListener("input", filterTasks);
  if (statusFilter) statusFilter.addEventListener("change", filterTasks);
}

async function createBoardTask() {
  const title = document.getElementById("boardTaskTitle").value.trim();
  const description = document.getElementById("boardTaskDesc").value.trim();
  const agentId = document.getElementById("boardTaskAgent").value || null;
  const priority = document.getElementById("boardTaskPriority").value;
  const execution_mode = document.getElementById("boardTaskMode").value;
  if (!title) {
    notify("Enter a task title", "error");
    return;
  }
  try {
    await fetchJson("/api/tasks", { method: "POST", body: { title, description, assigned_agent_id: agentId, priority, execution_mode } });
    notify("Task created", "success");
    await loadAll();
    renderActiveTab(false);
  } catch (e) {
    notify("Could not create task: " + e.message, "error");
  }
}

async function createTaskFromUI() {
  const title = document.getElementById("newTaskTitle").value.trim();
  const description = document.getElementById("newTaskDesc").value.trim();
  const agentId = document.getElementById("newTaskAgent").value || null;
  const priority = document.getElementById("newTaskPriority").value;
  const execution_mode = document.getElementById("newTaskMode").value;
  if (!title) {
    notify("Enter a task title", "error");
    return;
  }
  try {
    await fetchJson("/api/tasks", { method: "POST", body: { title, description, assigned_agent_id: agentId, priority, execution_mode } });
    document.getElementById("newTaskTitle").value = "";
    document.getElementById("newTaskDesc").value = "";
    notify("Task created — the CEO/agent will pick it up", "success");
    await loadAll();
    renderActiveTab(false);
  } catch (e) {
    notify("Could not create task: " + e.message, "error");
  }
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

function renderChatTab() {
  const existingList = document.getElementById("msgList");
  const previousScroll = existingList ? existingList.scrollTop : 0;
  const wasNearBottom = existingList
    ? existingList.scrollHeight - existingList.scrollTop - existingList.clientHeight < 80
    : true;
  const receiver = state.chatReceiver || "CEO";
  const conversation = receiver === "user"
    ? state.messages.filter((message) => message.sender === "user" && message.receiver === "user")
    : state.messages.filter((message) =>
      (message.sender === "user" && message.receiver === receiver) ||
      (message.sender === receiver && message.receiver === "user")
    );
  const messages = conversation.map((message) => messageHtml(message, conversation)).join("");
  const typing = Object.keys(state.typing)
    .filter((name) => state.typing[name])
    .map((name) => `<div class="msg them typing">${esc(name)} is typing…</div>`)
    .join("");
  document.getElementById("content").innerHTML = `
    <div class="chat-panel">
      <div class="chat-panel-header">
        <div>
          <div style="font-weight:700;">${icon("chat", 16)} Team chat</div>
          <label class="chat-recipient-label" for="chatReceiverLive">Conversation with</label>
        </div>
        <select id="chatReceiverLive" aria-label="Choose who to chat with">${buildReceiverOptions()}</select>
      </div>
      <div class="msg-list" id="msgList">${messages}${typing}</div>
      <div class="chat-input-wrap">
        <input type="text" id="chatInput" placeholder="Message the team… (e.g. 'assign me a task', 'what's my status?')">
        <button class="btn btn-primary btn-sm" id="chatSend">Send</button>
      </div>
    </div>
  `;

  const list = document.getElementById("msgList");
  if (list) {
    list.scrollTop = wasNearBottom ? list.scrollHeight : previousScroll;
    list.addEventListener("scroll", () => { state.chatScrollTop = list.scrollTop; }, { passive: true });
    list.addEventListener("click", (event) => {
      const replyButton = event.target.closest("[data-reply-message]");
      if (replyButton) setTeamReply(replyButton.dataset.replyMessage, "chatInput");
    });
  }
  const sel = document.getElementById("chatReceiverLive");
  if (sel) {
    sel.value = state.chatReceiver;
    sel.addEventListener("change", (e) => {
      state.chatReceiver = e.target.value;
      const fixed = document.getElementById("chatReceiverFixed");
      if (fixed) fixed.value = state.chatReceiver;
      renderActiveTab(false);
    });
  }
  const send = document.getElementById("chatSend");
  if (send) send.addEventListener("click", () => sendChat("tab"));
  const input = document.getElementById("chatInput");
  if (input) input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat("tab");
    }
  });
}

function buildReceiverOptions() {
  const agents = state.agents.length
    ? state.agents
    : [{ name: "CEO", role: "Chief Executive Officer" }];
  const opts = agents.map((a) => `<option value="${esc(a.name)}">${agentIcon(a.role)} ${esc(a.name)} — ${esc(a.role)}</option>`).join("");
  return opts + `<option value="user">You (personal note)</option>`;
}

function messageHtml(m, conversation = state.messages) {
  const me = m.sender === "user";
  const cls = me ? "msg me" : m.sender === "system" ? "msg sys" : "msg them";
  const name = me ? "You" : esc(m.sender);
  const time = new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const body = esc(m.content).replace(/\n/g, "<br>");
  const parent = m.reply_to_id ? conversation.find((message) => message.id === m.reply_to_id) : null;
  return `<div class="${cls}">
    <div style="font-weight:700;font-size:12px;margin-bottom:2px;">${name}</div>
    ${parent ? `<div class="msg-quoted"><b>${esc(parent.sender === "user" ? "You" : parent.sender)}</b> · ${esc(parent.content.slice(0, 180))}</div>` : ""}
    ${body}
    <span class="msg-time">${time}</span>
    ${m.sender !== "system" ? `<button class="msg-reply" type="button" data-reply-message="${esc(m.id)}">↩ Reply</button>` : ""}
  </div>`;
}

function setTeamReply(messageId, inputId) {
  state.replyToMessageId = state.replyToMessageId === messageId ? null : messageId;
  const input = document.getElementById(inputId);
  const parent = state.messages.find((message) => message.id === state.replyToMessageId);
  if (input) {
    input.placeholder = parent
      ? `Replying to ${parent.sender === "user" ? "you" : parent.sender}: ${parent.content.slice(0, 80)}`
      : "Message the team…";
    input.focus({ preventScroll: true });
  }
}

async function sendChat(source) {
  const inputId = source === "fixed" ? "chatInputFixed" : "chatInput";
  const selectId = source === "fixed" ? "chatReceiverFixed" : "chatReceiverLive";
  const input = document.getElementById(inputId);
  const select = document.getElementById(selectId);
  if (!input) return;
  const text = input.value.trim();
  const receiver = (select && select.value) || state.chatReceiver || "CEO";
  if (!text) return;

  input.value = "";
  state.chatReceiver = receiver;
  state.busy.chat = true;

  // Optimistic message so the user sees it immediately.
  state.messages.push({
    id: "tmp_" + Date.now(),
    sender: "user",
    receiver,
    content: text,
    timestamp: new Date().toISOString(),
    read: 0,
    reply_to_id: state.replyToMessageId,
  });
  renderActiveTab(true);
  renderFixedChat(true);

  try {
    await fetchJson("/api/messages", {
      method: "POST",
      body: { sender: "user", receiver, content: text, reply_to_id: state.replyToMessageId },
    });

    if (receiver !== "user") {
      state.typing[receiver] = true;
      renderActiveTab(true);
      renderFixedChat(true);
      await fetchJson("/api/agent-reply", {
        method: "POST",
        body: { sender: "user", receiver, content: text, reply_to_id: state.replyToMessageId },
      });
    }
    state.replyToMessageId = null;
    await loadAll();
    renderActiveTab(true);
    renderFixedChat(true);
    checkApprovals();
  } catch (e) {
    state.messages.push({
      id: "err_" + Date.now(),
      sender: "system",
      receiver: "user",
      content: "\u{26A0} " + e.message,
      timestamp: new Date().toISOString(),
      read: 0,
    });
    renderActiveTab(true);
    renderFixedChat(true);
    notify("Chat error: " + e.message, "error");
  } finally {
    state.typing[receiver] = false;
    state.busy.chat = false;
    renderActiveTab(true);
    renderFixedChat(true);
  }
}

/* ------------------------------------------------------------------ */
/* Fixed chat popup                                                    */
/* ------------------------------------------------------------------ */

let fixedChatReceiverWired = false;

function renderFixedChat(preserve = false) {
  const list = document.getElementById("chatMessages");
  if (!list) return;
  const scrollTop = preserve ? list.scrollTop : null;
  const nearBottom = preserve
    ? list.scrollHeight - list.scrollTop - list.clientHeight < 80
    : true;
  const typing = Object.keys(state.typing)
    .filter((name) => state.typing[name])
    .map((name) => `<div class="msg them typing">${esc(name)} is typing…</div>`)
    .join("");
  list.innerHTML = state.messages.map(messageHtml).join("") + typing;
  list.scrollTop = nearBottom || scrollTop == null
    ? list.scrollHeight
    : Math.min(scrollTop, list.scrollHeight - list.clientHeight);
  if (!list.dataset.replyWired) {
    list.addEventListener("click", (event) => {
      const replyButton = event.target.closest("[data-reply-message]");
      if (replyButton) setTeamReply(replyButton.dataset.replyMessage, "chatInputFixed");
    });
    list.dataset.replyWired = "1";
  }

  const sel = document.getElementById("chatReceiverFixed");
  if (sel) {
    const current = sel.value || state.chatReceiver;
    sel.innerHTML = buildReceiverOptions();
    sel.value = current;
    if (!fixedChatReceiverWired) {
      sel.addEventListener("change", (e) => {
        state.chatReceiver = e.target.value;
        const live = document.getElementById("chatReceiverLive");
        if (live) live.value = state.chatReceiver;
      });
      fixedChatReceiverWired = true;
    }
  }

  const btn = document.getElementById("chatSendFixed");
  if (btn && !btn.dataset.wired) {
    btn.dataset.wired = "1";
    btn.addEventListener("click", () => sendChat("fixed"));
  }
  const input = document.getElementById("chatInputFixed");
  if (input && !input.dataset.wired) {
    input.dataset.wired = "1";
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChat("fixed");
      }
    });
  }
}

function openChat() {
  const wrap = document.getElementById("chatWrap");
  const ball = document.getElementById("chatRestoreBtn");
  if (wrap) wrap.style.display = "flex";
  if (ball) ball.style.display = "none";
}

function hideChat() {
  const wrap = document.getElementById("chatWrap");
  const ball = document.getElementById("chatRestoreBtn");
  if (wrap) wrap.style.display = "none";
  if (ball) ball.style.display = "grid";
}

/* ------------------------------------------------------------------ */
/* Approvals                                                           */
/* ------------------------------------------------------------------ */

function checkApprovals() {
  const pending = state.approvals.filter((a) => a.status === "pending");
  const toast = document.getElementById("approvalToast");
  if (!toast) return;

  if (!pending.length) {
    toast.style.display = "none";
    return;
  }

  const ap = pending[0];
  const msg = document.getElementById("toastMsg");
  const time = document.getElementById("toastTime");
  const note = document.getElementById("toastNote");
  if (msg) msg.textContent = ap.description;
  if (time) time.textContent = new Date(ap.requested_at).toLocaleTimeString();
  if (note) {
    const extra = pending.length > 1 ? ` (+${pending.length - 1} more waiting)` : "";
    note.textContent = `Task: ${ap.task_title || "a task"} — Agent: ${ap.agent_name || "—"}${extra}`;
  }
  toast.style.display = "block";

  const approve = document.getElementById("apprApprove");
  const reject = document.getElementById("apprReject");
  if (approve) approve.onclick = () => handleApproval(ap.task_id, true);
  if (reject) reject.onclick = () => handleApproval(ap.task_id, false);
}

async function handleApproval(taskId, approved) {
  try {
    await fetchJson(`/api/tasks/${taskId}/approve`, { method: "POST", body: { approved } });
    notify(approved ? "Task approved" : "Task rejected", approved ? "success" : "info");
    await loadAll();
    renderActiveTab(true);
    renderBottomPanel();
    renderFixedChat(true);
    checkApprovals();
  } catch (e) {
    notify("Approval failed: " + e.message, "error");
  }
}

/* ------------------------------------------------------------------ */
/* Resources                                                           */
/* ------------------------------------------------------------------ */

function renderResources() {
  const platforms = [
    { key: "gmail", label: "Gmail / Email", icon: "&#9993;", hint: "Verify SMTP and IMAP credentials. Emails are sent only after you review a draft and explicitly choose Send.", setup: "Enable 2-Step Verification and create a Google App Password. The app verifies SMTP STARTTLS and IMAP over SSL before saving credentials in the ignored backend/.env file. The password is never returned to the browser.", setupUrl: "https://support.google.com/accounts/answer/185833" },
    { key: "instagram", label: "Instagram", icon: "&#128247;", hint: "Meta publishing is not active. Requires a professional account and public HTTPS media.", setup: "A live connection requires an eligible Instagram professional account, a Meta developer app with approved permissions, and OAuth token handling. This app cannot publish or read Instagram yet.", setupUrl: "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/" },
    { key: "linkedin", label: "LinkedIn", icon: "&#128188;", hint: "LinkedIn OAuth and publishing connector is not active.", setup: "A live connection requires a LinkedIn developer app, approved product access, OAuth, and the required organization/person permissions. This app cannot publish or read LinkedIn yet.", setupUrl: "https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api" },
    { key: "google_analytics", label: "Google Analytics", icon: "&#128202;", hint: "Read a 30-day GA4 report. Configure the OAuth client in the Google Sheets card first.", setup: "Add the GA4 property ID below, enable the Google Analytics Data API in Google Cloud, and grant the connected Google account Viewer access to that property.", setupUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries" },
    { key: "google_sheets", label: "Google Sheets", icon: "&#128200;", hint: "Save multiple spreadsheet links and let agents read relevant data when a task asks for it. Access is read-only.", setup: "Saving a spreadsheet URL does not grant access. Configure a Google Cloud OAuth client and authorize the requested read-only Sheets and Analytics scopes here.", setupUrl: "https://developers.google.com/workspace/sheets/api/quickstart/python" },
    { key: "domain_manager", label: "Domain Manager", icon: "&#127760;", hint: "A website URL is known, but its DNS/API provider has not been identified.", setup: "Identify the domain registrar or DNS host first (for example Cloudflare, Route 53, or your registrar). A supported provider API and scoped token are required; this app currently has no DNS connector.", setupUrl: "https://developers.cloudflare.com/fundamentals/api/get-started/create-token/" },
    { key: "telegram", label: "Telegram", icon: "&#9992;", hint: "Verify bots and queue posts for your approval before sending." },
  ];
  const connectedTelegram = state.accounts.filter((account) => account.platform === "telegram" && account.status === "connected" && account.verified);

  document.getElementById("content").innerHTML = `
    <section class="resource-hero">
      <div><div class="eyebrow">CONNECTED WORKSPACE</div><h2>Resources, with honest status.</h2>
        <p>Only provider-verified accounts are marked connected. Google Sheets and Analytics access is read-only; unsupported integrations remain clearly marked.</p></div>
      <span class="resource-safety-badge">Outbound posts require approval</span>
    </section>
    <div class="resource-grid">
      ${platforms.map((platform) => {
        const accounts = state.accounts.filter((account) => account.platform === platform.key);
        const verified = accounts.filter((account) => account.status === "connected" && account.verified);
        const googleOAuthConnected = state.accounts.some((account) =>
          account.platform === "google_oauth" && account.status === "connected" && account.verified);
        const activeConnection = verified.length > 0 ||
          (["google_sheets", "google_analytics"].includes(platform.key) && googleOAuthConnected);
        const canConnect = ["telegram", "gmail", "google_sheets", "google_analytics"].includes(platform.key);
        const stateLabel = verified.length ? `${verified.length} VERIFIED` : activeConnection ? "GOOGLE CONNECTED" : accounts.length ? "SETUP REQUIRED" : canConnect ? "NOT CONNECTED" : "NOT AVAILABLE";
        const connectionForm = platform.key === "gmail"
          ? `<form id="gmailConnectForm" class="resource-connect-form">
              <label>Gmail address<input name="sender_address" type="email" autocomplete="username" required value="${esc(accounts[0]?.username || "")}" placeholder="you@gmail.com"></label>
              <label>Google app password<input name="app_password" type="password" autocomplete="new-password" required minlength="16" maxlength="19" placeholder="16-character app password"></label>
              <small>Verified against smtp.gmail.com:587 and imap.gmail.com:993. Credentials are saved locally in backend/.env.</small>
              <button class="btn btn-primary btn-sm" type="submit">Verify and connect</button>
            </form>`
          : platform.key === "google_analytics"
            ? `<form id="googleAnalyticsConnectForm" class="resource-connect-form">
                <label>GA4 property ID<input name="property_id" type="text" inputmode="numeric" pattern="[0-9]{1,20}" maxlength="20" required placeholder="123456789"></label>
                <button class="btn btn-primary btn-sm" type="submit">Save GA4 property</button>
              </form>`
          : platform.key === "google_sheets"
            ? `<form id="googleSheetConnectForm" class="resource-connect-form">
                <label>Spreadsheet URL<input name="url" type="url" required placeholder="https://docs.google.com/spreadsheets/d/..."></label>
                <button class="btn btn-primary btn-sm" type="submit">Save spreadsheet</button>
              </form>
              <form id="googleOAuthForm" class="resource-connect-form">
                <b>Connect Google read-only</b>
                <label>OAuth client ID<input name="client_id" type="text" required maxlength="500" placeholder="...apps.googleusercontent.com" autocomplete="off"></label>
                <label>OAuth client secret<input name="client_secret" type="password" required maxlength="500" autocomplete="new-password"></label>
                <small>Create a Google Cloud OAuth client of type Web application. Add this exact redirect URI: <code>http://localhost:8000/api/resources/google-oauth/callback</code>. Credentials are stored in the local backend .env and never returned to the browser.</small>
                <button class="btn btn-primary btn-sm" type="submit">Save and authorize Google</button>
                ${state.accounts.some((account) => account.platform === "google_oauth" && account.verified)
                  ? `<button class="btn btn-outline btn-sm" type="button" data-disconnect-google-oauth>Disconnect Google OAuth</button>` : ""}
              </form>`
            : "";
        return `
          <article class="resource-card ${activeConnection ? "connected" : ""}">
            <div class="resource-head"><div class="r-name">${platform.icon} ${esc(platform.label)}</div>
              <div class="r-badge ${activeConnection ? "badge-connected" : "badge-disconnected"}">${stateLabel}</div></div>
            <div class="resource-desc">${esc(platform.hint)}</div>
            ${platform.setup ? `<details class="resource-guide"><summary>How to connect</summary><p>${esc(platform.setup)}</p><a href="${esc(platform.setupUrl)}" target="_blank" rel="noopener noreferrer">Official setup documentation ${icon("arrow-up-right", 13)}</a><small>${platform.key === "gmail" ? "Inbox checks use read-only IMAP; sending always waits for your explicit approval." : ["google_sheets", "google_analytics"].includes(platform.key) ? "OAuth credentials are stored locally; Google access is read-only." : "No active connector exists for this provider. Do not paste passwords, API keys, or OAuth secrets here."}</small></details>` : ""}
            ${accounts.map((account) => `
              <div class="resource-account-row"><span><b>${esc(account.username)}</b><small>${account.status === "connected" && account.verified
                ? esc(account.notes || "Verified")
                : platform.key === "google_sheets"
                  ? "URL saved. Connect Google OAuth to read this sheet."
                  : platform.key === "google_analytics"
                    ? "Property saved. Connect Google OAuth to read Analytics."
                    : esc(account.notes || "Not authenticated")}</small></span>
                ${platform.key === "google_sheets" ? `<button class="btn btn-outline btn-sm" data-read-google-sheet="${esc(account.id)}">Read sample</button>` : ""}
                ${platform.key === "google_analytics" ? `<button class="btn btn-outline btn-sm" data-read-google-analytics="${esc(account.id)}">Read 30-day report</button>` : ""}
                <button class="btn btn-outline btn-sm" data-disconnect="${esc(account.id)}">Remove</button></div>
                ${platform.key === "google_sheets" && state.googleSheetValues[account.id]
                  ? `<div class="google-sheet-preview">${googleSheetPreviewHtml(state.googleSheetValues[account.id])}</div>` : ""}
                ${platform.key === "google_analytics" && state.googleAnalyticsReports[account.id]
                  ? `<div class="google-sheet-preview">${googleAnalyticsReportHtml(state.googleAnalyticsReports[account.id])}</div>` : ""}`).join("")}
            ${platform.key === "gmail" && verified.length ? `
              <form id="emailDraftForm" class="resource-connect-form">
                <label>Recipient<input name="recipient" type="email" required placeholder="recipient@example.com"></label>
                <label>Subject<input name="subject" type="text" maxlength="250" required placeholder="Email subject"></label>
                <label>Message<textarea name="body" rows="5" maxlength="30000" required placeholder="Review your message before saving it as a draft"></textarea></label>
                <button class="btn btn-primary btn-sm" type="submit">Save email draft</button>
              </form>
              <section class="email-inbox-section">
                <div class="email-inbox-heading"><b>Inbox</b><button class="btn btn-outline btn-sm" data-refresh-email-inbox>Check inbox</button></div>
                <div class="email-inbox-list">${state.emailInbox.map((message, index) => `
                  <article class="email-inbox-card">
                    <div><b>${esc(message.subject || "(no subject)")}</b><small>From: ${esc(message.from_name ? `${message.from_name} <${message.from_address}>` : message.from_address)} · ${esc(message.date)}</small></div>
                    <p>${esc(message.snippet || "(No text preview available)")}</p>
                    ${message.from_address ? `<button class="btn btn-outline btn-sm" data-email-reply="${index}">Prepare reply draft</button>` : ""}
                  </article>`).join("") || `<div class="resource-setup-note">Inbox is not loaded. Checking uses read-only IMAP and does not mark messages as read.</div>`}</div>
              </section>
              <div class="email-draft-list">${state.emails.map((email) => `
                <article class="email-draft-card">
                  <div><b>${esc(email.subject)}</b><small>To: ${esc(email.recipient)} · ${esc(email.status)}</small></div>
                  <details><summary>Review message</summary><p>${esc(email.body)}</p></details>
                  ${email.result ? `<small>${esc(email.result)}</small>` : ""}
                  ${email.status === "draft" ? `<button class="btn btn-primary btn-sm" data-send-email="${esc(email.id)}">Send this email</button>` : ""}
                </article>`).join("") || `<div class="resource-setup-note">No email drafts saved.</div>`}</div>` : ""}
            <div class="resource-actions">${canConnect
              ? (platform.key === "telegram" ? `<button class="btn btn-primary btn-sm" data-connect="telegram">+ Connect bot</button>` : connectionForm)
              : `<span class="resource-unavailable">Connector unavailable</span>`}</div>
          </article>`;
      }).join("")}
    </div>

    <section class="resource-posts surface-panel">
      <div class="panel-heading"><div><div class="eyebrow">CONTENT STUDIO</div><h3>Prepare a Telegram post</h3></div></div>
      <p class="resource-desc">Ask the Content Creation agent to draft copy and hashtags, then add it here. Nothing is sent until you explicitly approve the draft.</p>
      ${connectedTelegram.length ? `
        <form id="postDraftForm" class="post-draft-form">
          <label>Bot and destination<select id="postAccount" required>${connectedTelegram.map((account) => `<option value="${esc(account.id)}">${esc(account.username)}</option>`).join("")}</select></label>
          <label>Post text<textarea id="postCaption" rows="4" maxlength="4000" required placeholder="Paste or adapt the agent's reviewed draft"></textarea></label>
          <label>Hashtags<input id="postHashtags" maxlength="1000" placeholder="#yourbrand #yourtopic"></label>
          <label>Public image URL (optional)<input id="postMediaUrl" type="url" placeholder="https://your-public-host/image.jpg"></label>
          <button class="btn btn-primary" type="submit">Queue for my approval</button>
        </form>` : `<div class="resource-setup-note">Connect and verify a Telegram bot to prepare a post. The bot must have permission to publish to the selected chat or channel.</div>`}
      <div class="content-post-list">
        ${state.contentPosts.map((post) => `
          <article class="content-post-card">
            <div class="content-post-top"><b>${esc(post.account_name)} | ${esc(post.platform)}</b><span class="suggestion-state state-${esc(post.status)}">${esc(post.status.replace("_", " "))}</span></div>
            <p>${esc(post.caption)}${post.hashtags ? `<br>${esc(post.hashtags)}` : ""}</p>
            ${post.result ? `<small>${esc(post.result)}</small>` : ""}
            ${post.status === "pending_approval" ? `<button class="btn btn-primary btn-sm" data-approve-content="${esc(post.id)}">Approve & publish</button>` : ""}
          </article>`).join("") || `<div class="empty-state">No posts are queued.</div>`}
      </div>
    </section>
  `;

  const form = document.getElementById("postDraftForm");
  if (form) form.addEventListener("submit", createContentPost);
  const gmailForm = document.getElementById("gmailConnectForm");
  if (gmailForm) gmailForm.addEventListener("submit", connectGmail);
  const sheetForm = document.getElementById("googleSheetConnectForm");
  if (sheetForm) sheetForm.addEventListener("submit", saveGoogleSheet);
  const googleOAuthForm = document.getElementById("googleOAuthForm");
  if (googleOAuthForm) googleOAuthForm.addEventListener("submit", connectGoogleOAuth);
  const googleAnalyticsForm = document.getElementById("googleAnalyticsConnectForm");
  if (googleAnalyticsForm) googleAnalyticsForm.addEventListener("submit", saveGoogleAnalyticsProperty);
  const emailForm = document.getElementById("emailDraftForm");
  if (emailForm) emailForm.addEventListener("submit", saveEmailDraft);
}

async function refreshEmailInbox() {
  const button = document.querySelector("[data-refresh-email-inbox]");
  if (button) button.disabled = true;
  try {
  const inbox = await fetchJson("/api/emails/inbox?limit=20");
  state.emailInbox = inbox.messages || [];
  renderActiveTab(false);
  notify(`Loaded ${state.emailInbox.length} inbox message(s) in read-only mode.`, "success");
  } catch (error) {
  notify("Could not check Gmail inbox: " + error.message, "error");
  } finally {
  const currentButton = document.querySelector("[data-refresh-email-inbox]");
  if (currentButton) currentButton.disabled = false;
  }
}

async function connectGmail(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const senderAddress = form.elements.sender_address.value.trim();
  const appPassword = form.elements.app_password.value;
  form.elements.app_password.value = "";
  const button = form.querySelector("button[type=submit]");
  if (button) button.disabled = true;
  try {
    await fetchJson("/api/resources/gmail/connect", {
      method: "POST",
      body: { sender_address: senderAddress, app_password: appPassword },
    });
    notify("Gmail SMTP and IMAP verified and connected", "success");
    await loadAll();
    renderActiveTab(false);
  } catch (error) {
    notify("Could not connect Gmail: " + error.message, "error");
    if (button) button.disabled = false;
  }
}

async function saveGoogleSheet(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const url = form.elements.url.value.trim();
  const button = form.querySelector("button[type=submit]");
  if (button) button.disabled = true;
  try {
    await fetchJson("/api/resources/google-sheets/connect", {
      method: "POST",
      body: { url },
    });
    notify("Spreadsheet saved. Google authorization is still required for access.", "success");
    await loadAll();
    renderActiveTab(false);
  } catch (error) {
    notify("Could not save spreadsheet: " + error.message, "error");
    if (button) button.disabled = false;
  }
}

async function connectGoogleOAuth(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const clientId = form.elements.client_id.value.trim();
  const clientSecret = form.elements.client_secret.value;
  form.elements.client_secret.value = "";
  const button = form.querySelector("button[type=submit]");
  if (button) button.disabled = true;
  try {
    const result = await fetchJson("/api/resources/google-oauth/start", {
      method: "POST",
      body: { client_id: clientId, client_secret: clientSecret },
    });
    window.location.assign(result.authorization_url);
  } catch (error) {
    notify("Could not start Google authorization: " + error.message, "error");
    if (button) button.disabled = false;
  }
}

function googleSheetPreviewHtml(values) {
  if (!Array.isArray(values) || !values.length) {
    return `<div class="resource-setup-note">The selected range contains no values.</div>`;
  }
  const rows = values.slice(0, 20);
  return `<div class="google-sheet-preview-scroll"><table><tbody>${rows.map((row) => `
    <tr>${(Array.isArray(row) ? row : []).slice(0, 10).map((cell) => `<td>${esc(String(cell ?? ""))}</td>`).join("")}</tr>
  `).join("")}</tbody></table></div><small>Read-only sample · up to 20 rows and 10 columns</small>`;
}

async function readGoogleSheetSample(accountId) {
  try {
    const result = await fetchJson(`/api/resources/google-sheets/${encodeURIComponent(accountId)}/values?cell_range=A1%3AJ20`);
    state.googleSheetValues[accountId] = result.values || [];
    renderActiveTab(false);
    notify(`Read ${state.googleSheetValues[accountId].length} row(s) from the spreadsheet.`, "success");
  } catch (error) {
    notify("Could not read spreadsheet: " + error.message, "error");
  }
}

async function saveGoogleAnalyticsProperty(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const propertyId = form.elements.property_id.value.trim();
  try {
    await fetchJson("/api/resources/google-analytics/connect", {
      method: "POST",
      body: { property_id: propertyId },
    });
    form.reset();
    await loadAll();
    renderActiveTab(false);
    notify("GA4 property saved. Read-only reporting requires Google OAuth and Analytics API access.", "success");
  } catch (error) {
    notify("Could not save GA4 property: " + error.message, "error");
  }
}

function googleAnalyticsReportHtml(report) {
  const headers = [
    ...(report.dimension_headers || []).map((header) => header.name),
    ...(report.metric_headers || []).map((header) => header.name),
  ];
  const rows = report.rows || [];
  if (!rows.length) return `<div class="resource-setup-note">No Analytics data was returned for the last 30 days.</div>`;
  return `<div class="google-sheet-preview-scroll"><table><thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join("")}</tr></thead><tbody>${rows.slice(0, 30).map((row) => {
    const cells = [
      ...(row.dimensionValues || []).map((value) => value.value),
      ...(row.metricValues || []).map((value) => value.value),
    ];
    return `<tr>${cells.map((cell) => `<td>${esc(cell || "")}</td>`).join("")}</tr>`;
  }).join("")}</tbody></table></div><small>Read-only · last 30 days</small>`;
}

async function readGoogleAnalyticsReport(accountId) {
  try {
    state.googleAnalyticsReports[accountId] = await fetchJson(
      `/api/resources/google-analytics/${encodeURIComponent(accountId)}/report`,
    );
    renderActiveTab(false);
    notify("Google Analytics report loaded.", "success");
  } catch (error) {
    notify("Could not read Google Analytics: " + error.message, "error");
  }
}

async function saveEmailDraft(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    recipient: form.elements.recipient.value.trim(),
    subject: form.elements.subject.value.trim(),
    body: form.elements.body.value,
  };
  try {
    await fetchJson("/api/emails", { method: "POST", body: payload });
    form.reset();
    notify("Email draft saved. Review it before sending.", "success");
    await loadAll();
    renderActiveTab(false);
  } catch (error) {
    notify("Could not save email draft: " + error.message, "error");
  }
}

async function sendEmailDraft(emailId) {
  const email = state.emails.find((item) => item.id === emailId);
  if (!email || email.status !== "draft") return;
  if (!confirm(`Send this email to ${email.recipient} with subject "${email.subject}"? This sends one email now.`)) return;
  try {
    await fetchJson(`/api/emails/${encodeURIComponent(emailId)}/send`, { method: "POST", body: {} });
    notify("Gmail accepted the email for delivery.", "success");
    await loadAll();
    renderActiveTab(false);
  } catch (error) {
    notify("Email was not confirmed as sent: " + error.message, "error");
    await loadAll();
    renderActiveTab(false);
  }
}

async function connectResource(platform) {
  if (platform !== "telegram") {
    notify("This provider connector is not available yet; no account was marked connected.", "error");
    return;
  }
  const botToken = prompt("Paste the Telegram bot token from BotFather. It will be sent to the local backend and never displayed again:");
  if (!botToken) return;
  const chatId = prompt("Enter the target Telegram chat or channel ID. The bot must have posting permission:");
  if (!chatId) return;
  try {
    await fetchJson("/api/resources/telegram/connect", { method: "POST", body: { bot_token: botToken, chat_id: chatId } });
    notify("Telegram bot verified and connected", "success");
    await loadAll();
    renderActiveTab(false);
  } catch (e) {
    notify("Telegram verification failed: " + e.message, "error");
  }
}

async function disconnectResource(accountId) {
  const account = state.accounts.find((entry) => entry.id === accountId);
  if (!account || !confirm(`Remove ${account.username}? Pending posts for this account will also be deleted.`)) return;
  try {
    await fetchJson("/api/accounts/" + accountId, { method: "DELETE" });
    notify(`${account.username} removed`, "info");
    await loadAll();
    renderActiveTab(false);
  } catch (e) {
    notify("Could not remove account: " + e.message, "error");
  }
}

async function createContentPost(event) {
  event.preventDefault();
  const body = {
    account_id: document.getElementById("postAccount").value,
    caption: document.getElementById("postCaption").value.trim(),
    hashtags: document.getElementById("postHashtags").value.trim(),
    media_url: document.getElementById("postMediaUrl").value.trim(),
  };
  try {
    await fetchJson("/api/content-posts", { method: "POST", body });
    notify("Draft queued. Review it before publishing.", "success");
    await loadAll();
    renderActiveTab(false);
  } catch (e) {
    notify("Could not queue post: " + e.message, "error");
  }
}

async function approveContentPost(postId) {
  if (!confirm("Publish this Telegram post now? This action sends it to the connected chat/channel.")) return;
  try {
    await fetchJson(`/api/content-posts/${postId}/approve`, { method: "POST", body: {} });
    notify("Approved post published", "success");
    await loadAll();
    renderActiveTab(false);
  } catch (e) {
    notify("Post was not published: " + e.message, "error");
    await loadAll();
    renderActiveTab(false);
  }
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

function renderFiles() {
  const userFiles = state.files.filter((file) => file.origin === "user" || !file.origin);
  const teamFiles = state.files.filter((file) => file.origin && file.origin !== "user");
  const fileCard = (file) => `
    <div class="file-item">
      <div class="file-info">
        <div class="file-name">${esc(file.original_name)}</div>
        <div class="file-meta"><span class="mime-badge">${esc(file.mime_type)}</span> • ${formatBytes(file.size)}${file.compressed ? ` • Compressed locally to ${formatBytes(file.stored_size)}` : ""} • ${file.origin === "user" ? "Uploaded by you" : `Created by ${esc(file.agent_name || file.uploaded_by || "team")}`}</div>
        ${file.task_title ? `<div class="file-meta">Task: ${esc(file.task_title)}${file.task_id ? ` · ${esc(file.task_id)}` : ""}</div>` : ""}
        ${file.task_id ? `<div class="file-meta">Created ${new Date(file.created_at).toLocaleDateString()}</div>` : ""}
      </div>
      <div class="file-actions">
        <button class="btn btn-outline btn-sm" data-download-file="${esc(file.id)}">${icon("download", 14)} Download</button>
        <button class="btn btn-outline btn-sm" data-delete-file="${esc(file.id)}" data-file-name="${esc(file.original_name)}">${icon("trash", 14)} Delete</button>
      </div>
    </div>`;
  document.getElementById("content").innerHTML = `
    <div class="section">
      <div class="section-title">${icon("files", 18)} Shared files</div>
      <p class="files-intro">Agent deliverables are saved automatically using task, agent, status, and date in the filename. The dashboard shows only the latest five completed tasks.</p>
      <div class="file-upload-zone" id="fileDropZone">
        <div style="font-weight:700;margin-bottom:6px;">Upload a file (Excel, PPT, Word, PDF, image, video, text)</div>
        <input type="file" id="fileUploadInput" multiple>
        <label for="fileUploadInput" class="btn btn-primary btn-sm" style="display:inline-flex;margin-top:8px;">Browse files</label>
        <div style="margin-top:8px;font-size:12px;color:var(--muted);">Drag files here or click to browse. Files are stored locally and shown to the team.</div>
      </div>
      <section class="files-group">
        <div class="section-title mt-8">Uploaded by you <span class="files-count">${userFiles.length}</span></div>
        <div class="file-list">${userFiles.map(fileCard).join("") || "<div class='empty-state'>Files you upload will be stored here.</div>"}</div>
      </section>
      <section class="files-group">
        <div class="section-title mt-8">Created by agents and team <span class="files-count">${teamFiles.length}</span></div>
        <div class="file-list">${teamFiles.map(fileCard).join("") || "<div class='empty-state'>Completed agent outputs and generated reports will appear here.</div>"}</div>
      </section>
    </div>
  `;

  const input = document.getElementById("fileUploadInput");
  if (input) input.addEventListener("change", (e) => uploadFiles(e.target.files));

  const zone = document.getElementById("fileDropZone");
  if (zone) {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      if (e.dataTransfer && e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
    });
  }
}

async function uploadFiles(fileList) {
  if (!fileList || !fileList.length) return;
  try {
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("uploaded_by", "user");
      await fetchJson("/api/files/upload", { method: "POST", body: fd });
    }
    notify(`${fileList.length} file(s) uploaded`, "success");
    await loadAll();
    renderActiveTab(false);
  } catch (e) {
    notify("Upload failed: " + e.message, "error");
  }
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

function renderReports() {
  const latest = state.weeklyReports[0];
  const archivedReports = state.weeklyReports.slice(latest ? 1 : 0);
  document.getElementById("content").innerHTML = `
    <section class="reports-hero">
      <div><div class="eyebrow">TEAM BRIEFING</div><h2>Work, told by the team.</h2>
        <p>Play an interactive recap built from saved tasks and agent outputs, or download a visual PDF summary.</p></div>
      <button class="btn btn-accent" id="btnGenReport">${icon("spark", 18)} Create a team recap</button>
    </section>
    ${latest ? `<section class="report-feature surface-panel">
      <div class="eyebrow">LATEST BRIEFING</div>
      <h2>Team recap · ${esc(latest.week_start)} — ${esc(latest.week_end)}</h2>
      <p class="panel-subtitle">Generated ${new Date(latest.generated_at).toLocaleString()}</p>
      <div class="report-actions">
        <button class="btn btn-primary" data-play-report="${esc(latest.id)}">${icon("play", 18)} Play recap</button>
        <button class="btn btn-outline" data-download-report="${esc(latest.id)}">${icon("download", 18)} Download PDF</button>
      </div>
    </section>` : ""}
    <div class="report-list">
      <div class="panel-heading"><div><div class="eyebrow">ARCHIVE</div><h3>Past briefings</h3></div></div>
      <div class="report-grid">
        ${archivedReports.map((r) => `
          <article class="report-card">
            <div class="report-info">
              <div class="report-title">Team recap · ${esc(r.week_start)} — ${esc(r.week_end)}</div>
              <div class="report-meta">Generated ${new Date(r.generated_at).toLocaleString()}</div>
            </div>
            <div class="report-actions">
              <button class="btn btn-primary btn-sm" data-play-report="${esc(r.id)}">${icon("play", 16)} Play recap</button>
              <button class="btn btn-outline btn-sm" data-download-report="${esc(r.id)}">${icon("download", 16)} Download PDF</button>
            </div>
          </article>`).join("") || `<div class="empty-state">${latest ? "No past briefings yet." : "No reports yet. Create a recap to see an agent-by-agent story grounded in saved work."}</div>`}
      </div>
    </div>
  `;

  const btn = document.getElementById("btnGenReport");
  if (btn) btn.addEventListener("click", generateReport);
}

async function generateReport() {
  const btn = document.getElementById("btnGenReport");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Generating…";
  }
  try {
    const res = await fetchJson("/api/weekly-reports/generate", { method: "POST", body: {} });
    await loadAll();
    renderActiveTab(false);
    notify("Team recap created", "success");
    if (res && res.data) openReportPlayer(res.data);
  } catch (e) {
    notify("Team recap failed: " + e.message, "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `${icon("spark", 18)} Create a team recap`;
    }
  }
}

function reportStatusChart(counts) {
  const entries = [
    ["Done", "done"], ["To do", "assigned"],
    ["In progress", "in_progress"], ["Waiting for Engineering", "waiting_engineering"],
    ["Review", "review"], ["Backlog", "backlog"], ["Blocked", "blocked"],
  ];
  return hbarList(entries.map(([label, key]) => ({ label, value: Number(counts[key] || 0) })));
}

const REPORT_VOICE_PROFILES = {
  "Chief Executive Officer": { preferred: ["en-US"], hints: ["david", "guy", "male"], rate: 0.88, pitch: 0.78, style: "American male, low pitch" },
  "Lead Generation": { preferred: ["en-GB"], hints: ["female", "serena", "kate"], rate: 0.96, pitch: 1.08, style: "British English female" },
  "Search Engine Optimization": { preferred: ["en-IN", "en-US"], hints: ["male", "rishi"], rate: 0.96, pitch: 0.92, style: "Indian-American English male" },
  "Data Scraping": { preferred: ["en-IN"], hints: ["male", "rishi"], rate: 0.94, pitch: 0.9, style: "North Indian English male" },
  "LinkedIn Data Scraping": { preferred: ["en-IN"], hints: ["female", "heera"], rate: 0.96, pitch: 1.06, style: "North Indian English female" },
  "Email Sender & Receiver": { preferred: ["en-US"], hints: ["chinese", "female", "mei"], rate: 0.94, pitch: 1, style: "Chinese-American English" },
  "Software Engineering": { preferred: ["en-IN", "en-US"], hints: ["male", "rishi"], rate: 0.95, pitch: 0.92, style: "Indian-American English male" },
  "Content Creation": { preferred: ["en-FR", "en-GB", "en-US"], hints: ["french", "female"], rate: 0.95, pitch: 1.08, style: "French-accented English female" },
};

function agentProgressChart(agent) {
  const counts = [
    ["Completed", Number(agent.completed_count || 0), "#45b993"],
    ["In review", (agent.weekly_tasks || []).filter((task) => task.status === "review").length, "#f0ac51"],
    ["Active", (agent.active_tasks || []).filter((task) => task.status !== "blocked").length, "#8092ff"],
    ["Blocked", (agent.active_tasks || []).filter((task) => task.status === "blocked").length, "#e27668"],
  ];
  const max = Math.max(1, ...counts.map(([, count]) => count));
  return `<div class="recap-chart">${counts.map(([label, count, color]) => `
    <div class="recap-chart-row"><span>${label}</span><div><i style="--bar:${color};--value:${Math.max(count ? 6 : 0, count / max * 100)}%"></i></div><b>${count}</b></div>
  `).join("")}</div>`;
}

function selectReportVoice(role, utterance, requestedVoice = "") {
  const profile = REPORT_VOICE_PROFILES[role] || REPORT_VOICE_PROFILES["Chief Executive Officer"];
  utterance.rate = profile.rate;
  utterance.pitch = profile.pitch;
  utterance.lang = profile.preferred[0];
  if (!("speechSynthesis" in window)) return "";
  const voices = window.speechSynthesis.getVoices();
  if (requestedVoice) {
    const requested = voices.find((voice) => voice.name.toLowerCase() === requestedVoice.toLowerCase());
    if (requested) {
      utterance.voice = requested;
      utterance.lang = requested.lang;
      return requested.name;
    }
  }
  for (const language of profile.preferred) {
    const candidates = voices.filter((voice) => voice.lang.toLowerCase().startsWith(language.toLowerCase()));
    const hinted = candidates.find((voice) => profile.hints.some((hint) => voice.name.toLowerCase().includes(hint)));
    if (hinted || candidates[0]) {
      utterance.voice = hinted || candidates[0];
      utterance.lang = utterance.voice.lang;
      return utterance.voice.name;
    }
  }
  return "";
}

function renderReportSlide() {
  const data = state.reportPlayerData;
  const player = document.getElementById("reportPlayer");
  if (!data || !player) return;
  const agents = data.agents || [];
  const totals = data.status_counts || {};
  const totalSlides = agents.length * 3 + 1;
  const index = Math.min(state.reportPlayerIndex, totalSlides - 1);
  const agentIndex = index > 0 ? Math.floor((index - 1) / 3) : -1;
  const agentTab = index > 0 ? (index - 1) % 3 : 0;
  const agent = agentIndex >= 0 ? agents[agentIndex] : null;
  const stage = player.querySelector(".recap-stage");
  const progress = player.querySelector(".recap-progress i");
  const slideCount = player.querySelector(".recap-slide-count");
  if (!stage) return;
  if (index === 0) {
    stage.innerHTML = `
      <div class="recap-kicker">WEEKLY TEAM RECAP</div>
      <h2>A week of work,<br><em>in focus.</em></h2>
      <p class="recap-period">${esc(data.week_start)} — ${esc(data.week_end)}</p>
      <div class="recap-metrics"><span><b>${Number(data.weekly_completed_count || 0)}</b>completed this week</span><span><b>${agents.length}</b>agents</span><span><b>${(data.highlights || []).length}</b>recorded updates</span></div>
      <div class="recap-chart-title">CURRENT TASK PIPELINE</div>
      ${reportStatusChart(totals)}
    `;
  } else {
    const tabNames = ["Task summary", "Progress", "Next actions"];
    const taskSummary = agent.task_summary || agent.narration || "No written update is available for this agent.";
    const content = agentTab === 0
      ? `<div class="recap-voice">${esc(taskSummary)}</div>
         <div class="recap-deliveries"><b>${Number(agent.completed_count || 0)}</b> completed task${Number(agent.completed_count || 0) === 1 ? "" : "s"} this week</div>`
      : agentTab === 1
        ? `<div class="recap-voice">${esc(agent.progress_summary || "No progress details have been recorded.")}</div>
           ${agentProgressChart(agent)}
           ${(agent.weekly_tasks || []).length ? `<ul class="recap-task-list">${agent.weekly_tasks.map((task) => `<li><b>${esc(task.title)}</b><span>${esc(statusLabel(task.status))}</span></li>`).join("")}</ul>` : ""}`
        : `<div class="recap-voice">${esc(agent.future_plan || "No future plan is recorded.")}</div>
           ${(agent.active_tasks || []).length ? `<div class="recap-active">Open work: ${agent.active_tasks.map((task) => `${esc(task.title)} (${esc(statusLabel(task.status))})`).join(" · ")}</div>` : ""}
           <div class="recap-next-note">Future steps reflect assigned work and recorded blockers; no unassigned work is invented.</div>`;
    const voiceProfile = agent.voice_profile || (REPORT_VOICE_PROFILES[agent.role] || {}).style || "browser default";
    stage.innerHTML = `
      <div class="recap-kicker">AGENT ${String(agentIndex + 1).padStart(2, "0")} / ${String(agents.length).padStart(2, "0")} · ${esc(tabNames[agentTab].toUpperCase())}</div>
      <div class="recap-agent-avatar">${agentIcon(agent)}</div>
      <h2>${esc(agent.name)}</h2><p class="recap-role">${esc(agent.role)} · ${esc(agent.status.replace("_", " "))}</p>
      <nav class="recap-agent-tabs" aria-label="${esc(agent.name)} report sections">${tabNames.map((name, tab) => `<button class="${tab === agentTab ? "active" : ""}" data-recap-tab="${tab}">${name}</button>`).join("")}</nav>
      <div class="recap-agent-content">${content}</div>
      <p class="recap-voice-profile">Voice profile: ${esc(voiceProfile)}</p>
    `;
  }
  if (progress) progress.style.width = `${((index + 1) / totalSlides) * 100}%`;
  if (slideCount) slideCount.textContent = `SCENE ${String(index + 1).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}`;
  const previous = player.querySelector("[data-recap-prev]");
  const next = player.querySelector("[data-recap-next]");
  if (previous) previous.disabled = index === 0;
  if (next) next.disabled = index >= totalSlides - 1;
  if (state.reportNarrationEnabled && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
    window.speechSynthesis.cancel();
    const spoken = index === 0
      ? `Team recap, ${data.week_start} through ${data.week_end}. ${data.weekly_completed_count || 0} completed tasks across ${agents.length} agents.`
      : `${agent.name}, ${agent.role}. ${agentTab === 0 ? agent.task_summary : agentTab === 1 ? agent.progress_summary : agent.future_plan}`;
    const utterance = new SpeechSynthesisUtterance(spoken);
    const requestedVoice = agent ? agent.voice_profile : "";
    const selectedVoice = selectReportVoice(
      agent ? agent.role : "Chief Executive Officer",
      utterance,
      requestedVoice,
    );
    if (requestedVoice && selectedVoice.toLowerCase() !== requestedVoice.toLowerCase()) {
      const voiceLabel = player.querySelector(".recap-voice-profile");
      if (voiceLabel) {
        voiceLabel.textContent = `Voice profile: ${requestedVoice} (not installed; using ${selectedVoice || "browser default"})`;
      }
    }
    window.speechSynthesis.speak(utterance);
  }
}

function reportVideoSlideData(data) {
  const slides = [{
    kicker: `TEAM RECAP · ${data.week_start} — ${data.week_end}`,
    title: "A week of work, in focus.",
    body: `${Number(data.weekly_completed_count || 0)} completed tasks across ${Number((data.agents || []).length)} agents.\n\n${(data.highlights || []).slice(0, 5).map((item) => `${item.agent_name}: ${item.title}`).join("\n") || "No completed task highlights were recorded."}`,
    agent: null,
    counts: data.status_counts || {},
  }];
  for (const agent of data.agents || []) {
    slides.push({
      kicker: `AGENT UPDATE · ${agent.role}`,
      title: agent.name,
      body: agent.task_summary || agent.narration || "No written task summary was recorded.",
      agent,
      counts: null,
    });
    slides.push({
      kicker: `PROGRESS · ${agent.name}`,
      title: "What moved forward",
      body: agent.progress_summary || "No progress details were recorded.",
      agent,
      counts: null,
    });
    slides.push({
      kicker: `NEXT ACTIONS · ${agent.name}`,
      title: "What happens next",
      body: agent.future_plan || "No next actions were recorded.",
      agent,
      counts: null,
    });
  }
  return slides;
}

function wrapVideoText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const lines = [];
  for (const rawLine of String(text || "").split("\n")) {
    if (!rawLine.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of rawLine.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines && shown.length) {
    shown[shown.length - 1] = shown[shown.length - 1].replace(/[.…]*$/, "") + "…";
  }
  shown.forEach((line, index) => {
    if (line) context.fillText(line, x, y + index * lineHeight);
  });
}

function drawReportVideoSlide(context, slide, index, total) {
  const gradient = context.createLinearGradient(0, 0, 1280, 720);
  gradient.addColorStop(0, "#F4EEE2");
  gradient.addColorStop(1, "#FBF8F1");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1280, 720);
  context.fillStyle = "#A8480F";
  context.font = "700 20px Segoe UI, sans-serif";
  context.fillText("PIN2PIN  /  TEAM RECAP", 78, 70);
  context.fillStyle = "#6A6054";
  context.font = "600 17px Segoe UI, sans-serif";
  context.fillText(slide.kicker.toUpperCase().slice(0, 95), 80, 145);
  context.fillStyle = "#1A1714";
  context.font = "700 54px Segoe UI, sans-serif";
  wrapVideoText(context, slide.title, 80, 230, 1100, 66, 2);
  context.fillStyle = "#51483E";
  context.font = "400 27px Segoe UI, sans-serif";
  wrapVideoText(context, slide.body, 84, 350, 1080, 42, 7);
  if (slide.counts) {
    const metrics = [
      ["Done", Number(slide.counts.done || 0), "#2F6F4A"],
      ["In progress", Number(slide.counts.in_progress || 0), "#BF541A"],
      ["Review", Number(slide.counts.review || 0), "#8A6200"],
      ["Blocked", Number(slide.counts.blocked || 0), "#B42318"],
    ];
    const maximum = Math.max(1, ...metrics.map((metric) => metric[1]));
    metrics.forEach(([label, count, color], row) => {
      const y = 565 + row * 34;
      context.fillStyle = "#51483E";
      context.font = "500 18px Segoe UI, sans-serif";
      context.fillText(label, 800, y);
      context.fillStyle = "#EADFCB";
      context.fillRect(970, y - 17, 200, 15);
      context.fillStyle = color;
      context.fillRect(970, y - 17, 200 * count / maximum, 15);
      context.fillStyle = "#1A1714";
      context.fillText(String(count), 1185, y);
    });
  }
  context.fillStyle = "#6A6054";
  context.font = "500 16px Segoe UI, sans-serif";
  context.fillText("Captioned report video · narration is available in the interactive player", 80, 674);
  context.textAlign = "right";
  context.fillText(`${index + 1} / ${total}`, 1200, 674);
  context.textAlign = "left";
}

async function exportReportVideo(button) {
  if (!state.reportPlayerData) return;
  if (!("MediaRecorder" in window) || !HTMLCanvasElement.prototype.captureStream) {
    notify("Video recording is not supported in this browser. Use the narrated recap or download the PDF.", "error");
    return;
  }
  const supportedType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
    .find((type) => MediaRecorder.isTypeSupported(type));
  if (!supportedType) {
    notify("This browser cannot encode a WebM report video. Use the narrated recap or download the PDF.", "error");
    return;
  }
  if (state.reportPlayerTimer) clearInterval(state.reportPlayerTimer);
  state.reportPlayerTimer = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  const autoplayButton = document.querySelector("#reportPlayer [data-recap-toggle]");
  if (autoplayButton) autoplayButton.textContent = "Play";
  button.disabled = true;
  button.textContent = "Recording…";
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) {
    button.disabled = false;
    button.textContent = "Export video";
    notify("Could not initialize the report video canvas.", "error");
    return;
  }
  const stream = canvas.captureStream(24);
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType: supportedType });
  const finished = new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("The browser stopped recording the report."));
    recorder.onstop = resolve;
  });
  try {
    recorder.start(250);
    const slides = reportVideoSlideData(state.reportPlayerData);
    for (let index = 0; index < slides.length; index += 1) {
      drawReportVideoSlide(context, slides[index], index, slides.length);
      button.textContent = `Recording ${index + 1}/${slides.length}…`;
      await new Promise((resolve) => window.setTimeout(resolve, 1800));
    }
    recorder.stop();
    await finished;
    const blob = new Blob(chunks, { type: supportedType });
    if (!blob.size) throw new Error("The browser returned an empty video.");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `team-recap-${state.reportPlayerData.week_start || "report"}.webm`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    notify(`Captioned team recap video exported (${formatBytes(blob.size)}).`, "success");
  } catch (error) {
    if (recorder.state !== "inactive") recorder.stop();
    notify("Could not export team recap video: " + error.message, "error");
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    button.disabled = false;
    button.textContent = "Export video";
  }
}

function openReportPlayer(data) {
  closeReportPlayer();
  state.modalReturnFocus = document.activeElement;
  state.reportPlayerData = data;
  state.reportPlayerIndex = 0;
  state.reportNarrationEnabled = false;
  const player = document.createElement("section");
  player.id = "reportPlayer";
  player.className = "report-player";
  player.setAttribute("role", "dialog");
  player.setAttribute("aria-modal", "true");
  player.setAttribute("aria-label", "Team recap presentation");
  player.setAttribute("tabindex", "-1");
  player.innerHTML = `
    <div class="recap-frame">
      <header class="recap-top"><span class="recap-brand">${icon("spark", 18)} PIN2PIN <span>TEAM RECAP</span></span><span class="recap-slide-count"></span><button class="icon-btn" data-recap-close aria-label="Close recap" title="Close recap">${icon("x", 18)}</button></header>
      <div class="recap-progress"><i></i></div>
      <main class="recap-stage"></main>
      <footer class="recap-controls"><button class="btn btn-outline" data-recap-prev>${icon("chevron-left", 16)} Previous</button><div><button class="btn btn-outline" data-recap-export>${icon("download", 16)} Export video</button><button class="btn btn-outline" data-recap-voice>${icon("play", 16)} Enable voice</button><button class="btn btn-outline" data-recap-toggle>${icon("pause", 16)} Pause</button></div><button class="btn btn-primary" data-recap-next>Next ${icon("chevron-right", 16)}</button></footer>
      <p class="recap-disclaimer">Video exports are captioned WebM slides without embedded audio; enable voice in the interactive player. Report content reflects recorded work only.</p>
    </div>`;
  document.body.appendChild(player);
  player.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-recap-close")) {
      closeReportPlayer();
    } else if (button.hasAttribute("data-recap-tab")) {
      const currentIndex = state.reportPlayerIndex;
      const currentAgent = Math.floor((currentIndex - 1) / 3);
      state.reportPlayerIndex = 1 + currentAgent * 3 + Number(button.dataset.recapTab);
      renderReportSlide();
    } else if (button.hasAttribute("data-recap-prev")) {
      state.reportPlayerIndex = Math.max(0, state.reportPlayerIndex - 1);
      renderReportSlide();
    } else if (button.hasAttribute("data-recap-next")) {
      state.reportPlayerIndex = Math.min(1 + (state.reportPlayerData.agents || []).length * 3 - 1, state.reportPlayerIndex + 1);
      renderReportSlide();
    } else if (button.hasAttribute("data-recap-voice")) {
      state.reportNarrationEnabled = !state.reportNarrationEnabled;
      button.textContent = state.reportNarrationEnabled ? "Voice on" : "Enable voice";
      renderReportSlide();
    } else if (button.hasAttribute("data-recap-export")) {
      exportReportVideo(button);
    } else if (button.hasAttribute("data-recap-toggle")) {
      if (state.reportPlayerTimer) {
        clearInterval(state.reportPlayerTimer);
        state.reportPlayerTimer = null;
        button.textContent = "Play";
      } else {
        if (state.reportPlayerIndex >= 1 + (state.reportPlayerData.agents || []).length * 3) state.reportPlayerIndex = 0;
        renderReportSlide();
        startReportAutoplay(button);
      }
    }
  });
  player.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeReportPlayer();
    if (event.key === "ArrowRight") {
      state.reportPlayerIndex = Math.min(1 + (state.reportPlayerData.agents || []).length * 3 - 1, state.reportPlayerIndex + 1);
      renderReportSlide();
    }
    if (event.key === "ArrowLeft") {
      state.reportPlayerIndex = Math.max(0, state.reportPlayerIndex - 1);
      renderReportSlide();
    }
  });
  renderReportSlide();
  startReportAutoplay(player.querySelector("[data-recap-toggle]"));
  player.focus({ preventScroll: true });
}

function startReportAutoplay(toggle) {
  if (state.reportPlayerTimer) clearInterval(state.reportPlayerTimer);
  if (toggle) toggle.textContent = "Pause";
  state.reportPlayerTimer = setInterval(() => {
    const last = (state.reportPlayerData.agents || []).length * 3;
    if (state.reportPlayerIndex >= last) {
      clearInterval(state.reportPlayerTimer);
      state.reportPlayerTimer = null;
      const currentToggle = document.querySelector("#reportPlayer [data-recap-toggle]");
      if (currentToggle) currentToggle.textContent = "Replay";
      return;
    }
    state.reportPlayerIndex += 1;
    renderReportSlide();
  }, 9000);
}

function closeReportPlayer() {
  if (state.reportPlayerTimer) clearInterval(state.reportPlayerTimer);
  state.reportPlayerTimer = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  const player = document.getElementById("reportPlayer");
  if (player) player.remove();
  restoreModalFocus();
}

function restoreModalFocus() {
  const target = state.modalReturnFocus;
  state.modalReturnFocus = null;
  if (target && target.isConnected && typeof target.focus === "function") {
    target.focus({ preventScroll: true });
  }
}

function handleModalKeyboard(event) {
  if (event.key === "Escape") {
    const taskChat = document.getElementById("taskChatOverlay");
    const taskDetails = document.getElementById("taskDetailsOverlay");
    const mediaPreview = document.getElementById("taskMediaPreviewOverlay");
    const reportPlayer = document.getElementById("reportPlayer");
    if (taskChat) taskChat.remove();
    else if (taskDetails) taskDetails.remove();
    else if (mediaPreview) mediaPreview.remove();
    else if (reportPlayer) closeReportPlayer();
    else if (document.getElementById("chatWrap")?.style.display !== "none") hideChat();
    else return;
    restoreModalFocus();
    event.preventDefault();
    return;
  }
  if (event.key !== "Tab") return;
  const dialog = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].pop();
  if (!dialog) return;
  const focusable = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.getClientRects().length > 0);
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus({ preventScroll: true });
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}

async function playSavedReport(reportId) {
  try {
    const data = await fetchJson(`/api/weekly-reports/${reportId}/briefing`);
    openReportPlayer(data);
  } catch (e) {
    notify("Could not open team recap: " + e.message, "error");
  }
}

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

function renderModels() {
  const r = state.modelRouter || {};
  const models = r.models || [];
  const media = state.mediaConfig || {};
  const mediaProviders = media.providers || [];
  const imageProvider = media.image_provider || "gemini";
  const videoProvider = media.video_provider || "gemini";
  const providerOptions = (selected) => mediaProviders.map((provider) =>
    `<option value="${esc(provider.id)}" ${selected === provider.id ? "selected" : ""} ${provider.has_key ? "" : "disabled"}>${esc(provider.label)}${provider.has_key ? "" : " — connect first"}</option>`
  ).join("");
  const imageOptions = (media.image_models || []).map((model) =>
    `<option value="${esc(model.slug)}">${esc(model.name)}</option>`
  ).join("");
  const videoOptions = (media.video_models || []).map((model) =>
    `<option value="${esc(model.slug)}">${esc(model.name)}</option>`
  ).join("");
  const imageProviderReady = mediaProviders.some((provider) => provider.id === imageProvider && provider.has_key);
  const videoProviderReady = mediaProviders.some((provider) => provider.id === videoProvider && provider.has_key);
  const active = r.selected_model || r.active_model || (models.length ? models[0] : "—");

  document.getElementById("content").innerHTML = `
    <div class="section">
      <div class="section-title">Model routing</div>
      <p style="color:var(--muted);font-size:13px;margin-bottom:14px;">
        Your agents use the provider and model selected in Configuration. If a model hits a limit,
        the router automatically tries the next model and then any other configured provider.
      </p>
      <div class="card" style="max-width:760px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <div style="font-weight:700;">Active Model</div>
            <div style="font-size:13px;color:var(--muted);">${esc(active)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700;font-size:13px;color:var(--primary);">${models.length ? `#${(r.index % models.length) + 1} of ${models.length}` : "No models"}</div>
            <div style="font-size:12px;color:var(--muted);">Provider: ${esc(r.provider_label || r.provider || "—")}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-outline" id="btnSwitchModel" ${models.length ? "" : "disabled"}>${icon("refresh", 16)} Switch model</button>
          <button class="btn btn-outline" data-goto="config">${icon("config", 16)} Configure provider</button>
        </div>
        <div class="router-notice" style="margin-top:12px;">
          ${icon("spark", 16)} Auto-failover is ${cfgVal("auto_failover", "1") === "0" ? "OFF" : "ON"}. Model cycling happens automatically on rate limit.
          ${r.has_key ? "API key is configured." : "No API key is configured for this provider."}
        </div>
      </div>
      <div class="section-title mt-8" style="margin-bottom:8px;">Models for ${esc(r.provider_label || r.provider || "—")} (${models.length})</div>
      <div class="model-list">
        ${models.map((m, i) => `
          <div class="model-item ${m === active ? "active" : ""}">
            <div class="m-name">${i + 1}. ${esc(m)}</div>
            <div class="m-status ${m === active ? "m-status-active" : "m-status-inactive"}">${m === active ? "SELECTED" : "available"}</div>
          </div>`).join("") || "<div class='empty'>No models. Configure a provider key first.</div>"}
      </div>
      <section class="media-models-card card">
          <div class="section-title">Image & video generation models</div>
          <p>Choose a provider and model separately for images and video. Google Gemini is the default; deAPI models appear after their key is tested. Only media-capable providers are listed here—ordinary text models cannot generate image or video files. Generation may consume provider credits.</p>
          <div class="media-model-selects">
            <label>Image provider<select id="mediaImageProvider">${providerOptions(imageProvider)}</select></label>
            <label>Image model<input id="mediaImageModel" list="mediaImageModelOptions" value="${esc(media.image_model || "")}" ${imageProviderReady ? "" : "disabled"}><datalist id="mediaImageModelOptions">${imageOptions}</datalist></label>
            <label>Video provider<select id="mediaVideoProvider">${providerOptions(videoProvider)}</select></label>
            <label>Video model<input id="mediaVideoModel" list="mediaVideoModelOptions" value="${esc(media.video_model || "")}" ${videoProviderReady ? "" : "disabled"}><datalist id="mediaVideoModelOptions">${videoOptions}</datalist></label>
          </div>
          <small>Gemini offers the existing default model IDs and compatible discovered model suggestions. deAPI lists only models enabled for this account and media type. Generated files are saved in Files.</small>
      </section>
    </div>
  `;

  const btn = document.getElementById("btnSwitchModel");
  if (btn) btn.addEventListener("click", switchModel);
  ["image", "video"].forEach((kind) => {
    const providerSelect = document.getElementById(`media${kind[0].toUpperCase()}${kind.slice(1)}Provider`);
    const modelInput = document.getElementById(`media${kind[0].toUpperCase()}${kind.slice(1)}Model`);
    if (providerSelect) providerSelect.addEventListener("change", () => selectMediaModel(kind, providerSelect.value, ""));
    if (modelInput) modelInput.addEventListener("change", () => {
      selectMediaModel(kind, providerSelect ? providerSelect.value : "gemini", modelInput.value);
    });
  });
}

async function switchModel() {
  try {
    await fetchJson("/api/model-router/switch", { method: "POST", body: {} });
    await loadAll();
    renderActiveTab(false);
    notify("Switched to the next model", "success");
  } catch (e) {
    notify("Could not switch model: " + e.message, "error");
  }
}

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

function renderConfig() {
  const mr = state.modelRouter || {};
  const provider = mr.provider || "openrouter";
  const selectedModel = cfgVal(`${provider}_selected_model`, "");
  const models = availableModelsFor(provider);
  const test = state.lastTest[provider];

  const providerCards = Object.keys(PROVIDER_CONFIG).map((key) => {
    const active = key === provider;
    const hasKey = cfgHas(`${key}_api_key`);
    const count = availableModelsFor(key).length;
    return `
      <div class="provider-card ${active ? "provider-active" : ""}" data-provider="${key}">
        <div class="provider-head">
          <div>
            <span class="provider-mark provider-mark-${esc(key)}" aria-hidden="true">${esc(PROVIDER_CONFIG[key].mark)}</span>
            <div class="provider-name">${esc(providerLabel(key))}</div>
            <div class="provider-sub">${hasKey ? `Key saved • ${count} model(s)` : "No key"}</div>
          </div>
          <div class="provider-badge ${active ? "badge-active" : "badge-inactive"}">${active ? "ACTIVE" : hasKey ? "KEY SAVED" : "NO KEY"}</div>
        </div>
        <input type="password" id="providerKey_${key}" placeholder="Paste ${esc(providerLabel(key))} API key" autocomplete="off">
        <div class="provider-actions">
          <button class="btn btn-outline btn-sm" data-test-provider="${key}">${icon("key", 14)} Test &amp; list</button>
          <button class="btn btn-primary btn-sm" data-save-provider="${key}">${icon("lock", 14)} Save key</button>
        </div>
        <div class="provider-link"><a href="${esc(PROVIDER_CONFIG[key].site)}" target="_blank" rel="noopener noreferrer">Get a key ${icon("arrow-up-right", 13)}</a></div>
      </div>`;
  }).join("");

  const modelOptions = models.length
    ? models.map((m) => `<option value="${esc(m)}" ${m === selectedModel ? "selected" : ""}>${esc(m)}</option>`).join("")
    : `<option value="">— test your key to load models —</option>`;

  document.getElementById("content").innerHTML = `
    <div class="section">
      <div class="section-title">Company profile</div>
      <form id="companyProfileForm" class="card onboarding-profile-form" style="max-width:760px;">
        <label>Your name<input name="owner_name" maxlength="100" required value="${esc(state.profile.owner_name || "")}"></label>
        <label>Company name<input name="company_name" maxlength="100" required value="${esc(state.profile.company_name || "")}"></label>
        <label>Business and product details<textarea name="company_description" maxlength="1200" rows="3" placeholder="Information agents may use to ground company-specific work.">${esc(state.profile.company_description || "")}</textarea></label>
        <label>Company website<input name="company_website" type="url" maxlength="500" placeholder="https://example.com" value="${esc(state.profile.company_website || "")}"></label>
        <button class="btn btn-primary" type="submit">Save company profile</button>
      </form>
    </div>
    <div class="section">
      <div class="section-title">AI provider</div>
      <p style="color:var(--muted);font-size:13px;margin-bottom:16px;">
        Click a provider card, paste its API key, click <b>Test &amp; List</b>, then choose a model and click <b>Use This Model</b>.
        The key is stored server-side; the browser never receives it back.
      </p>
      <div class="router-notice" style="margin-bottom:16px;">Hermes models are available through OpenRouter. Codex CLI remains available for local project edits in Project Workspace; OpenAI Codex API is a separate cloud option.</div>

      <div class="section-title" style="margin-bottom:8px;">Select Provider</div>
      <div class="provider-grid">${providerCards}</div>

      <div class="card active-provider-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
          <div>
            <div style="font-weight:700;">${esc(providerLabel(provider))} (${esc(provider)})</div>
            <div style="font-size:12px;color:var(--muted);">
              ${models.length} model(s) • Key: ${cfgHas(`${provider}_api_key`) ? "saved" : "not saved"} •
              Auto-failover: ${cfgVal("auto_failover", "1") === "0" ? "Disabled" : "Enabled"}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-primary" data-test-provider="${provider}">${icon("key", 16)} Test &amp; list models</button>
            <button class="btn btn-outline" data-save-provider="${provider}">${icon("lock", 16)} Save key</button>
            ${cfgHas(`${provider}_api_key`) ? `<button class="btn btn-outline" data-clear-key="${provider}">${icon("trash", 16)} Clear key</button>` : ""}
          </div>
        </div>

        <div class="input-wrap">
          <label>${esc(providerLabel(provider))} API key</label>
          <input type="password" id="configApiKey" placeholder="${cfgHas(`${provider}_api_key`) ? "A key is saved — paste a new one to replace it" : "Paste your API key"}" autocomplete="off">
          <div class="config-hint">Get a key at <a href="${esc(PROVIDER_CONFIG[provider].site)}" target="_blank" rel="noopener noreferrer">${esc(providerLabel(provider))} ${icon("arrow-up-right", 13)}</a></div>
        </div>

        <div class="input-wrap">
          <label>Model</label>
          <select id="configModelSelect">${modelOptions}</select>
        </div>
        <button class="btn btn-accent" data-use-model="${provider}" ${models.length ? "" : "disabled"}>${icon("check", 16)} Use this model</button>

        <div class="input-wrap" style="margin-top:14px;">
          <label>Model Auto-Failover</label>
          <select id="configAutoFailover">
            <option value="1" ${cfgVal("auto_failover", "1") !== "0" ? "selected" : ""}>Enabled — switch models automatically on rate limit</option>
            <option value="0" ${cfgVal("auto_failover", "1") === "0" ? "selected" : ""}>Disabled — use one model only</option>
          </select>
        </div>

        <div id="configTestResult" class="test-result ${test ? "test-" + test.type : ""}">${test ? esc(test.message) : ""}</div>
        <div class="router-notice" style="margin-top:12px;">
          ${icon("spark", 16)} Current active model: <b>${esc(selectedModel || mr.active_model || models[0] || "—")}</b>.
          If a model hits its limit, the router automatically tries the next model, then any other configured provider.
        </div>
      </div>

      <div class="section-title mt-8" style="margin-bottom:8px;">Available Models</div>
      <div class="model-list">
        ${models.map((m, i) => `
          <div class="model-item ${m === (selectedModel || models[0]) ? "active" : ""}">
            <div class="m-name">${i + 1}. ${esc(m)}</div>
            <div class="m-status ${m === (selectedModel || models[0]) ? "m-status-active" : "m-status-inactive"}">${m === (selectedModel || models[0]) ? "SELECTED" : "available"}</div>
          </div>`).join("") || "<div class='empty'>No models yet — test a provider key above.</div>"}
      </div>

      <div class="section-title mt-8" style="margin-bottom:8px;">Image & video generation</div>
      <div class="card deapi-config-card">
        <div class="deapi-config-heading">
          <div><span class="provider-mark provider-mark-deapi" aria-hidden="true">dA</span><b>deAPI.ai media models</b></div>
          <span class="provider-badge ${state.mediaConfig.has_key ? "badge-active" : "badge-inactive"}">${state.mediaConfig.has_key ? "CONNECTED" : "NOT CONNECTED"}</span>
        </div>
        <p>Test your deAPI key to load the image and video models enabled for your account. The key stays server-side in the local ignored <code>backend/.env</code>. Image/video generation can spend deAPI credits; model discovery itself does not generate media.</p>
        <div class="input-wrap">
          <label>deAPI key</label>
          <input id="deapiApiKey" type="password" autocomplete="off" placeholder="${state.mediaConfig.has_key ? "A key is saved — paste a replacement to update it" : "Paste your deAPI key"}">
          <div class="config-hint"><a href="https://app.deapi.ai/" target="_blank" rel="noopener noreferrer">Open deAPI account ${icon("arrow-up-right", 13)}</a></div>
        </div>
        <div class="provider-actions">
          <button class="btn btn-primary" id="btnTestDeapiMedia">${icon("key", 16)} Test key &amp; load models</button>
          ${state.mediaConfig.has_key ? `<button class="btn btn-outline" id="btnClearDeapiMedia">Disconnect deAPI</button>` : ""}
        </div>
        <div id="deapiMediaTestResult" class="test-result"></div>
        <div class="config-hint">Choose separate image and video models on the Models page. The agents first create a specific prompt, then submit it to the selected model and save the returned file.</div>
      </div>
      <div class="section-title mt-8" style="margin-bottom:8px;">Web research</div>
      <div class="card">
        <div style="font-weight:700;">Live search for research agents</div>
        <p style="color:var(--muted);font-size:13px;">
          ${cfgHas("web_search_api_key")
            ? "Research agents use the configured search option and automatically fall back to no-key public search."
            : "Research agents use no-key public web search. No search account, API key, or paid plan is required."}
          Public search needs an internet connection; it does not bypass login, access controls, or source-site limits.
          Any optional provider key is stored in the ignored backend/.env file and is never returned to the browser.
        </p>
        <div class="input-wrap">
          <label>Optional Tavily API key (not required)</label>
          <input type="password" id="webSearchApiKey" autocomplete="off"
            placeholder="${cfgHas("web_search_api_key") ? "A key is saved — paste a new one to replace it" : "Leave empty — no-key public search is ready"}">
          <div class="config-hint">
            Leave this optional field empty to use no-key public search. Search results are evidence candidates, not a guarantee of current or qualified profiles.
            Fully verified LinkedIn data requires manual review or approved API access; see
            <a href="https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access" target="_blank" rel="noopener noreferrer">LinkedIn API permissions ${icon("arrow-up-right", 13)}</a>
            and <a href="https://business.linkedin.com/sales-solutions/partners/become-a-partner" target="_blank" rel="noopener noreferrer">Sales Navigator partner access ${icon("arrow-up-right", 13)}</a>.
          </div>
        </div>
        <div class="provider-actions">
          <button class="btn btn-primary" data-test-web-search>${icon("search", 16)} Test public search / save optional key</button>
          ${cfgHas("web_search_api_key") ? `<button class="btn btn-outline" data-clear-key="web_search">${icon("trash", 16)} Disconnect</button>` : ""}
        </div>
        <div id="webSearchTestResult" class="test-result"></div>
      </div>
    </div>
  `;

  const failover = document.getElementById("configAutoFailover");
  const profileForm = document.getElementById("companyProfileForm");
  if (profileForm) profileForm.addEventListener("submit", saveCompanyProfile);
  document.getElementById("btnTestDeapiMedia").addEventListener("click", testDeapiMediaProvider);
  const clearDeapi = document.getElementById("btnClearDeapiMedia");
  if (clearDeapi) clearDeapi.addEventListener("click", clearDeapiMediaProvider);
  if (failover) {
    failover.addEventListener("change", async (e) => {
      try {
        await fetchJson("/api/config", { method: "POST", body: { key: "auto_failover", value: e.target.value } });
        notify("Auto-failover updated", "success");
        await loadAll();
      } catch (err) {
        notify("Could not save setting: " + err.message, "error");
      }
    });
  }
}

async function saveCompanyProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    owner_name: form.elements.owner_name.value.trim(),
    company_name: form.elements.company_name.value.trim(),
    company_description: form.elements.company_description.value.trim(),
    company_website: form.elements.company_website.value.trim(),
  };
  try {
    state.profile = await fetchJson("/api/profile", { method: "POST", body: payload });
    await loadAll();
    renderActiveTab(false);
    notify("Company profile saved", "success");
  } catch (error) {
    notify("Could not save company profile: " + error.message, "error");
  }
}

function enteredKey(provider) {
  const card = document.getElementById(`providerKey_${provider}`);
  if (card && card.value.trim()) return card.value.trim();
  if ((state.modelRouter.provider || "") === provider) {
    const main = document.getElementById("configApiKey");
    if (main && main.value.trim()) return main.value.trim();
  }
  return "";
}

function setTestResult(provider, message, type) {
  state.lastTest[provider] = { message, type };
  const el = document.getElementById("configTestResult");
  if (el && (state.modelRouter.provider || "") === provider) {
    el.textContent = message;
    el.className = `test-result test-${type}`;
  }
}

async function testProvider(provider) {
  const apiKey = enteredKey(provider);
  if (!apiKey) {
    notify(`Paste the ${providerLabel(provider)} API key first`, "error");
    setTestResult(provider, "Enter an API key first.", "error");
    return;
  }
  setTestResult(provider, "⏳ Testing key and fetching models…", "warning");
  try {
    const res = await fetchJson("/api/config/test-and-list", {
      method: "POST",
      body: { api_key: apiKey, provider },
    });
    if (!res.ok) {
      setTestResult(provider, "\u{274C} " + res.message, "error");
      notify(res.message, "error");
      return;
    }

    // Only save a key after it has been proven to work.
    await fetchJson("/api/config", { method: "POST", body: { key: `${provider}_api_key`, value: apiKey } });
    await fetchJson("/api/config", { method: "POST", body: { key: `use_${provider}`, value: "1" } });
    await fetchJson("/api/config/switch-provider", { method: "POST", body: { provider } });

    state.availableModels[provider] = res.available_models || [];
    setTestResult(
      provider,
      `\u{2705} ${res.message}${res.tested_model ? ` Tested: ${res.tested_model}` : ""}`,
      "success"
    );

    const card = document.getElementById(`providerKey_${provider}`);
    if (card) card.value = "";
    const main = document.getElementById("configApiKey");
    if (main) main.value = "";

    await loadAll();
    renderActiveTab(false);
    notify(`\u{2705} ${providerLabel(provider)} connected — ${(res.available_models || []).length} model(s) loaded`, "success");
  } catch (e) {
    setTestResult(provider, "\u{274C} " + e.message, "error");
    notify("Test failed: " + e.message, "error");
  }
}

async function saveProviderKey(provider) {
  const apiKey = enteredKey(provider);
  if (!apiKey) {
    notify(`Paste the ${providerLabel(provider)} API key first`, "error");
    return;
  }
  try {
    await fetchJson("/api/config", { method: "POST", body: { key: `${provider}_api_key`, value: apiKey } });
    await fetchJson("/api/config", { method: "POST", body: { key: `use_${provider}`, value: "1" } });
    await fetchJson("/api/config/switch-provider", { method: "POST", body: { provider } });
    const card = document.getElementById(`providerKey_${provider}`);
    if (card) card.value = "";
    const main = document.getElementById("configApiKey");
    if (main) main.value = "";
    await loadAll();
    renderActiveTab(false);
    notify(`${providerLabel(provider)} key saved. Now click Test & List Models.`, "success");
  } catch (e) {
    notify("Could not save key: " + e.message, "error");
  }
}

async function clearProviderKey(provider) {
  if (!confirm(`Remove the saved ${providerLabel(provider)} API key?`)) return;
  try {
    await fetchJson("/api/config", { method: "POST", body: { key: `${provider}_api_key`, value: "" } });
    await fetchJson("/api/config", { method: "POST", body: { key: `${provider}_selected_model`, value: "" } });
    await loadAll();
    renderActiveTab(false);
    notify(`${providerLabel(provider)} key removed`, "info");
  } catch (e) {
    notify("Could not clear key: " + e.message, "error");
  }
}

async function useModel(provider) {
  const select = document.getElementById("configModelSelect");
  if (!select || !select.value) {
    notify("Select a model first", "error");
    return;
  }
  try {
    await fetchJson("/api/config/select-model", { method: "POST", body: { provider, model: select.value } });
    await loadAll();
    renderActiveTab(false);
    notify(`Now using ${select.value}`, "success");
  } catch (e) {
    notify("Could not select model: " + e.message, "error");
  }
}

async function testDeapiMediaProvider() {
  const input = document.getElementById("deapiApiKey");
  const result = document.getElementById("deapiMediaTestResult");
  const apiKey = input ? input.value.trim() : "";
  if (!apiKey) {
    notify("Paste your deAPI key first", "error");
    return;
  }
  if (result) {
    result.textContent = "Testing key and loading account-enabled media models…";
    result.className = "test-result test-warning";
  }
  try {
    const response = await fetchJson("/api/media/deapi/test-and-list", {
      method: "POST",
      body: { api_key: apiKey },
    });
    if (!response.ok) {
      if (result) {
        result.textContent = response.message || "deAPI key test failed.";
        result.className = "test-result test-error";
      }
      notify(response.message || "deAPI key test failed.", "error");
      return;
    }
    state.mediaConfig = response;
    if (input) input.value = "";
    if (result) {
      result.textContent = response.message;
      result.className = "test-result test-success";
    }
    await loadAll();
    renderActiveTab(false);
    notify("deAPI connected — media models loaded", "success");
  } catch (error) {
    const message = /(^|\b)(not found|request failed \(404\))/i.test(error.message)
      ? "The running Pin2Pin backend returned 404 before it could test or save this key. Close Pin2Pin completely and relaunch the updated copy."
      : error.message;
    if (result) {
      result.textContent = message;
      result.className = "test-result test-error";
    }
    notify("Could not test deAPI key: " + message, "error");
  }
}

async function clearDeapiMediaProvider() {
  if (!confirm("Disconnect deAPI and clear its saved key and selected models?")) return;
  try {
    await Promise.all([
      fetchJson("/api/config", { method: "POST", body: { key: "deapi_api_key", value: "" } }),
      fetchJson("/api/config", { method: "POST", body: { key: "deapi_models", value: "[]" } }),
      fetchJson("/api/config", { method: "POST", body: { key: "deapi_image_model", value: "" } }),
      fetchJson("/api/config", { method: "POST", body: { key: "deapi_video_model", value: "" } }),
      fetchJson("/api/config", { method: "POST", body: { key: "media_image_provider", value: "gemini" } }),
      fetchJson("/api/config", { method: "POST", body: { key: "media_video_provider", value: "gemini" } }),
    ]);
    await loadAll();
    renderActiveTab(false);
    notify("deAPI disconnected", "info");
  } catch (error) {
    notify("Could not disconnect deAPI: " + error.message, "error");
  }
}

async function selectMediaModel(mediaType, provider, model) {
  try {
    state.mediaConfig = await fetchJson("/api/media/select-model", {
      method: "POST",
      body: { media_type: mediaType, provider, model },
    });
    renderActiveTab(false);
    notify(`${mediaType === "image" ? "Image" : "Video"} model updated`, "success");
  } catch (error) {
    notify("Could not select media model: " + error.message, "error");
    await loadAll();
    renderActiveTab(false);
  }
}

async function switchProvider(provider) {
  if ((state.modelRouter.provider || "") === provider) return;
  try {
    await fetchJson("/api/config/switch-provider", { method: "POST", body: { provider } });
    // Never carry a typed key across providers.
    const main = document.getElementById("configApiKey");
    if (main) main.value = "";
    await loadAll();
    renderActiveTab(false);
  } catch (e) {
    notify("Could not switch provider: " + e.message, "error");
  }
}

async function testWebSearch() {
  const input = document.getElementById("webSearchApiKey");
  const apiKey = input ? input.value.trim() : "";
  const result = document.getElementById("webSearchTestResult");
  if (result) {
    result.textContent = apiKey ? "Testing the API key with a live search…" : "Testing free keyless live search…";
    result.className = "test-result test-warning";
  }
  try {
    const response = await fetchJson("/api/research/test", {
      method: "POST",
      body: { api_key: apiKey },
    });
    if (!response.ok) throw new Error(response.message || "Search connection failed.");
    if (apiKey) {
      await fetchJson("/api/config", {
        method: "POST",
        body: { key: "web_search_api_key", value: apiKey },
      });
    }
    if (result) {
      result.textContent = "\u{2705} " + response.message;
      result.className = "test-result test-success";
    }
    input.value = "";
    await loadAll();
    renderActiveTab(false);
    notify(apiKey ? "Optional search key saved; no-key fallback remains enabled" : "No-key public web search is available", "success");
  } catch (error) {
    if (result) {
      result.textContent = "\u{274C} " + error.message;
      result.className = "test-result test-error";
    }
    notify("Could not connect web search: " + error.message, "error");
  }
}

/* ------------------------------------------------------------------ */
/* Activity                                                            */
/* ------------------------------------------------------------------ */

function renderActivity() {
  document.getElementById("content").innerHTML = `
    <div class="section">
      <div class="section-title">Recent activity</div>
      <div class="feed">
        ${state.activity.map((a) => feedItemHtml(a)).join("") || "<div class='empty'>No activity yet.</div>"}
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/* Event wiring                                                        */
/* ------------------------------------------------------------------ */

function setupListeners() {
  window.addEventListener("pagehide", saveLastView);
  document.addEventListener("keydown", handleModalKeyboard);
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      state.selectedAgentId = null;
      goToTab(el.dataset.tab);
    });
  });

  const refreshTop = document.getElementById("btnRefreshTop");
  const pauseWork = document.getElementById("btnPauseWork");
  const refreshPage = document.getElementById("btnRefresh");
  const refresh = async () => {
    await loadAll();
    renderActiveTab(true);
    renderBottomPanel();
    renderFixedChat(true);
    checkApprovals();
    notify("Refreshed", "info");
  };
  if (refreshTop) refreshTop.addEventListener("click", refresh);
  if (refreshPage) refreshPage.addEventListener("click", refresh);
  if (pauseWork) pauseWork.addEventListener("click", async () => {
    const paused = !state.operations.paused;
    pauseWork.disabled = true;
    try {
      state.operations = await fetchJson("/api/operations/pause", {
        method: "POST",
        body: { paused },
      });
      renderOperationsPauseControl();
      await loadAll();
      renderActiveTab(true);
      notify(
        paused
          ? "Queue paused. An already-running model or tool call may finish its current call."
          : "Queue resumed.",
        paused ? "info" : "success",
      );
    } catch (error) {
      notify(`Could not ${paused ? "pause" : "resume"} work: ${error.message}`, "error");
    } finally {
      pauseWork.disabled = false;
    }
  });

  const briefing = document.getElementById("btnCeoBriefing");
  if (briefing) briefing.addEventListener("click", () => {
    state.chatReceiver = "CEO";
    openChat();
    const select = document.getElementById("chatReceiverFixed");
    const input = document.getElementById("chatInputFixed");
    if (select) select.value = "CEO";
    if (input) {
      input.value = "Give me a concise briefing on current project work, blockers, and the next actions for the team.";
      sendChat("fixed");
    }
  });
  const weekly = document.getElementById("btnWeeklyReport");
  if (weekly) weekly.addEventListener("click", async () => {
    goToTab("reports");
    await generateReport();
  });

  const min = document.getElementById("chatMin");
  if (min) min.addEventListener("click", hideChat);
  const close = document.getElementById("chatClose");
  if (close) close.addEventListener("click", hideChat);
  const restore = document.getElementById("chatRestoreBtn");
  if (restore) {
    restore.style.display = "none";
    restore.addEventListener("click", openChat);
  }

  const content = document.getElementById("content");
  content.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const card = event.target.closest(".task-card");
    if (!card || event.target !== card || event.target.closest("button, a, summary, input, select, textarea")) return;
    event.preventDefault();
    openTaskDetails(card.dataset.taskId);
  });
  content.addEventListener("click", async (e) => {
    const archiveTaskButton = e.target.closest("[data-archive-task]");
    if (archiveTaskButton) {
      const task = state.tasks.find((item) => item.id === archiveTaskButton.getAttribute("data-archive-task"));
      if (!task || !confirm(`Hide "${task.title}" from the task board? Its history and files will be kept.`)) return;
      try {
        await fetchJson(`/api/tasks/${encodeURIComponent(task.id)}`, { method: "DELETE" });
        await loadAll();
        if (state.showArchivedTasks) {
          const allTasks = await fetchJson("/api/tasks?include_archived=true");
          state.archivedTasks = allTasks.filter((item) => Boolean(item.archived_at));
        }
        renderActiveTab(false);
        notify("Task hidden from the board; its history is preserved.", "success");
      } catch (error) {
        notify("Could not hide task: " + error.message, "error");
      }
      return;
    }

    const restoreTaskButton = e.target.closest("[data-restore-task]");
    if (restoreTaskButton) {
      const taskId = restoreTaskButton.getAttribute("data-restore-task");
      const task = state.archivedTasks.find((item) => item.id === taskId)
        || state.tasks.find((item) => item.id === taskId);
      if (!task) return;
      try {
        await fetchJson(`/api/tasks/${encodeURIComponent(task.id)}/restore`, { method: "POST" });
        await loadAll();
        const allTasks = await fetchJson("/api/tasks?include_archived=true");
        state.archivedTasks = allTasks.filter((item) => Boolean(item.archived_at));
        renderActiveTab(false);
        notify("Task restored to the board.", "success");
      } catch (error) {
        notify("Could not restore task: " + error.message, "error");
      }
      return;
    }

    const sendEmailButton = e.target.closest("[data-send-email]");
    if (sendEmailButton) {
      await sendEmailDraft(sendEmailButton.getAttribute("data-send-email"));
      return;
    }

    const inboxButton = e.target.closest("[data-refresh-email-inbox]");
    if (inboxButton) {
      await refreshEmailInbox();
      return;
    }

    const replyButton = e.target.closest("[data-email-reply]");
    if (replyButton) {
      const email = state.emailInbox[Number(replyButton.getAttribute("data-email-reply"))];
      const form = document.getElementById("emailDraftForm");
      if (!email || !form) return;
      form.elements.recipient.value = email.from_address;
      form.elements.subject.value = /^re:/i.test(email.subject) ? email.subject : `Re: ${email.subject}`;
      form.elements.body.value = "";
      form.elements.body.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      notify("Reply details filled in. Write and save the draft for review.", "info");
      return;
    }

    const closeMediaPreview = e.target.closest("[data-close-media-preview]");
    if (closeMediaPreview || e.target.id === "taskMediaPreviewOverlay") {
      const previewOverlay = document.getElementById("taskMediaPreviewOverlay");
      if (previewOverlay) previewOverlay.remove();
      restoreModalFocus();
      return;
    }

    const previewMedia = e.target.closest("[data-preview-file]");
    if (previewMedia) {
      openTaskMediaPreview(
        previewMedia.getAttribute("data-preview-file"),
        previewMedia.getAttribute("data-preview-name"),
        previewMedia.getAttribute("data-preview-mime"),
      );
      return;
    }

    const closeTaskDetails = e.target.closest("[data-close-task-details]");
    if (closeTaskDetails || e.target.id === "taskDetailsOverlay") {
      const overlay = document.getElementById("taskDetailsOverlay");
      if (overlay) overlay.remove();
      saveLastView();
      restoreModalFocus();
      return;
    }

    const closeTaskChat = e.target.closest("[data-close-task-chat]");
    if (closeTaskChat || e.target.id === "taskChatOverlay") {
      document.getElementById("taskChatOverlay")?.remove();
      restoreModalFocus();
      return;
    }

    const taskChatButton = e.target.closest("[data-task-chat]");
    if (taskChatButton) {
      openTaskChat(taskChatButton.getAttribute("data-task-chat"));
      return;
    }

    const openTask = e.target.closest("[data-open-task]");
    if (openTask) {
      openTaskDetails(openTask.getAttribute("data-open-task"));
      return;
    }

    const taskCard = e.target.closest(".task-card");
    if (taskCard && !e.target.closest("button, a, summary, details, input, select")) {
      openTaskDetails(taskCard.getAttribute("data-task-id"));
      return;
    }

    const goto = e.target.closest("[data-goto]");
    if (goto) {
      goToTab(goto.dataset.goto);
      return;
    }

    const back = e.target.closest("[data-back-team]");
    if (back) {
      state.selectedAgentId = null;
      renderActiveTab(false);
      return;
    }

    const deleteAgentButton = e.target.closest("[data-delete-agent]");
    if (deleteAgentButton) {
      await deleteAgent(deleteAgentButton.getAttribute("data-delete-agent"));
      return;
    }

    const deleteScheduleButton = e.target.closest("[data-delete-schedule]");
    if (deleteScheduleButton) {
      const scheduleId = deleteScheduleButton.getAttribute("data-delete-schedule");
      if (!confirm("Cancel this recurring schedule? Tasks already queued will remain on the board.")) return;
      try {
        await fetchJson(`/api/agent-schedules/${encodeURIComponent(scheduleId)}`, { method: "DELETE" });
        await loadAll();
        renderActiveTab(false);
        notify("Recurring schedule cancelled", "success");
      } catch (error) {
        notify("Could not cancel schedule: " + error.message, "error");
      }
      return;
    }

    const chatAgent = e.target.closest("[data-chat-agent]");
    if (chatAgent) {
      const name = chatAgent.getAttribute("data-chat-agent");
      state.chatReceiver = name;
      openChat();
      const sel = document.getElementById("chatReceiverFixed");
      if (sel) sel.value = name;
      notify(`Chatting with ${name}`, "info");
      return;
    }

    const agent = e.target.closest("[data-agent-id]");
    if (agent) {
      state.selectedAgentId = agent.getAttribute("data-agent-id");
      renderActiveTab(false);
      return;
    }

    const approve = e.target.closest("[data-approve-task]");
    if (approve) {
      await handleApproval(approve.getAttribute("data-approve-task"), true);
      return;
    }
    const reject = e.target.closest("[data-reject-task]");
    if (reject) {
      await handleApproval(reject.getAttribute("data-reject-task"), false);
      return;
    }

    const retry = e.target.closest("[data-retry-task]");
    if (retry) {
      try {
        await fetchJson(`/api/tasks/${retry.getAttribute("data-retry-task")}/retry`, { method: "POST", body: {} });
        await loadAll();
        renderActiveTab(false);
        notify("Task returned to the queue", "success");
      } catch (err) {
        notify("Could not retry task: " + err.message, "error");
      }
      return;
    }

    const suggestionTask = e.target.closest("[data-suggestion-task]");
    if (suggestionTask) {
      try {
        await fetchJson(`/api/suggestions/${suggestionTask.getAttribute("data-suggestion-task")}/create-task`, {
          method: "POST",
          body: {},
        });
        await loadAll();
        renderActiveTab(false);
        notify("Suggestion added to the task board", "success");
      } catch (err) {
        notify("Could not create task: " + err.message, "error");
      }
      return;
    }

    const suggestionDismiss = e.target.closest("[data-suggestion-dismiss]");
    if (suggestionDismiss) {
      try {
        await fetchJson(`/api/suggestions/${suggestionDismiss.getAttribute("data-suggestion-dismiss")}/dismiss`, {
          method: "POST",
          body: {},
        });
        await loadAll();
        renderActiveTab(false);
      } catch (err) {
        notify("Could not dismiss suggestion: " + err.message, "error");
      }
      return;
    }

    const exportTask = e.target.closest("[data-export-task]");
    if (exportTask) {
      triggerDownload(`/api/tasks/${exportTask.getAttribute("data-export-task")}/export`);
      return;
    }

    const testBtn = e.target.closest("[data-test-provider]");
    if (testBtn) {
      await testProvider(testBtn.getAttribute("data-test-provider"));
      return;
    }
    if (e.target.closest("[data-test-web-search]")) {
      await testWebSearch();
      return;
    }
    const saveBtn = e.target.closest("[data-save-provider]");
    if (saveBtn) {
      await saveProviderKey(saveBtn.getAttribute("data-save-provider"));
      return;
    }
    const clearBtn = e.target.closest("[data-clear-key]");
    if (clearBtn) {
      await clearProviderKey(clearBtn.getAttribute("data-clear-key"));
      return;
    }
    const modelBtn = e.target.closest("[data-use-model]");
    if (modelBtn) {
      await useModel(modelBtn.getAttribute("data-use-model"));
      return;
    }

    const connect = e.target.closest("[data-connect]");
    if (connect) {
      await connectResource(connect.getAttribute("data-connect"));
      return;
    }
    const disconnect = e.target.closest("[data-disconnect]");
    if (disconnect) {
      await disconnectResource(disconnect.getAttribute("data-disconnect"));
      return;
    }
    const readGoogleSheet = e.target.closest("[data-read-google-sheet]");
    if (readGoogleSheet) {
      await readGoogleSheetSample(readGoogleSheet.getAttribute("data-read-google-sheet"));
      return;
    }
    const readGoogleAnalytics = e.target.closest("[data-read-google-analytics]");
    if (readGoogleAnalytics) {
      await readGoogleAnalyticsReport(readGoogleAnalytics.getAttribute("data-read-google-analytics"));
      return;
    }
    const disconnectGoogle = e.target.closest("[data-disconnect-google-oauth]");
    if (disconnectGoogle) {
      if (!confirm("Disconnect Google access for saved Sheets and Analytics resources? Their resource IDs will remain saved.")) return;
      try {
        await fetchJson("/api/resources/google-oauth", { method: "DELETE" });
        state.googleSheetValues = {};
        state.googleAnalyticsReports = {};
        await loadAll();
        renderActiveTab(false);
        notify("Google OAuth disconnected; saved resources remain.", "info");
      } catch (error) {
        notify("Could not disconnect Google: " + error.message, "error");
      }
      return;
    }
    const approveContent = e.target.closest("[data-approve-content]");
    if (approveContent) {
      await approveContentPost(approveContent.getAttribute("data-approve-content"));
      return;
    }

    const download = e.target.closest("[data-download-file]");
    if (download) {
      triggerDownload(`/api/files/${download.getAttribute("data-download-file")}/download`);
      return;
    }
    const del = e.target.closest("[data-delete-file]");
    if (del) {
      if (!confirm(`Delete ${del.getAttribute("data-file-name")}?`)) return;
      try {
        await fetchJson(`/api/files/${del.getAttribute("data-delete-file")}`, { method: "DELETE" });
        notify("File deleted", "info");
        await loadAll();
        renderActiveTab(false);
      } catch (err) {
        notify("Delete failed: " + err.message, "error");
      }
      return;
    }

    const report = e.target.closest("[data-download-report]");
    if (report) {
      triggerDownload(`/api/weekly-reports/${report.getAttribute("data-download-report")}/download`);
      return;
    }
    const playReport = e.target.closest("[data-play-report]");
    if (playReport) {
      await playSavedReport(playReport.getAttribute("data-play-report"));
      return;
    }

    const providerCard = e.target.closest("[data-provider]");
    if (providerCard) {
      if (e.target.closest("input, button, a")) return;
      await switchProvider(providerCard.getAttribute("data-provider"));
      return;
    }
  });
}

/* Start */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

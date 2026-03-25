const UI_STORAGE_KEY = "safeed-ui-state-v5";

const I18N = {
  "en-IN": {
    "nav.agenda": "Agenda",
    "nav.dashboard": "Dashboard",
    "nav.tracks": "Tracks",
    "nav.resources": "Resources",
    "nav.support": "Support",
    "nav.admin": "Admin",
    "hero.eyebrow": "Safety literacy for real-world communities",
    "hero.title": "SafeEd is now a real application, not just a prototype.",
    "hero.lead":
      "Create accounts, complete learning tracks, submit quizzes, save official resources, request support, and manage content through an admin workflow.",
    "agenda.title": "What SafeEd is doing now",
    "dashboard.title": "Your learning and support activity",
    "tracks.title": "Real content with lessons and quizzes",
    "resources.title": "Verified support pathways and reusable programs",
    "report.title": "Submit a support request or guided follow-up",
    "admin.title": "Content and workflow management",
  },
  "hi-IN": {
    "nav.agenda": "कार्य योजना",
    "nav.dashboard": "डैशबोर्ड",
    "nav.tracks": "ट्रैक",
    "nav.resources": "संसाधन",
    "nav.support": "समर्थन",
    "nav.admin": "एडमिन",
    "hero.eyebrow": "वास्तविक समुदायों के लिए सुरक्षा साक्षरता",
    "hero.title": "SafeEd अब एक वास्तविक एप्लिकेशन है, केवल प्रोटोटाइप नहीं।",
    "hero.lead":
      "खाते बनाएं, लर्निंग ट्रैक पूरे करें, क्विज़ भेजें, आधिकारिक संसाधन सहेजें, सहायता अनुरोध भेजें और एडमिन वर्कफ़्लो से कंटेंट प्रबंधित करें।",
    "agenda.title": "SafeEd अभी क्या कर रहा है",
    "dashboard.title": "आपकी सीख और समर्थन गतिविधि",
    "tracks.title": "सबक और क्विज़ के साथ वास्तविक कंटेंट",
    "resources.title": "सत्यापित सहायता मार्ग और पुन: उपयोग योग्य प्रोग्राम",
    "report.title": "सहायता अनुरोध या मार्गदर्शित फॉलो-अप भेजें",
    "admin.title": "कंटेंट और वर्कफ़्लो प्रबंधन",
  },
};

const state = {
  theme: "light",
  authMode: "register",
  search: "",
  globalSearch: "",
  filter: "all",
  locale: "en-IN",
  bootstrap: null,
  quizState: {},
  draftTrack: null,
  offlineMode: false,
  editing: {
    trackId: null,
    resourceId: null,
    programId: null,
    supportId: null,
  },
};

const dom = {
  html: document.documentElement,
  body: document.body,
  themeToggle: document.getElementById("theme-toggle"),
  localeSelect: document.getElementById("locale-select"),
  navToggle: document.querySelector("[data-action='toggle-nav']"),
  navigation: document.getElementById("site-navigation"),
  navActions: document.querySelector(".nav-actions"),
  sessionControls: document.getElementById("session-controls"),
  metricGrid: document.getElementById("metric-grid"),
  dashboardShell: document.getElementById("dashboard-shell"),
  trackSearch: document.getElementById("track-search"),
  globalSearch: document.getElementById("global-search"),
  trackFilters: document.getElementById("track-filters"),
  summaryStrip: document.getElementById("summary-strip"),
  trackGrid: document.getElementById("track-grid"),
  supportGrid: document.getElementById("support-grid"),
  supportDrawer: document.getElementById("support-drawer"),
  supportDrawerGrid: document.getElementById("support-drawer-grid"),
  resourceGrid: document.getElementById("resource-grid"),
  programGrid: document.getElementById("program-grid"),
  reportForm: document.getElementById("report-form"),
  reportCategory: document.getElementById("report-category"),
  reportUrgency: document.getElementById("report-urgency"),
  reportExtraFields: document.getElementById("report-extra-fields"),
  reportNextSteps: document.getElementById("report-next-steps"),
  reporterName: document.getElementById("reporter-name"),
  reporterEmail: document.getElementById("reporter-email"),
  reporterPhone: document.getElementById("reporter-phone"),
  adminShell: document.getElementById("admin-shell"),
  trackDialog: document.getElementById("track-dialog"),
  trackDialogContent: document.getElementById("track-dialog-content"),
  authDialog: document.getElementById("auth-dialog"),
  authTitle: document.getElementById("auth-title"),
  authCopy: document.getElementById("auth-copy"),
  registerForm: document.getElementById("register-form"),
  loginForm: document.getElementById("login-form"),
  seededAdminNote: document.getElementById("seeded-admin-note"),
  toast: document.getElementById("toast"),
  contentVersion: document.getElementById("content-version"),
};

let toastTimer = null;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeLink(url) {
  if (typeof url !== "string") {
    return "#";
  }
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("tel:")) {
    return url;
  }
  return "#";
}

function getCookie(name) {
  return document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.split("=")[1];
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat(state.locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
  } catch (error) {
    return value;
  }
}

function loadUiState() {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    state.theme = parsed.theme || state.theme;
    state.authMode = parsed.authMode || state.authMode;
    state.search = parsed.search || state.search;
    state.globalSearch = parsed.globalSearch || state.globalSearch;
    state.filter = parsed.filter || state.filter;
    state.locale = parsed.locale || state.locale;
  } catch (error) {
    console.warn("SafeEd UI state could not be restored.", error);
  }
}

function saveUiState() {
  localStorage.setItem(
    UI_STORAGE_KEY,
    JSON.stringify({
      theme: state.theme,
      authMode: state.authMode,
      search: state.search,
      globalSearch: state.globalSearch,
      filter: state.filter,
      locale: state.locale,
    }),
  );
}

function applyTheme() {
  dom.html.dataset.theme = state.theme;
  dom.themeToggle.textContent = state.theme === "dark" ? "Use light theme" : "Use dark theme";
}

function applyLocale() {
  const defaults = state.bootstrap?.defaults;
  const fallbackLocale = defaults?.locales?.default || state.locale || "en-IN";
  state.locale = state.locale || fallbackLocale;
  dom.html.lang = state.locale.startsWith("hi") ? "hi" : "en";
  if (dom.localeSelect) {
    dom.localeSelect.value = state.locale;
  }
  const dictionary = I18N[state.locale] || I18N["en-IN"];
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (dictionary[key]) {
      node.textContent = dictionary[key];
    }
  });
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, 2800);
}

async function api(path, options = {}) {
  const csrf = getCookie("safeed_csrf");
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.detail || "Request failed.");
  }

  return payload;
}

async function refreshBootstrap(showSuccessMessage = "") {
  const bootstrap = await api("/api/bootstrap");
  state.bootstrap = bootstrap;
  state.offlineMode = false;
  renderAll();
  if (showSuccessMessage) {
    showToast(showSuccessMessage);
  }
}

async function loadOfflineBootstrap() {
  try {
    const response = await fetch("/assets/data/bootstrap.json", { cache: "force-cache" });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    return null;
  }
}

function toggleSupportDrawer() {
  const isHidden = dom.supportDrawer.hasAttribute("hidden");
  if (isHidden) {
    dom.supportDrawer.removeAttribute("hidden");
    dom.body.dataset.supportOpen = "true";
  } else {
    closeSupportDrawer();
  }
}

function closeSupportDrawer() {
  dom.supportDrawer.setAttribute("hidden", "");
  delete dom.body.dataset.supportOpen;
}

function toggleMobileNav() {
  const expanded = dom.navToggle.getAttribute("aria-expanded") === "true";
  dom.navToggle.setAttribute("aria-expanded", String(!expanded));
  dom.navigation.classList.toggle("is-open", !expanded);
  dom.navActions.classList.toggle("is-open", !expanded);
}

function openAuthDialog(mode = "register") {
  state.authMode = mode;
  saveUiState();
  renderAuthMode();
  if (!dom.authDialog.open) {
    dom.authDialog.showModal();
  }
}

function renderAuthMode() {
  const isLogin = state.authMode === "login";
  dom.authTitle.textContent = isLogin ? "Sign in" : "Create account";
  dom.authCopy.textContent = isLogin
    ? "Sign in to save progress, submit quizzes, and access your dashboard."
    : "Create a learner or facilitator account to track progress and submit quizzes.";
  dom.registerForm.hidden = isLogin;
  dom.loginForm.hidden = !isLogin;

  const defaults = state.bootstrap?.defaults;
  if (defaults?.defaultAdminEmail && defaults?.defaultAdminPassword) {
    dom.seededAdminNote.textContent = `Admin demo: ${defaults.defaultAdminEmail} / ${defaults.defaultAdminPassword}`;
  } else {
    dom.seededAdminNote.textContent = "Admin demo hidden. Set SAFEED_EXPOSE_ADMIN_DEMO=true to show it.";
  }
}

function renderMetrics() {
  const bootstrap = state.bootstrap;
  const user = bootstrap?.user;
  const dashboard = bootstrap?.dashboard;
  const contentVersion = bootstrap?.defaults?.contentVersion || "unknown";
  const metrics = [
    { value: bootstrap?.tracks?.length || 0, label: "seeded learning tracks" },
    { value: bootstrap?.supportContacts?.length || 0, label: "support contact entries" },
    { value: bootstrap?.programs?.length || 0, label: "program shells" },
    {
      value: user ? `${dashboard?.completedTracks || 0}` : contentVersion,
      label: user ? "tracks completed by you" : "content version",
    },
  ];

  dom.metricGrid.innerHTML = metrics
    .map(
      (metric) => `
        <article class="metric-card">
          <strong>${escapeHtml(metric.value)}</strong>
          <span>${escapeHtml(metric.label)}</span>
        </article>
      `,
    )
    .join("");
}

function renderSessionControls() {
  const user = state.bootstrap?.user;

  if (!user) {
    dom.sessionControls.innerHTML = `
      <button class="ghost-button" type="button" data-action="open-auth" data-auth-mode="login">Sign in</button>
      <button class="primary-button" type="button" data-action="open-auth" data-auth-mode="register">Register</button>
    `;
    return;
  }

  dom.sessionControls.innerHTML = `
    <div class="user-chip">
      <div>
        <small>${escapeHtml(user.role)}</small>
        ${escapeHtml(user.name)}
      </div>
    </div>
    <button class="ghost-button" type="button" data-action="scroll-dashboard">Dashboard</button>
    ${user.role === "admin" ? '<button class="ghost-button" type="button" data-action="scroll-admin">Admin</button>' : ""}
    <button class="primary-button" type="button" data-action="logout">Logout</button>
  `;
}

function renderFilters() {
  const categories = new Set((state.bootstrap?.tracks || []).map((track) => track.category));
  const filters = [
    { id: "all", label: "All tracks" },
    ...Array.from(categories).sort().map((category) => ({
      id: category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
    })),
  ];

  dom.trackFilters.innerHTML = filters
    .map(
      (filter) => `
        <button
          class="filter-button ${filter.id === state.filter ? "is-active" : ""}"
          type="button"
          data-action="set-filter"
          data-filter-id="${escapeHtml(filter.id)}"
        >
          ${escapeHtml(filter.label)}
        </button>
      `,
    )
    .join("");
}

function getFilteredTracks() {
  const tracks = state.bootstrap?.tracks || [];
  const search = state.search.trim().toLowerCase();
  return tracks.filter((track) => {
    const matchesFilter = state.filter === "all" || track.category === state.filter;
    const haystack = [
      track.title,
      track.summary,
      track.audience,
      track.deliveryFormat,
      track.pathway,
      track.badge,
      ...(track.tags || []),
      ...(track.outcomes || []),
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = search ? haystack.includes(search) : true;
    return matchesFilter && matchesSearch;
  });
}

function renderSummary() {
  const user = state.bootstrap?.user;
  const dashboard = state.bootstrap?.dashboard;
  const filteredCount = getFilteredTracks().length;
  const items = [
    { value: filteredCount, label: "tracks currently visible" },
    { value: dashboard?.completedTracks ?? 0, label: user ? "tracks completed by you" : "completion unlocks after sign-in" },
    { value: dashboard?.savedResources ?? 0, label: user ? "resources saved to your account" : "saved resources after sign-in" },
    { value: dashboard?.activeReports ?? 0, label: user ? "active support requests" : "support requests if you submit them" },
  ];

  dom.summaryStrip.innerHTML = items
    .map(
      (item) => `
        <article class="summary-item">
          <strong>${escapeHtml(item.value)}</strong>
          <span>${escapeHtml(item.label)}</span>
        </article>
      `,
    )
    .join("");
}

function renderTracks() {
  const user = state.bootstrap?.user;
  dom.trackGrid.innerHTML = getFilteredTracks()
    .map((track) => {
      const completed = Boolean(track.progress?.completed);
      const score = track.progress?.quizScore;
      const statusLabel = track.status && track.status !== "published" ? track.status : completed ? "Completed" : "In progress";
      return `
        <article class="track-card">
          <div class="track-card__header">
            <div>
              <h3>${escapeHtml(track.title)}</h3>
              <div class="track-card__meta">
                <span>${escapeHtml(track.duration)}</span>
                <span>${escapeHtml(track.deliveryFormat)}</span>
                <span>${escapeHtml(track.audience)}</span>
              </div>
            </div>
            <span class="track-card__status ${completed ? "track-card__status--complete" : "track-card__status--pending"}">
              ${escapeHtml(statusLabel)}
            </span>
          </div>
          <div class="pill-row">
            ${track.badge ? `<span class="meta-pill">${escapeHtml(track.badge)}</span>` : ""}
            ${track.pathway ? `<span class="meta-pill">${escapeHtml(track.pathway)}</span>` : ""}
          </div>
          <p>${escapeHtml(track.summary)}</p>
          <ul class="tag-list">
            ${(track.tags || []).map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}
          </ul>
          <div class="item-meta">
            <span>${escapeHtml((track.outcomes || []).length)} outcomes</span>
            <span>${escapeHtml((track.lessons || []).length)} lessons</span>
            <span>${score !== null && score !== undefined ? `${escapeHtml(score)}% latest quiz` : "Quiz not submitted yet"}</span>
          </div>
          <div class="track-card__actions">
            <button class="secondary-button" type="button" data-action="open-track" data-track-id="${track.id}">
              Open track
            </button>
            <button class="track-card__button" type="button" data-action="toggle-complete" data-track-id="${track.id}">
              ${user ? (completed ? "Mark as not done" : "Mark complete") : "Sign in to save progress"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDashboard() {
  const user = state.bootstrap?.user;
  const dashboard = state.bootstrap?.dashboard;

  if (!user || !dashboard) {
    dom.dashboardShell.innerHTML = `
      <div class="empty-state">
        Sign in to activate your dashboard, save progress, submit quizzes, and track support requests over time.
      </div>
    `;
    return;
  }

  const cards = [
    { value: dashboard.completedTracks, label: "tracks completed" },
    { value: dashboard.savedResources, label: "resources saved" },
    { value: dashboard.activeReports, label: "active reports" },
    {
      value: dashboard.averageQuizScore !== null && dashboard.averageQuizScore !== undefined ? `${dashboard.averageQuizScore}%` : "N/A",
      label: "average quiz score",
    },
  ];

  const recentReports = dashboard.recentReports || [];
  const recentActivity = dashboard.recentActivity || [];
  const nextRecommended = dashboard.nextRecommended;

  dom.dashboardShell.innerHTML = `
    <div class="dashboard-grid">
      ${cards
        .map(
          (card) => `
            <article class="dashboard-card">
              <strong>${escapeHtml(card.value)}</strong>
              <span>${escapeHtml(card.label)}</span>
            </article>
          `,
        )
        .join("")}
    </div>
    <div class="dashboard-actions">
      ${
        nextRecommended
          ? `
            <div class="list-card">
              <div class="list-card__header">
                <h3>Next recommended track</h3>
                <span class="status-pill">${escapeHtml(nextRecommended.pathway || "Next up")}</span>
              </div>
              <p>${escapeHtml(nextRecommended.summary)}</p>
              <div class="inline-actions">
                <button class="primary-button" type="button" data-action="open-track" data-track-id="${nextRecommended.id}">
                  Continue ${escapeHtml(nextRecommended.title)}
                </button>
              </div>
            </div>
          `
          : ""
      }
      <div class="list-card">
        <div class="list-card__header">
          <h3>Recent learning activity</h3>
          <span class="status-pill">${escapeHtml(recentActivity.length)} items</span>
        </div>
        <div class="item-list">
          ${
            recentActivity.length
              ? recentActivity
                  .map(
                    (item) => `
                      <article class="item-list__row">
                        <h4>${escapeHtml(item.trackTitle)}</h4>
                        <div class="item-meta">
                          <span>${item.completed ? "Completed" : "In progress"}</span>
                          <span>${item.quizScore !== null && item.quizScore !== undefined ? `${escapeHtml(item.quizScore)}% quiz` : "Quiz pending"}</span>
                          <span>${escapeHtml(formatDateTime(item.lastActivity))}</span>
                        </div>
                      </article>
                    `,
                  )
                  .join("")
              : '<div class="empty-state">No learning activity yet.</div>'
          }
        </div>
      </div>
    </div>
    <div class="dashboard-stack">
      <div class="list-card">
        <div class="list-card__header">
          <h3>Recent support requests</h3>
          <span class="status-pill">${escapeHtml(user.role)}</span>
        </div>
        <div class="item-list">
          ${
            recentReports.length
              ? recentReports
                  .map(
                    (report) => `
                      <article class="report-card">
                        <h4>${escapeHtml(report.category)}</h4>
                        <div class="item-meta">
                          <span>${escapeHtml(report.urgency)}</span>
                          <span>${escapeHtml(report.status)}</span>
                          <span>${escapeHtml(formatDateTime(report.createdAt))}</span>
                        </div>
                        <p>${escapeHtml(report.description)}</p>
                      </article>
                    `,
                  )
                  .join("")
              : '<div class="empty-state">No support requests submitted from this account yet.</div>'
          }
        </div>
      </div>
    </div>
  `;
}

function matchesSearch(term, fields) {
  if (!term) {
    return true;
  }
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(term);
}

function renderSupportCards() {
  const term = state.globalSearch.trim().toLowerCase();
  const contacts = (state.bootstrap?.supportContacts || []).filter((entry) =>
    matchesSearch(term, [entry.title, entry.category, entry.description, entry.number]),
  );
  const markup = contacts
    .map(
      (entry) => `
        <article class="support-card">
          <h3>${escapeHtml(entry.title)}</h3>
          <strong>${escapeHtml(entry.number)}</strong>
          <p>${escapeHtml(entry.description)}</p>
          <div class="resource-card__meta">
            ${entry.license ? `<span>${escapeHtml(entry.license)}</span>` : ""}
          </div>
          <div class="resource-card__actions">
            <a class="primary-button" href="${safeLink(`tel:${entry.number}`)}">Call</a>
            <a class="secondary-button" href="${safeLink(entry.link)}" target="_blank" rel="noreferrer">Official site</a>
          </div>
        </article>
      `,
    )
    .join("");

  dom.supportGrid.innerHTML = markup || emptyStateMarkup("No support contacts match your search.");
  dom.supportDrawerGrid.innerHTML = markup || emptyStateMarkup("No support contacts match your search.");
}

function renderResources() {
  const user = state.bootstrap?.user;
  const term = state.globalSearch.trim().toLowerCase();
  const resources = (state.bootstrap?.resources || []).filter((resource) =>
    matchesSearch(term, [resource.title, resource.owner, resource.category, resource.description, ...(resource.tags || [])]),
  );
  dom.resourceGrid.innerHTML = resources.length
    ? resources
    .map(
      (resource) => `
        <article class="resource-card">
          <button
            class="resource-card__save"
            type="button"
            data-action="${user ? "toggle-save-resource" : "open-auth"}"
            data-resource-id="${resource.id}"
            data-auth-mode="login"
            aria-pressed="${resource.saved}"
            aria-label="${resource.saved ? "Remove saved resource" : "Save resource"}"
          >
            ${resource.saved ? "Saved" : "Save"}
          </button>
          <h3>${escapeHtml(resource.title)}</h3>
          <div class="resource-card__meta">
            <span>${escapeHtml(resource.owner)}</span>
            <span>${escapeHtml(resource.category)}</span>
            <span>Verified ${escapeHtml(resource.verifiedOn)}</span>
          </div>
          <p>${escapeHtml(resource.description)}</p>
          <ul class="tag-list">
            ${(resource.tags || []).map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}
          </ul>
          <div class="item-meta">
            ${resource.license ? `<span>${escapeHtml(resource.license)}</span>` : ""}
          </div>
          <div class="resource-card__actions">
            <a class="resource-card__button" href="${safeLink(resource.link)}" target="_blank" rel="noreferrer">Visit source</a>
          </div>
        </article>
      `,
    )
    .join("")
    : emptyStateMarkup("No resources match your search.");
}

function renderPrograms() {
  const term = state.globalSearch.trim().toLowerCase();
  const programs = (state.bootstrap?.programs || []).filter((program) =>
    matchesSearch(term, [program.title, program.badge, program.summary, ...(program.meta || [])]),
  );
  dom.programGrid.innerHTML = programs.length
    ? programs
    .map(
      (program) => `
        <article class="program-card">
          <span class="program-card__badge">${escapeHtml(program.badge)}</span>
          <h3>${escapeHtml(program.title)}</h3>
          <div class="program-card__meta">
            ${(program.meta || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
            <span>${escapeHtml(program.status)}</span>
          </div>
          <p>${escapeHtml(program.summary)}</p>
          ${program.license ? `<p class="helper-copy">${escapeHtml(program.license)}</p>` : ""}
        </article>
      `,
    )
    .join("")
    : emptyStateMarkup("No programs match your search.");
}

function renderReportFields() {
  const defaults = state.bootstrap?.defaults;
  if (!defaults) {
    return;
  }
  const category = dom.reportCategory.value || defaults.reportCategories?.[0];
  const fields = defaults.reportFields?.[category] || [];
  dom.reportExtraFields.innerHTML = fields
    .map(
      (field) => `
        <label>
          <span>${escapeHtml(field.label)}</span>
          <input
            type="${escapeHtml(field.type || "text")}"
            data-field-id="${escapeHtml(field.id)}"
            ${field.required ? "required" : ""}
          >
        </label>
      `,
    )
    .join("");
}

function renderReportNextSteps() {
  const defaults = state.bootstrap?.defaults;
  if (!defaults) {
    return;
  }
  const category = dom.reportCategory.value || defaults.reportCategories?.[0];
  const urgency = dom.reportUrgency.value || defaults.reportUrgency?.[0];
  const steps = defaults.reportNextSteps?.[category]?.[urgency] || [];
  dom.reportNextSteps.innerHTML = steps.length
    ? steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")
    : "<li>No guidance available yet.</li>";
}

function renderReportDefaults() {
  const defaults = state.bootstrap?.defaults;
  if (!defaults) {
    return;
  }

  dom.reportCategory.innerHTML = defaults.reportCategories
    .map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
    .join("");
  dom.reportUrgency.innerHTML = defaults.reportUrgency
    .map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
    .join("");

  const user = state.bootstrap?.user;
  dom.reporterName.value = user?.name || "";
  dom.reporterEmail.value = user?.email || "";
  dom.reporterPhone.value = "";
  renderReportFields();
  renderReportNextSteps();
}

function formatJsonField(value, fallback = []) {
  try {
    return escapeHtml(JSON.stringify(value || fallback, null, 2));
  } catch (error) {
    return escapeHtml(JSON.stringify(fallback, null, 2));
  }
}

function trackFormMarkup(track = null) {
  const draft = track || state.draftTrack || {};
  const showDraft = !track && state.draftTrack;
  const draftDeliveryFormat = draft.deliveryFormat || draft.delivery_format || "";
  const draftPathOrder = draft.pathOrder ?? draft.path_order ?? 0;
  const draftPassingScore = draft.passingScore ?? draft.passing_score ?? 70;
  const draftCompletionCriteria = draft.completionCriteria || draft.completion_criteria || [];
  const draftSourceUrl = draft.sourceUrl || draft.source_url || "";
  return `
    <form id="track-admin-form" class="admin-form">
      <input type="hidden" name="trackId" value="${track?.id || ""}">
      <div class="draft-panel">
        <label><span>Draft prompt</span><textarea id="draft-prompt" maxlength="800" placeholder="Describe the safety topic you want drafted."></textarea></label>
        <div class="inline-actions">
          <button class="ghost-button" type="button" data-action="generate-track-draft">Generate draft</button>
          ${showDraft ? '<button class="ghost-button" type="button" data-action="clear-track-draft">Clear draft</button>' : ""}
        </div>
        ${showDraft ? '<p class="helper-copy">Draft loaded. Review and edit before saving.</p>' : ""}
      </div>
      <div class="field-grid field-grid--two">
        <label><span>Title</span><input name="title" type="text" maxlength="255" value="${escapeHtml(draft.title || "")}" required></label>
        <label><span>Category</span><input name="category" type="text" maxlength="64" value="${escapeHtml(draft.category || "")}" required></label>
      </div>
      <div class="field-grid field-grid--two">
        <label><span>Duration</span><input name="duration" type="text" maxlength="64" value="${escapeHtml(draft.duration || "")}" required></label>
        <label><span>Audience</span><input name="audience" type="text" maxlength="255" value="${escapeHtml(draft.audience || "")}" required></label>
      </div>
      <label><span>Delivery format</span><input name="deliveryFormat" type="text" maxlength="120" value="${escapeHtml(draftDeliveryFormat)}" required></label>
      <label><span>Summary</span><textarea name="summary" maxlength="2000" required>${escapeHtml(draft.summary || "")}</textarea></label>
      <div class="field-grid field-grid--two">
        <label><span>Pathway</span><input name="pathway" type="text" maxlength="120" value="${escapeHtml(draft.pathway || "")}"></label>
        <label><span>Path order</span><input name="pathOrder" type="number" min="0" value="${escapeHtml(draftPathOrder)}"></label>
      </div>
      <div class="field-grid field-grid--two">
        <label><span>Badge</span><input name="badge" type="text" maxlength="120" value="${escapeHtml(draft.badge || "")}"></label>
        <label><span>Passing score</span><input name="passingScore" type="number" min="0" max="100" value="${escapeHtml(draftPassingScore)}"></label>
      </div>
      <div class="field-grid field-grid--two">
        <label><span>Status</span>
          <select name="status">
            ${["published", "draft"].map((status) => `<option value="${status}" ${draft.status === status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </label>
        <label><span>Source URL</span><input name="sourceUrl" type="url" maxlength="512" value="${escapeHtml(draftSourceUrl)}"></label>
      </div>
      <label><span>License</span><input name="license" type="text" maxlength="120" value="${escapeHtml(draft.license || "")}"></label>
      <label><span>Tags (one per line)</span><textarea name="tags">${escapeHtml((draft.tags || []).join("\n"))}</textarea></label>
      <label><span>Outcomes (one per line)</span><textarea name="outcomes">${escapeHtml((draft.outcomes || []).join("\n"))}</textarea></label>
      <label><span>Materials (one per line)</span><textarea name="materials">${escapeHtml((draft.materials || []).join("\n"))}</textarea></label>
      <label><span>Prerequisites (one per line)</span><textarea name="prerequisites">${escapeHtml((draft.prerequisites || []).join("\n"))}</textarea></label>
      <label><span>Completion criteria (one per line)</span><textarea name="completionCriteria">${escapeHtml(draftCompletionCriteria.join("\n"))}</textarea></label>
      <label><span>Lessons JSON</span><textarea name="lessonsJson">${formatJsonField(draft.lessons, [])}</textarea></label>
      <label><span>Quiz JSON</span><textarea name="quizJson">${formatJsonField(draft.quiz, [])}</textarea></label>
      <div class="inline-actions">
        <button class="primary-button" type="submit">${track ? "Update track" : "Create track"}</button>
        ${track ? '<button class="ghost-button" type="button" data-action="cancel-track-edit">Cancel edit</button>' : ""}
      </div>
    </form>
  `;
}

function resourceFormMarkup(resource = null) {
  return `
    <form id="resource-admin-form" class="admin-form">
      <input type="hidden" name="resourceId" value="${resource?.id || ""}">
      <div class="field-grid field-grid--two">
        <label><span>Title</span><input name="title" type="text" maxlength="255" value="${escapeHtml(resource?.title || "")}" required></label>
        <label><span>Owner</span><input name="owner" type="text" maxlength="255" value="${escapeHtml(resource?.owner || "")}" required></label>
      </div>
      <div class="field-grid field-grid--two">
        <label><span>Category</span><input name="category" type="text" maxlength="80" value="${escapeHtml(resource?.category || "")}" required></label>
        <label><span>Verified on</span><input name="verifiedOn" type="text" maxlength="64" value="${escapeHtml(resource?.verifiedOn || "")}" required></label>
      </div>
      <div class="field-grid field-grid--two">
        <label><span>Status</span><input name="status" type="text" maxlength="32" value="${escapeHtml(resource?.status || "active")}" required></label>
        <label><span>Source URL</span><input name="sourceUrl" type="url" maxlength="512" value="${escapeHtml(resource?.sourceUrl || "")}"></label>
      </div>
      <label><span>License</span><input name="license" type="text" maxlength="120" value="${escapeHtml(resource?.license || "")}"></label>
      <label><span>Link</span><input name="link" type="url" maxlength="512" value="${escapeHtml(resource?.link || "")}" required></label>
      <label><span>Description</span><textarea name="description" maxlength="2000" required>${escapeHtml(resource?.description || "")}</textarea></label>
      <label><span>Tags (one per line)</span><textarea name="tags">${escapeHtml((resource?.tags || []).join("\n"))}</textarea></label>
      <div class="inline-actions">
        <button class="primary-button" type="submit">${resource ? "Update resource" : "Create resource"}</button>
        ${resource ? '<button class="ghost-button" type="button" data-action="cancel-resource-edit">Cancel edit</button>' : ""}
      </div>
    </form>
  `;
}

function programFormMarkup(program = null) {
  return `
    <form id="program-admin-form" class="admin-form">
      <input type="hidden" name="programId" value="${program?.id || ""}">
      <div class="field-grid field-grid--two">
        <label><span>Title</span><input name="title" type="text" maxlength="255" value="${escapeHtml(program?.title || "")}" required></label>
        <label><span>Badge</span><input name="badge" type="text" maxlength="120" value="${escapeHtml(program?.badge || "")}" required></label>
      </div>
      <label><span>Status</span><input name="status" type="text" maxlength="40" value="${escapeHtml(program?.status || "Active")}" required></label>
      <label><span>Summary</span><textarea name="summary" maxlength="2000" required>${escapeHtml(program?.summary || "")}</textarea></label>
      <label><span>Meta lines (one per line)</span><textarea name="meta">${escapeHtml((program?.meta || []).join("\n"))}</textarea></label>
      <div class="field-grid field-grid--two">
        <label><span>Source URL</span><input name="sourceUrl" type="url" maxlength="512" value="${escapeHtml(program?.sourceUrl || "")}"></label>
        <label><span>License</span><input name="license" type="text" maxlength="120" value="${escapeHtml(program?.license || "")}"></label>
      </div>
      <div class="inline-actions">
        <button class="primary-button" type="submit">${program ? "Update program" : "Create program"}</button>
        ${program ? '<button class="ghost-button" type="button" data-action="cancel-program-edit">Cancel edit</button>' : ""}
      </div>
    </form>
  `;
}

function supportFormMarkup(contact = null) {
  return `
    <form id="support-admin-form" class="admin-form">
      <input type="hidden" name="supportId" value="${contact?.id || ""}">
      <div class="field-grid field-grid--two">
        <label><span>Title</span><input name="title" type="text" maxlength="255" value="${escapeHtml(contact?.title || "")}" required></label>
        <label><span>Number</span><input name="number" type="text" maxlength="40" value="${escapeHtml(contact?.number || "")}" required></label>
      </div>
      <div class="field-grid field-grid--two">
        <label><span>Category</span><input name="category" type="text" maxlength="80" value="${escapeHtml(contact?.category || "")}" required></label>
        <label><span>Priority</span><input name="priority" type="number" min="1" max="999" value="${escapeHtml(contact?.priority || 100)}" required></label>
      </div>
      <label><span>Link</span><input name="link" type="url" maxlength="512" value="${escapeHtml(contact?.link || "")}" required></label>
      <label><span>Description</span><textarea name="description" maxlength="2000" required>${escapeHtml(contact?.description || "")}</textarea></label>
      <div class="field-grid field-grid--two">
        <label><span>Source URL</span><input name="sourceUrl" type="url" maxlength="512" value="${escapeHtml(contact?.sourceUrl || "")}"></label>
        <label><span>License</span><input name="license" type="text" maxlength="120" value="${escapeHtml(contact?.license || "")}"></label>
      </div>
      <div class="inline-actions">
        <button class="primary-button" type="submit">${contact ? "Update support contact" : "Create support contact"}</button>
        ${contact ? '<button class="ghost-button" type="button" data-action="cancel-support-edit">Cancel edit</button>' : ""}
      </div>
    </form>
  `;
}

function renderQuizResults(trackId) {
  const quizState = state.quizState[trackId];
  if (!quizState?.results?.length) {
    return "";
  }

  return `
    <div class="dialog-section">
      <div class="list-card">
        <div class="list-card__header">
          <h3>${escapeHtml(quizState.passed ? "Quiz passed" : "Quiz submitted")}</h3>
          <span class="status-pill">${escapeHtml(quizState.score)}%</span>
        </div>
        <div class="quiz-results">
          ${quizState.results
            .map(
              (result, index) => `
                <article class="quiz-result ${result.isCorrect ? "quiz-result--correct" : "quiz-result--incorrect"}">
                  <h4>Question ${index + 1}</h4>
                  <p>${escapeHtml(result.question)}</p>
                  <div class="item-meta">
                    <span>${result.isCorrect ? "Correct" : "Review needed"}</span>
                    <span>Selected option ${escapeHtml(result.selected + 1)}</span>
                    <span>Correct option ${escapeHtml(result.correctIndex + 1)}</span>
                  </div>
                  <p class="helper-copy">${escapeHtml(result.explanation)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function trackDialogMarkup(track) {
  const user = state.bootstrap?.user;
  const quizState = state.quizState[track.id] || {};
  const score = track.progress?.quizScore;
  const completed = Boolean(track.progress?.completed);
  const prerequisites = track.prerequisites || [];
  const completionCriteria = track.completionCriteria || [];

  return `
    <div class="dialog-section">
      <section class="list-card">
        <div class="list-card__header">
          <div>
            <p class="eyebrow">${escapeHtml(track.category)}</p>
            <h2 id="track-dialog-title">${escapeHtml(track.title)}</h2>
          </div>
          <span class="status-pill">${completed ? "Completed" : score !== null && score !== undefined ? `${score}% latest` : "Not completed"}</span>
        </div>
        <p>${escapeHtml(track.summary)}</p>
        <div class="item-meta">
          <span>${escapeHtml(track.duration)}</span>
          <span>${escapeHtml(track.deliveryFormat)}</span>
          <span>${escapeHtml(track.audience)}</span>
        </div>
        <div class="pill-row">
          ${track.badge ? `<span class="meta-pill">${escapeHtml(track.badge)}</span>` : ""}
          ${track.pathway ? `<span class="meta-pill">${escapeHtml(track.pathway)}</span>` : ""}
        </div>
        <ul class="tag-list">
          ${(track.tags || []).map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}
        </ul>
        <div class="inline-actions">
          <button class="primary-button" type="button" data-action="toggle-complete" data-track-id="${track.id}">
            ${user ? (completed ? "Mark as not done" : "Mark complete") : "Sign in to save progress"}
          </button>
          ${user ? "" : '<button class="ghost-button" type="button" data-action="open-auth" data-auth-mode="login">Sign in</button>'}
        </div>
      </section>

      <div class="field-grid field-grid--two">
        <section class="list-card">
          <div class="list-card__header">
            <h3>Learning outcomes</h3>
          </div>
          <ul class="bullet-list">
            ${(track.outcomes || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </section>

        <section class="list-card">
          <div class="list-card__header">
            <h3>Suggested materials</h3>
          </div>
          <ul class="bullet-list">
            ${(track.materials || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </section>
      </div>

      <div class="field-grid field-grid--two">
        <section class="list-card">
          <div class="list-card__header">
            <h3>Prerequisites</h3>
          </div>
          <ul class="bullet-list">
            ${prerequisites.length ? prerequisites.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>None</li>"}
          </ul>
        </section>

        <section class="list-card">
          <div class="list-card__header">
            <h3>Completion criteria</h3>
            <span class="status-pill">Pass mark ${escapeHtml(track.passingScore || 70)}%</span>
          </div>
          <ul class="bullet-list">
            ${completionCriteria.length ? completionCriteria.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>Complete lessons and quiz.</li>"}
          </ul>
        </section>
      </div>

      <section class="list-card">
        <div class="list-card__header">
          <h3>Lesson plan</h3>
          <span class="status-pill">${escapeHtml((track.lessons || []).length)} lessons</span>
        </div>
        <div class="lessons-list">
          ${(track.lessons || [])
            .map(
              (lesson) => `
                <article class="lesson-card">
                  <h4>${escapeHtml(lesson.title)}</h4>
                  <div class="item-meta">
                    <span>${escapeHtml(lesson.type)}</span>
                  </div>
                  <ul class="bullet-list">
                    ${(lesson.points || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
                  </ul>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="list-card">
        <div class="list-card__header">
          <h3>Quiz</h3>
          <span class="status-pill">Pass mark ${escapeHtml(track.passingScore || 70)}%</span>
        </div>
        ${
          user
            ? `
              <form id="quiz-form" class="quiz-form" data-track-id="${track.id}">
                ${(track.quiz || [])
                  .map(
                    (question, index) => `
                      <fieldset class="quiz-question">
                        <h4>Question ${index + 1}</h4>
                        <p>${escapeHtml(question.question)}</p>
                        <div class="option-list">
                          ${question.options
                            .map(
                              (option, optionIndex) => `
                                <label class="option-row">
                                  <input
                                    type="radio"
                                    name="question-${index}"
                                    value="${optionIndex}"
                                    ${String(quizState.answers?.[index]) === String(optionIndex) ? "checked" : ""}
                                    required
                                  >
                                  <span>${escapeHtml(option)}</span>
                                </label>
                              `,
                            )
                            .join("")}
                        </div>
                      </fieldset>
                    `,
                  )
                  .join("")}
                <div class="inline-actions">
                  <button class="primary-button" type="submit">Submit quiz</button>
                </div>
              </form>
            `
            : emptyStateMarkup("Sign in to submit the quiz and store your score.")
        }
      </section>

      ${renderQuizResults(track.id)}
    </div>
  `;
}

function openTrackDialog(trackId) {
  const track = (state.bootstrap?.tracks || []).find((item) => item.id === Number(trackId));
  if (!track) {
    showToast("Track not found.");
    return;
  }

  state.activeTrackId = track.id;
  dom.trackDialogContent.innerHTML = trackDialogMarkup(track);
  if (!dom.trackDialog.open) {
    dom.trackDialog.showModal();
  }
}

function renderAdmin() {
  const user = state.bootstrap?.user;
  if (!user || user.role !== "admin") {
    dom.adminShell.innerHTML = emptyStateMarkup("Sign in as an admin account to manage tracks, resources, programs, support contacts, and request statuses.");
    return;
  }

  const overview = state.bootstrap?.adminOverview || {
    counts: { users: 0, tracks: 0, resources: 0, programs: 0, supportContacts: 0, reports: 0, audits: 0 },
    reports: [],
    audits: [],
  };
  const track = (state.bootstrap?.tracks || []).find((item) => item.id === state.editing.trackId) || null;
  const resource = (state.bootstrap?.resources || []).find((item) => item.id === state.editing.resourceId) || null;
  const program = (state.bootstrap?.programs || []).find((item) => item.id === state.editing.programId) || null;
  const contact = (state.bootstrap?.supportContacts || []).find((item) => item.id === state.editing.supportId) || null;
  const summaryCards = [
    { label: "users", value: overview.counts.users },
    { label: "tracks", value: overview.counts.tracks },
    { label: "resources", value: overview.counts.resources },
    { label: "reports", value: overview.counts.reports },
  ];
  const statusOptions = state.bootstrap?.defaults?.reportStatuses || ["New", "In review", "Resolved", "Closed"];

  dom.adminShell.innerHTML = `
    <div class="admin-summary-grid">
      ${summaryCards
        .map(
          (card) => `
            <article class="admin-card">
              <strong>${escapeHtml(card.value)}</strong>
              <span>${escapeHtml(card.label)}</span>
            </article>
          `,
        )
        .join("")}
    </div>

    <section class="list-card admin-tools">
      <div class="list-card__header">
        <h3>Admin tools</h3>
        <span class="status-pill">Content v${escapeHtml(state.bootstrap?.defaults?.contentVersion || "unknown")}</span>
      </div>
      <div class="inline-actions">
        <button class="ghost-button" type="button" data-action="export-content">Export content</button>
        <input id="content-import" class="file-input" type="file" accept="application/json">
        <button class="ghost-button" type="button" data-action="import-content">Import content</button>
      </div>
      <p class="helper-copy">Exports include tracks, resources, programs, and support contacts. Imports merge by title or slug.</p>
    </section>

    <div class="management-grid">
      <section class="list-card">
        <div class="list-card__header">
          <h3>${track ? "Edit track" : "Create track"}</h3>
          <span class="status-pill">${escapeHtml((state.bootstrap?.tracks || []).length)} total</span>
        </div>
        ${trackFormMarkup(track)}
        <div class="item-list">
          ${(state.bootstrap?.tracks || [])
            .map(
              (item) => `
                <article class="item-list__row">
                  <h4>${escapeHtml(item.title)}</h4>
                  <div class="item-meta">
                    <span>${escapeHtml(item.category)}</span>
                    <span>${escapeHtml(item.duration)}</span>
                    <span>${escapeHtml(item.audience)}</span>
                    <span>${escapeHtml(item.status)}</span>
                  </div>
                  <div class="inline-actions">
                    <button class="ghost-button" type="button" data-action="edit-track" data-track-id="${item.id}">Edit</button>
                    <button class="ghost-button" type="button" data-action="delete-track" data-track-id="${item.id}">Delete</button>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="list-card">
        <div class="list-card__header">
          <h3>${resource ? "Edit resource" : "Create resource"}</h3>
          <span class="status-pill">${escapeHtml((state.bootstrap?.resources || []).length)} total</span>
        </div>
        ${resourceFormMarkup(resource)}
        <div class="item-list">
          ${(state.bootstrap?.resources || [])
            .map(
              (item) => `
                <article class="item-list__row">
                  <h4>${escapeHtml(item.title)}</h4>
                  <div class="item-meta">
                    <span>${escapeHtml(item.owner)}</span>
                    <span>${escapeHtml(item.category)}</span>
                    <span>${escapeHtml(item.status || "active")}</span>
                  </div>
                  <div class="inline-actions">
                    <button class="ghost-button" type="button" data-action="edit-resource" data-resource-id="${item.id}">Edit</button>
                    <button class="ghost-button" type="button" data-action="delete-resource" data-resource-id="${item.id}">Delete</button>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="list-card">
        <div class="list-card__header">
          <h3>${program ? "Edit program" : "Create program"}</h3>
          <span class="status-pill">${escapeHtml((state.bootstrap?.programs || []).length)} total</span>
        </div>
        ${programFormMarkup(program)}
        <div class="item-list">
          ${(state.bootstrap?.programs || [])
            .map(
              (item) => `
                <article class="item-list__row">
                  <h4>${escapeHtml(item.title)}</h4>
                  <div class="item-meta">
                    <span>${escapeHtml(item.badge)}</span>
                    <span>${escapeHtml(item.status)}</span>
                  </div>
                  <div class="inline-actions">
                    <button class="ghost-button" type="button" data-action="edit-program" data-program-id="${item.id}">Edit</button>
                    <button class="ghost-button" type="button" data-action="delete-program" data-program-id="${item.id}">Delete</button>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="list-card">
        <div class="list-card__header">
          <h3>${contact ? "Edit support contact" : "Create support contact"}</h3>
          <span class="status-pill">${escapeHtml((state.bootstrap?.supportContacts || []).length)} total</span>
        </div>
        ${supportFormMarkup(contact)}
        <div class="item-list">
          ${(state.bootstrap?.supportContacts || [])
            .map(
              (item) => `
                <article class="item-list__row">
                  <h4>${escapeHtml(item.title)}</h4>
                  <div class="item-meta">
                    <span>${escapeHtml(item.number)}</span>
                    <span>${escapeHtml(item.category)}</span>
                    <span>Priority ${escapeHtml(item.priority)}</span>
                  </div>
                  <div class="inline-actions">
                    <button class="ghost-button" type="button" data-action="edit-support" data-support-id="${item.id}">Edit</button>
                    <button class="ghost-button" type="button" data-action="delete-support" data-support-id="${item.id}">Delete</button>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    </div>

    <section class="list-card">
      <div class="list-card__header">
        <h3>Support request queue</h3>
        <span class="status-pill">${escapeHtml(overview.reports.length)} recent</span>
      </div>
      <div class="item-list">
        ${
          overview.reports.length
            ? overview.reports
                .map(
                  (report) => `
                    <article class="report-card" data-status="${escapeHtml(report.status)}">
                      <h4>${escapeHtml(report.category)}</h4>
                      <div class="item-meta">
                        <span>${escapeHtml(report.reporterName)}</span>
                        <span>${escapeHtml(report.reporterEmail)}</span>
                        <span>${escapeHtml(report.urgency)}</span>
                        <span>${escapeHtml(report.status)}</span>
                        <span>${escapeHtml(formatDateTime(report.createdAt))}</span>
                      </div>
                      <p>${escapeHtml(report.description)}</p>
                      <div class="field-grid">
                        <label><span>Admin notes</span><textarea data-field="admin-notes">${escapeHtml(report.adminNotes || "")}</textarea></label>
                        <label><span>Follow-up (ISO)</span><input data-field="follow-up" type="datetime-local" value="${report.nextFollowUp ? escapeHtml(report.nextFollowUp.slice(0, 16)) : ""}"></label>
                        <label><span>Resolution checklist (one per line)</span><textarea data-field="checklist">${escapeHtml((report.resolutionChecklist || []).join("\n"))}</textarea></label>
                      </div>
                      <div class="inline-actions">
                        ${statusOptions
                          .map(
                            (status) => `
                              <button
                                class="${status === report.status ? "primary-button" : "ghost-button"}"
                                type="button"
                                data-action="set-report-status"
                                data-report-id="${report.id}"
                                data-status="${escapeHtml(status)}"
                              >
                                ${escapeHtml(status)}
                              </button>
                            `,
                          )
                          .join("")}
                        <button class="ghost-button" type="button" data-action="save-report-details" data-report-id="${report.id}">
                          Save details
                        </button>
                      </div>
                    </article>
                  `,
                )
                .join("")
            : emptyStateMarkup("No support requests are stored yet.")
        }
      </div>
    </section>

    <section class="list-card">
      <div class="list-card__header">
        <h3>Recent admin activity</h3>
        <span class="status-pill">${escapeHtml(overview.audits.length)} entries</span>
      </div>
      <div class="item-list">
        ${
          overview.audits.length
            ? overview.audits
                .map(
                  (audit) => `
                    <article class="item-list__row">
                      <h4>${escapeHtml(audit.action)} ${escapeHtml(audit.entityType)}</h4>
                      <div class="item-meta">
                        <span>ID ${escapeHtml(audit.entityId ?? "n/a")}</span>
                        <span>${escapeHtml(formatDateTime(audit.createdAt))}</span>
                      </div>
                    </article>
                  `,
                )
                .join("")
            : emptyStateMarkup("No admin actions logged yet.")
        }
      </div>
    </section>
  `;
}

function renderAll() {
  renderAuthMode();
  renderMetrics();
  renderSessionControls();
  renderFilters();
  renderSummary();
  renderTracks();
  renderDashboard();
  renderSupportCards();
  renderResources();
  renderPrograms();
  renderReportDefaults();
  renderAdmin();
  applyTheme();
  applyLocale();
  observeReveals();
  if (dom.trackSearch && dom.trackSearch.value !== state.search) {
    dom.trackSearch.value = state.search;
  }
  if (dom.globalSearch && dom.globalSearch.value !== state.globalSearch) {
    dom.globalSearch.value = state.globalSearch;
  }
  if (dom.contentVersion) {
    dom.contentVersion.textContent = state.bootstrap?.defaults?.contentVersion || "unknown";
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : "Request failed.";
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyStateMarkup(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function observeReveals() {
  const items = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  if (!window.safeEdRevealObserver) {
    window.safeEdRevealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            window.safeEdRevealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
  }

  items.forEach((item) => {
    if (!item.classList.contains("is-visible")) {
      window.safeEdRevealObserver.observe(item);
    }
  });
}

function parseJsonField(value, fallback, label) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function trackPayloadFromForm(form) {
  return {
    title: form.elements.title.value.trim(),
    category: form.elements.category.value.trim(),
    duration: form.elements.duration.value.trim(),
    audience: form.elements.audience.value.trim(),
    delivery_format: form.elements.deliveryFormat.value.trim(),
    summary: form.elements.summary.value.trim(),
    tags: splitLines(form.elements.tags.value),
    outcomes: splitLines(form.elements.outcomes.value),
    materials: splitLines(form.elements.materials.value),
    prerequisites: splitLines(form.elements.prerequisites.value),
    completion_criteria: splitLines(form.elements.completionCriteria.value),
    pathway: form.elements.pathway.value.trim(),
    path_order: Number(form.elements.pathOrder.value || 0),
    badge: form.elements.badge.value.trim(),
    passing_score: Number(form.elements.passingScore.value || 70),
    source_url: form.elements.sourceUrl.value.trim(),
    license: form.elements.license.value.trim(),
    status: form.elements.status.value,
    lessons: parseJsonField(form.elements.lessonsJson.value, [], "Lessons JSON"),
    quiz: parseJsonField(form.elements.quizJson.value, [], "Quiz JSON"),
  };
}

function resourcePayloadFromForm(form) {
  return {
    title: form.elements.title.value.trim(),
    owner: form.elements.owner.value.trim(),
    category: form.elements.category.value.trim(),
    description: form.elements.description.value.trim(),
    link: form.elements.link.value.trim(),
    verified_on: form.elements.verifiedOn.value.trim(),
    tags: splitLines(form.elements.tags.value),
    source_url: form.elements.sourceUrl.value.trim(),
    license: form.elements.license.value.trim(),
    status: form.elements.status.value.trim(),
  };
}

function programPayloadFromForm(form) {
  return {
    title: form.elements.title.value.trim(),
    badge: form.elements.badge.value.trim(),
    summary: form.elements.summary.value.trim(),
    status: form.elements.status.value.trim(),
    meta: splitLines(form.elements.meta.value),
    source_url: form.elements.sourceUrl.value.trim(),
    license: form.elements.license.value.trim(),
  };
}

function supportPayloadFromForm(form) {
  return {
    title: form.elements.title.value.trim(),
    number: form.elements.number.value.trim(),
    category: form.elements.category.value.trim(),
    description: form.elements.description.value.trim(),
    link: form.elements.link.value.trim(),
    priority: Number(form.elements.priority.value || 100),
    source_url: form.elements.sourceUrl.value.trim(),
    license: form.elements.license.value.trim(),
  };
}

function resetEditing(type) {
  state.editing[`${type}Id`] = null;
  renderAdmin();
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function maybeRequireAuth(error) {
  if (errorMessage(error) === "Authentication required.") {
    openAuthDialog("login");
    return true;
  }
  return false;
}

async function readImportFile() {
  const input = document.getElementById("content-import");
  if (!(input instanceof HTMLInputElement) || !input.files?.length) {
    throw new Error("Select a JSON file to import.");
  }
  const file = input.files[0];
  return await file.text();
}

function reportDetailsFromCard(card) {
  const notes = card.querySelector("[data-field='admin-notes']")?.value || "";
  const followUp = card.querySelector("[data-field='follow-up']")?.value || "";
  const checklist = splitLines(card.querySelector("[data-field='checklist']")?.value || "");
  const status = card.dataset.status || "New";
  return { notes, followUp, checklist, status };
}

async function handleAction(action, target) {
  try {
    switch (action) {
      case "toggle-theme":
        state.theme = state.theme === "dark" ? "light" : "dark";
        saveUiState();
        applyTheme();
        return;
      case "toggle-nav":
        toggleMobileNav();
        return;
      case "toggle-support":
        toggleSupportDrawer();
        return;
      case "open-auth":
        openAuthDialog(target.dataset.authMode || "register");
        return;
      case "switch-auth-mode":
        state.authMode = target.dataset.authMode || "register";
        saveUiState();
        renderAuthMode();
        return;
      case "logout":
        await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
        if (dom.authDialog.open) {
          dom.authDialog.close();
        }
        await refreshBootstrap("Signed out successfully.");
        return;
      case "scroll-dashboard":
        scrollToSection("dashboard");
        return;
      case "scroll-admin":
        scrollToSection("admin-console");
        return;
      case "set-filter":
        state.filter = target.dataset.filterId || "all";
        saveUiState();
        renderFilters();
        renderSummary();
        renderTracks();
        return;
      case "open-track":
        openTrackDialog(Number(target.dataset.trackId));
        return;
      case "toggle-complete": {
        const trackId = Number(target.dataset.trackId);
        await api(`/api/tracks/${trackId}/toggle-complete`, { method: "POST", body: JSON.stringify({}) });
        await refreshBootstrap("Progress updated.");
        if (dom.trackDialog.open) {
          openTrackDialog(trackId);
        }
        return;
      }
      case "toggle-save-resource":
        await api(`/api/resources/${Number(target.dataset.resourceId)}/toggle-save`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        await refreshBootstrap("Resource library updated.");
        return;
      case "edit-track":
        state.editing.trackId = Number(target.dataset.trackId);
        state.draftTrack = null;
        renderAdmin();
        scrollToSection("admin-console");
        return;
      case "edit-resource":
        state.editing.resourceId = Number(target.dataset.resourceId);
        renderAdmin();
        scrollToSection("admin-console");
        return;
      case "edit-program":
        state.editing.programId = Number(target.dataset.programId);
        renderAdmin();
        scrollToSection("admin-console");
        return;
      case "edit-support":
        state.editing.supportId = Number(target.dataset.supportId);
        renderAdmin();
        scrollToSection("admin-console");
        return;
      case "cancel-track-edit":
        resetEditing("track");
        return;
      case "cancel-resource-edit":
        resetEditing("resource");
        return;
      case "cancel-program-edit":
        resetEditing("program");
        return;
      case "cancel-support-edit":
        resetEditing("support");
        return;
      case "delete-track":
        if (!window.confirm("Delete this track? Existing progress linked to it will also be removed.")) {
          return;
        }
        await api(`/api/admin/tracks/${Number(target.dataset.trackId)}`, { method: "DELETE" });
        state.editing.trackId = null;
        await refreshBootstrap("Track deleted.");
        return;
      case "delete-resource":
        if (!window.confirm("Delete this resource?")) {
          return;
        }
        await api(`/api/admin/resources/${Number(target.dataset.resourceId)}`, { method: "DELETE" });
        state.editing.resourceId = null;
        await refreshBootstrap("Resource deleted.");
        return;
      case "delete-program":
        if (!window.confirm("Delete this program?")) {
          return;
        }
        await api(`/api/admin/programs/${Number(target.dataset.programId)}`, { method: "DELETE" });
        state.editing.programId = null;
        await refreshBootstrap("Program deleted.");
        return;
      case "delete-support":
        if (!window.confirm("Delete this support contact?")) {
          return;
        }
        await api(`/api/admin/support-contacts/${Number(target.dataset.supportId)}`, { method: "DELETE" });
        state.editing.supportId = null;
        await refreshBootstrap("Support contact deleted.");
        return;
      case "set-report-status": {
        const reportId = Number(target.dataset.reportId);
        const card = target.closest(".report-card");
        const details = card ? reportDetailsFromCard(card) : { notes: "", followUp: "", checklist: [], status: "New" };
        const nextStatus = target.dataset.status || details.status || "New";
        await api(`/api/admin/reports/${reportId}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: nextStatus,
            admin_notes: details.notes,
            next_follow_up: details.followUp || null,
            resolution_checklist: details.checklist,
          }),
        });
        await refreshBootstrap("Report status updated.");
        return;
      }
      case "save-report-details": {
        const reportId = Number(target.dataset.reportId);
        const card = target.closest(".report-card");
        if (!card) {
          return;
        }
        const details = reportDetailsFromCard(card);
        await api(`/api/admin/reports/${reportId}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: details.status,
            admin_notes: details.notes,
            next_follow_up: details.followUp || null,
            resolution_checklist: details.checklist,
          }),
        });
        await refreshBootstrap("Report details updated.");
        return;
      }
      case "export-content": {
        const payload = await api("/api/admin/export");
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "safeed-content-export.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast("Export ready.");
        return;
      }
      case "import-content": {
        const fileText = await readImportFile();
        const payload = JSON.parse(fileText);
        await api("/api/admin/import", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await refreshBootstrap("Content imported.");
        return;
      }
      case "generate-track-draft": {
        const prompt = document.getElementById("draft-prompt")?.value || "";
        if (!prompt.trim()) {
          showToast("Enter a draft prompt first.");
          return;
        }
        const result = await api("/api/admin/ai/draft-track", {
          method: "POST",
          body: JSON.stringify({ prompt }),
        });
        state.draftTrack = result.draft || null;
        renderAdmin();
        showToast("Draft generated.");
        return;
      }
      case "clear-track-draft":
        state.draftTrack = null;
        renderAdmin();
        return;
      default:
        return;
    }
  } catch (error) {
    if (!maybeRequireAuth(error)) {
      showToast(errorMessage(error));
    }
  }
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  try {
    if (form.id === "register-form") {
      event.preventDefault();
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.elements.name.value.trim(),
          email: form.elements.email.value.trim(),
          password: form.elements.password.value,
          role: form.elements.role.value,
          organization: form.elements.organization.value.trim(),
        }),
      });
      dom.authDialog.close();
      form.reset();
      await refreshBootstrap("Account created successfully.");
      return;
    }

    if (form.id === "login-form") {
      event.preventDefault();
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.elements.email.value.trim(),
          password: form.elements.password.value,
        }),
      });
      dom.authDialog.close();
      form.reset();
      await refreshBootstrap("Signed in successfully.");
      return;
    }

    if (form.id === "report-form") {
      event.preventDefault();
      const reportData = {};
      dom.reportExtraFields?.querySelectorAll("[data-field-id]").forEach((input) => {
        reportData[input.dataset.fieldId] = input.value;
      });
      if (dom.reporterPhone?.value) {
        reportData.phone = dom.reporterPhone.value.trim();
      }
      const response = await api("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          reporter_name: dom.reporterName.value.trim(),
          reporter_email: dom.reporterEmail.value.trim(),
          category: dom.reportCategory.value,
          urgency: dom.reportUrgency.value,
          preferred_contact: document.getElementById("report-contact").value,
          description: document.getElementById("report-description").value.trim(),
          report_data: reportData,
        }),
      });
      form.reset();
      renderReportDefaults();
      if (response?.nextSteps?.length) {
        dom.reportNextSteps.innerHTML = response.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
      }
      await refreshBootstrap("Support request submitted.");
      return;
    }

    if (form.id === "quiz-form") {
      event.preventDefault();
      const trackId = Number(form.dataset.trackId);
      const track = (state.bootstrap?.tracks || []).find((item) => item.id === trackId);
      if (!track) {
        throw new Error("Track not found.");
      }

      const formData = new FormData(form);
      const answers = (track.quiz || []).map((_, index) => {
        const value = formData.get(`question-${index}`);
        if (value === null) {
          throw new Error("Please answer every quiz question before submitting.");
        }
        return Number(value);
      });

      state.quizState[trackId] = { answers };
      const result = await api(`/api/tracks/${trackId}/quiz`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      state.quizState[trackId] = { ...state.quizState[trackId], ...result };
      await refreshBootstrap(`Quiz submitted: ${result.score}%.`);
      openTrackDialog(trackId);
      return;
    }

    if (form.id === "track-admin-form") {
      event.preventDefault();
      const id = form.elements.trackId.value;
      await api(id ? `/api/admin/tracks/${id}` : "/api/admin/tracks", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(trackPayloadFromForm(form)),
      });
      state.editing.trackId = null;
      state.draftTrack = null;
      await refreshBootstrap(id ? "Track updated." : "Track created.");
      return;
    }

    if (form.id === "resource-admin-form") {
      event.preventDefault();
      const id = form.elements.resourceId.value;
      await api(id ? `/api/admin/resources/${id}` : "/api/admin/resources", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(resourcePayloadFromForm(form)),
      });
      state.editing.resourceId = null;
      await refreshBootstrap(id ? "Resource updated." : "Resource created.");
      return;
    }

    if (form.id === "program-admin-form") {
      event.preventDefault();
      const id = form.elements.programId.value;
      await api(id ? `/api/admin/programs/${id}` : "/api/admin/programs", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(programPayloadFromForm(form)),
      });
      state.editing.programId = null;
      await refreshBootstrap(id ? "Program updated." : "Program created.");
      return;
    }

    if (form.id === "support-admin-form") {
      event.preventDefault();
      const id = form.elements.supportId.value;
      await api(id ? `/api/admin/support-contacts/${id}` : "/api/admin/support-contacts", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(supportPayloadFromForm(form)),
      });
      state.editing.supportId = null;
      await refreshBootstrap(id ? "Support contact updated." : "Support contact created.");
    }
  } catch (error) {
    if (!maybeRequireAuth(error)) {
      showToast(errorMessage(error));
    }
  }
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) {
      const navLink = event.target.closest("#site-navigation a");
      if (navLink) {
        toggleMobileNav(true);
      }
      return;
    }

    event.preventDefault();
    handleAction(target.dataset.action, target);
  });

  document.addEventListener("submit", handleSubmit);

  dom.trackSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    saveUiState();
    renderSummary();
    renderTracks();
  });

  dom.globalSearch?.addEventListener("input", (event) => {
    state.globalSearch = event.target.value;
    saveUiState();
    renderSupportCards();
    renderResources();
    renderPrograms();
  });

  dom.reportCategory?.addEventListener("change", () => {
    renderReportFields();
    renderReportNextSteps();
  });

  dom.reportUrgency?.addEventListener("change", renderReportNextSteps);

  dom.localeSelect?.addEventListener("change", (event) => {
    state.locale = event.target.value;
    saveUiState();
    applyLocale();
    renderDashboard();
    renderAdmin();
  });

  dom.trackDialog.addEventListener("close", () => {
    state.activeTrackId = null;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dom.supportDrawer.hasAttribute("hidden")) {
      closeSupportDrawer();
    }
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || (location.protocol !== "http:" && location.protocol !== "https:")) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (error) {
      console.warn("SafeEd service worker registration failed.", error);
    }
  });
}

async function init() {
  loadUiState();
  applyTheme();
  bindEvents();
  observeReveals();
  renderAuthMode();

  try {
    await refreshBootstrap();
  } catch (error) {
    const offline = await loadOfflineBootstrap();
    if (offline) {
      state.bootstrap = offline;
      state.offlineMode = true;
      renderAll();
      showToast("Offline content loaded.");
    } else {
      showToast(errorMessage(error));
    }
  }

  registerServiceWorker();
}

init();

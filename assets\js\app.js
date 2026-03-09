import { APP_DATA } from "./data.js";

const STORAGE_KEY = "safeed-state-v2";

const state = {
  theme: "light",
  search: "",
  filter: "all",
  profile: {
    name: "",
    role: "student",
    goal: "prevention",
    minutes: "30",
  },
  completedTrackIds: [],
  savedResourceIds: [],
};

const dom = {
  html: document.documentElement,
  body: document.body,
  themeToggle: document.getElementById("theme-toggle"),
  navToggle: document.querySelector("[data-action='toggle-nav']"),
  navigation: document.getElementById("site-navigation"),
  navActions: document.querySelector(".nav-actions"),
  plannerForm: document.getElementById("planner-form"),
  plannerTitle: document.getElementById("planner-title"),
  plannerRecommendations: document.getElementById("planner-recommendations"),
  trackSearch: document.getElementById("track-search"),
  trackFilters: document.getElementById("track-filters"),
  summaryStrip: document.getElementById("summary-strip"),
  trackGrid: document.getElementById("track-grid"),
  supportGrid: document.getElementById("support-grid"),
  supportDrawer: document.getElementById("support-drawer"),
  supportDrawerGrid: document.getElementById("support-drawer-grid"),
  resourceGrid: document.getElementById("resource-grid"),
  programGrid: document.getElementById("program-grid"),
  standardsGrid: document.getElementById("standards-grid"),
  dialog: document.getElementById("track-dialog"),
  dialogContent: document.getElementById("track-dialog-content"),
  toast: document.getElementById("toast"),
};

let toastTimer = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    state.theme = parsed.theme || state.theme;
    state.search = parsed.search || state.search;
    state.filter = parsed.filter || state.filter;
    state.profile = { ...state.profile, ...(parsed.profile || {}) };
    state.completedTrackIds = Array.isArray(parsed.completedTrackIds) ? parsed.completedTrackIds : [];
    state.savedResourceIds = Array.isArray(parsed.savedResourceIds) ? parsed.savedResourceIds : [];
  } catch (error) {
    console.warn("SafeEd state could not be restored.", error);
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      theme: state.theme,
      search: state.search,
      filter: state.filter,
      profile: state.profile,
      completedTrackIds: state.completedTrackIds,
      savedResourceIds: state.savedResourceIds,
    }),
  );
}

function applyTheme() {
  dom.html.dataset.theme = state.theme;
  dom.themeToggle.textContent = state.theme === "dark" ? "Use light theme" : "Use dark theme";
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, 2800);
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

function getFilteredTracks() {
  const search = state.search.trim().toLowerCase();

  return APP_DATA.tracks.filter((track) => {
    const matchesFilter = state.filter === "all" ? true : track.category === state.filter;
    const haystack = [
      track.title,
      track.summary,
      track.audience,
      ...track.tags,
      ...track.outcomes,
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = search ? haystack.includes(search) : true;
    return matchesFilter && matchesSearch;
  });
}

function getCompletedCount() {
  return state.completedTrackIds.length;
}

function formatLabel(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getRecommendations() {
  const weighted = APP_DATA.tracks
    .map((track) => {
      let score = 0;

      if (track.roleTags.includes(state.profile.role)) {
        score += 2;
      }

      if (track.goalTags.includes(state.profile.goal)) {
        score += 2;
      }

      if (track.category === state.profile.goal) {
        score += 1;
      }

      return { track, score };
    })
    .sort((left, right) => right.score - left.score || left.track.title.localeCompare(right.track.title));

  return weighted.slice(0, 3).map((entry) => entry.track);
}

function renderPlanner() {
  dom.plannerForm.name.value = state.profile.name;
  dom.plannerForm.role.value = state.profile.role;
  dom.plannerForm.goal.value = state.profile.goal;
  dom.plannerForm.minutes.value = state.profile.minutes;

  const recommendations = getRecommendations();
  const learnerName = state.profile.name.trim() || "your";
  const paceLabel = Number(state.profile.minutes) >= 60 ? "deeper weekly block" : "steady weekly pace";

  dom.plannerTitle.textContent = `Three tracks for ${learnerName} ${paceLabel}`;
  dom.plannerRecommendations.innerHTML = recommendations
    .map(
      (track) => `
        <article class="recommendation-card">
          <strong>${track.title}</strong>
          <p>${track.summary}</p>
          <div class="recommendation-card__meta">
            <span>${track.duration}</span>
            <span>${track.format}</span>
          </div>
          <button class="secondary-button" type="button" data-action="open-track" data-track-id="${track.id}">
            Open brief
          </button>
        </article>
      `,
    )
    .join("");
}

function renderFilters() {
  dom.trackFilters.innerHTML = APP_DATA.filters
    .map(
      (filter) => `
        <button
          class="filter-button ${filter.id === state.filter ? "is-active" : ""}"
          type="button"
          data-action="set-filter"
          data-filter-id="${filter.id}"
        >
          ${filter.label}
        </button>
      `,
    )
    .join("");
}

function renderSummary() {
  const filteredCount = getFilteredTracks().length;
  const savedCount = state.savedResourceIds.length;
  const roleLabel = formatLabel(state.profile.role);

  dom.summaryStrip.innerHTML = `
    <article class="summary-item">
      <strong>${filteredCount}</strong>
      <span>tracks currently visible</span>
    </article>
    <article class="summary-item">
      <strong>${getCompletedCount()}</strong>
      <span>tracks completed locally</span>
    </article>
    <article class="summary-item">
      <strong>${savedCount}</strong>
      <span>official resources saved</span>
    </article>
    <article class="summary-item">
      <strong>${roleLabel}</strong>
      <span>planner role in focus</span>
    </article>
  `;
}

function renderTracks() {
  const filteredTracks = getFilteredTracks();
  dom.trackGrid.innerHTML = filteredTracks
    .map((track) => {
      const completed = state.completedTrackIds.includes(track.id);
      return `
        <article class="track-card">
          <div class="track-card__header">
            <div>
              <h3>${track.title}</h3>
              <div class="track-card__meta">
                <span>${track.duration}</span>
                <span>${track.format}</span>
                <span>${track.audience}</span>
              </div>
            </div>
            <span class="track-card__status ${completed ? "track-card__status--complete" : "track-card__status--pending"}">
              ${completed ? "Completed" : "In progress"}
            </span>
          </div>
          <p>${track.summary}</p>
          <ul class="tag-list">
            ${track.tags.map((tag) => `<li>${tag}</li>`).join("")}
          </ul>
          <div class="track-card__actions">
            <button class="secondary-button" type="button" data-action="open-track" data-track-id="${track.id}">
              Open brief
            </button>
            <button
              class="track-card__button"
              type="button"
              data-action="toggle-complete"
              data-track-id="${track.id}"
              aria-pressed="${completed}"
            >
              ${completed ? "Mark as not done" : "Mark complete"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSupportCards(target) {
  target.innerHTML = APP_DATA.supportNumbers
    .map(
      (entry) => `
        <article class="support-card">
          <h3>${entry.title}</h3>
          <strong>${entry.number}</strong>
          <p>${entry.description}</p>
          <div class="resource-card__actions">
            <a class="primary-button" href="tel:${entry.number}">Call</a>
            <a class="secondary-button" href="${entry.link}" target="_blank" rel="noreferrer">Official site</a>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderResources() {
  dom.resourceGrid.innerHTML = APP_DATA.resources
    .map((resource) => {
      const saved = state.savedResourceIds.includes(resource.id);
      return `
        <article class="resource-card">
          <button
            class="resource-card__save"
            type="button"
            data-action="toggle-save-resource"
            data-resource-id="${resource.id}"
            aria-pressed="${saved}"
            aria-label="${saved ? "Remove saved resource" : "Save resource"}"
          >
            ${saved ? "Saved" : "Save"}
          </button>
          <h3>${resource.title}</h3>
          <div class="resource-card__meta">
            <span>${resource.owner}</span>
            <span>Verified ${APP_DATA.meta.lastVerified}</span>
          </div>
          <p>${resource.description}</p>
          <div class="resource-card__actions">
            <a class="resource-card__button" href="${resource.link}" target="_blank" rel="noreferrer">Visit source</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPrograms() {
  dom.programGrid.innerHTML = APP_DATA.programs
    .map(
      (program) => `
        <article class="program-card">
          <span class="program-card__badge">${program.badge}</span>
          <h3>${program.title}</h3>
          <div class="program-card__meta">
            ${program.meta.map((item) => `<span>${item}</span>`).join("")}
          </div>
          <p>${program.summary}</p>
        </article>
      `,
    )
    .join("");
}

function renderStandards() {
  dom.standardsGrid.innerHTML = APP_DATA.standards
    .map(
      (item) => `
        <article class="standard-card">
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>
      `,
    )
    .join("");
}

function openTrackDialog(trackId) {
  const track = APP_DATA.tracks.find((entry) => entry.id === trackId);
  if (!track) {
    return;
  }

  const completed = state.completedTrackIds.includes(track.id);
  dom.dialogContent.innerHTML = `
    <div class="dialog-header">
      <div>
        <p class="eyebrow">${formatLabel(track.category)}</p>
        <h2>${track.title}</h2>
        <p class="dialog-copy">${track.summary}</p>
      </div>
      <div class="track-card__meta">
        <span>${track.duration}</span>
        <span>${track.format}</span>
      </div>
    </div>
    <div class="dialog-grid">
      <section class="dialog-panel">
        <h3>Learning outcomes</h3>
        <ul class="dialog-list">
          ${track.outcomes.map((outcome) => `<li>${outcome}</li>`).join("")}
        </ul>
      </section>
      <section class="dialog-panel">
        <h3>Materials included</h3>
        <ul class="dialog-list">
          ${track.materials.map((item) => `<li>${item}</li>`).join("")}
        </ul>
        <p><strong>Best for:</strong> ${track.audience}</p>
        <button
          class="primary-button"
          type="button"
          data-action="toggle-complete"
          data-track-id="${track.id}"
          aria-pressed="${completed}"
        >
          ${completed ? "Mark as not done" : "Mark complete"}
        </button>
      </section>
    </div>
  `;

  if (!dom.dialog.open) {
    dom.dialog.showModal();
  }
}

function renderAll() {
  applyTheme();
  renderPlanner();
  renderFilters();
  renderSummary();
  renderTracks();
  renderSupportCards(dom.supportGrid);
  renderSupportCards(dom.supportDrawerGrid);
  renderResources();
  renderPrograms();
  renderStandards();
}

function toggleTrackCompletion(trackId) {
  const alreadyCompleted = state.completedTrackIds.includes(trackId);
  if (alreadyCompleted) {
    state.completedTrackIds = state.completedTrackIds.filter((id) => id !== trackId);
    showToast("Track moved back to in progress.");
  } else {
    state.completedTrackIds = [...state.completedTrackIds, trackId];
    showToast("Track marked complete.");
  }

  saveState();
  renderSummary();
  renderTracks();
  renderPlanner();

  if (dom.dialog.open) {
    openTrackDialog(trackId);
  }
}

function toggleSavedResource(resourceId) {
  const saved = state.savedResourceIds.includes(resourceId);
  if (saved) {
    state.savedResourceIds = state.savedResourceIds.filter((id) => id !== resourceId);
    showToast("Resource removed from saved list.");
  } else {
    state.savedResourceIds = [...state.savedResourceIds, resourceId];
    showToast("Official resource saved.");
  }

  saveState();
  renderSummary();
  renderResources();
}

function setupRevealAnimation() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 },
  );

  items.forEach((item) => observer.observe(item));
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("SafeEd service worker registration failed.", error);
    });
  }
}

function handlePlannerSubmit(event) {
  event.preventDefault();
  const formData = new FormData(dom.plannerForm);
  state.profile = {
    name: String(formData.get("name") || "").trim(),
    role: String(formData.get("role") || "student"),
    goal: String(formData.get("goal") || "prevention"),
    minutes: String(formData.get("minutes") || "30"),
  };

  saveState();
  renderPlanner();
  renderSummary();
  showToast("Learning plan saved locally on this device.");
}

function initializeFromState() {
  dom.trackSearch.value = state.search;
}

function attachEvents() {
  dom.plannerForm.addEventListener("submit", handlePlannerSubmit);

  dom.trackSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    saveState();
    renderSummary();
    renderTracks();
  });

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) {
      if (dom.body.dataset.supportOpen === "true" && !event.target.closest("#support-drawer")) {
        if (!event.target.closest("[data-action='toggle-support']")) {
          closeSupportDrawer();
        }
      }
      return;
    }

    const action = target.dataset.action;

    switch (action) {
      case "toggle-theme":
        state.theme = state.theme === "dark" ? "light" : "dark";
        saveState();
        applyTheme();
        break;
      case "toggle-support":
        toggleSupportDrawer();
        break;
      case "toggle-nav":
        toggleMobileNav();
        break;
      case "set-filter":
        state.filter = target.dataset.filterId || "all";
        saveState();
        renderFilters();
        renderSummary();
        renderTracks();
        break;
      case "open-track":
        openTrackDialog(target.dataset.trackId);
        break;
      case "toggle-complete":
        toggleTrackCompletion(target.dataset.trackId);
        break;
      case "toggle-save-resource":
        toggleSavedResource(target.dataset.resourceId);
        break;
      default:
        break;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dom.body.dataset.supportOpen === "true") {
      closeSupportDrawer();
    }
  });

  dom.navigation.addEventListener("click", (event) => {
    if (event.target.matches("a") && window.innerWidth <= 860) {
      dom.navigation.classList.remove("is-open");
      dom.navActions.classList.remove("is-open");
      dom.navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

function init() {
  loadState();
  initializeFromState();
  renderAll();
  attachEvents();
  setupRevealAnimation();
  registerServiceWorker();
}

init();

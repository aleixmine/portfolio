import { MiniRouter } from "./mini-router";
import { ThemeManager } from "./theme";
import type { ThemeMode } from "./theme";

const miniRouter = new MiniRouter();

miniRouter.addEventListener("loadPage", async (page) => {
  if (page === "terminal") {
    miniRouter.showLoading();
    try {
      const { load } = await import("./pages/terminal");
      load();
    } catch (err) {
      return;
    } finally {
      miniRouter.hideLoading();
    }
  }
  if (page === "games.tictactoe") {
    miniRouter.showLoading();
    try {
      const { load } = await import("./games/tictactoe/tictactoe");
      load();
    } catch (err) {
      return;
    } finally {
      miniRouter.hideLoading();
    }
  }
});
miniRouter.load();
miniRouter.connect();

const theme = new ThemeManager();

const themeToggle = document.querySelector<HTMLButtonElement>(".theme-toggle");

const THEME_META: Record<ThemeMode, string> = {
  light: "Theme: light — click to switch to dark",
  dark: "Theme: dark — click to switch to auto",
  auto: "Theme: auto (follows system) — click to switch to light",
};

function renderThemeToggle(mode: ThemeMode): void {
  if (!themeToggle) return;
  themeToggle.setAttribute("data-mode", mode);
  const label = THEME_META[mode];
  themeToggle.setAttribute("aria-label", label);
  themeToggle.setAttribute("title", label);
}

themeToggle?.addEventListener("click", () => theme.cycle());
renderThemeToggle(theme.getCurrentMode());
theme.onChange(renderThemeToggle);

// --- Mobile hamburger menu ---
const nav = document.querySelector<HTMLElement>(".nav");
const toggle = document.querySelector<HTMLButtonElement>(".nav__toggle");

toggle?.addEventListener("click", () => {
  const open = nav?.classList.toggle("nav--open") ?? false;
  toggle.classList.toggle("nav__toggle--open", open);
  document.body.style.overflow = open ? "hidden" : "";
});

// Close mobile nav when a link is clicked
nav?.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (target.closest("[data-href-page]")) {
    nav.classList.remove("nav--open");
    toggle?.classList.remove("nav__toggle--open");
    document.body.style.overflow = "";
  }
});

export type ThemeMode = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";
const MODES: ThemeMode[] = ["light", "dark", "auto"];

function parseMode(value: string | null): ThemeMode {
    return value === "light" || value === "dark" ? value : "auto";
}

export class ThemeManager {
    private mode: ThemeMode;
    private resolved: ResolvedTheme;
    private readonly media: MediaQueryList;
    private readonly listeners = new Set<
        (mode: ThemeMode, resolved: ResolvedTheme) => void
    >();

    constructor() {
        let stored: string | null = null;
        try {
            stored = localStorage.getItem(STORAGE_KEY);
        } catch {
            // localStorage unavailable
        }

        this.mode = parseMode(stored);
        this.media = window.matchMedia("(prefers-color-scheme: dark)");
        this.resolved = this.mode === "dark" ||
            (this.mode !== "light" &&
                window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
        this.apply();

        this.media.addEventListener("change", this.handleMediaChange);
        window.addEventListener("storage", this.handleStorageChange);
    }

    getCurrentMode(): ThemeMode {
        return this.mode;
    }

    getResolvedTheme(): ResolvedTheme {
        return this.resolved;
    }

    cycle(): ThemeMode {
        const next = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length];
        this.setMode(next);
        return next;
    }

    setMode(mode: ThemeMode): void {
        this.mode = mode;
        this.resolved =
            mode === "auto" ? (this.media.matches ? "dark" : "light") : mode;

        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch {
            // ignore
        }
        this.apply();
        this.notify();
    }

    onChange(fn: (mode: ThemeMode, resolved: ResolvedTheme) => void): void {
        this.listeners.add(fn);
    }

    private handleMediaChange = (event: MediaQueryListEvent): void => {
        // Only system-driven changes matter in auto mode
        if (this.mode !== "auto") return;
        this.resolved = event.matches ? "dark" : "light";
        this.apply();
        this.notify();
    };

    private handleStorageChange = (event: StorageEvent): void => {
        if (event.key !== STORAGE_KEY) return;
        this.setMode(parseMode(event.newValue));
    };

    private apply(): void {
        document.documentElement.setAttribute("data-theme", this.resolved);
    }

    private notify(): void {
        this.listeners.forEach((fn) => fn(this.mode, this.resolved));
    }
}

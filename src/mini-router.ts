class CPath {
    name: string;
    subs: Record<string, CPath>;
    element: HTMLElement | null;

    constructor(name: string) {
        this.name = name;
        this.subs = {};
        this.element = null;
    }

    addSub(cpath: CPath): this {
        this.subs[cpath.name] = cpath;
        return this;
    }

    static find(path: string, root: CPath): CPath | null {
        let current: CPath = root;
        for (const segment of path.split(".")) {
            if (!current.subs[segment]) return null;
            current = current.subs[segment];
        }
        return current;
    }

    static register(path: string, root: CPath): CPath {
        let current: CPath = root;
        for (const segment of path.split(".")) {
            if (!current.subs[segment]) {
                current.addSub(new CPath(segment));
            }
            current = current.subs[segment];
        }
        return current;
    }
}

export class MiniRouter {
    usePathURL: boolean;
    currentPath: string | null;
    root: CPath;
    private loading: boolean;
    private returnPath: string | null;
    private listeners: Record<string, Array<(path: string) => void>>;

    constructor() {
        this.usePathURL = window.location.protocol !== "file:";
        this.currentPath = null;
        this.root = new CPath("__root__");
        this.listeners = {};
        this.loading = false;
        this.returnPath = null;
    }

    addEventListener(event: string, callback: (path: string) => void): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    removeEventListener(event: string, callback: (path: string) => void): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
    private emit(event: string, path: string): void {
        (this.listeners[event] ?? []).forEach(cb => {
            try {
                Promise.resolve(cb(path)).catch(err =>
                    console.error(`MiniRouter: error in "${event}" listener`, err)
                );
            } catch (err) {
                console.error(`MiniRouter: error in "${event}" listener`, err);
            }
        });
    }

    load() {
        document.querySelectorAll<HTMLElement>(".page").forEach(el => {
            const path = el.getAttribute("data-page");
            if (!path) return;

            const node = CPath.register(path, this.root);
            node.element = el;
        });

        window.addEventListener("popstate", (e: PopStateEvent) => {
            const path =
                (e.state as { path?: string } | null)?.path ??
                this._getPathFromURL() ??
                "main";

            this._show(path);
        });

        const path = this._getPathFromURL() ?? "main";

        // Mostrar la página inicial SIN crear una entrada de historial
        this._show(path);

        // Opcional: sincronizar el state actual
        history.replaceState(
            { path },
            "",
            this._getURL(path)
        );
    }

    private _getPathFromURL(): string | null {
        if (this.usePathURL) {
            const path = window.location.pathname
                .replace(/^\//, "")
                .replace(/\//g, ".");
            return path || null;
        } else {
            const param = new URLSearchParams(window.location.search).get("path");
            return param || null;
        }
    }

    private _show(path: string, silent = false): void {
        if (path === this.currentPath) return;

        const node = CPath.find(path, this.root);
        if (!node?.element) {
            console.warn(`MiniRouter: page not found -> "${path}"`);
            this.navigate("internal.404");
            return;
        }

        if (this.currentPath) {
            const prev = CPath.find(this.currentPath, this.root);
            if (prev?.element) prev.element.classList.remove("page--active");
        }

        node.element.classList.add("page--active");
        this.currentPath = path;

        if (!silent) this.emit("loadPage", path);
    }

    navigate(path: string): void {
        const node = CPath.find(path, this.root);

        if (!node?.element) {
            console.warn(`MiniRouter: page not found -> "${path}"`);
            this.navigate("internal.404");
            return;
        }

        if (path === this.currentPath) return;

        history.pushState(
            { path },
            "",
            this._getURL(path)
        );

        this._show(path);
    }

    getAllPaths(): string[] {
        const paths: string[] = [];

        const walk = (node: CPath, prefix: string) => {
            const path = prefix ? `${prefix}.${node.name}` : node.name;
            if (node.element) paths.push(path);

            Object.values(node.subs).forEach(child => walk(child, path));
        };

        Object.values(this.root.subs).forEach(child => walk(child, ""));
        return paths;
    }

    connect() {
        const elements = document.querySelectorAll<HTMLElement>(
            "[data-href-page]"
        );

        elements.forEach((element) => {
            element.addEventListener('click', (ev) => {
                ev.preventDefault();

                const href = element.dataset.hrefPage;

                if (href) {
                    this.navigate(href);
                }
            });
        });
    }

    showLoading(): void {
        if (this.loading) return;
        if (!this.currentPath) {
            console.warn("MiniRouter: showLoading() called before any page loaded");
            return;
        }
        this.returnPath = this.currentPath;
        this._show("internal.loading", true);
        this.loading = true;
    }

    hideLoading(): void {
        if (!this.loading || !this.returnPath) return;
        this._show(this.returnPath, true);
        this.loading = false;
        this.returnPath = null;
    }
    private _getURL(path: string): string {
        return path === "main"
            ? "/"
            : this.usePathURL
                ? `/${path.replace(/\./g, "/")}`
                : `?path=${encodeURIComponent(path)}`;
    }
}
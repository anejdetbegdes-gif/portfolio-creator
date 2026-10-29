// ========================================
// PORTFOLIO CREATOR — editor, preview and export
// Plain JavaScript. No frameworks, no server, no tracking.
//
// How it works:
//   1. All portfolio content lives in one `state` object.
//   2. renderPortfolio(state, "edit")   -> editor view (with edit buttons)
//      renderPortfolio(state, "export") -> published view (no controls)
//   3. Preview shows the EXACT exported file inside a sandboxed iframe,
//      so Preview and Export can never drift apart.
//   4. The state is auto-saved to localStorage (this browser only).
// ========================================

(function () {
    "use strict";

    // ----------------------------------------
    // CONSTANTS & DEFAULTS
    // ----------------------------------------

    const STORAGE_KEY = "portfolioCreatorData.v2";
    const LEGACY_STORAGE_KEY = "portfolioCreatorData";
    const THEMES = ["professional", "editorial", "dark"];
    const THEME_NAMES = {
        professional: "Professional Light",
        editorial: "Editorial Minimal",
        dark: "Modern Dark"
    };
    const THEME_BG = {
        professional: "#ffffff",
        editorial: "#f7f3ec",
        dark: "#0a0b10"
    };

    const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;   // 10 MB per original file
    const STORAGE_WARN_BYTES = 4 * 1024 * 1024;   // browsers allow ~5 MB

    const DEFAULT = {
        name: "Your Name",
        title: "Student • Your Major",
        about: "Write a short introduction about yourself, your interests, experience, and career goals. This will appear on your portfolio website."
    };

    const DEFAULT_PROJECT_TITLES = ["Project Title", "New Project", ""];
    const DEFAULT_PROJECT_DESCRIPTIONS = [
        "Add a short description explaining what you created and what you learned.",
        "Add another academic, professional, or personal project here.",
        "Add a description for your project.",
        ""
    ];

    const LINK_TYPES = {
        resume: { label: "Resume", button: "View Resume", add: "+ Add Resume" },
        linkedin: { label: "LinkedIn", button: "LinkedIn", add: "+ Add LinkedIn" },
        github: { label: "GitHub", button: "GitHub", add: "+ Add GitHub" },
        email: { label: "Email", button: "Email Me", add: "+ Add Email" }
    };

    // Built-in optional sections, in the order they appear on the portfolio
    const SECTION_TYPES = {
        experience: {
            label: "Experience",
            nav: "Experience",
            kicker: "Where I've worked",
            layout: "timeline",
            titleLabel: "Role & organization",
            titlePlaceholder: "IT Support Intern — Acme Corp",
            metaLabel: "Dates",
            metaPlaceholder: "Jun 2025 – Aug 2025",
            descriptionPlaceholder: "What you did, the tools you used, and what you achieved."
        },
        education: {
            label: "Education",
            nav: "Education",
            kicker: "Studies",
            layout: "timeline",
            titleLabel: "Degree & school",
            titlePlaceholder: "M.S. Computer Science — State University",
            metaLabel: "Dates",
            metaPlaceholder: "2024 – 2026",
            descriptionPlaceholder: "Focus area, honors, relevant coursework."
        },
        skills: {
            label: "Skills",
            nav: "Skills",
            kicker: "Toolkit",
            layout: "skills",
            titleLabel: "Skill group",
            titlePlaceholder: "Programming",
            metaLabel: null,
            descriptionLabel: "Skills",
            descriptionPlaceholder: "Python, Java, SQL",
            descriptionHelp: "Separate skills with commas. Each one becomes a tag."
        },
        certifications: {
            label: "Certifications",
            nav: "Certifications",
            kicker: "Credentials",
            layout: "cards",
            titleLabel: "Certification",
            titlePlaceholder: "CompTIA Security+",
            metaLabel: "Issuer / year",
            metaPlaceholder: "CompTIA · 2025",
            descriptionPlaceholder: "Optional: what it covers or why it matters."
        }
    };

    const SECTION_KEYS = Object.keys(SECTION_TYPES);

    const CUSTOM_TYPE = {
        label: "Custom section",
        kicker: "More about me",
        layout: "cards",
        titleLabel: "Title (optional)",
        titlePlaceholder: "Food Bank Volunteer",
        metaLabel: "Date / organization",
        metaPlaceholder: "2024 – Present",
        descriptionPlaceholder: "Describe this item."
    };

    function defaultState() {
        return {
            version: 2,
            theme: "professional",
            nameSize: "auto",
            subtitles: [],
            name: DEFAULT.name,
            title: DEFAULT.title,
            about: DEFAULT.about,
            links: { resume: "", linkedin: "", github: "", email: "" },
            photo: { src: "", x: 50, y: 50, zoom: 1 },
            projects: [
                {
                    id: uid(), title: "Project Title",
                    description: DEFAULT_PROJECT_DESCRIPTIONS[0],
                    link: "", image: "", fit: "cover", tech: "", process: "", results: ""
                },
                {
                    id: uid(), title: "Project Title",
                    description: DEFAULT_PROJECT_DESCRIPTIONS[1],
                    link: "", image: "", fit: "cover", tech: "", process: "", results: ""
                }
            ],
            sections: { experience: [], education: [], skills: [], certifications: [], custom: [] }
        };
    }


    // ----------------------------------------
    // SMALL UTILITIES
    // ----------------------------------------

    function uid() {
        return "id-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    }

    function isValidId(value) {
        return typeof value === "string" && /^[A-Za-z0-9-]{1,40}$/.test(value);
    }

    // Escape text for safe use in HTML text AND attribute values
    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function str(value, max) {
        return typeof value === "string" ? value.slice(0, max) : "";
    }

    function clampNumber(value, min, max, fallback) {
        const n = Number(value);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    }

    function getInitials(name) {
        const words = String(name || "").trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) return "YN";
        let initials = Array.from(words[0])[0];
        if (words.length > 1) initials += Array.from(words[words.length - 1])[0];
        return initials.toUpperCase();
    }

    function splitList(text) {
        return String(text || "")
            .split(/[,\n]/)
            .map(function (item) { return item.trim(); })
            .filter(Boolean)
            .slice(0, 40);
    }

    // Validate a URL typed by a student. Only http(s) is accepted.
    function parseUserUrl(input) {
        const value = String(input || "").trim();

        if (value === "") return { ok: true, value: "" };

        if (/\s/.test(value)) {
            return { ok: false, error: "Links cannot contain spaces. Please paste the full web address." };
        }

        if (/^(javascript|data|vbscript|file|blob):/i.test(value)) {
            return { ok: false, error: "This type of link is not allowed. Use a normal web address that starts with https://" };
        }

        let candidate = value;
        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
            if (/^[a-z][a-z0-9+.-]*:/i.test(candidate) && !/^[^:]+\.[^:]+:\d/.test(candidate)) {
                return { ok: false, error: "Only links starting with https:// or http:// are allowed." };
            }
            candidate = "https://" + candidate;
        }

        let url;
        try {
            url = new URL(candidate);
        } catch (error) {
            return { ok: false, error: "This doesn't look like a web address. Example: https://github.com/your-name" };
        }

        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return { ok: false, error: "Only links starting with https:// or http:// are allowed." };
        }

        if (!url.hostname.includes(".") || url.hostname.startsWith(".") || url.hostname.endsWith(".")) {
            return { ok: false, error: "Please enter a complete web address, for example https://www.linkedin.com/in/your-name" };
        }

        if (url.username || url.password) {
            return { ok: false, error: "Links that contain a username or password are not allowed." };
        }

        return { ok: true, value: url.href };
    }

    function safeHttpUrl(value) {
        const result = parseUserUrl(value);
        return result.ok ? result.value : "";
    }

    function isEmail(value) {
        return typeof value === "string" &&
            value.length <= 254 &&
            /^[^\s@<>"'(),;:\\]+@[^\s@<>"'(),;:\\]+\.[^\s@<>"'(),;:\\]{2,}$/.test(value);
    }

    // Only images produced by our own compressor are accepted
    function isSafeImage(value) {
        return typeof value === "string" &&
            value.length < 4000000 &&
            /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
    }

    function formatBytes(bytes) {
        if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    function isDefaultAbout(text) {
        return !text || text.trim() === "" || text.trim() === DEFAULT.about;
    }

    function isPlaceholderProject(project) {
        return DEFAULT_PROJECT_TITLES.includes(project.title.trim()) &&
            DEFAULT_PROJECT_DESCRIPTIONS.includes(project.description.trim()) &&
            !project.image && !project.link && !project.tech &&
            !project.process && !project.results;
    }


    // ----------------------------------------
    // STATE: LOAD, VALIDATE, MIGRATE
    // ----------------------------------------

    function normalizeEntry(entry) {
        entry = entry && typeof entry === "object" ? entry : {};
        return {
            id: isValidId(entry.id) ? entry.id : uid(),
            title: str(entry.title, 120),
            meta: str(entry.meta, 120),
            description: str(entry.description, 1000)
        };
    }

    function normalizeState(raw) {
        const base = defaultState();

        if (!raw || typeof raw !== "object") return base;

        const links = raw.links && typeof raw.links === "object" ? raw.links : {};
        const photo = raw.photo && typeof raw.photo === "object" ? raw.photo : {};
        const sections = raw.sections && typeof raw.sections === "object" ? raw.sections : {};

        const state = {
            version: 2,
            theme: THEMES.includes(raw.theme) ? raw.theme : "professional",
            nameSize: ["auto", "large", "medium", "small"].includes(raw.nameSize) ? raw.nameSize : "auto",
            subtitles: Array.isArray(raw.subtitles)
                ? raw.subtitles.map(function (t) { return str(t, 120).trim(); }).filter(Boolean).slice(0, 3)
                : [],
            name: str(raw.name, 80).trim() || base.name,
            title: str(raw.title, 120).trim() || base.title,
            about: typeof raw.about === "string" ? str(raw.about, 1500) : base.about,
            links: {
                resume: safeHttpUrl(str(links.resume, 600)),
                linkedin: safeHttpUrl(str(links.linkedin, 600)),
                github: safeHttpUrl(str(links.github, 600)),
                email: isEmail(links.email) ? links.email : ""
            },
            photo: {
                src: isSafeImage(photo.src) ? photo.src : "",
                x: clampNumber(photo.x, 0, 100, 50),
                y: clampNumber(photo.y, 0, 100, 50),
                zoom: clampNumber(photo.zoom, 1, 3, 1)
            },
            projects: base.projects,
            sections: { experience: [], education: [], skills: [], certifications: [], custom: [] }
        };

        if (Array.isArray(raw.projects)) {
            state.projects = raw.projects.slice(0, 30).map(function (p) {
                p = p && typeof p === "object" ? p : {};
                return {
                    id: isValidId(p.id) ? p.id : uid(),
                    title: str(p.title, 100),
                    description: str(p.description, 600),
                    link: safeHttpUrl(str(p.link, 600)),
                    image: isSafeImage(p.image) ? p.image : "",
                    fit: p.fit === "contain" ? "contain" : "cover",
                    tech: str(p.tech, 200),
                    process: str(p.process, 1500),
                    results: str(p.results, 800)
                };
            });
        }

        SECTION_KEYS.forEach(function (key) {
            if (Array.isArray(sections[key])) {
                state.sections[key] = sections[key].slice(0, 30).map(normalizeEntry);
            }
        });

        if (Array.isArray(sections.custom)) {
            state.sections.custom = sections.custom.slice(0, 10).map(function (c) {
                c = c && typeof c === "object" ? c : {};
                return {
                    id: isValidId(c.id) ? c.id : uid(),
                    name: str(c.name, 60).trim() || "Custom Section",
                    entries: Array.isArray(c.entries) ? c.entries.slice(0, 30).map(normalizeEntry) : []
                };
            });
        }

        return state;
    }

    // Convert drafts saved by the first version of Portfolio Creator
    function migrateLegacy(old) {
        function unwrapUrl(value) {
            return String(value || "").replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
        }

        return {
            name: old.name,
            title: old.title,
            about: old.about,
            links: { resume: old.resume, linkedin: old.linkedin, github: old.github },
            photo: { src: unwrapUrl(old.profileImage) },
            projects: Array.isArray(old.projects) ? old.projects.map(function (p) {
                return {
                    title: p.title,
                    description: p.description,
                    link: p.link,
                    image: unwrapUrl(p.image)
                };
            }) : undefined
        };
    }

    function loadState() {
        let raw = null;

        try {
            raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return { state: normalizeState(JSON.parse(raw)), loaded: true };

            const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (legacy) return { state: normalizeState(migrateLegacy(JSON.parse(legacy))), loaded: true };
        } catch (error) {
            console.error("Saved portfolio could not be loaded:", error);
            return { state: defaultState(), loaded: false, failed: true };
        }

        return { state: defaultState(), loaded: false };
    }


    // ----------------------------------------
    // SAVING (auto + manual) & STATUS
    // ----------------------------------------

    let state;
    let saveTimer = null;
    let hasUnsavedChanges = false;
    let lastSaveFailed = false;

    const statusBox = document.getElementById("save-status");
    const statusText = document.getElementById("save-status-text");

    function setStatus(kind, message) {
        statusBox.dataset.state = kind;
        statusText.textContent = message;
    }

    function timeNow() {
        return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    // Call after every change. Saves shortly after the student stops editing.
    function changed() {
        hasUnsavedChanges = true;
        setStatus("pending", "Saving…");
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () { persist(false); }, 600);
        updateProgress();
    }

    function persist(manual) {
        clearTimeout(saveTimer);

        let json;
        try {
            json = JSON.stringify(state);
            localStorage.setItem(STORAGE_KEY, json);
        } catch (error) {
            const quota = error && (error.name === "QuotaExceededError" || error.code === 22 || error.code === 1014);
            const message = quota
                ? "Not saved: browser storage is full. Use fewer or smaller images, or download a backup."
                : "Not saved: this browser is blocking storage (private mode?). Download a backup to keep your work.";

            setStatus("error", message);
            if (manual || !lastSaveFailed) toast(message, "error", 7000);
            lastSaveFailed = true;
            console.error(error);
            return false;
        }

        // Remove the old-format draft once the new one is saved successfully
        try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch (e) { /* ignore */ }

        hasUnsavedChanges = false;
        lastSaveFailed = false;

        const size = json.length * 2; // localStorage stores UTF-16
        statusBox.title = "Draft size: about " + formatBytes(size) + " (browsers allow about 5 MB)";

        if (size > STORAGE_WARN_BYTES) {
            setStatus("pending", "Saved " + timeNow() + " — storage almost full (" + formatBytes(size) + ")");
            if (manual) toast("Saved, but your draft is close to the browser's storage limit. Consider smaller images.", "error", 6000);
        } else {
            setStatus("saved", "All changes saved · " + timeNow());
            if (manual) toast("Portfolio saved in this browser.", "success");
        }

        return true;
    }

    window.addEventListener("beforeunload", function (event) {
        if (hasUnsavedChanges) persist(false);
        if (hasUnsavedChanges || lastSaveFailed) {
            event.preventDefault();
            event.returnValue = "";
        }
    });


    // ----------------------------------------
    // TOASTS
    // ----------------------------------------

    const toastRegion = document.getElementById("toast-region");

    function toast(message, kind, duration) {
        const item = document.createElement("div");
        item.className = "toast" + (kind ? " " + kind : "");
        item.setAttribute("role", kind === "error" ? "alert" : "status");
        item.textContent = message;
        toastRegion.appendChild(item);
        setTimeout(function () { item.remove(); }, duration || 3200);
    }


    // ========================================
    // PORTFOLIO STYLES (shared by editor, preview and export)
    // Everything is scoped under .pf so it never affects the editor UI.
    // ========================================

    const PORTFOLIO_CSS = `
:where(.pf, .pf *) { box-sizing: border-box; margin: 0; padding: 0; }
.pf {
  --bg: #fff; --bg-alt: #f8fafc; --surface: #fff; --surface-2: #f1f5f9;
  --text: #0f172a; --text-2: #334155; --muted: #64748b;
  --line: #e2e8f0; --line-strong: #cbd5e1;
  --accent: #2563eb; --accent-ink: #1d4ed8; --on-accent: #fff;
  --btn-bg: var(--accent); --btn-ink: var(--on-accent);
  --chip-bg: #eff6ff; --chip-ink: #1d4ed8;
  --radius: 16px; --btn-radius: 10px;
  --font-body: Inter, "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-head: var(--font-body);
  --font-mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace;
  --hero-bg: var(--bg);
  --nav-bg: rgba(255,255,255,.86);
  --shadow: 0 1px 2px rgba(15,23,42,.04);
  --shadow-lg: 0 20px 45px rgba(15,23,42,.10);
  background: var(--bg); color: var(--text);
  font-family: var(--font-body); font-size: 16px; line-height: 1.6;
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  overflow-wrap: break-word;
  min-height: 100vh;
}
:where(.pf) img { display: block; max-width: 100%; }
:where(.pf) a { color: inherit; }
:where(.pf) :is(ul, ol) { list-style: none; }
:where(.pf) :is(h1, h2, h3, h4) { font-family: var(--font-head); color: var(--text); overflow-wrap: anywhere; }
.pf a:focus-visible, .pf summary:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; border-radius: 4px; }
.pf-wrap { width: min(1120px, calc(100% - 40px)); margin-inline: auto; }

/* NAV */
.pf-nav { position: sticky; top: 0; z-index: 20; background: var(--nav-bg); border-bottom: 1px solid var(--line);
  -webkit-backdrop-filter: saturate(160%) blur(12px); backdrop-filter: saturate(160%) blur(12px); }
.pf-nav-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; height: 64px; }
.pf-brand { font-family: var(--font-head); font-weight: 800; font-size: 17px; letter-spacing: -.02em; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50%; }
.pf-nav-links { display: flex; gap: 26px; overflow-x: auto; scrollbar-width: none; }
.pf-nav-links::-webkit-scrollbar { display: none; }
.pf-nav-links a { color: var(--muted); font-size: 14px; font-weight: 600; text-decoration: none; white-space: nowrap; transition: color .2s; }
.pf-nav-links a:hover { color: var(--accent-ink); }

/* HERO */
.pf-hero { padding: 96px 0 88px; background: var(--hero-bg); border-bottom: 1px solid var(--line); }
.pf-hero-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, .7fr); gap: 72px; align-items: center; }
.pf-eyebrow { color: var(--accent-ink); font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; margin-bottom: 16px; }
.pf-name { font-size: clamp(40px, 6vw, 68px); line-height: 1.04; letter-spacing: -.035em; font-weight: 800; margin-bottom: 14px; }
.pf-title { color: var(--text-2); font-size: clamp(18px, 2.2vw, 21px); font-weight: 600; margin-bottom: 30px; }
.pf-about { max-width: 680px; }
.pf-about h2 { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; font-family: var(--font-body); }
.pf-about p { color: var(--muted); font-size: 17px; line-height: 1.8; white-space: pre-line; }
.pf-links { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; align-items: center; }
.pf-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: var(--btn-radius);
  border: 1px solid var(--line-strong); background: var(--surface); color: var(--text);
  font-family: var(--font-body); font-size: 15px; font-weight: 700; line-height: 1.2; text-decoration: none;
  transition: transform .2s, background-color .2s, border-color .2s, color .2s, box-shadow .2s; }
.pf-btn:hover { transform: translateY(-2px); border-color: var(--accent); color: var(--accent-ink); }
.pf-btn-primary { background: var(--btn-bg); border-color: transparent; color: var(--btn-ink); box-shadow: 0 8px 20px rgba(37,99,235,.20); }
.pf-btn-primary:hover { color: var(--btn-ink); border-color: transparent; filter: brightness(1.08); }
.pf-btn span[aria-hidden] { font-size: .9em; opacity: .8; }

/* PHOTO (same crop math in editor and export) */
.pf-photo-col { display: flex; flex-direction: column; align-items: center; }
.pf-photo { position: relative; width: 240px; max-width: 100%; aspect-ratio: 1 / 1; border-radius: 50%; overflow: hidden;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe); border: 8px solid var(--surface); box-shadow: var(--shadow-lg);
  display: grid; place-items: center; }
.pf-photo img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; object-fit: cover; user-select: none; -webkit-user-drag: none; }
.pf-initials { font-family: var(--font-head); font-size: 56px; font-weight: 800; color: var(--accent-ink); }

/* SECTIONS */
.pf-section { padding: 88px 0; }
.pf-alt { background: var(--bg-alt); }
.pf-section-head { margin-bottom: 36px; max-width: 720px; }
.pf-kicker { color: var(--accent-ink); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; margin-bottom: 10px; }
.pf-section-head h2 { font-size: clamp(28px, 4vw, 38px); line-height: 1.15; letter-spacing: -.025em; }
.pf-section-intro { margin-top: 8px; color: var(--muted); }

/* PROJECTS */
.pf-projects { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 24px; }
.pf-project { display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); transition: transform .25s, box-shadow .25s, border-color .25s; }
.pf-project:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
.pf-media { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: var(--surface-2); }
.pf-media img { width: 100%; height: 100%; max-width: none; }
.pf-media.fit-cover img { object-fit: cover; }
.pf-media.fit-contain img { object-fit: contain; padding: 18px; }
.pf-media-ph { display: grid; place-items: center; }
.pf-media-ph > span { font-family: var(--font-head); font-size: 54px; font-weight: 800; color: rgba(255,255,255,.92); letter-spacing: -.03em; }
.pf-ph-0 { background: radial-gradient(circle at 75% 20%, #60a5fa, transparent 35%), linear-gradient(135deg, #172554, #2563eb); }
.pf-ph-1 { background: radial-gradient(circle at 70% 30%, #c4b5fd, transparent 35%), linear-gradient(135deg, #312e81, #7c3aed); }
.pf-ph-2 { background: radial-gradient(circle at 20% 30%, #94a3b8, transparent 30%), linear-gradient(135deg, #0f172a, #475569); }
.pf-project-body { display: flex; flex-direction: column; gap: 12px; padding: 24px; flex: 1; }
.pf-project-title { font-size: 20px; line-height: 1.3; letter-spacing: -.01em; }
.pf-project-desc { color: var(--muted); font-size: 15px; line-height: 1.7; white-space: pre-line; }
.pf-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pf-chips li { padding: 5px 10px; border-radius: 999px; background: var(--chip-bg); color: var(--chip-ink); font-size: 12px; font-weight: 700; line-height: 1.3; }
.pf-case { display: grid; gap: 12px; border-top: 1px solid var(--line); padding-top: 14px; }
.pf-case h4 { margin-bottom: 4px; font-size: 11.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--accent-ink); font-family: var(--font-body); }
.pf-case p { color: var(--muted); font-size: 14.5px; line-height: 1.7; white-space: pre-line; }
.pf-case-results { padding: 12px 14px; border-radius: calc(var(--radius) * .6); background: var(--chip-bg); }
.pf-case-results p { color: var(--text-2); }
.pf-project-link { margin-top: auto; padding-top: 4px; color: var(--accent-ink); font-size: 14px; font-weight: 800; text-decoration: none; align-self: flex-start; }
.pf-project-link:hover { text-decoration: underline; text-underline-offset: 3px; }

/* TIMELINE (experience, education) */
.pf-timeline { position: relative; display: grid; gap: 30px; padding-left: 28px; border-left: 2px solid var(--line); margin-left: 6px; max-width: 820px; }
.pf-timeline > li { position: relative; }
.pf-timeline > li::before { content: ""; position: absolute; left: -36px; top: 6px; width: 12px; height: 12px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 4px var(--bg-alt), 0 0 0 5px var(--line); }
.pf-section:not(.pf-alt) .pf-timeline > li::before { box-shadow: 0 0 0 4px var(--bg), 0 0 0 5px var(--line); }
.pf-meta { color: var(--accent-ink); font-size: 13px; font-weight: 700; margin-bottom: 2px; }
.pf-timeline h3, .pf-card h3 { font-size: 18px; line-height: 1.35; }
.pf-entry-text { margin-top: 6px; color: var(--muted); font-size: 15px; line-height: 1.7; white-space: pre-line; }

/* SKILLS */
.pf-skill-groups { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 20px; }
.pf-skill-group { padding: 22px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); }
.pf-skill-group h3 { font-size: 16px; margin-bottom: 12px; }

/* CARDS (certifications, custom sections) */
.pf-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 20px; }
.pf-card { padding: 24px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); }
.pf-card .pf-meta { margin-top: 4px; }

/* CONTACT */
.pf-contact { padding: 96px 0; text-align: center; border-top: 1px solid var(--line); }
.pf-contact h2 { font-size: clamp(30px, 5vw, 46px); letter-spacing: -.03em; line-height: 1.1; }
.pf-contact p { max-width: 560px; margin: 14px auto 0; color: var(--muted); font-size: 17px; }
.pf-contact .pf-links { justify-content: center; }

/* FOOTER */
.pf .pf-footer { padding: 28px 0; border-top: 1px solid var(--line); background: var(--bg); color: var(--muted); font-size: 13px; }
.pf-footer-inner { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.pf-footer a { color: var(--muted); text-decoration: none; font-weight: 600; }
.pf-footer a:hover { color: var(--accent-ink); }

/* ---------- THEME 1: PROFESSIONAL LIGHT ---------- */
.pf.t-professional {
  --hero-bg: radial-gradient(circle at 85% 20%, #dbeafe 0%, transparent 32%), linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

/* ---------- THEME 2: EDITORIAL MINIMAL ---------- */
.pf.t-editorial {
  --bg: #f7f3ec; --bg-alt: #f1ebe1; --surface: #fffdf9; --surface-2: #efe8dc;
  --text: #1c1917; --text-2: #44403c; --muted: #625a52;
  --line: #e2d9cb; --line-strong: #1c1917;
  --accent: #9a3412; --accent-ink: #9a3412; --on-accent: #fff;
  --btn-bg: #1c1917; --btn-ink: #f7f3ec;
  --chip-bg: transparent; --chip-ink: #44403c;
  --radius: 3px; --btn-radius: 999px;
  --font-head: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif;
  --font-body: "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif;
  --nav-bg: rgba(247,243,236,.9);
  --shadow: none; --shadow-lg: none;
  counter-reset: pf-sec;
}
.t-editorial .pf-brand { font-weight: 600; font-size: 19px; letter-spacing: 0; }
.t-editorial .pf-nav-links a { font-weight: 500; color: var(--text-2); }
.t-editorial .pf-hero { padding: 88px 0 80px; border-bottom-color: var(--line-strong); }
.t-editorial .pf-hero-grid { grid-template-columns: minmax(0, .72fr) minmax(0, 1.5fr); gap: 64px; align-items: end; }
.t-editorial .pf-photo-col { order: -1; align-items: stretch; }
.t-editorial .pf-photo { width: 100%; max-width: 320px; aspect-ratio: 4 / 5; border-radius: 2px; border: 0; box-shadow: none; background: #e7dccb; }
.t-editorial .pf-initials { font-weight: 400; font-style: italic; font-size: 64px; color: #44403c; }
.t-editorial .pf-eyebrow { color: var(--text-2); font-family: var(--font-head); font-style: italic; font-weight: 400; font-size: 17px; letter-spacing: 0; text-transform: none; }
.t-editorial .pf-name { font-weight: 500; font-size: clamp(44px, 7vw, 86px); letter-spacing: -.025em; line-height: 1; margin-bottom: 18px; }
.t-editorial .pf-title { font-family: var(--font-head); font-style: italic; font-weight: 400; font-size: clamp(19px, 2.4vw, 24px); }
.t-editorial .pf-about { padding-top: 22px; border-top: 1px solid var(--line); }
.t-editorial .pf-about h2 { color: var(--accent); }
.t-editorial .pf-about p { color: var(--text-2); }
.t-editorial .pf-btn { background: transparent; border-color: var(--line-strong); font-weight: 600; }
.t-editorial .pf-btn:hover { transform: none; background: var(--text); color: var(--bg); border-color: var(--text); }
.t-editorial .pf-btn-primary { background: var(--btn-bg); box-shadow: none; }
.t-editorial .pf-section-head { counter-increment: pf-sec; display: grid; grid-template-columns: 180px 1fr; gap: 24px; max-width: none; padding-top: 18px; border-top: 1px solid var(--line-strong); margin-bottom: 44px; }
.t-editorial .pf-kicker { font-family: var(--font-head); font-style: italic; font-weight: 400; font-size: 16px; letter-spacing: 0; text-transform: none; color: var(--text-2); }
.t-editorial .pf-kicker::before { content: counter(pf-sec, decimal-leading-zero) " — "; color: var(--accent); font-style: normal; }
.t-editorial .pf-section-head h2 { font-weight: 500; font-size: clamp(30px, 4.5vw, 46px); }
.t-editorial .pf-section-intro { grid-column: 2; }
.t-editorial .pf-projects { grid-template-columns: 1fr; gap: 0; counter-reset: pf-proj; }
.t-editorial .pf-project { counter-increment: pf-proj; display: grid; grid-template-columns: minmax(0, .95fr) minmax(0, 1.25fr); gap: 44px; align-items: start; padding: 36px 0; background: transparent; border: 0; border-top: 1px solid var(--line); border-radius: 0; }
.t-editorial .pf-project:first-child { border-top: 0; padding-top: 0; }
.t-editorial .pf-project:hover { transform: none; box-shadow: none; }
.t-editorial .pf-media { aspect-ratio: 4 / 3; border-radius: 2px; }
.t-editorial .pf-project-body { padding: 0; }
.t-editorial .pf-project-title { font-weight: 500; font-size: clamp(24px, 3vw, 30px); line-height: 1.2; }
.t-editorial .pf-project-title::before { content: counter(pf-proj, decimal-leading-zero); display: block; margin-bottom: 10px; color: var(--accent); font-family: var(--font-body); font-size: 13px; font-weight: 700; letter-spacing: .1em; }
.t-editorial .pf-project-desc { color: var(--text-2); font-size: 16px; }
.t-editorial .pf-chips { gap: 4px 0; }
.t-editorial .pf-chips li { padding: 0; border-radius: 0; font-size: 13px; font-weight: 600; }
.t-editorial .pf-chips li + li::before { content: "/"; margin: 0 8px; color: var(--accent); }
.t-editorial .pf-project-link { color: var(--text); border-bottom: 1px solid var(--text); font-weight: 600; }
.t-editorial .pf-project-link:hover { text-decoration: none; color: var(--accent); border-color: var(--accent); }
.t-editorial .pf-media-ph > span { color: rgba(28,25,23,.55); font-weight: 400; font-style: italic; font-size: 64px; }
.t-editorial .pf-ph-0 { background: #e7dccb; }
.t-editorial .pf-ph-1 { background: #ddd0bb; }
.t-editorial .pf-ph-2 { background: #d4c4ab; }
.t-editorial .pf-timeline { border-left: 0; padding-left: 0; margin-left: 0; gap: 0; max-width: none; }
.t-editorial .pf-timeline > li { display: grid; grid-template-columns: 180px 1fr; gap: 24px; padding: 22px 0; border-top: 1px solid var(--line); }
.t-editorial .pf-timeline > li:first-child { border-top: 0; padding-top: 0; }
.t-editorial .pf-timeline > li::before { display: none; }
.t-editorial .pf-timeline .pf-meta { color: var(--text-2); font-weight: 600; padding-top: 4px; }
.t-editorial .pf-timeline h3, .t-editorial .pf-card h3, .t-editorial .pf-skill-group h3 { font-weight: 500; font-size: 22px; }
.t-editorial .pf-skill-group, .t-editorial .pf-card { background: transparent; border: 0; border-top: 1px solid var(--line-strong); padding: 18px 0 0; }
.t-editorial .pf-contact h2 { font-weight: 500; font-size: clamp(36px, 6vw, 64px); }
.t-editorial .pf-case h4 { color: var(--accent); }
.t-editorial .pf-case-results { background: transparent; padding: 0 0 0 14px; border-left: 2px solid var(--accent); border-radius: 0; }

/* ---------- THEME 3: MODERN DARK ---------- */
.pf.t-dark {
  --bg: #0a0b10; --bg-alt: #0e1017; --surface: #12141c; --surface-2: #181b25;
  --text: #eef0f5; --text-2: #c9cede; --muted: #9aa2b5;
  --line: rgba(255,255,255,.08); --line-strong: rgba(255,255,255,.18);
  --accent: #a78bfa; --accent-ink: #c4b5fd; --on-accent: #0a0b10;
  --btn-bg: linear-gradient(135deg, #a78bfa, #22d3ee); --btn-ink: #0a0b10;
  --chip-bg: rgba(167,139,250,.12); --chip-ink: #d8ccff;
  --radius: 20px; --btn-radius: 12px;
  --font-body: Inter, "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif;
  --hero-bg: radial-gradient(700px circle at 85% -10%, rgba(139,92,246,.28), transparent 60%), radial-gradient(500px circle at -5% 110%, rgba(34,211,238,.14), transparent 60%), #0a0b10;
  --nav-bg: rgba(10,11,16,.78);
  --shadow: none; --shadow-lg: 0 24px 60px rgba(0,0,0,.45);
  color-scheme: dark;
}
.t-dark .pf-eyebrow, .t-dark .pf-kicker, .t-dark .pf-meta { font-family: var(--font-mono); letter-spacing: .02em; text-transform: none; font-weight: 600; }
.t-dark .pf-eyebrow { color: #67e8f9; font-size: 14px; }
.t-dark .pf-kicker { font-size: 13px; color: var(--accent-ink); }
.t-dark .pf-kicker::before { content: "// "; color: var(--muted); }
.t-dark .pf-name-text { background: linear-gradient(92deg, #ffffff 30%, #c4b5fd 70%, #67e8f9); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }
.t-dark .pf-photo { width: 230px; border-radius: 32px; border: 0; background: linear-gradient(135deg, #312e81, #0e7490);
  box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 0 0 6px rgba(10,11,16,1), 0 0 0 7px rgba(167,139,250,.55), 0 30px 80px rgba(139,92,246,.28); }
.t-dark .pf-initials { color: #fff; }
.t-dark .pf-btn { background: rgba(255,255,255,.03); }
.t-dark .pf-btn:hover { border-color: var(--accent); color: #fff; background: rgba(167,139,250,.10); }
.t-dark .pf-btn-primary { background: var(--btn-bg); box-shadow: 0 10px 30px rgba(139,92,246,.35); }
.t-dark .pf-btn-primary:hover { color: var(--btn-ink); background: var(--btn-bg); }
.t-dark .pf-projects { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.t-dark .pf-project { position: relative; }
.t-dark .pf-project:hover { border-color: rgba(167,139,250,.45); box-shadow: 0 0 0 1px rgba(167,139,250,.25), 0 24px 60px rgba(139,92,246,.18); }
.t-dark .pf-project:first-child { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); }
.t-dark .pf-project:first-child .pf-media { aspect-ratio: auto; min-height: 300px; height: 100%; }
.t-dark .pf-project:first-child .pf-project-body { padding: 36px; justify-content: center; }
.t-dark .pf-project:first-child .pf-project-title { font-size: 26px; }
.t-dark .pf-ph-0 { background: radial-gradient(circle at 70% 25%, rgba(167,139,250,.75), transparent 45%), radial-gradient(circle at 20% 90%, rgba(34,211,238,.45), transparent 45%), #151822; }
.t-dark .pf-ph-1 { background: radial-gradient(circle at 30% 30%, rgba(34,211,238,.6), transparent 45%), #151822; }
.t-dark .pf-ph-2 { background: radial-gradient(circle at 70% 70%, rgba(244,114,182,.55), transparent 45%), #151822; }
.t-dark .pf-media.fit-contain { background: #0f1118; }
.t-dark .pf-case h4 { font-family: var(--font-mono); letter-spacing: .04em; text-transform: none; color: #67e8f9; }
.t-dark .pf-case-results { border: 1px solid rgba(167,139,250,.22); }
.t-dark .pf-chips li { border: 1px solid rgba(167,139,250,.22); font-family: var(--font-mono); font-weight: 500; }
.t-dark .pf-timeline > li::before { background: #67e8f9; box-shadow: 0 0 0 4px var(--bg-alt), 0 0 14px rgba(103,232,249,.8); }
.t-dark .pf-section:not(.pf-alt) .pf-timeline > li::before { box-shadow: 0 0 0 4px var(--bg), 0 0 14px rgba(103,232,249,.8); }
.t-dark .pf-meta { color: #67e8f9; }
.t-dark .pf-contact { background: radial-gradient(600px circle at 50% 120%, rgba(139,92,246,.25), transparent 70%); }
.t-dark .pf-skill-group, .t-dark .pf-card { background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.01)); }

/* ---------- EXTRA LINES UNDER THE TITLE ---------- */
.pf-subtitles { margin: -22px 0 30px; display: grid; gap: 3px; justify-items: start; }
.pf-subtitles.is-empty { margin-top: -18px; }
.pf-subtitle { color: var(--muted); font-size: 17px; font-weight: 500; line-height: 1.5; }
.t-editorial .pf-subtitle { font-family: var(--font-head); font-style: italic; font-size: 19px; color: var(--text-2); }
.t-editorial .pf-subtitles { margin-top: -14px; }

/* ---------- NAME SIZE (chosen by the student) ---------- */
.pf-size-medium .pf-name { font-size: clamp(34px, 4.8vw, 54px); }
.pf-size-small .pf-name { font-size: clamp(30px, 3.8vw, 42px); letter-spacing: -.025em; }
.t-editorial.pf-size-medium .pf-name { font-size: clamp(38px, 5.6vw, 66px); }
.t-editorial.pf-size-small .pf-name { font-size: clamp(32px, 4.4vw, 50px); }

/* ---------- RESPONSIVE ---------- */
@media (max-width: 860px) {
  .pf-hero { padding: 56px 0 52px; }
  .pf-hero-grid, .t-editorial .pf-hero-grid { grid-template-columns: 1fr; gap: 36px; }
  .pf-photo-col { order: -1; align-items: flex-start; }
  .pf-photo { width: 168px; border-width: 6px; }
  .t-editorial .pf-photo { width: 200px; }
  .t-dark .pf-photo { width: 160px; border-radius: 26px; }
  .pf-initials { font-size: 44px; }
  .pf-section { padding: 64px 0; }
  .pf-contact { padding: 72px 0; }
  .t-dark .pf-projects { grid-template-columns: 1fr; }
  .t-dark .pf-project:first-child { display: flex; }
  .t-dark .pf-project:first-child .pf-media { aspect-ratio: 16 / 10; min-height: 0; height: auto; }
  .t-dark .pf-project:first-child .pf-project-body { padding: 24px; }
  .t-editorial .pf-project { grid-template-columns: 1fr; gap: 20px; }
  .t-editorial .pf-section-head, .t-editorial .pf-timeline > li { grid-template-columns: 1fr; gap: 6px; }
  .t-editorial .pf-section-intro { grid-column: auto; }
  .pf-nav-links { gap: 18px; }
}
@media (max-width: 520px) {
  .pf-size-medium .pf-name, .t-editorial.pf-size-medium .pf-name { font-size: 34px; }
  .pf-size-small .pf-name, .t-editorial.pf-size-small .pf-name { font-size: 29px; }
  .pf-wrap { width: calc(100% - 32px); }
  .pf-nav-inner { height: 56px; }
  .pf-nav-links a:not(.pf-nav-contact) { display: none; }
  .pf-links .pf-btn { flex: 1 1 auto; justify-content: center; }
  .pf-about p, .pf-contact p { font-size: 16px; }
  .pf-project-body { padding: 20px; }
  .t-editorial .pf-project-body { padding: 0; }
  .pf-footer-inner { flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) {
  .pf *, .pf *::before, .pf *::after { transition: none !important; animation: none !important; }
}
@media print {
  .pf-nav { position: static; }
  .pf-project:hover { transform: none; }
}

/* Editor-only adjustments (never present in the export) */
.pf.is-editing { min-height: 0; }
.pf.is-editing .pf-nav { position: relative; }
.pf.is-editing .pf-project:hover { transform: none; }
`;


    // ========================================
    // PORTFOLIO MARKUP
    // mode: "edit" (with controls) or "export" (published version)
    // ========================================

    function photoStyle(photo) {
        const x = clampNumber(photo.x, 0, 100, 50).toFixed(1);
        const y = clampNumber(photo.y, 0, 100, 50).toFixed(1);
        const z = clampNumber(photo.zoom, 1, 3, 1).toFixed(3);
        return "object-position:" + x + "% " + y + "%;transform:scale(" + z + ");transform-origin:" + x + "% " + y + "%";
    }

    function linkHref(key, value) {
        return key === "email" ? "mailto:" + value : value;
    }

    function linkAnchor(key, value, primary) {
        const info = LINK_TYPES[key];
        const external = key !== "email";
        return '<a class="pf-btn' + (primary ? " pf-btn-primary" : "") + '" href="' + esc(linkHref(key, value)) + '"' +
            (external ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" +
            esc(info.button) + (external ? ' <span aria-hidden="true">↗</span>' : "") + "</a>";
    }

    function renderLinks(s, edit) {
        const keys = ["resume", "linkedin", "github", "email"];
        const firstSet = keys.find(function (k) { return s.links[k]; });
        let html = "";

        keys.forEach(function (key) {
            const value = s.links[key];
            const primary = key === firstSet;

            if (value) {
                if (edit) {
                    html += '<span class="ed-link-wrap">' + linkAnchor(key, value, primary) +
                        '<button type="button" class="ed-btn ed-icon" data-action="edit-link" data-key="' + key + '" aria-label="Edit ' + LINK_TYPES[key].label + ' link">✎</button>' +
                        '<button type="button" class="ed-btn ed-icon ed-danger" data-action="remove-link" data-key="' + key + '" aria-label="Remove ' + LINK_TYPES[key].label + ' link">×</button>' +
                        "</span>";
                } else {
                    html += linkAnchor(key, value, primary);
                }
            } else if (edit) {
                html += '<button type="button" class="ed-add" data-action="edit-link" data-key="' + key + '">' + LINK_TYPES[key].add + "</button>";
            }
        });

        return html ? '<div class="pf-links">' + html + "</div>" : "";
    }

    function editButton(action, label, extra) {
        return '<button type="button" class="ed-btn ed-inline" data-action="' + action + '"' + (extra || "") +
            ' aria-label="' + esc(label) + '">✎ Edit</button>';
    }

    // Auto: picks a size from the name's length so long names never look oversized
    function effectiveNameSize(s) {
        if (s.nameSize && s.nameSize !== "auto") return s.nameSize;
        const n = (s.name || "").trim().length;
        return n <= 16 ? "large" : (n <= 26 ? "medium" : "small");
    }

    function nameSizeControl(s, name) {
        const sizes = [["auto", "Auto", "Size chosen from the length of your name"], ["large", "L", "Large"], ["medium", "M", "Medium"], ["small", "S", "Small"]];
        const current = s.nameSize || "auto";
        const tip = current === "auto"
            ? '<span class="ed-size-hint">Auto = ' + ({ large: "Large", medium: "Medium", small: "Small" })[effectiveNameSize(s)] + " for your name</span>" : "";
        return '<div class="ed-name-size" role="group" aria-label="Name options">' +
            '<button type="button" class="ed-btn" data-action="edit-name" aria-label="Edit name">✎ Edit name</button>' +
            '<span class="ed-size-label">Size</span>' +
            '<span class="ed-segment">' + sizes.map(function (sz) {
                return '<button type="button" data-action="name-size" data-size="' + sz[0] + '" aria-pressed="' + (current === sz[0]) + '" title="' + sz[2] + '">' + sz[1] + "</button>";
            }).join("") + "</span>" + tip + "</div>";
    }

    function renderSubtitles(s, edit) {
        const lines = s.subtitles || [];
        if (!lines.length && !edit) return "";
        let html = lines.map(function (line, i) {
            return '<p class="pf-subtitle">' + esc(line) + (edit
                ? ' <button type="button" class="ed-btn ed-icon" data-action="subtitle-edit" data-key="' + i + '" aria-label="Edit line ' + (i + 1) + '">✎</button>' +
                  '<button type="button" class="ed-btn ed-icon ed-danger" data-action="subtitle-remove" data-key="' + i + '" aria-label="Remove line ' + (i + 1) + '">×</button>'
                : "") + "</p>";
        }).join("");
        if (edit && lines.length < 3) {
            html += '<button type="button" class="ed-add ed-add-line" data-action="subtitle-add">+ Add another line (degree, minor, Ph.D. …)</button>';
        }
        return '<div class="pf-subtitles' + (lines.length ? "" : " is-empty") + '">' + html + "</div>";
    }

    function renderHero(s, edit) {
        const name = s.name.trim() || DEFAULT.name;
        const aboutIsPlaceholder = isDefaultAbout(s.about);
        const year = new Date().getFullYear();
        const eyebrow = s.theme === "dark" ? "Hi, I'm" : (s.theme === "editorial" ? "Portfolio, " + year : "Portfolio");

        let about = "";
        if (edit) {
            about = '<div class="pf-about"><h2>About me ' + editButton("edit-about", "Edit About Me") + "</h2>" +
                (aboutIsPlaceholder
                    ? '<p class="ed-placeholder">' + esc(DEFAULT.about) + '</p><p><span class="ed-tag">Placeholder — not published until you write your own</span></p>'
                    : "<p>" + esc(s.about.trim()) + "</p>") +
                "</div>";
        } else if (!aboutIsPlaceholder) {
            about = '<div class="pf-about"><h2>About me</h2><p>' + esc(s.about.trim()) + "</p></div>";
        }

        let photo;
        if (s.photo.src) {
            photo = '<div class="pf-photo' + (edit ? " ed-draggable-photo" : "") + '"' + (edit ? ' id="ed-photo-frame"' : "") + ">" +
                '<img src="' + esc(s.photo.src) + '" alt="Portrait of ' + esc(name) + '" style="' + photoStyle(s.photo) + '"' + (edit ? ' draggable="false"' : "") + ">" +
                "</div>";
        } else {
            photo = '<div class="pf-photo"><span class="pf-initials" aria-hidden="true">' + esc(getInitials(name)) + "</span></div>";
        }

        let photoTools = "";
        if (edit) {
            photoTools = '<div class="ed-photo-tools" role="group" aria-label="Profile photo controls">' +
                '<div class="ed-row">' +
                '<button type="button" class="ed-btn" data-action="photo-choose">' + (s.photo.src ? "Change photo" : "Upload photo") + "</button>" +
                (s.photo.src
                    ? '<button type="button" class="ed-btn" data-action="photo-reset">Reset position</button>' +
                      '<button type="button" class="ed-btn ed-danger" data-action="photo-remove">Remove</button>'
                    : "") +
                "</div>" +
                (s.photo.src
                    ? '<label>Left / right<input type="range" min="0" max="100" step="1" data-photo="x" value="' + s.photo.x + '"></label>' +
                      '<label>Up / down<input type="range" min="0" max="100" step="1" data-photo="y" value="' + s.photo.y + '"></label>' +
                      '<label>Zoom<input type="range" min="1" max="3" step="0.01" data-photo="zoom" value="' + s.photo.zoom + '"></label>' +
                      "<p>Tip: drag the photo to reposition it.</p>"
                    : "<p>JPG, PNG or WebP, up to 10 MB. A clear, well-lit headshot works best.</p>") +
                "</div>";
        }

        return '<section class="pf-hero">' +
            '<div class="pf-wrap pf-hero-grid">' +
            '<div class="pf-hero-text">' +
            '<p class="pf-eyebrow">' + esc(eyebrow) + "</p>" +
            '<h1 class="pf-name"><span class="pf-name-text">' + esc(name) + "</span></h1>" +
            (edit ? nameSizeControl(s, name) : "") +
            '<p class="pf-title">' + esc(s.title) + (edit ? editButton("edit-title", "Edit title") : "") + "</p>" +
            renderSubtitles(s, edit) +
            about +
            renderLinks(s, edit) +
            "</div>" +
            '<div class="pf-photo-col">' + photo + photoTools + "</div>" +
            "</div>" +
            "</section>";
    }

    function renderProject(p, index, total, edit) {
        const title = p.title.trim() || "Untitled Project";
        const letter = Array.from(title)[0].toUpperCase();
        const tech = splitList(p.tech);
        const placeholder = isPlaceholderProject(p);
        const id = esc(p.id);

        let tools = "";
        let mediaTools = "";

        if (edit) {
            tools = '<div class="ed-card-tools">' +
                '<span class="ed-btn ed-icon ed-handle" draggable="true" data-id="' + id + '" aria-hidden="true" title="Drag to reorder (keyboard: use the arrow buttons)">⋮⋮</span>' +
                '<button type="button" class="ed-btn ed-icon" data-action="project-up" data-id="' + id + '" aria-label="Move ' + esc(title) + ' earlier"' + (index === 0 ? " disabled" : "") + ">↑</button>" +
                '<button type="button" class="ed-btn ed-icon" data-action="project-down" data-id="' + id + '" aria-label="Move ' + esc(title) + ' later"' + (index === total - 1 ? " disabled" : "") + ">↓</button>" +
                (placeholder ? '<span class="ed-tag">Placeholder — edit to publish</span>' : "") +
                '<span class="ed-spacer"></span>' +
                '<button type="button" class="ed-btn" data-action="project-edit" data-id="' + id + '" aria-label="Edit project ' + esc(title) + '">✎ Edit</button>' +
                '<button type="button" class="ed-btn ed-danger" data-action="project-remove" data-id="' + id + '" aria-label="Remove project ' + esc(title) + '">Remove</button>' +
                "</div>";

            mediaTools = '<div class="ed-media-tools">' +
                '<button type="button" class="ed-btn" data-action="project-image" data-id="' + id + '">' + (p.image ? "Change image" : "Add image") + "</button>" +
                (p.image
                    ? '<span class="ed-segment" role="group" aria-label="Image fit">' +
                      '<button type="button" data-action="project-fit" data-fit="cover" data-id="' + id + '" aria-pressed="' + (p.fit === "cover") + '" title="Fill the area, edges may be cropped">Cover</button>' +
                      '<button type="button" data-action="project-fit" data-fit="contain" data-id="' + id + '" aria-pressed="' + (p.fit === "contain") + '" title="Show the whole image">Contain</button>' +
                      "</span>"
                    : "") +
                "</div>";
        }

        const media = p.image
            ? '<div class="pf-media fit-' + (p.fit === "contain" ? "contain" : "cover") + '"><img src="' + esc(p.image) + '" alt="Image for ' + esc(title) + '">' + mediaTools + "</div>"
            : '<div class="pf-media pf-media-ph pf-ph-' + (index % 3) + '"><span aria-hidden="true">' + esc(letter) + "</span>" + mediaTools + "</div>";

        let details = "";
        if (p.process.trim() || p.results.trim()) {
            details = '<div class="pf-case">' +
                (p.process.trim() ? '<div class="pf-case-block"><h4>Process</h4><p>' + esc(p.process.trim()) + "</p></div>" : "") +
                (p.results.trim() ? '<div class="pf-case-block pf-case-results"><h4>Results</h4><p>' + esc(p.results.trim()) + "</p></div>" : "") +
                "</div>";
        }

        return '<article class="pf-project' + (edit && placeholder ? " ed-placeholder-card" : "") + '" data-id="' + id + '">' +
            tools +
            media +
            '<div class="pf-project-body">' +
            '<h3 class="pf-project-title">' + esc(title) + "</h3>" +
            (p.description.trim() ? '<p class="pf-project-desc">' + esc(p.description.trim()) + "</p>" : "") +
            (tech.length ? '<ul class="pf-chips" aria-label="Technologies">' + tech.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : "") +
            details +
            (p.link ? '<a class="pf-project-link" href="' + esc(p.link) + '" target="_blank" rel="noopener noreferrer">View project <span aria-hidden="true">→</span></a>' : "") +
            "</div>" +
            "</article>";
    }

    function entryTools(type, entry, sectionId) {
        const attrs = ' data-type="' + type + '" data-id="' + esc(entry.id) + '"' + (sectionId ? ' data-section="' + esc(sectionId) + '"' : "");
        const name = esc(entry.title || "entry");
        return '<div class="ed-entry-tools">' +
            '<button type="button" class="ed-btn" data-action="entry-edit"' + attrs + ' aria-label="Edit ' + name + '">✎ Edit</button>' +
            '<button type="button" class="ed-btn ed-danger" data-action="entry-remove"' + attrs + ' aria-label="Remove ' + name + '">Remove</button>' +
            "</div>";
    }

    function renderEntries(layout, entries, type, sectionId, edit) {
        if (layout === "timeline") {
            return '<ol class="pf-timeline">' + entries.map(function (e) {
                return "<li>" +
                    (e.meta.trim() ? '<p class="pf-meta">' + esc(e.meta.trim()) + "</p>" : "") +
                    "<div>" +
                    (e.title.trim() ? "<h3>" + esc(e.title.trim()) + "</h3>" : "") +
                    (e.description.trim() ? '<p class="pf-entry-text">' + esc(e.description.trim()) + "</p>" : "") +
                    (edit ? entryTools(type, e, sectionId) : "") +
                    "</div></li>";
            }).join("") + "</ol>";
        }

        if (layout === "skills") {
            return '<div class="pf-skill-groups">' + entries.map(function (e) {
                const items = splitList(e.description);
                return '<div class="pf-skill-group">' +
                    (e.title.trim() ? "<h3>" + esc(e.title.trim()) + "</h3>" : "") +
                    (items.length ? '<ul class="pf-chips">' + items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" : "") +
                    (edit ? entryTools(type, e, sectionId) : "") +
                    "</div>";
            }).join("") + "</div>";
        }

        // cards
        return '<div class="pf-cards">' + entries.map(function (e) {
            return '<div class="pf-card">' +
                (e.title.trim() ? "<h3>" + esc(e.title.trim()) + "</h3>" : "") +
                (e.meta.trim() ? '<p class="pf-meta">' + esc(e.meta.trim()) + "</p>" : "") +
                (e.description.trim() ? '<p class="pf-entry-text">' + esc(e.description.trim()) + "</p>" : "") +
                (edit ? entryTools(type, e, sectionId) : "") +
                "</div>";
        }).join("") + "</div>";
    }

    function sectionWrap(opts) {
        return '<section class="pf-section' + (opts.alt ? " pf-alt" : "") + '" id="' + opts.id + '" aria-labelledby="' + opts.id + '-h">' +
            '<div class="pf-wrap">' +
            '<div class="pf-section-head">' +
            '<p class="pf-kicker">' + esc(opts.kicker) + "</p>" +
            "<div>" +
            '<h2 id="' + opts.id + '-h">' + opts.titleHtml + "</h2>" +
            (opts.intro ? '<p class="pf-section-intro">' + esc(opts.intro) + "</p>" : "") +
            "</div>" +
            "</div>" +
            opts.body +
            (opts.tools || "") +
            "</div>" +
            "</section>";
    }

    // Is an entry worth publishing? (no blank cards)
    function hasContent(entry) {
        return Boolean(entry.title.trim() || entry.description.trim());
    }

    function renderPortfolio(s, mode) {
        const edit = mode === "edit";
        const name = s.name.trim() || DEFAULT.name;
        const blocks = [];
        const nav = [];

        // PROJECTS
        const projects = edit ? s.projects : s.projects.filter(function (p) { return !isPlaceholderProject(p); });

        if (projects.length || edit) {
            const body = projects.length
                ? '<div class="pf-projects">' + projects.map(function (p, i) { return renderProject(p, i, projects.length, edit); }).join("") + "</div>"
                : '<p class="pf-section-intro">No projects yet.</p>';

            blocks.push({
                id: "pf-projects", nav: "Work", kicker: "Selected work", titleHtml: "Projects",
                intro: "A selection of my academic, professional and personal work.",
                body: body,
                tools: edit ? '<div class="ed-section-tools"><button type="button" class="ed-add" data-action="project-add">+ Add Project</button></div>' : ""
            });
        }

        // BUILT-IN SECTIONS
        SECTION_KEYS.forEach(function (key) {
            const cfg = SECTION_TYPES[key];
            const entries = s.sections[key].filter(function (e) { return edit || hasContent(e); });
            if (!entries.length) return;

            blocks.push({
                id: "pf-" + key, nav: cfg.nav, kicker: cfg.kicker, titleHtml: esc(cfg.label),
                body: renderEntries(cfg.layout, entries, key, null, edit),
                tools: edit ? '<div class="ed-section-tools"><button type="button" class="ed-add" data-action="entry-add" data-type="' + key + '">+ Add ' + esc(cfg.label) + " entry</button></div>" : ""
            });
        });

        // CUSTOM SECTIONS
        s.sections.custom.forEach(function (section, index) {
            const entries = section.entries.filter(function (e) { return edit || hasContent(e); });
            if (!entries.length && !edit) return;

            const sid = esc(section.id);
            blocks.push({
                id: "pf-custom-" + (index + 1), nav: null, kicker: CUSTOM_TYPE.kicker,
                titleHtml: esc(section.name) + (edit
                    ? ' <button type="button" class="ed-btn ed-inline" data-action="custom-rename" data-section="' + sid + '" aria-label="Rename section ' + esc(section.name) + '">✎ Rename</button>' +
                      ' <button type="button" class="ed-btn ed-inline ed-danger" data-action="custom-remove" data-section="' + sid + '" aria-label="Remove section ' + esc(section.name) + '">Remove section</button>'
                    : ""),
                body: entries.length ? renderEntries("cards", entries, "custom", section.id, edit) : (edit ? '<p class="pf-section-intro"><span class="ed-tag">Empty — add an entry or it will not be published</span></p>' : ""),
                tools: edit ? '<div class="ed-section-tools"><button type="button" class="ed-add" data-action="entry-add" data-type="custom" data-section="' + sid + '">+ Add entry</button></div>' : ""
            });
        });

        const sectionsHtml = blocks.map(function (b, i) {
            if (b.nav) nav.push({ id: b.id, label: b.nav });
            b.alt = i % 2 === 0;
            return sectionWrap(b);
        }).join("");

        // ADD-SECTION PANEL (editor only)
        let addPanel = "";
        if (edit) {
            const missing = SECTION_KEYS.filter(function (k) { return s.sections[k].length === 0; });
            const used = s.sections.custom.map(function (c) { return c.name.toLowerCase(); });
            const ideas = ["Volunteer Work", "Awards", "Leadership", "Languages", "Publications", "Research"]
                .filter(function (n) { return used.indexOf(n.toLowerCase()) === -1; });
            addPanel = '<div class="ed-add-sections"><div class="pf-wrap">' +
                "<h2>Add more sections</h2>" +
                "<p>Optional. Add as many as you need. Empty sections are never shown on your published portfolio.</p>" +
                (missing.length ? '<div class="ed-section-tools">' +
                missing.map(function (k) {
                    return '<button type="button" class="ed-add" data-action="entry-add" data-type="' + k + '">+ ' + esc(SECTION_TYPES[k].label) + "</button>";
                }).join("") + "</div>" : "") +
                '<button type="button" class="ed-add ed-add-big" data-action="custom-add">' +
                '<span class="ed-plus" aria-hidden="true">+</span><span><strong>Add your own section</strong><small>Give it any title, then add entries</small></span></button>' +
                (ideas.length ? '<div class="ed-ideas"><span>Quick ideas:</span>' + ideas.map(function (n) {
                    return '<button type="button" class="ed-idea" data-action="custom-quick" data-name="' + esc(n) + '">+ ' + esc(n) + "</button>";
                }).join("") + "</div>" : "") +
                "</div></div>";
        }

        // CONTACT
        const hasLinks = ["resume", "linkedin", "github", "email"].some(function (k) { return s.links[k]; });
        let contact = "";
        if (hasLinks) {
            nav.push({ id: "pf-contact", label: "Contact", contact: true });
            contact = '<section class="pf-contact" id="pf-contact" aria-labelledby="pf-contact-h"><div class="pf-wrap">' +
                '<h2 id="pf-contact-h">Let\'s connect</h2>' +
                "<p>Interested in working together or want to learn more about my work? I'd love to hear from you.</p>" +
                renderLinks(s, false) +
                "</div></section>";
        }

        const navHtml = '<header class="pf-nav"><div class="pf-wrap pf-nav-inner">' +
            '<a class="pf-brand" href="#pf-top">' + esc(name) + "</a>" +
            (nav.length ? '<nav class="pf-nav-links" aria-label="Sections">' + nav.map(function (n) {
                return '<a href="#' + n.id + '"' + (n.contact ? ' class="pf-nav-contact"' : "") + ">" + esc(n.label) + "</a>";
            }).join("") + "</nav>" : "") +
            "</div></header>";

        const footer = '<footer class="pf-footer"><div class="pf-wrap pf-footer-inner">' +
            "<span>© " + new Date().getFullYear() + " " + esc(name) + "</span>" +
            '<a href="#pf-top">Back to top ↑</a>' +
            "</div></footer>";

        return '<div class="pf t-' + s.theme + " pf-size-" + effectiveNameSize(s) + (edit ? " is-editing" : "") + '"' + (edit ? "" : ' id="pf-top"') + ">" +
            navHtml +
            "<main>" + renderHero(s, edit) + sectionsHtml + addPanel + contact + "</main>" +
            footer +
            "</div>";
    }


    // ========================================
    // EXPORT: one standalone index.html
    // ========================================

    function buildExportHTML(s) {
        const name = s.name.trim() || DEFAULT.name;
        const description = isDefaultAbout(s.about)
            ? name + " — " + s.title
            : s.about.trim().replace(/\s+/g, " ").slice(0, 160);

        const favicon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
            '<rect width="64" height="64" rx="16" fill="' + (s.theme === "editorial" ? "#1c1917" : (s.theme === "dark" ? "#8b5cf6" : "#2563eb")) + '"/>' +
            '<text x="32" y="41" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">' +
            esc(getInitials(name)) + "</text></svg>";

        return "<!DOCTYPE html>\n" +
            '<html lang="en">\n<head>\n' +
            '<meta charset="UTF-8">\n' +
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
            "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'\">\n" +
            '<meta name="referrer" content="strict-origin-when-cross-origin">\n' +
            "<title>" + esc(name) + " | Portfolio</title>\n" +
            '<meta name="description" content="' + esc(description) + '">\n' +
            '<meta name="author" content="' + esc(name) + '">\n' +
            '<meta property="og:type" content="website">\n' +
            '<meta property="og:title" content="' + esc(name) + ' | Portfolio">\n' +
            '<meta property="og:description" content="' + esc(description) + '">\n' +
            '<meta name="theme-color" content="' + THEME_BG[s.theme] + '">\n' +
            '<meta name="generator" content="Portfolio Creator">\n' +
            '<link rel="icon" href="data:image/svg+xml,' + encodeURIComponent(favicon) + '">\n' +
            "<style>\nhtml { scroll-behavior: smooth; background: " + THEME_BG[s.theme] + "; }\nbody { margin: 0; }\n" +
            PORTFOLIO_CSS + "\n</style>\n" +
            "</head>\n<body>\n" +
            renderPortfolio(s, "export") +
            "\n</body>\n</html>\n";
    }

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    }

    function exportWarnings() {
        const list = [];
        if (state.name.trim() === DEFAULT.name) list.push("Your name still says \"Your Name\".");
        if (state.title.trim() === DEFAULT.title) list.push("Your title is still the placeholder.");
        if (isDefaultAbout(state.about)) list.push("About Me is empty (it will be left out).");
        if (!state.photo.src) list.push("No profile photo (your initials will be shown).");
        if (!state.projects.some(function (p) { return !isPlaceholderProject(p); })) list.push("No finished projects yet (placeholder projects are left out).");
        return list;
    }

    function exportPortfolio() {
        const warnings = exportWarnings();
        if (warnings.length) {
            const go = window.confirm(
                "Before you export, you may want to fix:\n\n• " + warnings.join("\n• ") +
                "\n\nExport anyway?"
            );
            if (!go) return;
        }

        if (hasUnsavedChanges) persist(false);

        const html = buildExportHTML(state);

        // Chrome / Edge: a real "Save as" dialog. If index.html already exists the
        // computer asks to REPLACE it, instead of silently saving "index (1).html".
        if (typeof window.showSaveFilePicker === "function") {
            saveWithPicker(html).then(function (result) {
                if (result === "saved") openGuide("saved");
                else if (result === "cancelled") toast("Export cancelled. Nothing was saved.");
                else { downloadFile(html, "index.html", "text/html;charset=utf-8"); openGuide("downloaded"); }
            });
            return;
        }

        // Other browsers: normal download
        downloadFile(html, "index.html", "text/html;charset=utf-8");
        openGuide("downloaded");
    }

    async function saveWithPicker(html) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: "index.html",
                types: [{ description: "Web page", accept: { "text/html": [".html"] } }]
            });
            if (handle.name !== "index.html") {
                toast("Heads up: you saved it as \"" + handle.name + "\". Rename it to index.html before uploading.", "error", 9000);
            }
            const writable = await handle.createWritable();
            await writable.write(new Blob([html], { type: "text/html;charset=utf-8" }));
            await writable.close();
            return "saved";
        } catch (error) {
            if (error && error.name === "AbortError") return "cancelled";
            console.warn("Save dialog unavailable, falling back to download:", error);
            return "fallback";
        }
    }


    // ========================================
    // EDITOR RENDERING & FOCUS MANAGEMENT
    // ========================================

    const canvas = document.getElementById("editor-canvas");

    // Inject the shared portfolio styles once (single source of truth)
    const styleTag = document.createElement("style");
    styleTag.id = "portfolio-styles";
    styleTag.textContent = PORTFOLIO_CSS;
    document.head.appendChild(styleTag);

    function describeControl(el) {
        if (!el || !el.dataset) return null;
        return {
            action: el.dataset.action || null,
            id: el.dataset.id || null,
            key: el.dataset.key || null,
            type: el.dataset.type || null,
            section: el.dataset.section || null,
            fit: el.dataset.fit || null,
            elementId: el.id || null
        };
    }

    function focusControl(desc) {
        if (!desc) return;
        if (desc.elementId && document.getElementById(desc.elementId)) {
            document.getElementById(desc.elementId).focus();
            return;
        }
        if (!desc.action) return;

        const candidates = document.querySelectorAll('[data-action="' + CSS.escape(desc.action) + '"]');
        for (const el of candidates) {
            if ((desc.id === null || el.dataset.id === desc.id) &&
                (desc.key === null || el.dataset.key === desc.key) &&
                (desc.type === null || el.dataset.type === desc.type) &&
                (desc.section === null || el.dataset.section === desc.section) &&
                (desc.fit === null || el.dataset.fit === desc.fit)) {
                if (!el.disabled) { el.focus(); return; }
            }
        }
    }

    function render(focusDesc) {
        canvas.innerHTML = renderPortfolio(state, "edit");
        updateThemePicker();
        updateProgress();
        if (focusDesc) focusControl(focusDesc);
    }


    // ========================================
    // DIALOGS
    // ========================================

    const dialogs = {
        field: document.getElementById("field-modal"),
        project: document.getElementById("project-modal"),
        entry: document.getElementById("entry-modal"),
        guide: document.getElementById("guide-modal")
    };

    let pendingFocus = null; // where focus returns after a dialog closes

    function openDialog(dialog, opener, firstField) {
        pendingFocus = describeControl(opener);
        dialog.showModal();
        const target = firstField || dialog.querySelector("input:not([hidden]), textarea:not([hidden]), button.btn-save");
        if (target) {
            target.focus();
            if (target.select && target.value) target.select();
        }
    }

    Object.values(dialogs).forEach(function (dialog) {
        dialog.querySelectorAll("[data-close]").forEach(function (button) {
            button.addEventListener("click", function () { dialog.close(); });
        });

        // Click on the dark backdrop closes the dialog
        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) dialog.close();
        });

        dialog.addEventListener("close", function () {
            const desc = pendingFocus;
            pendingFocus = null;
            // Wait a tick so any re-render has finished
            setTimeout(function () { focusControl(desc); }, 0);
        });
    });

    function setFieldError(input, errorEl, message) {
        errorEl.textContent = message || "";
        if (input) {
            if (message) input.setAttribute("aria-invalid", "true");
            else input.removeAttribute("aria-invalid");
        }
    }


    // ----------------------------------------
    // TEXT FIELD DIALOG (name, title, about, links, section name)
    // ----------------------------------------

    const fieldForm = document.getElementById("field-form");
    const fieldTitle = document.getElementById("field-modal-title");
    const fieldLabel = document.getElementById("field-label");
    const fieldInput = document.getElementById("field-input");
    const fieldTextarea = document.getElementById("field-textarea");
    const fieldHelp = document.getElementById("field-help");
    const fieldError = document.getElementById("field-error");

    let fieldContext = null;

    const FIELD_CONFIG = {
        name: {
            title: "Edit your name", label: "Full name", max: 80, required: "Please enter your name.",
            placeholder: "Jane Doe", help: "Enter the name you want displayed on your portfolio."
        },
        title: {
            title: "Edit your title", label: "Degree, major, or professional title", max: 120, required: "Please enter a title.",
            placeholder: "M.S. Computer Science • Cybersecurity", help: "Example: B.S. Information Systems • Data Analytics"
        },
        about: {
            title: "Edit your About Me", label: "About me", max: 1500, multiline: true,
            placeholder: "I'm a ... student interested in ... I enjoy ... I'm looking for ...",
            help: "2–4 sentences about your interests, experience and goals. Press Enter for a new paragraph. Leave empty to hide this section."
        },
        resume: {
            title: "Your resume link", label: "Resume URL", url: true, max: 600,
            placeholder: "https://drive.google.com/…",
            help: "Paste a public link to your resume, e.g. a Google Drive or OneDrive file shared as \"Anyone with the link can view\". Leave empty to remove."
        },
        linkedin: {
            title: "Your LinkedIn profile", label: "LinkedIn URL", url: true, max: 600,
            placeholder: "https://www.linkedin.com/in/your-name",
            help: "Paste the full address of your LinkedIn profile. Leave empty to remove."
        },
        github: {
            title: "Your GitHub profile", label: "GitHub URL", url: true, max: 600,
            placeholder: "https://github.com/your-username",
            help: "Paste the full address of your GitHub profile. Leave empty to remove."
        },
        email: {
            title: "Your email address", label: "Email", email: true, max: 254,
            placeholder: "you@example.com",
            help: "Visitors can click to email you. Your portfolio is public, so consider a school or professional address. Leave empty to remove."
        },
        subtitle: {
            title: "Add a line under your title", label: "Line", max: 120, required: "Please type the line, or select Cancel.",
            placeholder: "Minor in Statistics",
            help: "Examples: Minor in Statistics · B.S. Biology, State University · Ph.D. Applicant, Fall 2028"
        },
        customName: {
            title: "Name your section", label: "Section name", max: 60, required: "Please give the section a name.",
            placeholder: "Volunteer Work", help: "Examples: Volunteer Work, Awards, Publications, Leadership."
        }
    };

    function openFieldDialog(kind, opener, extra) {
        const cfg = FIELD_CONFIG[kind];
        fieldContext = Object.assign({ kind: kind }, extra || {});

        fieldTitle.textContent = cfg.title;
        fieldLabel.textContent = cfg.label;
        fieldHelp.textContent = cfg.help;
        setFieldError(fieldInput, fieldError, "");
        setFieldError(fieldTextarea, fieldError, "");

        let current = "";
        if (kind === "name") current = state.name === DEFAULT.name ? "" : state.name;
        if (kind === "title") current = state.title === DEFAULT.title ? "" : state.title;
        if (kind === "about") current = isDefaultAbout(state.about) ? "" : state.about;
        if (LINK_TYPES[kind]) current = state.links[kind] || "";
        if (kind === "customName") current = extra && extra.currentName ? extra.currentName : "";
        if (kind === "subtitle") current = extra && extra.index != null ? (state.subtitles[extra.index] || "") : "";

        const input = cfg.multiline ? fieldTextarea : fieldInput;
        fieldTextarea.hidden = !cfg.multiline;
        fieldInput.hidden = Boolean(cfg.multiline);
        fieldLabel.htmlFor = input.id;

        if (!cfg.multiline) {
            fieldInput.type = cfg.url ? "url" : (cfg.email ? "email" : "text");
            fieldInput.inputMode = cfg.url ? "url" : (cfg.email ? "email" : "text");
        }

        input.maxLength = cfg.max;
        input.placeholder = cfg.placeholder || "";
        input.value = current;

        openDialog(dialogs.field, opener, input);
    }

    fieldForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!fieldContext) return;

        const kind = fieldContext.kind;
        const cfg = FIELD_CONFIG[kind];
        const input = cfg.multiline ? fieldTextarea : fieldInput;
        let value = input.value.trim();

        if (cfg.required && value === "") {
            setFieldError(input, fieldError, cfg.required);
            input.focus();
            return;
        }

        if (cfg.url) {
            const result = parseUserUrl(value);
            if (!result.ok) {
                setFieldError(input, fieldError, result.error);
                input.focus();
                return;
            }
            value = result.value;
        }

        if (cfg.email && value !== "") {
            value = value.replace(/^mailto:/i, "");
            if (!isEmail(value)) {
                setFieldError(input, fieldError, "Please enter a valid email address, like name@example.com");
                input.focus();
                return;
            }
        }

        if (kind === "name") state.name = value;
        else if (kind === "title") state.title = value;
        else if (kind === "about") state.about = value;
        else if (LINK_TYPES[kind]) state.links[kind] = value;
        else if (kind === "subtitle") {
            const idx = fieldContext.index;
            if (idx != null && state.subtitles[idx] != null) state.subtitles[idx] = value;
            else if (state.subtitles.length < 3) state.subtitles.push(value);
            pendingFocus = { action: idx != null ? "subtitle-edit" : "subtitle-add", key: idx != null ? String(idx) : null, id: null, type: null, section: null, fit: null, elementId: null };
        }
        else if (kind === "customName") {
            if (fieldContext.sectionId) {
                const section = findCustom(fieldContext.sectionId);
                if (section) section.name = value;
            } else {
                const section = { id: uid(), name: value, entries: [] };
                state.sections.custom.push(section);
                pendingFocus = { action: "entry-add", type: "custom", section: section.id, id: null, key: null, fit: null, elementId: null };
            }
        }

        if (LINK_TYPES[kind]) {
            // focus the edit control for this link, or its add button if removed
            pendingFocus = { action: "edit-link", key: kind, id: null, type: null, section: null, fit: null, elementId: null };
        }

        fieldContext = null;
        changed();
        render();
        dialogs.field.close();
    });

    dialogs.field.addEventListener("close", function () { fieldContext = null; });


    // ----------------------------------------
    // PROJECT DIALOG (changes apply only on Save)
    // ----------------------------------------

    const projectForm = document.getElementById("project-form");
    const projectModalTitle = document.getElementById("project-modal-title");
    const projectSaveButton = document.getElementById("project-save");
    const pTitle = document.getElementById("project-title-input");
    const pDescription = document.getElementById("project-description-input");
    const pDescriptionCount = document.getElementById("project-description-count");
    const pLink = document.getElementById("project-link-input");
    const pTech = document.getElementById("project-tech-input");
    const pProcess = document.getElementById("project-process-input");
    const pResults = document.getElementById("project-results-input");
    const pTitleError = document.getElementById("project-title-error");
    const pLinkError = document.getElementById("project-link-error");
    const pImagePreview = document.getElementById("project-image-preview");
    const pImageChoose = document.getElementById("project-image-choose");
    const pImageRemove = document.getElementById("project-image-remove");
    const pFitButtons = dialogs.project.querySelectorAll("[data-fit]");

    let projectDraft = null; // { isNew, id, image, fit }

    function updateDraftImagePreview() {
        if (projectDraft.image) {
            pImagePreview.innerHTML = "";
            const img = document.createElement("img");
            img.src = projectDraft.image;
            img.alt = "Selected project image";
            img.style.objectFit = projectDraft.fit;
            pImagePreview.appendChild(img);
        } else {
            pImagePreview.textContent = "No image";
        }
        pImageRemove.hidden = !projectDraft.image;
        pFitButtons.forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.dataset.fit === projectDraft.fit));
        });
    }

    function updateDescriptionCount() {
        pDescriptionCount.textContent = pDescription.value.length + " / 600";
    }

    function openProjectDialog(project, opener) {
        const isNew = !project;
        projectDraft = {
            isNew: isNew,
            id: isNew ? uid() : project.id,
            image: isNew ? "" : project.image,
            fit: isNew ? "cover" : project.fit
        };

        const placeholder = project && isPlaceholderProject(project);

        projectModalTitle.textContent = isNew ? "Add a project" : "Edit project";
        projectSaveButton.textContent = isNew ? "Add Project" : "Save Project";
        pTitle.value = isNew || DEFAULT_PROJECT_TITLES.includes(project.title.trim()) ? "" : project.title;
        pDescription.value = isNew || (placeholder || DEFAULT_PROJECT_DESCRIPTIONS.includes(project.description.trim())) ? "" : project.description;
        pLink.value = isNew ? "" : project.link;
        pTech.value = isNew ? "" : project.tech;
        pProcess.value = isNew ? "" : project.process;
        pResults.value = isNew ? "" : project.results;

        setFieldError(pTitle, pTitleError, "");
        setFieldError(pLink, pLinkError, "");
        updateDraftImagePreview();
        updateDescriptionCount();

        openDialog(dialogs.project, opener, pTitle);
    }

    pDescription.addEventListener("input", updateDescriptionCount);

    pFitButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            projectDraft.fit = button.dataset.fit;
            updateDraftImagePreview();
        });
    });

    // This file input lives INSIDE the dialog (elements outside a modal dialog are inert)
    const draftImageInput = document.getElementById("project-draft-image-input");

    pImageChoose.addEventListener("click", function () {
        draftImageInput.click();
    });

    draftImageInput.addEventListener("change", async function () {
        const file = draftImageInput.files[0];
        draftImageInput.value = "";
        if (!file || !projectDraft) return;
        try {
            const data = await processImage(file, 1200, 0.8, true);
            if (!projectDraft) return;
            projectDraft.image = data;
            updateDraftImagePreview();
            pImageChoose.focus();
        } catch (error) {
            handleImageError(error);
        }
    });

    pImageRemove.addEventListener("click", function () {
        projectDraft.image = "";
        updateDraftImagePreview();
        pImageChoose.focus();
    });

    projectForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!projectDraft) return;

        const title = pTitle.value.trim();
        const link = parseUserUrl(pLink.value);
        let valid = true;

        setFieldError(pTitle, pTitleError, title ? "" : "Please give your project a title.");
        setFieldError(pLink, pLinkError, link.ok ? "" : link.error);

        if (!title) { pTitle.focus(); valid = false; }
        else if (!link.ok) { pLink.focus(); valid = false; }
        if (!valid) return;

        const data = {
            id: projectDraft.id,
            title: title.slice(0, 100),
            description: pDescription.value.trim().slice(0, 600),
            link: link.value,
            image: projectDraft.image,
            fit: projectDraft.fit === "contain" ? "contain" : "cover",
            tech: pTech.value.trim().slice(0, 200),
            process: pProcess.value.trim().slice(0, 1500),
            results: pResults.value.trim().slice(0, 800)
        };

        if (projectDraft.isNew) {
            state.projects.push(data);
            toast("Project added.", "success");
        } else {
            const index = state.projects.findIndex(function (p) { return p.id === data.id; });
            if (index !== -1) state.projects[index] = data;
        }

        pendingFocus = { action: "project-edit", id: data.id, key: null, type: null, section: null, fit: null, elementId: null };
        projectDraft = null;
        changed();
        render();
        dialogs.project.close();
    });

    // Cancel / Escape / backdrop: nothing is created or changed
    dialogs.project.addEventListener("close", function () { projectDraft = null; });


    // ----------------------------------------
    // SECTION ENTRY DIALOG
    // ----------------------------------------

    const entryForm = document.getElementById("entry-form");
    const entryModalLabel = document.getElementById("entry-modal-label");
    const entryModalTitle = document.getElementById("entry-modal-title");
    const eTitleLabel = document.getElementById("entry-title-label");
    const eTitle = document.getElementById("entry-title-input");
    const eMetaField = document.getElementById("entry-meta-field");
    const eMetaLabel = document.getElementById("entry-meta-label");
    const eMeta = document.getElementById("entry-meta-input");
    const eDescriptionLabel = document.getElementById("entry-description-label");
    const eDescription = document.getElementById("entry-description-input");
    const eDescriptionHelp = document.getElementById("entry-description-help");
    const eError = document.getElementById("entry-error");

    let entryContext = null; // { type, sectionId, id|null }

    function findCustom(sectionId) {
        return state.sections.custom.find(function (c) { return c.id === sectionId; });
    }

    function entryList(type, sectionId) {
        if (type === "custom") {
            const section = findCustom(sectionId);
            return section ? section.entries : null;
        }
        return state.sections[type] || null;
    }

    function openEntryDialog(type, sectionId, entryId, opener) {
        const cfg = type === "custom" ? CUSTOM_TYPE : SECTION_TYPES[type];
        const list = entryList(type, sectionId);
        if (!cfg || !list) return;

        const entry = entryId ? list.find(function (e) { return e.id === entryId; }) : null;
        entryContext = { type: type, sectionId: sectionId || null, id: entry ? entry.id : null };

        const sectionName = type === "custom" ? findCustom(sectionId).name : cfg.label;
        entryModalLabel.textContent = sectionName.toUpperCase();
        entryModalTitle.textContent = (entry ? "Edit " : "Add ") + (type === "skills" ? "skill group" : "entry");

        eTitleLabel.textContent = cfg.titleLabel;
        eTitle.placeholder = cfg.titlePlaceholder || "";
        eTitle.value = entry ? entry.title : "";

        eMetaField.hidden = !cfg.metaLabel;
        if (cfg.metaLabel) {
            eMetaLabel.innerHTML = esc(cfg.metaLabel) + ' <span class="optional">(optional)</span>';
            eMeta.placeholder = cfg.metaPlaceholder || "";
        }
        eMeta.value = entry ? entry.meta : "";

        eDescriptionLabel.textContent = cfg.descriptionLabel || "Description";
        eDescription.placeholder = cfg.descriptionPlaceholder || "";
        eDescriptionHelp.textContent = cfg.descriptionHelp || "Press Enter for a new line.";
        eDescription.value = entry ? entry.description : "";

        setFieldError(eTitle, eError, "");
        openDialog(dialogs.entry, opener, eTitle);
    }

    entryForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!entryContext) return;

        const list = entryList(entryContext.type, entryContext.sectionId);
        if (!list) { dialogs.entry.close(); return; }

        const data = {
            id: entryContext.id || uid(),
            title: eTitle.value.trim().slice(0, 120),
            meta: eMetaField.hidden ? "" : eMeta.value.trim().slice(0, 120),
            description: eDescription.value.trim().slice(0, 1000)
        };

        if (entryContext.type === "skills" && (!data.title || !data.description)) {
            setFieldError(data.title ? eDescription : eTitle, eError, "Please add a group name and at least one skill.");
            (data.title ? eDescription : eTitle).focus();
            return;
        }

        if (!data.title && !data.description) {
            setFieldError(eTitle, eError, "Please add a title or a description.");
            eTitle.focus();
            return;
        }

        const index = list.findIndex(function (e) { return e.id === data.id; });
        if (index === -1) list.push(data);
        else list[index] = data;

        pendingFocus = { action: "entry-edit", id: data.id, type: entryContext.type, section: entryContext.sectionId, key: null, fit: null, elementId: null };
        entryContext = null;
        changed();
        render();
        dialogs.entry.close();
    });

    dialogs.entry.addEventListener("close", function () { entryContext = null; });


    // ----------------------------------------
    // PUBLISH GUIDE
    // ----------------------------------------

    const guideExportNote = document.getElementById("guide-export-note");

    function openGuide(afterExport, opener) {
        guideExportNote.hidden = !afterExport;
        document.getElementById("guide-saved-text").hidden = afterExport !== "saved";
        document.getElementById("guide-downloaded-text").hidden = afterExport === "saved";
        document.getElementById("guide-modal-title").textContent = afterExport
            ? "Exported! Now put it online"
            : "Put your portfolio online";
        openDialog(dialogs.guide, opener || document.getElementById("export-button"));
    }


    // ========================================
    // IMAGES: validation + compression
    // ========================================

    const photoInput = document.getElementById("photo-input");
    const projectImageInput = document.getElementById("project-image-input");
    let imageTarget = null; // { kind: "card", id }

    function UserError(message) { this.message = message; }

    function loadImageFromFile(file) {
        return new Promise(function (resolve, reject) {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = function () { URL.revokeObjectURL(url); reject(new UserError("This image could not be opened. Please try a different JPG or PNG file.")); };
            img.src = url;
        });
    }

    function canvasHasTransparency(ctx, width, height) {
        try {
            const data = ctx.getImageData(0, 0, width, height).data;
            const step = Math.max(4, Math.floor(data.length / 4 / 40000) * 4); // sample up to ~40k pixels
            for (let i = 3; i < data.length; i += step) {
                if (data[i] < 250) return true;
            }
        } catch (e) { /* ignore */ }
        return false;
    }

    // Resize so the longest side is at most maxSize, then compress.
    // keepTransparency: PNG/WebP logos keep their transparent background when possible.
    async function processImage(file, maxSize, quality, keepTransparency) {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (!file || !allowed.includes(file.type)) {
            throw new UserError("Please choose a JPG, PNG or WebP image.");
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            throw new UserError("This image is larger than 10 MB. Please choose a smaller image.");
        }

        const img = await loadImageFromFile(file);
        const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvasEl = document.createElement("canvas");
        canvasEl.width = width;
        canvasEl.height = height;
        const ctx = canvasEl.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        if (keepTransparency && file.type !== "image/jpeg" && canvasHasTransparency(ctx, width, height)) {
            const webp = canvasEl.toDataURL("image/webp", 0.86);
            if (webp.startsWith("data:image/webp") && webp.length < 900000) return webp;

            const png = canvasEl.toDataURL("image/png");
            if (png.length < 900000) return png;
            // Too large as PNG: fall through to JPEG on a white background
        }

        // Flatten onto white (JPEG has no transparency)
        const flat = document.createElement("canvas");
        flat.width = width;
        flat.height = height;
        const flatCtx = flat.getContext("2d");
        flatCtx.fillStyle = "#ffffff";
        flatCtx.fillRect(0, 0, width, height);
        flatCtx.drawImage(canvasEl, 0, 0);
        return flat.toDataURL("image/jpeg", quality);
    }

    function handleImageError(error) {
        toast(error instanceof UserError ? error.message : "The image could not be processed. Please try another file.", "error", 5000);
        if (!(error instanceof UserError)) console.error(error);
    }

    photoInput.addEventListener("change", async function () {
        const file = photoInput.files[0];
        photoInput.value = "";
        if (!file) return;

        try {
            state.photo = { src: await processImage(file, 800, 0.82, false), x: 50, y: 50, zoom: 1 };
            changed();
            render({ action: "photo-choose", id: null, key: null, type: null, section: null, fit: null, elementId: null });
            toast("Photo added. Drag it or use the sliders to adjust.", "success");
        } catch (error) {
            handleImageError(error);
        }
    });

    projectImageInput.addEventListener("change", async function () {
        const file = projectImageInput.files[0];
        const target = imageTarget;
        projectImageInput.value = "";
        imageTarget = null;
        if (!file || !target) return;

        try {
            const data = await processImage(file, 1200, 0.8, true);

            if (target.kind === "card") {
                const project = state.projects.find(function (p) { return p.id === target.id; });
                if (!project) return;
                project.image = data;
                changed();
                render({ action: "project-image", id: project.id, key: null, type: null, section: null, fit: null, elementId: null });
            }
        } catch (error) {
            handleImageError(error);
        }
    });


    // ========================================
    // PROFILE PHOTO POSITIONING (sliders + drag)
    // Uses object-position + scale(); the export uses the same CSS,
    // so the crop looks identical everywhere.
    // ========================================

    function applyPhotoStyle() {
        const img = canvas.querySelector("#ed-photo-frame img");
        if (img) img.setAttribute("style", photoStyle(state.photo));
        canvas.querySelectorAll("[data-photo]").forEach(function (slider) {
            slider.value = state.photo[slider.dataset.photo];
        });
    }

    canvas.addEventListener("input", function (event) {
        const slider = event.target.closest("[data-photo]");
        if (!slider) return;
        const key = slider.dataset.photo;
        state.photo[key] = key === "zoom"
            ? clampNumber(slider.value, 1, 3, 1)
            : clampNumber(slider.value, 0, 100, 50);
        applyPhotoStyle();
        changed();
    });

    let photoDrag = null;

    canvas.addEventListener("pointerdown", function (event) {
        const frame = event.target.closest("#ed-photo-frame");
        if (!frame || !state.photo.src) return;
        event.preventDefault();
        frame.setPointerCapture(event.pointerId);
        const rect = frame.getBoundingClientRect();
        photoDrag = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            x: state.photo.x,
            y: state.photo.y,
            width: rect.width,
            height: rect.height
        };
    });

    canvas.addEventListener("pointermove", function (event) {
        if (!photoDrag || event.pointerId !== photoDrag.pointerId) return;
        const factor = 100 / state.photo.zoom;
        const dx = (event.clientX - photoDrag.startX) / photoDrag.width * factor;
        const dy = (event.clientY - photoDrag.startY) / photoDrag.height * factor;
        // Dragging right reveals more of the left side of the image
        state.photo.x = clampNumber(photoDrag.x - dx, 0, 100, 50);
        state.photo.y = clampNumber(photoDrag.y - dy, 0, 100, 50);
        applyPhotoStyle();
    });

    function endPhotoDrag(event) {
        if (!photoDrag || event.pointerId !== photoDrag.pointerId) return;
        photoDrag = null;
        changed();
    }

    canvas.addEventListener("pointerup", endPhotoDrag);
    canvas.addEventListener("pointercancel", endPhotoDrag);


    // ========================================
    // PROJECT REORDERING (drag handle + up/down buttons)
    // ========================================

    function moveProject(id, newIndex) {
        const from = state.projects.findIndex(function (p) { return p.id === id; });
        if (from === -1) return false;
        newIndex = Math.max(0, Math.min(state.projects.length - 1, newIndex));
        if (newIndex === from) return false;
        const item = state.projects.splice(from, 1)[0];
        state.projects.splice(newIndex, 0, item);
        changed();
        return true;
    }

    let dragProjectId = null;

    canvas.addEventListener("dragstart", function (event) {
        const handle = event.target.closest && event.target.closest(".ed-handle");
        if (!handle) { event.preventDefault(); return; }
        dragProjectId = handle.dataset.id;
        const card = handle.closest(".pf-project");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", dragProjectId);
        if (card && event.dataTransfer.setDragImage) event.dataTransfer.setDragImage(card, 30, 30);
        setTimeout(function () { if (card) card.classList.add("ed-dragging"); }, 0);
    });

    canvas.addEventListener("dragover", function (event) {
        if (!dragProjectId) return;
        const card = event.target.closest(".pf-project");
        if (!card) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        canvas.querySelectorAll(".ed-drop-target").forEach(function (c) { if (c !== card) c.classList.remove("ed-drop-target"); });
        if (card.dataset.id !== dragProjectId) card.classList.add("ed-drop-target");
    });

    canvas.addEventListener("drop", function (event) {
        if (!dragProjectId) return;
        const card = event.target.closest(".pf-project");
        event.preventDefault();
        if (card && card.dataset.id !== dragProjectId) {
            const target = state.projects.findIndex(function (p) { return p.id === card.dataset.id; });
            if (moveProject(dragProjectId, target)) {
                const id = dragProjectId;
                dragProjectId = null;
                render({ action: "project-edit", id: id, key: null, type: null, section: null, fit: null, elementId: null });
                toast("Project order updated.");
                return;
            }
        }
        dragProjectId = null;
        render();
    });

    canvas.addEventListener("dragend", function () {
        if (dragProjectId) {
            dragProjectId = null;
            render();
        }
    });


    // ========================================
    // CLICK ACTIONS IN THE EDITOR (event delegation)
    // ========================================

    canvas.addEventListener("click", function (event) {
        const control = event.target.closest("[data-action]");
        if (!control || !canvas.contains(control)) return;

        const action = control.dataset.action;
        const id = control.dataset.id;
        const project = id ? state.projects.find(function (p) { return p.id === id; }) : null;

        switch (action) {
            case "edit-name": openFieldDialog("name", control); break;
            case "edit-title": openFieldDialog("title", control); break;
            case "edit-about": openFieldDialog("about", control); break;
            case "edit-link": openFieldDialog(control.dataset.key, control); break;

            case "remove-link": {
                const key = control.dataset.key;
                if (!LINK_TYPES[key]) break;
                if (!window.confirm("Remove your " + LINK_TYPES[key].label + " link?")) break;
                state.links[key] = "";
                changed();
                render({ action: "edit-link", key: key, id: null, type: null, section: null, fit: null, elementId: null });
                break;
            }

            case "photo-choose": photoInput.click(); break;

            case "photo-reset":
                state.photo.x = 50; state.photo.y = 50; state.photo.zoom = 1;
                applyPhotoStyle();
                changed();
                break;

            case "photo-remove":
                if (!window.confirm("Remove your profile photo?")) break;
                state.photo = { src: "", x: 50, y: 50, zoom: 1 };
                changed();
                render({ action: "photo-choose", id: null, key: null, type: null, section: null, fit: null, elementId: null });
                break;

            case "project-add": openProjectDialog(null, control); break;
            case "project-edit": if (project) openProjectDialog(project, control); break;

            case "project-remove":
                if (!project) break;
                if (!window.confirm("Remove the project \"" + (project.title || "Untitled") + "\"? This cannot be undone.")) break;
                state.projects = state.projects.filter(function (p) { return p.id !== id; });
                changed();
                render({ action: "project-add", id: null, key: null, type: null, section: null, fit: null, elementId: null });
                toast("Project removed.");
                break;

            case "project-up":
            case "project-down": {
                const index = state.projects.findIndex(function (p) { return p.id === id; });
                if (moveProject(id, index + (action === "project-up" ? -1 : 1))) {
                    render(describeControl(control));
                    // If we hit the end the button is disabled; focus its partner
                    if (document.activeElement === document.body || document.activeElement === canvas) {
                        focusControl({ action: action === "project-up" ? "project-down" : "project-up", id: id, key: null, type: null, section: null, fit: null, elementId: null });
                    }
                }
                break;
            }

            case "project-image":
                if (!project) break;
                imageTarget = { kind: "card", id: project.id };
                projectImageInput.click();
                break;

            case "project-fit":
                if (!project) break;
                project.fit = control.dataset.fit === "contain" ? "contain" : "cover";
                changed();
                render(describeControl(control));
                break;

            case "entry-add": openEntryDialog(control.dataset.type, control.dataset.section, null, control); break;
            case "entry-edit": openEntryDialog(control.dataset.type, control.dataset.section, id, control); break;

            case "entry-remove": {
                const list = entryList(control.dataset.type, control.dataset.section);
                if (!list) break;
                const index = list.findIndex(function (e) { return e.id === id; });
                if (index === -1) break;
                if (!window.confirm("Remove \"" + (list[index].title || "this entry") + "\"?")) break;
                list.splice(index, 1);
                changed();
                render({ action: "entry-add", type: control.dataset.type, section: control.dataset.section || null, id: null, key: null, fit: null, elementId: null });
                break;
            }

            case "custom-add": openFieldDialog("customName", control); break;

            case "custom-quick": {
                const nameQ = String(control.dataset.name || "").slice(0, 60);
                if (!nameQ) break;
                const sectionQ = { id: uid(), name: nameQ, entries: [] };
                state.sections.custom.push(sectionQ);
                changed();
                render({ action: "entry-add", type: "custom", section: sectionQ.id, id: null, key: null, fit: null, elementId: null });
                break;
            }

            case "subtitle-add": openFieldDialog("subtitle", control, { index: null }); break;
            case "subtitle-edit": openFieldDialog("subtitle", control, { index: Number(control.dataset.key) }); break;
            case "subtitle-remove": {
                const idx = Number(control.dataset.key);
                if (!(idx >= 0 && idx < state.subtitles.length)) break;
                if (!window.confirm("Remove the line \"" + state.subtitles[idx] + "\"?")) break;
                state.subtitles.splice(idx, 1);
                changed();
                render({ action: "subtitle-add", id: null, key: null, type: null, section: null, fit: null, elementId: null });
                break;
            }

            case "name-size": {
                const size = control.dataset.size;
                if (["auto", "large", "medium", "small"].indexOf(size) === -1) break;
                state.nameSize = size;
                changed();
                render(describeControl(control));
                break;
            }

            case "custom-rename": {
                const section = findCustom(control.dataset.section);
                if (section) openFieldDialog("customName", control, { sectionId: section.id, currentName: section.name });
                break;
            }

            case "custom-remove": {
                const section = findCustom(control.dataset.section);
                if (!section) break;
                if (!window.confirm("Remove the whole \"" + section.name + "\" section and its entries?")) break;
                state.sections.custom = state.sections.custom.filter(function (c) { return c.id !== section.id; });
                changed();
                render({ action: "custom-add", id: null, key: null, type: null, section: null, fit: null, elementId: null });
                break;
            }
        }
    });


    // ========================================
    // THEME PICKER (radio group with arrow-key support)
    // ========================================

    const themeButtons = Array.from(document.querySelectorAll(".theme-option"));

    function updateThemePicker() {
        themeButtons.forEach(function (button) {
            const active = button.dataset.theme === state.theme;
            button.setAttribute("aria-checked", String(active));
            button.tabIndex = active ? 0 : -1;
        });
    }

    function selectTheme(theme, focus) {
        if (!THEMES.includes(theme)) return;
        if (state.theme !== theme) {
            state.theme = theme;
            changed();
            render();
            toast("Design changed to " + THEME_NAMES[theme] + ".");
        }
        if (focus) {
            const button = themeButtons.find(function (b) { return b.dataset.theme === theme; });
            if (button) button.focus();
        }
    }

    themeButtons.forEach(function (button, index) {
        button.addEventListener("click", function () { selectTheme(button.dataset.theme, false); });
        button.addEventListener("keydown", function (event) {
            let next = null;
            if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % themeButtons.length;
            if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + themeButtons.length) % themeButtons.length;
            if (next !== null) {
                event.preventDefault();
                selectTheme(themeButtons[next].dataset.theme, true);
            }
        });
    });


    // ========================================
    // COMPLETENESS INDICATOR
    // ========================================

    const progressText = document.getElementById("progress-text");
    const progressFill = document.getElementById("progress-fill");
    const progressList = document.getElementById("progress-list");

    function updateProgress() {
        const checks = [
            ["Name", state.name.trim() !== "" && state.name.trim() !== DEFAULT.name],
            ["Professional title", state.title.trim() !== "" && state.title.trim() !== DEFAULT.title],
            ["About Me", !isDefaultAbout(state.about)],
            ["Profile photo", Boolean(state.photo.src)],
            ["A professional link", Boolean(state.links.resume || state.links.linkedin || state.links.github || state.links.email)],
            ["A customized project", state.projects.some(function (p) {
                return !isPlaceholderProject(p) && !DEFAULT_PROJECT_TITLES.includes(p.title.trim());
            })]
        ];

        const done = checks.filter(function (c) { return c[1]; }).length;
        progressText.textContent = done + " of " + checks.length + " complete" + (done === checks.length ? " 🎉" : "");
        progressFill.style.width = (done / checks.length * 100) + "%";
        progressList.innerHTML = checks.map(function (c) {
            return '<li class="' + (c[1] ? "done" : "") + '">' + esc(c[0]) +
                '<span class="visually-hidden">' + (c[1] ? " (done)" : " (to do)") + "</span></li>";
        }).join("");
    }


    // ========================================
    // PREVIEW (renders the exact exported file)
    // ========================================

    const previewLayer = document.getElementById("preview-layer");
    const previewFrame = document.getElementById("preview-frame");
    const previewStage = document.getElementById("preview-stage");
    const previewBack = document.getElementById("preview-back");
    const deviceButtons = previewLayer.querySelectorAll("[data-device]");
    const pageRegions = [
        document.querySelector(".creator-toolbar"),
        document.querySelector(".settings-bar"),
        document.querySelector(".editor-frame")
    ];

    function setDevice(device) {
        previewStage.classList.toggle("is-mobile", device === "mobile");
        deviceButtons.forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.dataset.device === device));
        });
    }

    // The preview is loaded from a blob: URL (not srcdoc) so in-page links
    // like "#pf-projects" scroll inside the preview exactly like the export.
    let previewUrl = null;

    function openPreview() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
        const html = buildExportHTML(state);

        if (window.location.protocol === "file:") {
            // Opened from disk: blob links can't jump to "#sections" here, so use srcdoc
            // with <base href="about:srcdoc"> (preview only; the export is unchanged).
            previewFrame.removeAttribute("src");
            previewFrame.srcdoc = html
                .replace(" base-uri 'none';", "")
                .replace("<head>\n", '<head>\n<base href="about:srcdoc">\n');
        } else {
            previewFrame.removeAttribute("srcdoc");
            previewUrl = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
            previewFrame.src = previewUrl;
        }
        previewLayer.hidden = false;
        document.body.style.overflow = "hidden";
        pageRegions.forEach(function (r) { if (r) r.inert = true; });
        previewBack.focus();
    }

    // Fallback for pages opened from disk (file://), where browsers block
    // in-page "#section" jumps inside the preview frame: scroll it ourselves.
    previewFrame.addEventListener("load", function () {
        let doc = null;
        try { doc = previewFrame.contentDocument; } catch (e) { doc = null; }
        if (!doc) return;
        doc.addEventListener("click", function (event) {
            const link = event.target.closest && event.target.closest('a[href^="#"]');
            if (!link) return;
            const id = link.getAttribute("href").slice(1);
            const target = id ? doc.getElementById(id) : null;
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    function closePreview() {
        previewLayer.hidden = true;
        document.body.style.overflow = "";
        pageRegions.forEach(function (r) { if (r) r.inert = false; });
        previewFrame.removeAttribute("srcdoc");
        previewFrame.src = "about:blank";
        if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
        document.getElementById("preview-button").focus();
    }

    document.getElementById("preview-button").addEventListener("click", openPreview);
    previewBack.addEventListener("click", closePreview);
    document.getElementById("preview-export").addEventListener("click", exportPortfolio);
    deviceButtons.forEach(function (b) {
        b.addEventListener("click", function () { setDevice(b.dataset.device); });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !previewLayer.hidden && !document.querySelector("dialog[open]")) {
            closePreview();
        }
    });


    // ========================================
    // SETTINGS-ROW POPOVERS (checklist, storage note, Draft menu)
    // Built on <details>; closes on outside click, Escape, or after a menu choice.
    // ========================================

    const popovers = Array.from(document.querySelectorAll(".settings-pop"));

    popovers.forEach(function (pop) {
        pop.addEventListener("toggle", function () {
            if (pop.open) {
                popovers.forEach(function (other) { if (other !== pop) other.open = false; });
            }
        });
        pop.querySelectorAll(".menu-item").forEach(function (item) {
            item.addEventListener("click", function () { pop.open = false; });
        });
    });

    document.addEventListener("click", function (event) {
        popovers.forEach(function (pop) {
            if (pop.open && !pop.contains(event.target)) pop.open = false;
        });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        popovers.forEach(function (pop) {
            if (pop.open) {
                pop.open = false;
                pop.querySelector("summary").focus();
            }
        });
    });

    // ========================================
    // EDITING TIP (can be hidden; the choice is remembered in this browser)
    // ========================================

    const TIP_KEY = "portfolioCreatorHideTip";
    const editorHint = document.getElementById("editor-hint");
    const tipsButton = document.getElementById("tips-button");

    function setTipHidden(hidden) {
        editorHint.hidden = hidden;
        tipsButton.hidden = !hidden;
        try {
            if (hidden) localStorage.setItem(TIP_KEY, "1");
            else localStorage.removeItem(TIP_KEY);
        } catch (e) { /* storage blocked: just hide for this visit */ }
    }

    try {
        if (localStorage.getItem(TIP_KEY) === "1") {
            editorHint.hidden = true;
            tipsButton.hidden = false;
        }
    } catch (e) { /* ignore */ }

    document.getElementById("hint-close").addEventListener("click", function () {
        setTipHidden(true);
        document.getElementById("draft-menu-button").focus();
    });

    tipsButton.addEventListener("click", function () {
        setTipHidden(false);
        document.getElementById("hint-close").focus();
    });

    // ========================================
    // TOOLBAR & DRAFT TOOLS
    // ========================================

    document.getElementById("save-portfolio-button").addEventListener("click", function () {
        persist(true);
    });

    document.getElementById("export-button").addEventListener("click", exportPortfolio);

    document.getElementById("guide-button").addEventListener("click", function () {
        openGuide(false, document.getElementById("draft-menu-button"));
    });

    document.getElementById("reset-button").addEventListener("click", function () {
        const ok = window.confirm(
            "Reset your portfolio?\n\nThis deletes ALL your text, links, photos, projects and sections in this browser " +
            "and restores the default template and design. This cannot be undone.\n\n" +
            "Tip: click Cancel and use \"Download backup\" first if you might want it later."
        );
        if (!ok) return;
        state = defaultState();
        setTipHidden(false);
        render();
        persist(false);
        toast("Portfolio reset to the default template.", "success");
    });

    document.getElementById("backup-button").addEventListener("click", function () {
        const date = new Date().toISOString().slice(0, 10);
        downloadFile(JSON.stringify(state), "portfolio-backup-" + date + ".json", "application/json");
        toast("Backup downloaded. Keep it somewhere safe.", "success");
    });

    const restoreInput = document.getElementById("restore-input");

    document.getElementById("restore-button").addEventListener("click", function () {
        restoreInput.click();
    });

    restoreInput.addEventListener("change", function () {
        const file = restoreInput.files[0];
        restoreInput.value = "";
        if (!file) return;

        if (file.size > 25 * 1024 * 1024) {
            toast("This file is too large to be a portfolio backup.", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            let data;
            try {
                data = JSON.parse(String(reader.result));
            } catch (error) {
                toast("This file is not a valid portfolio backup.", "error");
                return;
            }
            if (!data || typeof data !== "object" || (!data.name && !data.projects)) {
                toast("This file is not a valid portfolio backup.", "error");
                return;
            }
            if (!window.confirm("Replace your current draft with this backup?")) return;
            state = normalizeState(data);
            render();
            persist(true);
        };
        reader.onerror = function () { toast("The backup file could not be read.", "error"); };
        reader.readAsText(file);
    });


    // ========================================
    // START
    // ========================================

    const loaded = loadState();
    state = loaded.state;

    // Theme chosen on the homepage (creator.html?theme=editorial)
    try {
        const params = new URLSearchParams(window.location.search);
        const theme = params.get("theme");
        if (theme && THEMES.includes(theme)) {
            if (state.theme !== theme) {
                state.theme = theme;
                hasUnsavedChanges = true;
            }
            history.replaceState(null, "", window.location.pathname);
        }
    } catch (e) { /* ignore */ }

    render();

    if (loaded.failed) {
        setStatus("error", "Your saved draft could not be loaded. Starting a new one.");
    } else if (hasUnsavedChanges) {
        persist(false);
    } else if (loaded.loaded) {
        setStatus("saved", "Draft loaded · changes save automatically");
    } else {
        setStatus("saved", "Changes save automatically in this browser");
    }

    // Small hook for automated testing (no effect for students)
    window.__portfolioCreator = {
        getState: function () { return JSON.parse(JSON.stringify(state)); },
        buildExportHTML: function () { return buildExportHTML(state); },
        parseUserUrl: parseUserUrl
    };

})();

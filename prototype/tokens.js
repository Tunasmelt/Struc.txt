/* NoteFlow design tokens — single source of truth.
   Extracted verbatim from docs/noteflow-board-prototype.html (:root + THEMES + TEMPLATES).
   Loaded as a classic script so window.NF_TOKENS and the :root custom properties
   exist before any component renders. Never hardcode a hex or font name downstream —
   reference var(--token) in styles, or NF_TOKENS.* in logic. */
(function () {
  /* ---------- base palette (prototype :root) ---------- */
  var BASE = {
    chrome:     "#12100E",
    chrome2:    "#1B1815",
    chromeLine: "#302B26",
    felt:       "#243029",
    felt2:      "#1C251F",
    chalk:      "#EDE9E1",
    chalkDim:   "#9A948A",
    brass:      "#C9A227",
    ink:        "#211E19",
    ink2:       "#5B554C"
  };

  /* Literals the prototype used inline; named here so they exist once only. */
  var EXTRA = {
    muted:       "#6E675E",
    railFg:      "#B8B2A8",
    hover:       "#262119",
    hoverBtn:    "#252119",
    borderHover: "#4A4238",
    brassHi:     "#DFB531",
    brassInk:    "#171408",
    chipFg:      "#C4CCC5",
    boardLbl:    "#7C8A80",
    well:        "#100E0C",
    rule:        "#201C18",
    line2:       "#211D19",
    dim2:        "#5F594F",
    railDot:     "#7C7468",
    drawerFg:    "#DAD5CB",
    danger:      "#B4432F",
    dangerBg:    "#3A2119",
    dangerFg:    "#E39485"
  };

  /* ---------- board themes (cosmetic surface only) ---------- */
  var THEMES = {
    felt:  { label: "Felt board", felt: "#243029", felt2: "#1C251F", brass: "#C9A227" },
    cork:  { label: "Corkboard",  felt: "#8B6B4A", felt2: "#6E5238", brass: "#BE6A3A" },
    slate: { label: "Slate",      felt: "#232C36", felt2: "#1A2129", brass: "#6FA8C9" },
    chalk: { label: "Chalkboard", felt: "#191919", felt2: "#111111", brass: "#8FBF7F" }
  };

  /* ---------- template stock/pin colours (fixed across themes) ---------- */
  var TEMPLATES = {
    meeting:   { name: "Meeting minutes", stock: "#E6D6AC", pin: "#C08A2E" },
    soap:      { name: "SOAP note",       stock: "#D5E4DA", pin: "#3F7F63" },
    oneonone:  { name: "1:1 notes",       stock: "#D2DEEC", pin: "#3A6699" },
    journal:   { name: "Journal entry",   stock: "#EFD8D3", pin: "#B0574F" },
    lecture:   { name: "Lecture notes",   stock: "#E6E3DB", pin: "#69675E" },
    interview: { name: "Interview notes", stock: "#DFDAEC", pin: "#67589F" },
    fieldlog:  { name: "Field log",       stock: "#DCE6E7", pin: "#3B7C86", custom: true }
  };

  /* ---------- type ---------- */
  var TYPE = {
    display: '"Bricolage Grotesque",sans-serif',
    mono:    '"IBM Plex Mono",monospace',
    body:    '"Public Sans",system-ui,sans-serif',
    weight:  { medium: 500, semi: 600, bold: 700, black: 800 },
    size: {
      mark: "19px", drawerTitle: "22px", modalTitle: "19px", noteTitle: "16.5px",
      body: "15px", drawerBody: "14px", control: "13px", railItem: "13.5px",
      todo: "13px", fieldValue: "12.8px", prose: "13px", check: "12.6px",
      outline: "12.6px", person: "11px", chip: "11px", raw: "12.5px",
      toast: "12.5px", meta: "9.5px", railLabel: "10px", menuLabel: "9.5px",
      hint: "11px", modalHint: "10.5px", eyebrow: "10px"
    },
    tracking: {
      tight: "-.03em", title: "-.02em", drawer: "-.025em",
      meta: ".12em", field: ".11em", label: ".15em", eyebrow: ".14em",
      menu: ".13em", chip: ".05em", raw: ".1em", seg: ".07em", loose: ".06em"
    },
    lineHeight: { note: 1.2, field: 1.42, check: 1.35, outline: 1.5, todo: 1.4, drawer: 1.55, raw: 1.7 }
  };

  /* ---------- spacing / radii / shadows / motion ---------- */
  var SPACE = {
    railW: "236px", topbarH: "60px", drawerW: "min(440px,100%)", modalW: "min(620px,100%)",
    notePadding: "22px 16px 14px", noteW: 262, noteWMin: 200, noteWMax: 380,
    boardPad: "4px 20px 80px", boardMinH: "1200px", boardMinW: "1180px",
    railPad: "16px 12px", topbarPad: "0 18px", gridSnap: 20,
    arrangeGap: 22, arrangeRowH: 300, stackAnchor: { x: 420, y: 140 }, stackStep: 3
  };

  var RADII = { base: "2px", note: "1px", pill: "99px", round: "50%", pinR: "11px" };

  var SHADOWS = {
    note:     "0 1px 1px rgba(0,0,0,.28), 0 10px 18px -8px rgba(0,0,0,.55)",
    noteHover:"0 2px 2px rgba(0,0,0,.24), 0 22px 34px -12px rgba(0,0,0,.6)",
    noteDrag: "0 30px 50px -14px rgba(0,0,0,.7)",
    pin:      "0 2px 3px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.18)",
    menu:     "0 18px 34px -12px rgba(0,0,0,.6)",
    ctxmenu:  "0 20px 40px -12px rgba(0,0,0,.65)",
    drawer:   "-30px 0 60px -20px rgba(0,0,0,.7)",
    toast:    "0 18px 40px -12px rgba(0,0,0,.6)"
  };

  var TRANSITIONS = {
    note:    "transform .18s cubic-bezier(.2,.8,.3,1), box-shadow .18s, width .18s, padding .18s",
    stacked: "transform .32s cubic-bezier(.2,.8,.3,1), left .32s, top .32s, box-shadow .18s",
    drawer:  "transform .26s cubic-bezier(.2,.8,.3,1)",
    toast:   "transform .28s cubic-bezier(.2,.8,.3,1)",
    btn:     "background .15s,border-color .15s",
    surface: "background .3s",
    fade:    "opacity .15s",
    collapse:"transform .15s,opacity .15s"
  };

  /* ---------- ink washes used on the paper stock ---------- */
  var PAPER = {
    sheen:      "linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,0) 70px)",
    rule:       "rgba(0,0,0,.13)",
    footerRule: "rgba(0,0,0,.18)",
    tagBg:      "rgba(0,0,0,.07)",
    tagLine:    "rgba(0,0,0,.28)",
    personBg:   "rgba(0,0,0,.09)",
    personLine: "rgba(0,0,0,.13)",
    checkLine:  "rgba(0,0,0,.42)",
    btnHover:   "rgba(0,0,0,.08)",
    handle:     "rgba(0,0,0,.45)"
  };

  /* ---------- :root injection ---------- */
  var VARS = {
    "--chrome": BASE.chrome, "--chrome-2": BASE.chrome2, "--chrome-line": BASE.chromeLine,
    "--felt": BASE.felt, "--felt-2": BASE.felt2,
    "--chalk": BASE.chalk, "--chalk-dim": BASE.chalkDim,
    "--brass": BASE.brass, "--ink": BASE.ink, "--ink-2": BASE.ink2,
    "--radius": RADII.base, "--pin-r": RADII.pinR,
    "--muted": EXTRA.muted, "--rail-fg": EXTRA.railFg, "--hover": EXTRA.hover,
    "--hover-btn": EXTRA.hoverBtn, "--border-hover": EXTRA.borderHover,
    "--brass-hi": EXTRA.brassHi, "--brass-ink": EXTRA.brassInk,
    "--chip-fg": EXTRA.chipFg, "--board-lbl": EXTRA.boardLbl,
    "--well": EXTRA.well, "--rule": EXTRA.rule, "--line-2": EXTRA.line2,
    "--dim-2": EXTRA.dim2, "--rail-dot": EXTRA.railDot, "--drawer-fg": EXTRA.drawerFg,
    "--danger": EXTRA.danger, "--danger-bg": EXTRA.dangerBg, "--danger-fg": EXTRA.dangerFg,
    "--font-display": TYPE.display, "--font-mono": TYPE.mono, "--font-body": TYPE.body,
    "--paper-sheen": PAPER.sheen,
    "--shadow-note": SHADOWS.note, "--shadow-note-hover": SHADOWS.noteHover,
    "--shadow-note-drag": SHADOWS.noteDrag, "--shadow-pin": SHADOWS.pin,
    "--shadow-menu": SHADOWS.menu, "--shadow-ctx": SHADOWS.ctxmenu,
    "--shadow-drawer": SHADOWS.drawer, "--shadow-toast": SHADOWS.toast,
    "--t-note": TRANSITIONS.note, "--t-stacked": TRANSITIONS.stacked,
    "--t-drawer": TRANSITIONS.drawer, "--t-toast": TRANSITIONS.toast,
    "--t-btn": TRANSITIONS.btn, "--t-surface": TRANSITIONS.surface, "--t-fade": TRANSITIONS.fade
  };

  function injectRoot() {
    var css = ":root{";
    for (var k in VARS) css += k + ":" + VARS[k] + ";";
    css += "}";
    var el = document.getElementById("nf-tokens");
    if (!el) {
      el = document.createElement("style");
      el.id = "nf-tokens";
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
  }

  /* ---------- display modes ----------
     The board is the modern flat treatment in both appearances.
     'light' and 'dark' override the same token names; template stock/pin
     colours are untouched in both, per spec 4.5.
     The prototype's corkboard values stay in BASE/THEMES above so the
     validated design is still recoverable, but no longer ships as a mode. */
  var MODES = {
    light: {
      "--chrome": "#FAFAFA",
      "--chrome-2": "#FFFFFF",
      "--chrome-line": "#E7E5E4",
      "--felt": "#F4F4F5",
      "--felt-2": "#EFEFF1",
      "--chalk": "#1C1917",
      "--chalk-dim": "#78716C",
      "--brass": "#B08A1E",
      "--brass-hi": "#C9A227",
      "--brass-ink": "#171408",
      "--brass-text": "#7A5F10",
      "--ink": "#1C1917",
      "--ink-2": "#78716C",
      "--muted": "#6E6862",
      "--rail-fg": "#57534E",
      "--hover": "#F5F5F4",
      "--hover-btn": "#F5F5F4",
      "--border-hover": "#D6D3D1",
      "--chip-fg": "#57534E",
      "--board-lbl": "#78716C",
      "--well": "#FAFAFA",
      "--rule": "#EFEDEC",
      "--line-2": "#EFEDEC",
      "--dim-2": "#A8A29E",
      "--rail-dot": "#A8A29E",
      "--drawer-fg": "#292524",
      "--danger-bg": "#FEF2F2",
      "--danger-fg": "#B91C1C",
      "--paper-sheen": "none",
      "--shadow-note": "0 1px 2px rgba(0,0,0,.06), 0 8px 24px -12px rgba(0,0,0,.18)",
      "--shadow-note-hover": "0 2px 4px rgba(0,0,0,.07), 0 18px 36px -16px rgba(0,0,0,.22)",
      "--shadow-note-drag": "0 24px 48px -20px rgba(0,0,0,.28)",
      "--shadow-pin": "none",
      "--shadow-menu": "0 12px 28px -10px rgba(0,0,0,.16)",
      "--shadow-ctx": "0 14px 32px -10px rgba(0,0,0,.18)",
      "--shadow-drawer": "-24px 0 48px -24px rgba(0,0,0,.18)",
      "--shadow-toast": "0 12px 30px -10px rgba(0,0,0,.2)",
      "--card-bg": "#FFFFFF",
      "--card-line": "#E7E5E4",
      "--card-rule": "#EFEDEC",
      "--card-chip": "#F5F5F4",
      "--card-box": "#D6D3D1",
      "--board-grid": "rgba(0,0,0,.045)"
    },
    dark: {
      "--chrome": "#101012",
      "--chrome-2": "#17171A",
      "--chrome-line": "#292930",
      "--felt": "#0B0B0D",
      "--felt-2": "#08080A",
      "--chalk": "#EDEBE8",
      "--chalk-dim": "#8E8A85",
      "--brass": "#D4AC34",
      "--brass-hi": "#E4BF48",
      "--brass-ink": "#17140A",
      "--brass-text": "#D9B23C",
      "--ink": "#E8E6E2",
      "--ink-2": "#8E8A85",
      "--muted": "#9A948A",
      "--rail-fg": "#B4AFA8",
      "--hover": "#1F1F24",
      "--hover-btn": "#1F1F24",
      "--border-hover": "#3A3A43",
      "--chip-fg": "#B4AFA8",
      "--board-lbl": "#7A756F",
      "--well": "#0C0C0E",
      "--rule": "#232329",
      "--line-2": "#232329",
      "--dim-2": "#6E6A65",
      "--rail-dot": "#6E6A65",
      "--drawer-fg": "#DCD9D4",
      "--danger": "#C0503A",
      "--danger-bg": "#2A1512",
      "--danger-fg": "#E8998A",
      "--paper-sheen": "none",
      "--shadow-note": "0 1px 2px rgba(0,0,0,.5), 0 10px 26px -14px rgba(0,0,0,.75)",
      "--shadow-note-hover": "0 2px 5px rgba(0,0,0,.55), 0 20px 40px -18px rgba(0,0,0,.8)",
      "--shadow-note-drag": "0 28px 54px -20px rgba(0,0,0,.85)",
      "--shadow-pin": "none",
      "--shadow-menu": "0 14px 30px -10px rgba(0,0,0,.7)",
      "--shadow-ctx": "0 16px 34px -10px rgba(0,0,0,.75)",
      "--shadow-drawer": "-26px 0 52px -24px rgba(0,0,0,.8)",
      "--shadow-toast": "0 14px 32px -10px rgba(0,0,0,.7)",
      "--card-bg": "#1B1B20",
      "--card-line": "#2C2C34",
      "--card-rule": "#26262D",
      "--card-chip": "#232329",
      "--card-box": "#3A3A43",
      "--board-grid": "rgba(255,255,255,.035)"
    }
  };

  /* Card geometry — one treatment now, read by the logic rather than inlined. */
  var MODE_CARD = {
    radius: "10px", padding: "14px 16px 14px", tilt: false, pin: false, sheen: false
  };

  /* Written as a stylesheet rather than inline props on <html>: inline custom
     properties are lost when the tree is cloned (image export, screenshots),
     which silently drops the whole mode. */
  function applyMode(key) {
    var r = document.documentElement;
    var all = MODES.modern;
    for (var k in all) r.style.removeProperty(k);
    var m = MODES[key] || {};
    var css = ":root{";
    for (var j in m) css += j + ":" + m[j] + ";";
    css += "}";
    var el = document.getElementById("nf-mode");
    if (!el) {
      el = document.createElement("style");
      el.id = "nf-mode";
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
    r.setAttribute("data-mode", key);
  }

  /* Swap the three themed surface properties. Template colours never change. */
  function applyTheme(key) {
    var t = THEMES[key] || THEMES.felt;
    var r = document.documentElement;
    r.style.setProperty("--felt", t.felt);
    r.style.setProperty("--felt-2", t.felt2);
    r.style.setProperty("--brass", t.brass);
    if (document.body) document.body.setAttribute("data-theme", key);
    r.setAttribute("data-theme", key);
  }

  injectRoot();

  window.NF_TOKENS = {
    BASE: BASE, EXTRA: EXTRA, THEMES: THEMES, TEMPLATES: TEMPLATES,
    TYPE: TYPE, SPACE: SPACE, RADII: RADII, SHADOWS: SHADOWS,
    TRANSITIONS: TRANSITIONS, PAPER: PAPER, VARS: VARS,
    MODES: MODES, MODE_CARD: MODE_CARD,
    applyTheme: applyTheme, applyMode: applyMode, injectRoot: injectRoot
  };
})();

/**
 * chatbot.js — Playwright Copilot
 * GitHub Copilot-style AI assistant for the Playwright Testing Dashboard.
 * Self-contained: injects its own CSS, builds its own DOM, zero external deps.
 */
(function (global) {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────
  // CSS  (scoped under #copilot-root so it never leaks to the rest of the page)
  // ─────────────────────────────────────────────────────────────────────────
  const PWC_CSS = `
    /* ── Floating container (fixed across all tabs) ── */
    #copilot-root {
      position: fixed;
      bottom: 24px; right: 24px;
      z-index: 99999;
      display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      pointer-events: none; /* let clicks pass through to page */
    }
    #copilot-root * { pointer-events: auto; }

    /* ── Chat panel ── */
    #copilot-root .pwc-panel {
      display: none; flex-direction: column;
      width: 420px; height: 580px;
      background: #1e1e2e; border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,.6), 0 0 0 1px #3b3b5c;
      animation: pwcSlideUp .22s ease;
    }
    #copilot-root .pwc-panel.pwc-open { display: flex; }
    @keyframes pwcSlideUp {
      from { opacity:0; transform:translateY(16px); }
      to   { opacity:1; transform:translateY(0); }
    }

    /* ── FAB (floating action button) ── */
    #copilot-root .pwc-fab {
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #6366f1);
      border: none; color: #fff; font-size: 26px;
      cursor: pointer; flex-shrink: 0;
      box-shadow: 0 4px 20px rgba(124,58,237,.55);
      transition: transform .2s, box-shadow .2s;
      display: flex; align-items: center; justify-content: center;
    }
    #copilot-root .pwc-fab:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(124,58,237,.75); }
    #copilot-root .pwc-fab.pwc-open { background: linear-gradient(135deg,#1e1e2e,#2d2d4a); font-size:20px; }

    /* ── Unread badge on FAB ── */
    #copilot-root .pwc-fab-badge {
      position: absolute; top:-2px; right:-2px;
      width:18px; height:18px; border-radius:50%;
      background:#ef4444; color:#fff; font-size:10px; font-weight:800;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 2px 6px rgba(239,68,68,.6);
    }
    #copilot-root .pwc-fab-wrap {
      position: relative; display: inline-flex;
    }
  `
  // Append to existing CSS string
  + `
    #copilot-root .pwc-panel {
      /* already declared above — kept here for scoping */
    }
    /* Header */
    #copilot-root .pwc-header {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 18px;
      background: linear-gradient(135deg, #2d1b69 0%, #1e1e2e 100%);
      border-bottom: 1px solid #2d2d4a;
      flex-shrink: 0;
    }
    /* Header */
    #copilot-root .pwc-header {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 18px;
      background: linear-gradient(135deg, #2d1b69 0%, #1e1e2e 100%);
      border-bottom: 1px solid #2d2d4a;
      flex-shrink: 0;
    }
    #copilot-root .pwc-logo {
      font-size: 22px; line-height: 1;
    }
    #copilot-root .pwc-title {
      font-size: 15px; font-weight: 700; color: #e2e8f0; flex: 1;
    }
    #copilot-root .pwc-badge {
      background: linear-gradient(135deg, #7c3aed, #6366f1);
      color: #fff; font-size: 10px; font-weight: 800;
      padding: 2px 7px; border-radius: 20px; letter-spacing: 1px;
    }
    #copilot-root .pwc-status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
    }
    #copilot-root .pwc-clear-btn {
      background: none; border: none; color: #64748b;
      font-size: 16px; cursor: pointer; padding: 4px 6px;
      border-radius: 6px; transition: all .2s;
    }
    #copilot-root .pwc-clear-btn:hover { background: #2d2d4a; color: #e2e8f0; }

    /* Messages */
    #copilot-root .pwc-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 14px;
      scrollbar-width: thin; scrollbar-color: #3b3b5c #1e1e2e;
    }
    #copilot-root .pwc-messages::-webkit-scrollbar { width: 5px; }
    #copilot-root .pwc-messages::-webkit-scrollbar-thumb {
      background: #3b3b5c; border-radius: 4px;
    }

    /* Bubbles */
    #copilot-root .pwc-bubble { display: flex; gap: 10px; max-width: 95%; }
    #copilot-root .pwc-bubble.user { align-self: flex-end; flex-direction: row-reverse; }
    #copilot-root .pwc-bubble.bot  { align-self: flex-start; }

    #copilot-root .pwc-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; flex-shrink: 0;
    }
    #copilot-root .pwc-avatar.bot  { background: linear-gradient(135deg,#7c3aed,#6366f1); }
    #copilot-root .pwc-avatar.user { background: linear-gradient(135deg,#0ea5e9,#06b6d4); }

    #copilot-root .pwc-bubble-body {
      border-radius: 12px; padding: 10px 14px;
      font-size: 13px; line-height: 1.6; color: #e2e8f0;
      word-break: break-word;
    }
    #copilot-root .pwc-bubble.bot  .pwc-bubble-body { background: #23233a; border-radius: 4px 12px 12px 12px; }
    #copilot-root .pwc-bubble.user .pwc-bubble-body {
      background: linear-gradient(135deg,#6366f1,#7c3aed);
      border-radius: 12px 4px 12px 12px;
    }

    #copilot-root .pwc-bubble-body p { margin: 6px 0; }
    #copilot-root .pwc-bubble-body p:first-child { margin-top: 0; }
    #copilot-root .pwc-bubble-body p:last-child  { margin-bottom: 0; }
    #copilot-root .pwc-bubble-body b  { color: #c4b5fd; }
    #copilot-root .pwc-bubble-body ul { margin: 6px 0; padding-left: 18px; }
    #copilot-root .pwc-bubble-body li { margin: 3px 0; }

    /* Code blocks */
    #copilot-root .pwc-code-wrap {
      margin: 10px 0; border-radius: 8px; overflow: hidden;
      border: 1px solid #30304a;
    }
    #copilot-root .pwc-code-toolbar {
      display: flex; align-items: center;
      background: #161625; padding: 6px 12px;
      border-bottom: 1px solid #30304a;
    }
    #copilot-root .pwc-code-lang {
      font-size: 11px; color: #7c3aed; font-weight: 700;
      font-family: monospace; flex: 1;
    }
    #copilot-root .pwc-copy-btn {
      font-size: 11px; padding: 3px 10px; border-radius: 4px;
      border: 1px solid #3b3b5c; background: #23233a;
      color: #94a3b8; cursor: pointer; transition: all .2s;
    }
    #copilot-root .pwc-copy-btn:hover { background: #7c3aed; color: #fff; border-color: #7c3aed; }
    #copilot-root .pwc-pre {
      margin: 0; padding: 14px 16px;
      background: #0d1117; overflow-x: auto;
    }
    #copilot-root .pwc-pre code {
      font-family: 'Cascadia Code','Fira Code','Courier New',monospace;
      font-size: 12px; line-height: 1.7; color: #e6edf3;
      white-space: pre;
    }
    /* keyword colouring (simple, no external lib) */
    #copilot-root .pwc-kw  { color: #ff7b72; }
    #copilot-root .pwc-str { color: #a5d6ff; }
    #copilot-root .pwc-fn  { color: #d2a8ff; }
    #copilot-root .pwc-cm  { color: #8b949e; font-style: italic; }

    /* Typing dots */
    #copilot-root .pwc-typing-wrap {
      display: flex; align-items: center; gap: 5px; padding: 10px 14px;
      background: #23233a; border-radius: 4px 12px 12px 12px;
    }
    #copilot-root .pwc-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #7c3aed;
      animation: pwcBounce 1.2s infinite;
    }
    #copilot-root .pwc-dot:nth-child(2) { animation-delay: .2s; }
    #copilot-root .pwc-dot:nth-child(3) { animation-delay: .4s; }
    @keyframes pwcBounce {
      0%,80%,100% { transform: translateY(0); opacity:.6; }
      40%         { transform: translateY(-7px); opacity:1; }
    }

    /* Chips */
    #copilot-root .pwc-chips {
      display: flex; gap: 8px; padding: 10px 14px;
      overflow-x: auto; flex-shrink: 0;
      border-top: 1px solid #2d2d4a;
      scrollbar-width: none;
    }
    #copilot-root .pwc-chips::-webkit-scrollbar { display: none; }
    #copilot-root .pwc-chip {
      white-space: nowrap; font-size: 11.5px; font-weight: 600;
      padding: 5px 12px; border-radius: 20px; cursor: pointer;
      border: 1px solid #3b3b5c; background: #23233a; color: #c4b5fd;
      transition: all .2s; flex-shrink: 0;
    }
    #copilot-root .pwc-chip:hover { background: #7c3aed; border-color: #7c3aed; color: #fff; }

    /* Input bar */
    #copilot-root .pwc-input-bar {
      display: flex; gap: 0; flex-shrink: 0; align-items: center;
      border-top: 1px solid #2d2d4a;
      background: #161625; padding: 0 4px 0 0; position: relative;
    }
    #copilot-root .pwc-plus-btn {
      background: none; border: none; color: #7c3aed;
      font-size: 22px; font-weight: 300; padding: 0 10px;
      cursor: pointer; line-height: 1; transition: color .2s;
      flex-shrink: 0;
    }
    #copilot-root .pwc-plus-btn:hover { color: #a78bfa; }
    #copilot-root .pwc-input {
      flex: 1; background: transparent; border: none; outline: none;
      color: #e2e8f0; font-size: 13px; padding: 13px 8px;
      font-family: inherit; min-height: 20px; max-height: 80px;
      overflow-y: auto; word-break: break-word; cursor: text;
      white-space: pre-wrap;
    }
    #copilot-root .pwc-input:empty::before {
      content: attr(data-placeholder);
      color: #475569; pointer-events: none;
    }
    #copilot-root .pwc-send-btn {
      background: linear-gradient(135deg,#7c3aed,#6366f1);
      border: none; color: #fff; font-size: 18px; padding: 0 18px;
      cursor: pointer; transition: opacity .2s; align-self: stretch;
    }
    #copilot-root .pwc-send-btn:hover { opacity: .85; }

    /* Image preview staging area */
    #copilot-root .pwc-img-preview {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px; background: #23233a;
      border-top: 1px solid #3b3b5c;
      animation: pwcSlideUp .2s ease;
    }
    #copilot-root .pwc-img-preview img {
      width: 52px; height: 40px; object-fit: cover;
      border-radius: 6px; border: 1px solid #3b3b5c; flex-shrink: 0;
    }
    #copilot-root .pwc-img-preview-info {
      flex: 1; display: flex; flex-direction: column; gap: 2px; overflow: hidden;
    }
    #copilot-root #pwc-img-preview-label {
      font-size: 12px; color: #e2e8f0; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #copilot-root .pwc-img-preview-hint {
      font-size: 10px; color: #64748b;
    }
    #copilot-root .pwc-img-preview-remove {
      background: #2d2d4a; border: none; color: #94a3b8;
      border-radius: 50%; width: 22px; height: 22px;
      cursor: pointer; font-size: 12px; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
      transition: background .15s;
    }
    #copilot-root .pwc-img-preview-remove:hover { background: #ef4444; color: #fff; }

    /* Paste-image highlight */
    #copilot-root .pwc-panel.pwc-paste-active {
      outline: 2px solid #7c3aed;
      outline-offset: -2px;
    }
    /* Paste hint bar */
    #copilot-root .pwc-paste-hint {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 12px; font-size: 11px; color: #64748b;
      border-top: 1px solid #2d2d4a; background: #161625;
      flex-shrink: 0;
    }
    #copilot-root .pwc-paste-btn {
      background: #2d2d4a; border: 1px solid #3b3b5c;
      border-radius: 6px; padding: 3px 10px;
      color: #c4b5fd; font-size: 11px; font-weight: 600;
      cursor: pointer; transition: background .15s;
      white-space: nowrap;
    }
    #copilot-root .pwc-paste-btn:hover { background: #7c3aed; border-color: #7c3aed; color: #fff; }
    #copilot-root .pwc-paste-sep { color: #3b3b5c; }

    /* Drag-over highlight on message area */
    #copilot-root .pwc-messages.pwc-drag-over {
      outline: 2px dashed #7c3aed;
      outline-offset: -6px;
      background: #23233a;
    }

    /* "+" floating menu */
    #copilot-root .pwc-plus-menu {
      position: absolute; bottom: calc(100% + 6px); left: 6px;
      background: #23233a; border: 1px solid #3b3b5c;
      border-radius: 12px; padding: 6px 0; min-width: 210px;
      box-shadow: 0 8px 32px rgba(0,0,0,.5);
      z-index: 999; display: none;
    }
    #copilot-root .pwc-plus-menu.open { display: block; }
    #copilot-root .pwc-plus-menu-divider {
      border: none; border-top: 1px solid #2d2d4a; margin: 4px 0;
    }
    #copilot-root .pwc-plus-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 16px; cursor: pointer; font-size: 13px;
      color: #e2e8f0; transition: background .15s;
      white-space: nowrap;
    }
    #copilot-root .pwc-plus-item:hover { background: #2d2d4a; }
    #copilot-root .pwc-plus-item .pwc-pm-icon {
      font-size: 16px; width: 22px; text-align: center; flex-shrink: 0;
    }
    #copilot-root .pwc-plus-item .pwc-pm-label { flex: 1; }
    #copilot-root .pwc-plus-item .pwc-pm-desc {
      font-size: 11px; color: #64748b;
    }
    #copilot-root .pwc-plus-item.disabled {
      opacity: .4; cursor: default; pointer-events: none;
    }

    /* Info tag inside messages */
    #copilot-root .pwc-tag {
      display: inline-block; font-size: 10px; font-weight: 700;
      padding: 1px 7px; border-radius: 10px; margin-right: 5px;
      background: #7c3aed33; color: #c4b5fd;
    }
    #copilot-root .pwc-divider {
      margin: 4px 0; border: none; border-top: 1px solid #2d2d4a;
    }
    #copilot-root .pwc-step-row {
      display: flex; align-items: flex-start; gap: 8px; margin: 5px 0;
    }
    #copilot-root .pwc-step-num {
      min-width: 20px; height: 20px; border-radius: 50%;
      background: #7c3aed33; color: #c4b5fd; font-size: 11px;
      font-weight: 700; display: flex; align-items: center; justify-content: center;
    }
  `;

  // ─────────────────────────────────────────────────────────────────────────
  // HTML template
  // ─────────────────────────────────────────────────────────────────────────
  const PWC_HTML = `
    <div class="pwc-panel" id="pwc-panel">
    <div class="pwc-header">
      <span class="pwc-logo">🤖</span>
      <span class="pwc-title">Playwright Copilot</span>
      <span class="pwc-badge">AI</span>
      <span class="pwc-status-dot" title="Ready"></span>
      <button class="pwc-clear-btn" id="pwc-clear-btn" title="Clear chat">🗑</button>
      <button class="pwc-clear-btn" id="pwc-close-btn" title="Close" style="font-size:18px">✕</button>
    </div>
    <div class="pwc-messages" id="pwc-messages"></div>
    <div class="pwc-chips"   id="pwc-chips"></div>
    <!-- Image preview staging area — shown before send -->
    <div class="pwc-img-preview" id="pwc-img-preview" style="display:none">
      <img id="pwc-img-preview-thumb" src="" alt="preview">
      <div class="pwc-img-preview-info">
        <span id="pwc-img-preview-label">Screenshot</span>
        <span class="pwc-img-preview-hint">Add a message below and press Send ↵</span>
      </div>
      <button class="pwc-img-preview-remove" id="pwc-img-preview-remove" title="Remove image">✕</button>
    </div>
    <div class="pwc-paste-hint">
      <button id="pwc-paste-btn" class="pwc-paste-btn" title="Read image from clipboard">📋 Paste Image</button>
      <span class="pwc-paste-sep">or drag &amp; drop image here</span>
    </div>
    <div class="pwc-input-bar">
      <button class="pwc-plus-btn" id="pwc-plus-btn" title="More actions">+</button>
      <div class="pwc-plus-menu" id="pwc-plus-menu">
        <div class="pwc-plus-item" data-action="attach-screenshot">
          <span class="pwc-pm-icon">🖼</span>
          <span class="pwc-pm-label">Add screenshot</span>
          <span class="pwc-pm-desc">analyse failure</span>
        </div>
        <div class="pwc-plus-item" data-action="attach-spec">
          <span class="pwc-pm-icon">📎</span>
          <span class="pwc-pm-label">Attach .spec file</span>
          <span class="pwc-pm-desc">review test code</span>
        </div>
        <hr class="pwc-plus-menu-divider">
        <div class="pwc-plus-item" data-action="do-record-start">
          <span class="pwc-pm-icon">⏺</span>
          <span class="pwc-pm-label">Start recording</span>
        </div>
        <div class="pwc-plus-item" data-action="do-record-stop">
          <span class="pwc-pm-icon">⏹</span>
          <span class="pwc-pm-label">Stop recording</span>
        </div>
        <div class="pwc-plus-item" data-action="do-capture">
          <span class="pwc-pm-icon">📸</span>
          <span class="pwc-pm-label">Capture tests</span>
          <span class="pwc-pm-desc">UI screenshots</span>
        </div>
        <div class="pwc-plus-item" data-action="do-run-all">
          <span class="pwc-pm-icon">▶️</span>
          <span class="pwc-pm-label">Run all tests</span>
        </div>
        <hr class="pwc-plus-menu-divider">
        <div class="pwc-plus-item" data-action="quick-login">
          <span class="pwc-pm-icon">🧪</span>
          <span class="pwc-pm-label">Generate login test</span>
        </div>
        <div class="pwc-plus-item" data-action="quick-cart">
          <span class="pwc-pm-icon">🛒</span>
          <span class="pwc-pm-label">Generate cart test</span>
        </div>
        <hr class="pwc-plus-menu-divider">
        <div class="pwc-plus-item" data-action="do-reports">
          <span class="pwc-pm-icon">📊</span>
          <span class="pwc-pm-label">Open reports</span>
        </div>
        <div class="pwc-plus-item" data-action="quick-list">
          <span class="pwc-pm-icon">📋</span>
          <span class="pwc-pm-label">List my tests</span>
        </div>
      </div>
      <input type="file" id="pwc-file-img"  accept="image/*"   style="display:none">
      <input type="file" id="pwc-file-spec" accept=".ts,.js,.spec.ts,.spec.js" style="display:none">
      <div class="pwc-input" id="pwc-input"
           contenteditable="true" spellcheck="false"
           data-placeholder="Ask anything… Ctrl+V to paste image"></div>
      <button class="pwc-send-btn" id="pwc-send-btn">➤</button>
    </div>
    </div>
    <div class="pwc-fab-wrap">
      <button class="pwc-fab" id="pwc-fab" title="Playwright Copilot">🤖</button>
      <span class="pwc-fab-badge" id="pwc-fab-badge" style="display:none">1</span>
    </div>
  `;

  // ─────────────────────────────────────────────────────────────────────────
  // Intent dispatch table  (first match wins)
  // ─────────────────────────────────────────────────────────────────────────
  const INTENT_TABLE = [
    // ── ACTION intents (must be before informational ones) ───────────────────
    { intent: 'DO_RECORD_START', rx: /\bstart\s+record|\bbegin\s+record|\brecord\s+(?:new\s+)?test|\blaunch\s+record|\bopen\s+codegen/i },
    { intent: 'DO_RECORD_STOP',  rx: /\bstop\s+record|\bend\s+record|\bfinish\s+record|\bsave\s+record/i },
    { intent: 'DO_CAPTURE',      rx: /\bcapture\s+(?:the\s+)?(?:test|screenshot|ui|snap)|take\s+screenshot(?:s)?\s+(?:for|of)/i },
    { intent: 'DO_CAPTURE_ASSERTIONS', rx: /\bcapture\s+(?:all\s+)?assertion|\bcapture\s+(?:assertion\s+)?(?:snapshot|text|code)|\btake\s+assertion\s+snapshot/i },
    { intent: 'DO_RUN_ALL',      rx: /\brun\s+all\s+test|\bexecute\s+all\s+test|\bplay\s+all\s+test|\brun\s+all\b/i },
    { intent: 'DO_RUN_TEST',     rx: /\brun\s+(?:the\s+)?test\b|\bexecute\s+(?:the\s+)?test\b|\bplay\s+(?:the\s+)?test\b|\brun\s+tc\d/i },
    { intent: 'DO_STOP_TESTS',   rx: /\bstop\s+(?:running\s+)?(?:the\s+)?(?:my\s+)?tests?|\bcancel\s+(?:the\s+)?(?:my\s+)?tests?|\babort\s+tests?|\bhalt\s+tests?|\bkill\s+tests?/i },
    { intent: 'DO_UPDATE_TEST',  rx: /\bupdate\s+(?:the\s+)?(?:my\s+)?tests?|\bedit\s+(?:the\s+)?(?:my\s+)?test\s+scenario|\bmodify\s+(?:the\s+)?(?:my\s+)?tests?|\bchange\s+(?:the\s+)?(?:my\s+)?tests?/i },
    { intent: 'DO_SAVE_TEST',    rx: /\bsave\s+(?:the\s+)?(?:my\s+)?test\s+(?:scenario|case)|\bsave\s+(?:my\s+)?changes|\bpersist\s+(?:the\s+)?(?:my\s+)?tests?/i },
    { intent: 'DO_DELETE_TEST',  rx: /\bdelete\s+(?:the\s+)?(?:my\s+)?tests?|\bremove\s+(?:the\s+)?(?:my\s+)?tests?|\berase\s+tests?|\bdrop\s+tests?/i },
    { intent: 'DO_EXPORT_TESTS', rx: /\bexport\s+(?:all\s+)?(?:the\s+)?(?:my\s+)?tests?|\bdownload\s+(?:all\s+)?(?:the\s+)?(?:my\s+)?tests?|\bsave\s+test.*(?:excel|csv|file)|\bexport.*(?:excel|csv)/i },
    { intent: 'DO_WRITE_TEST',   rx: /\bwrite\s+(?:a\s+)?test\b|\bcreate\s+(?:a\s+)?test\s*case|\bsave\s+(?:a\s+)?test|\bauto.?generate\s+test/i },
    { intent: 'DO_NAVIGATE',     rx: /\bgo\s+to\b|\bnavigate\s+to\b|\bopen\s+(?:the\s+)?(?:dashboard|record|test\s+scenario|api\s+test|report|config)\b|\bswitch\s+to\s+(?:the\s+)?(?:dashboard|record|test|api|report|config)/i },
    { intent: 'DO_REPORTS',      rx: /\bopen\s+report|\bview\s+report|\bshow\s+report|\bgenerate\s+(?:html\s+)?report|\blaunch\s+report/i },
    // ── Informational intents ─────────────────────────────────────────────────
    { intent: 'LIST_TESTS',    rx: /list|show.*(test|scenario|case)|what.*test|my tests/i },
    { intent: 'ADD_STEP',      rx: /add.*(step|action)|append.*step|new step to/i },
    { intent: 'GEN_LOGIN',     rx: /gen.*login|login.*test|sign.?in.*test|create.*login/i },
    { intent: 'GEN_CART',      rx: /cart.*test|add.*cart|shop.*test|buy.*test|ecommerce/i },
    { intent: 'GEN_SEARCH',    rx: /search.*test|test.*search/i },
    { intent: 'GEN_REGISTER',  rx: /register.*test|signup.*test|registration/i },
    { intent: 'GEN_API',       rx: /api.*test|rest.*test|endpoint.*test|http.*test/i },
    { intent: 'GEN_TEST',      rx: /gen(erate)?|create.*test|write.*test|build.*test|new test/i },
    { intent: 'NAVIGATE',      rx: /navigat|go to|goto|open.*url|visit|load.*page/i },
    { intent: 'CLICK',         rx: /^how.*click|click.*button|click.*link|click.*element|how.*press/i },
    { intent: 'FILL',          rx: /fill|type.*field|enter.*field|input.*field|how.*type/i },
    { intent: 'SELECT',        rx: /select|dropdown|choose.*option|pick.*value/i },
    { intent: 'ASSERT',        rx: /assert|expect|verif|check.*visible|should.*be|validate/i },
    { intent: 'LOCATORS',      rx: /locator|selector|how.*find.*element|getByRole|getByText|getByLabel|getByPlaceholder/i },
    { intent: 'FIXTURES',      rx: /fixture|beforeEach|afterEach|setup|teardown/i },
    { intent: 'DEBUG',         rx: /debug|trace|screenshot|log|error|fail|slow/i },
    { intent: 'POM',           rx: /page object|POM|page class|page model/i },
    { intent: 'PARALLEL',      rx: /parallel|worker|shard|concurr/i },
    { intent: 'CODEGEN',       rx: /codegen|record|playwright.*record/i },
    { intent: 'REPORT',        rx: /report|allure|html.*report|test.*report|report.*template|generate.*report|view.*report|open.*report/i },
    { intent: 'CI_CD',         rx: /ci|cd|github.*action|jenkins|pipeline|deploy|ci\/cd|continuous/i },
    { intent: 'HELP',          rx: /^(hi|hello|hey|help|what can you|commands|options)$/i },
    { intent: 'HELP',          rx: /help me|what.*do|capabilities/i },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // PlaywrightCopilot class
  // ─────────────────────────────────────────────────────────────────────────
  class PlaywrightCopilot {
    constructor (rootId = 'copilot-root') {
      this.rootId        = rootId;
      this.root          = null;
      this.msgList       = null;
      this.inputEl       = null;
      this.initialized   = false;
      this._typingEl     = null;
      this._pendingImage = null; // set when user pastes a screenshot; cleared after next message
    }

    // ── Public API ──────────────────────────────────────────────────────────

    init () {
      if (this.initialized) return;
      this._injectStyles();
      this._buildDOM();
      this._bindEvents();
      this._renderWelcome();
      this._renderChips();
      this.initialized = true;

      // Patch existing global helpers so startRecording / stopRecording etc.
      // continue to work and their messages appear in the copilot panel.
      const self = this;
      global.addBotMessage = function (text) {
        self._appendBotBubble(`<p>${self._escapeHtml(text)
          .replace(/\n/g,'<br>')
          .replace(/<code>(.*?)<\/code>/g, '<code style="background:#2d2d4a;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:11px;color:#c4b5fd">$1</code>')}</p>`);
      };
      // Legacy stubs still referenced by dashboard.html
      global.sendMessage = function () {
        // Forward text from the legacy #chatInput (Record & Play tab panel) if it has content
        const legacyInput = document.getElementById('chatInput');
        if (legacyInput && legacyInput.value.trim()) {
          const text = legacyInput.value.trim();
          legacyInput.value = '';
          self.sendMessage(text);
          return;
        }
        self._handleSend();
      };
      global.quickAsk    = function (q) { self.sendMessage(q); };
      global.clearChat   = function ()  { self.clearChat(); };
    }

    /** Toggle the chat panel open/closed */
    _togglePanel (open) {
      if (!this.panel) return;
      const fab = this.root.querySelector('#pwc-fab');
      if (open) {
        this.panel.classList.add('pwc-open');
        if (fab) { fab.textContent = '✕'; fab.classList.add('pwc-open'); }
        this._hideBadge();
        this._scrollToBottom();
      } else {
        this.panel.classList.remove('pwc-open');
        if (fab) { fab.textContent = '🤖'; fab.classList.remove('pwc-open'); }
      }
    }

    _showBadge () {
      const badge = this.root.querySelector('#pwc-fab-badge');
      if (badge && !this.panel?.classList.contains('pwc-open')) {
        badge.style.display = 'flex';
      }
    }

    _hideBadge () {
      const badge = this.root.querySelector('#pwc-fab-badge');
      if (badge) badge.style.display = 'none';
    }

    /** Public: send a message programmatically */
    sendMessage (text) {
      if (!text || !text.trim()) return;
      if (!this.initialized) this.init();
      this._togglePanel(true); // auto-open when sending
      this._appendUserBubble(text.trim());
      this._processMessage(text.trim());
    }

    clearChat () {
      if (this.msgList) this.msgList.innerHTML = '';
      this._renderWelcome();
      this._renderChips();
    }

    // ── Internal DOM ────────────────────────────────────────────────────────

    _injectStyles () {
      if (document.getElementById('pwc-styles')) return;
      const el = document.createElement('style');
      el.id = 'pwc-styles';
      el.textContent = PWC_CSS;
      document.head.appendChild(el);
    }

    _buildDOM () {
      this.root = document.getElementById(this.rootId);
      if (!this.root) return;
      this.root.innerHTML = PWC_HTML;
      this.panel   = this.root.querySelector('#pwc-panel');
      this.msgList = this.root.querySelector('#pwc-messages');
      this.inputEl = this.root.querySelector('#pwc-input');
    }

    _bindEvents () {
      this.root.querySelector('#pwc-send-btn').addEventListener('click', () => this._handleSend());

      // Enter sends, Shift+Enter adds newline
      this.inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._handleSend(); }
      });

      // ── Paste handler on contenteditable — receives images via Ctrl+V ──────
      this.inputEl.addEventListener('paste', e => {
        const cd = e.clipboardData;
        if (!cd) return;

        // Check for image items first
        for (let i = 0; i < cd.items.length; i++) {
          if (cd.items[i].type.startsWith('image/')) {
            e.preventDefault();
            const file = cd.items[i].getAsFile();
            if (file) this._handleImageAttach(file);
            return;
          }
        }

        // Plain text — strip HTML formatting, insert as plain text
        e.preventDefault();
        const text = cd.getData('text/plain');
        document.execCommand('insertText', false, text);
      });

      this.root.querySelector('#pwc-clear-btn').addEventListener('click', () => this.clearChat());

      // Close button in header
      const closeBtn = this.root.querySelector('#pwc-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => this._togglePanel(false));

      // FAB — toggle panel open/close
      const fab = this.root.querySelector('#pwc-fab');
      if (fab) {
        fab.addEventListener('click', () => {
          const isOpen = this.panel.classList.contains('pwc-open');
          this._togglePanel(!isOpen);
        });
      }

      // "+" menu toggle
      const plusBtn  = this.root.querySelector('#pwc-plus-btn');
      const plusMenu = this.root.querySelector('#pwc-plus-menu');
      plusBtn.addEventListener('click', e => {
        e.stopPropagation();
        plusMenu.classList.toggle('open');
      });
      // Close menu when clicking outside
      document.addEventListener('click', () => plusMenu.classList.remove('open'));
      plusMenu.addEventListener('click', e => e.stopPropagation());

      // Menu item actions
      plusMenu.addEventListener('click', e => {
        const item = e.target.closest('[data-action]');
        if (!item) return;
        plusMenu.classList.remove('open');
        const action = item.dataset.action;
        switch (action) {
          case 'attach-screenshot':  this.root.querySelector('#pwc-file-img').click();   break;
          case 'attach-spec':        this.root.querySelector('#pwc-file-spec').click();  break;
          case 'do-record-start':    this.sendMessage('start recording');                break;
          case 'do-record-stop':     this.sendMessage('stop recording');                 break;
          case 'do-capture':         this.sendMessage('capture the tests');              break;
          case 'do-run-all':         this.sendMessage('run all tests');                  break;
          case 'do-reports':         this.sendMessage('open report');                    break;
          case 'quick-login':        this.sendMessage('generate login test');            break;
          case 'quick-cart':         this.sendMessage('generate cart test');             break;
          case 'quick-api':          this.sendMessage('generate API test');              break;
          case 'quick-report':       this.sendMessage('report template');                break;
          case 'quick-ci':           this.sendMessage('github actions CI/CD');           break;
          case 'quick-list':         this.sendMessage('list my tests');                  break;
        }
      });

      // Handle image file attach
      this.root.querySelector('#pwc-file-img').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        this._handleImageAttach(file);
      });

      // Handle spec file attach
      this.root.querySelector('#pwc-file-spec').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        this._handleSpecAttach(file);
      });

      // ── Remove image preview ─────────────────────────────────────────────
      const removeBtn = this.root.querySelector('#pwc-img-preview-remove');
      if (removeBtn) removeBtn.addEventListener('click', () => this._clearImagePreview());

      // ── Paste Image button → navigator.clipboard.read() ─────────────────
      const pasteBtn = this.root.querySelector('#pwc-paste-btn');
      if (pasteBtn) {
        pasteBtn.addEventListener('click', () => this._pasteFromClipboard());
      }

      // ── Drag-and-drop image onto the message area ─────────────────────────
      const msgArea = this.msgList;
      msgArea.addEventListener('dragover', e => {
        e.preventDefault();
        msgArea.classList.add('pwc-drag-over');
      });
      msgArea.addEventListener('dragleave', () => msgArea.classList.remove('pwc-drag-over'));
      msgArea.addEventListener('drop', e => {
        e.preventDefault();
        msgArea.classList.remove('pwc-drag-over');
        const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
        if (file) this._handleImageAttach(file);
      });
    }

    _handleSend () {
      const text = (this.inputEl.textContent || '').trim();
      // Require either text or a pending image
      if (!text && !this._pendingImage) return;
      this.inputEl.textContent = '';

      if (this._pendingImage) {
        const img = this._pendingImage; // keep ref before sendMessage clears it
        this._clearImagePreview();

        // Post image + instruction as a combined user bubble
        const instruction = text || ''; // may be empty — bot will ask
        const imgHtml = `
          <div style="margin-bottom:6px;font-size:12px;color:#94a3b8">📷 ${this._escapeHtml(img.label)}</div>
          <img src="${img.dataUrl}" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid #3b3b5c;display:block">
          ${instruction ? `<div style="margin-top:6px;font-size:13px">${this._escapeHtml(instruction)}</div>` : ''}`;
        this._appendUserBubble(imgHtml, true);

        // Re-attach pending image for _processMessage to use
        this._pendingImage = img;

        if (instruction) {
          // User gave explicit instruction — dispatch immediately
          this._processMessage(instruction);
        } else {
          // No instruction — ask what to do
          this._pendingImage = img; // keep it set
          this._showTypingDots();
          setTimeout(() => {
            this._appendBotBubble(`
              <p>📷 <b>Screenshot attached!</b> What would you like me to do?</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
                ${[
                  ['✏️ Write test cases',   'img:write_tests'],
                  ['▶️ Execute test cases', 'img:execute'],
                  ['➕ Add as a test step', 'img:add_step'],
                  ['🐛 Debug this failure', 'img:debug'],
                  ['📊 Generate report',    'img:report'],
                  ['🔍 Identify elements',  'img:identify'],
                ].map(([lbl, action]) =>
                  `<button class="pwc-chip pwc-img-chip" data-img-action="${action}" style="font-size:11px">${lbl}</button>`
                ).join('')}
              </div>
              <p style="color:#64748b;font-size:11px;margin-top:8px">Or type your instruction and press Send ↵</p>`);
            this._renderChips();
          }, 400);
        }
      } else {
        this.sendMessage(text);
      }
    }

    _clearImagePreview () {
      this._pendingImage = null;
      const preview = this.root.querySelector('#pwc-img-preview');
      if (preview) preview.style.display = 'none';
      const thumb = this.root.querySelector('#pwc-img-preview-thumb');
      if (thumb) thumb.src = '';
    }

    async _pasteFromClipboard () {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        this._appendBotBubble(`<p>⚠️ Clipboard API not available. Use the <b>+</b> button → <b>Add screenshot</b> to attach an image file instead.</p>`);
        return;
      }
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const file = new File([blob], 'clipboard.png', { type });
              this._handleImageAttach(file);
              return;
            }
          }
        }
        // Nothing image-like found
        this._appendBotBubble(`<p>⚠️ No image in clipboard. Copy a screenshot first (Win+Shift+S or PrtSc), then click <b>📋 Paste Image</b>.</p>`);
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          this._appendBotBubble(`<p>⚠️ <b>Clipboard permission denied.</b><br>Click the 🔒 icon in the browser address bar → allow <b>Clipboard</b> access, then try again.</p>`);
        } else {
          this._appendBotBubble(`<p>⚠️ Could not read clipboard: ${this._escapeHtml(err.message)}</p>`);
        }
      }
    }

    _handleImageAttach (file) {
      // Brief visual flash
      if (this.panel) {
        this.panel.classList.add('pwc-paste-active');
        setTimeout(() => this.panel.classList.remove('pwc-paste-active'), 600);
      }
      const reader = new FileReader();
      reader.onload = ev => {
        const label = (file.name && file.name !== 'image.png') ? file.name : 'Pasted screenshot';
        const dataUrl = ev.target.result;

        // Store pending image — will be included when user presses Send
        this._pendingImage = { label, dataUrl };

        // Show thumbnail preview in staging area (NOT yet posted to chat)
        const preview   = this.root.querySelector('#pwc-img-preview');
        const thumb     = this.root.querySelector('#pwc-img-preview-thumb');
        const labelEl   = this.root.querySelector('#pwc-img-preview-label');
        if (preview && thumb && labelEl) {
          thumb.src      = dataUrl;
          labelEl.textContent = label;
          preview.style.display = 'flex';
        }

        // Focus input so user can type their instruction immediately
        this.inputEl.focus();
      };
      reader.readAsDataURL(file);
    }

    _handleSpecAttach (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const code = ev.target.result;
        const lines = code.split('\n').length;
        this._appendUserBubble(`📎 <b>${this._escapeHtml(file.name)}</b> <span style="color:#64748b;font-size:11px">(${lines} lines)</span>`, true);
        // Count tests
        const testMatches = (code.match(/\btest\s*\(/g) || []).length;
        const describeMatches = (code.match(/\bdescribe\s*\(/g) || []).length;
        // Check for common patterns
        const hasGoto      = /page\.goto/.test(code);
        const hasLocators  = /getByRole|getByText|getByLabel|locator\(/.test(code);
        const hasAssert    = /expect\(/.test(code);
        const hasPOM       = /class\s+\w+Page/.test(code);
        const hasFixtures  = /test\.extend|fixtures/.test(code);
        this._appendBotBubble(`<p>📎 <b>File analysed: ${this._escapeHtml(file.name)}</b></p>
          <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:10px">
            <tr><td style="padding:3px 8px;color:#94a3b8">Tests found</td>   <td style="padding:3px 8px;color:#c4b5fd;font-weight:700">${testMatches}</td></tr>
            <tr><td style="padding:3px 8px;color:#94a3b8">Describe blocks</td><td style="padding:3px 8px;color:#c4b5fd;font-weight:700">${describeMatches}</td></tr>
            <tr><td style="padding:3px 8px;color:#94a3b8">page.goto</td>      <td style="padding:3px 8px">${hasGoto      ? '✅ Yes' : '❌ No'}</td></tr>
            <tr><td style="padding:3px 8px;color:#94a3b8">Locators used</td>  <td style="padding:3px 8px">${hasLocators  ? '✅ Yes' : '❌ No'}</td></tr>
            <tr><td style="padding:3px 8px;color:#94a3b8">Assertions</td>     <td style="padding:3px 8px">${hasAssert    ? '✅ Yes' : '⚠️ None found'}</td></tr>
            <tr><td style="padding:3px 8px;color:#94a3b8">Page Object</td>    <td style="padding:3px 8px">${hasPOM       ? '✅ Yes' : '—'}</td></tr>
            <tr><td style="padding:3px 8px;color:#94a3b8">Fixtures</td>       <td style="padding:3px 8px">${hasFixtures  ? '✅ Yes' : '—'}</td></tr>
          </table>
          ${!hasAssert ? '<p>⚠️ <b>No assertions detected</b> — add <code>expect()</code> calls to make tests meaningful.</p>' : ''}
          ${!hasLocators ? '<p>⚠️ Consider using role-based locators (<code>getByRole</code>, <code>getByLabel</code>) for resilience.</p>' : ''}
          <p style="color:#64748b;font-size:12px">Ask me anything about this file, e.g. "how to add assertions" or "explain fixtures".</p>`);
      };
      reader.readAsText(file);
    }

    // ── Welcome message ─────────────────────────────────────────────────────

    _renderWelcome () {
      const testCount = this._getTestCount();
      this._appendBotBubble(`
        <p>👋 <b>Playwright Copilot</b> — your AI test automation assistant</p>
        <span class="pwc-tag">${testCount} tests saved</span>
        <hr class="pwc-divider">
        <p><b>I can perform actions for you:</b></p>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <tr><td style="padding:4px 0;color:#22c55e;width:22px">⏺</td><td style="padding:4px 8px;color:#e2e8f0"><b>"start recording"</b> — launch browser &amp; record</td></tr>
          <tr><td style="padding:4px 0;color:#ef4444">⏹</td><td style="padding:4px 8px;color:#e2e8f0"><b>"stop recording"</b> — save the recorded test</td></tr>
          <tr><td style="padding:4px 0;color:#f59e0b">📸</td><td style="padding:4px 8px;color:#e2e8f0"><b>"capture the tests"</b> — take UI screenshots per step</td></tr>
          <tr><td style="padding:4px 0;color:#6366f1">✏️</td><td style="padding:4px 8px;color:#e2e8f0"><b>"write a test that…"</b> — generate &amp; save from description</td></tr>
          <tr><td style="padding:4px 0;color:#22c55e">▶️</td><td style="padding:4px 8px;color:#e2e8f0"><b>"run all tests"</b> / <b>"run [test name]"</b></td></tr>
          <tr><td style="padding:4px 0;color:#0ea5e9">📊</td><td style="padding:4px 8px;color:#e2e8f0"><b>"open report"</b> — view test results</td></tr>
          <tr><td style="padding:4px 0;color:#c4b5fd">📍</td><td style="padding:4px 8px;color:#e2e8f0"><b>"go to [tab]"</b> — navigate dashboard pages</td></tr>
        </table>
        <hr class="pwc-divider">
        <p style="color:#64748b;font-size:12px">Also generates code, explains concepts, and answers Playwright questions.</p>
      `);
    }

    // ── Chips ───────────────────────────────────────────────────────────────

    _renderChips () {
      const container = this.root.querySelector('#pwc-chips');
      if (!container) return;
      const hasTests = this._getTestCount() > 0;
      const chips = hasTests
        ? ['▶ Start Recording','⏹ Stop Recording','📸 Capture Tests',
           '🚀 Run All Tests','📋 List My Tests','📊 Open Reports',
           'Go To Test Scenarios','Write A Test']
        : ['▶ Start Recording','Write A Test','Go To Record & Play',
           'Generate Login Test','Explain Locators','API Test Example',
           'Report Template','CI/CD Setup'];
      container.innerHTML = chips.map(c =>
        `<button class="pwc-chip" data-q="${c}">${c}</button>`
      ).join('');
      container.querySelectorAll('.pwc-chip').forEach(btn => {
        btn.addEventListener('click', () => this.sendMessage(btn.dataset.q));
      });
    }

    // ── Message rendering ────────────────────────────────────────────────────

    _appendUserBubble (text, isHtml = false) {
      const wrap = document.createElement('div');
      wrap.className = 'pwc-bubble user';
      const body = isHtml ? text : this._escapeHtml(text);
      wrap.innerHTML = `
        <div class="pwc-avatar user">👤</div>
        <div class="pwc-bubble-body">${body}</div>`;
      this.msgList.appendChild(wrap);
      this._scrollToBottom();
    }

    _appendBotBubble (html) {
      this._hideTypingDots();
      const wrap = document.createElement('div');
      wrap.className = 'pwc-bubble bot';
      wrap.innerHTML = `
        <div class="pwc-avatar bot">🤖</div>
        <div class="pwc-bubble-body">${html}</div>`;
      this.msgList.appendChild(wrap);
      // Show badge on FAB when panel is closed
      this._showBadge();
      // Wire copy buttons inside new bubble
      wrap.querySelectorAll('.pwc-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const code = btn.closest('.pwc-code-wrap').querySelector('code').textContent;
          this._copyToClipboard(code, btn);
        });
      });
      // Wire plain data-q chips (follow-up suggestions, etc.)
      wrap.querySelectorAll('.pwc-chip[data-q]').forEach(chip => {
        chip.addEventListener('click', () => this.sendMessage(chip.dataset.q));
      });
      // Wire image-action chips — restore pending image then dispatch
      wrap.querySelectorAll('.pwc-img-chip[data-img-action]').forEach(chip => {
        chip.addEventListener('click', () => {
          const action = chip.dataset.imgAction;
          // Find the image from the preceding user bubble (image was pasted there)
          const allBubbles = Array.from(this.msgList.querySelectorAll('.pwc-bubble'));
          const botBubbleIndex = allBubbles.indexOf(wrap);
          const prevUserBubble = allBubbles.slice(0, botBubbleIndex).reverse()
            .find(b => b.classList.contains('user'));
          const imgEl = prevUserBubble?.querySelector('img');
          const imgSrc = imgEl?.src || null;
          const imgLabel = prevUserBubble?.querySelector('[style*="94a3b8"]')
            ?.textContent?.trim() || 'screenshot';
          // Restore pending image so _dispatchWithImage can use it
          this._pendingImage = { label: imgLabel, dataUrl: imgSrc };
          const promptMap = {
            'img:write_tests': 'write test cases for this screenshot',
            'img:execute':     'execute test cases',
            'img:add_step':    'add this as a test step',
            'img:debug':       'debug this failure',
            'img:report':      'generate report',
            'img:identify':    'identify UI elements in this screenshot',
          };
          this.sendMessage(promptMap[action] || action);
        });
      });
      this._scrollToBottom();
    }

    _showTypingDots () {
      this._hideTypingDots();
      const wrap = document.createElement('div');
      wrap.className = 'pwc-bubble bot';
      wrap.id = 'pwc-typing';
      wrap.innerHTML = `
        <div class="pwc-avatar bot">🤖</div>
        <div class="pwc-typing-wrap">
          <span class="pwc-dot"></span>
          <span class="pwc-dot"></span>
          <span class="pwc-dot"></span>
        </div>`;
      this.msgList.appendChild(wrap);
      this._scrollToBottom();
    }

    _hideTypingDots () {
      const el = document.getElementById('pwc-typing');
      if (el) el.remove();
    }

    _scrollToBottom () {
      if (this.msgList) this.msgList.scrollTop = this.msgList.scrollHeight;
    }

    // ── Core message processing ──────────────────────────────────────────────

    _processMessage (raw) {
      this._showTypingDots();
      const delay = 400 + Math.random() * 300;
      setTimeout(async () => {
        let html;
        if (this._pendingImage) {
          // User is responding to an attached screenshot — handle with image context
          const img = this._pendingImage;
          this._pendingImage = null; // consume it
          html = this._dispatchWithImage(img, raw);
        } else {
          const intent = this._detectIntent(raw);
          html = await this._dispatch(intent, raw);
        }
        this._appendBotBubble(html);
        this._renderChips();
      }, delay);
    }

    // ── Intent detection ─────────────────────────────────────────────────────

    _detectIntent (msg) {
      const lower = msg.toLowerCase().trim();
      console.log('[CHATBOT DEBUG] Input:', msg);
      console.log('[CHATBOT DEBUG] Lower:', lower);
      for (const row of INTENT_TABLE) {
        if (row.rx.test(lower)) {
          console.log('[CHATBOT DEBUG] Matched intent:', row.intent);
          return row.intent;
        }
      }
      console.log('[CHATBOT DEBUG] No match, using FALLBACK');
      return 'FALLBACK';
    }

    // ── Dispatch ─────────────────────────────────────────────────────────────

    async _dispatch (intent, raw) {
      console.log('[CHATBOT DEBUG] Dispatching intent:', intent);
      switch (intent) {
        // ── Image-context action (shouldn't normally reach here but safety) ──
        case 'IMG_ACTION':      return this._imgFallback(raw);
        // ── Action handlers ──────────────────────────────────────────────────
        case 'DO_RECORD_START': return this._doRecordStart(raw);
        case 'DO_RECORD_STOP':  return this._doRecordStop();
        case 'DO_CAPTURE':      return this._doCapture(raw);
        case 'DO_CAPTURE_ASSERTIONS': return this._doCaptureAssertions(raw);
        case 'DO_RUN_ALL':      return this._doRunAll();
        case 'DO_RUN_TEST':     return this._doRunTest(raw);
        case 'DO_STOP_TESTS':   return this._doStopTests();
        case 'DO_UPDATE_TEST':  return this._doUpdateTest(raw);
        case 'DO_SAVE_TEST':    return this._doSaveTest(raw);
        case 'DO_DELETE_TEST':  return this._doDeleteTest(raw);
        case 'DO_EXPORT_TESTS': return await this._doExportTests(raw);
        case 'DO_WRITE_TEST':   return this._doWriteTest(raw);
        case 'DO_NAVIGATE':     return this._doNavigate(raw);
        case 'DO_REPORTS':      return this._doOpenReports();
        // ── Informational handlers ───────────────────────────────────────────
        case 'LIST_TESTS':   return await this._genListTests();
        case 'ADD_STEP':     return this._genAddStep(raw);
        case 'GEN_LOGIN':    return this._genLogin();
        case 'GEN_CART':     return this._genCart();
        case 'GEN_SEARCH':   return this._genSearch();
        case 'GEN_REGISTER': return this._genRegister();
        case 'GEN_API':      return this._genApiTest();
        case 'GEN_TEST':     return this._genGenericTest(raw);
        case 'NAVIGATE':     return this._genNavigate(raw);
        case 'CLICK':        return this._genClick(raw);
        case 'FILL':         return this._genFill(raw);
        case 'SELECT':       return this._genSelect(raw);
        case 'ASSERT':       return this._genAssert(raw);
        case 'LOCATORS':     return this._explainLocators();
        case 'FIXTURES':     return this._explainFixtures();
        case 'DEBUG':        return this._explainDebug();
        case 'POM':          return this._explainPOM();
        case 'PARALLEL':     return this._explainParallel();
        case 'CODEGEN':      return this._explainCodegen();
        case 'REPORT':       return this._explainReport();
        case 'CI_CD':        return this._explainCiCd();
        case 'HELP':         return this._genHelp();
        default:             return this._genFallback(raw);
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CODE GENERATION TEMPLATES
    // ══════════════════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════════
    // IMAGE-CONTEXT HANDLERS — called when user replies after pasting a screenshot
    // ══════════════════════════════════════════════════════════════════════════

    _dispatchWithImage (img, raw) {
      const r = raw.toLowerCase();
      if (/write.*test|create.*test|generate.*test|test.*case/i.test(r))  return this._imgWriteTests(img, raw);
      if (/execut|run.*test|play.*test/i.test(r))                          return this._imgExecuteTests(img, raw);
      if (/add.*step|new.*step|append.*step/i.test(r))                     return this._imgAddStep(img, raw);
      if (/debug|fail|error|broken|issue|fix/i.test(r))                    return this._imgDebug(img, raw);
      if (/report/i.test(r))                                               return this._doOpenReports();
      if (/identify|element|selector|locator|find/i.test(r))               return this._imgIdentifyElements(img, raw);
      if (/start.*record|record.*test/i.test(r))                           return this._doRecordStart(raw);
      return this._imgFallback(raw);
    }

    _imgWriteTests (img, raw) {
      // Extract any description the user gave
      const desc = raw.replace(/write.*test.*cases?.*for.*this/i, '').replace(/write.*test/i, '').trim()
                   || 'the page shown in the screenshot';
      const code = this._generateCodeFromDescription(desc || 'verify page elements are visible');
      const tcNum = this._getTestCount() + 1;
      const tcName = `TC${String(tcNum).padStart(2,'0')}_Screenshot_${desc.split(/\s+/).slice(0,3).map(w => w.charAt(0).toUpperCase()+w.slice(1)).join('').replace(/[^a-zA-Z0-9]/g,'')||'Test'}`;

      this._saveGeneratedTest(tcName, desc || 'Test from screenshot', code);

      return `
        <p>✅ <b>Test case generated from your screenshot!</b></p>
        <p style="color:#64748b;font-size:12px">📋 <em>${this._escapeHtml(desc || 'Page test')}</em></p>
        ${this._codeBlock(code, 'typescript')}
        <p>Test saved as <code style="color:#c4b5fd">${this._escapeHtml(tcName)}</code></p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          <button class="pwc-chip" data-q="execute test cases">▶️ Execute now</button>
          <button class="pwc-chip" data-q="capture the tests">📸 Capture screenshots</button>
          <button class="pwc-chip" data-q="list my tests">📋 View all tests</button>
        </div>`;
    }

    _imgExecuteTests (img, raw) {
      // Run all tests or a specific one mentioned
      const data = global.testScenariosData || {};
      const allTests = Object.values(data).flat().filter(Boolean);
      const lower = raw.toLowerCase();
      const match = allTests.find(t => t.name && lower.includes(t.name.toLowerCase()));

      if (match) {
        if (typeof global.showPage === 'function') global.showPage(2);
        const cfg = typeof global.getTestConfiguration === 'function'
          ? global.getTestConfiguration()
          : { retries: 0, workers: 1, browser: 'chromium', headless: true };
        fetch('http://localhost:3456/api/run-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testCaseName: match.name, testCaseId: match.id, ...cfg })
        }).catch(() => {});
        return `<p>▶️ <b>Executing: "${this._escapeHtml(match.name)}"</b></p>
          <p>Check the terminal for live output.</p>
          <button class="pwc-chip" data-q="open report">📊 Open report when done</button>`;
      }

      if (typeof global.runAllTests === 'function') {
        if (typeof global.showPage === 'function') global.showPage(2);
        global.runAllTests();
      }

      return `<p>▶️ <b>Running all test cases!</b></p>
        <p>Executing the full test suite. Check the terminal for output.</p>
        ${allTests.length ? `<p><b>${allTests.length}</b> test(s) in queue.</p>` : ''}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          <button class="pwc-chip" data-q="open report">📊 Open report</button>
          <button class="pwc-chip" data-q="list my tests">📋 View tests</button>
        </div>`;
    }

    _imgAddStep (img, raw) {
      const data = global.testScenariosData || {};
      const allTests = Object.values(data).flat().filter(Boolean);
      if (!allTests.length) {
        return `<p>⚠️ No saved tests found.</p><p>Say <b>"write test cases"</b> to create one from your screenshot first.</p>`;
      }
      const rows = allTests.slice(0,6).map((t,i) =>
        `<tr><td style="padding:3px 8px;color:#94a3b8">${i+1}</td>
             <td style="padding:3px 8px;color:#e2e8f0">${this._escapeHtml(t.name||'—')}</td></tr>`
      ).join('');
      return `<p>➕ <b>Which test should I add this step to?</b></p>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:8px">${rows}</table>
        <p style="color:#64748b;font-size:11px">Type: <em>"add step to [test name] — click Login button"</em></p>`;
    }

    _imgDebug (img, raw) {
      return `<p>🐛 <b>Debugging your screenshot</b></p>
        <p>Based on your screenshot, here are the most common causes and fixes:</p>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <tr><td style="padding:4px 8px;color:#f87171;white-space:nowrap">Element not found</td>
              <td style="padding:4px 8px;color:#94a3b8">Selector may be wrong or element is inside an iframe</td></tr>
          <tr><td style="padding:4px 8px;color:#f87171;white-space:nowrap">Timeout</td>
              <td style="padding:4px 8px;color:#94a3b8">Page/API took too long — increase <code>timeout</code> or wait for <code>networkidle</code></td></tr>
          <tr><td style="padding:4px 8px;color:#f87171;white-space:nowrap">Overlay/modal</td>
              <td style="padding:4px 8px;color:#94a3b8">Press Escape or dismiss the overlay before interacting</td></tr>
          <tr><td style="padding:4px 8px;color:#f87171;white-space:nowrap">Assertion failed</td>
              <td style="padding:4px 8px;color:#94a3b8">Use <code>toBeVisible()</code> instead of checking innerHTML</td></tr>
        </table>
        ${this._codeBlock(`// Wait for element before acting
await page.waitForSelector('.target-element', { state: 'visible' });

// Dismiss overlays
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// Retry-safe assertion
await expect(page.locator('.result')).toBeVisible({ timeout: 10000 });

// Enable traces to see exactly what happened
// playwright.config.ts → use: { trace: 'on' }
// Then: npx playwright show-report`, 'typescript')}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          <button class="pwc-chip" data-q="open report">📊 Open report</button>
          <button class="pwc-chip" data-q="capture the tests">📸 Recapture screenshots</button>
        </div>`;
    }

    _imgIdentifyElements (img, raw) {
      return `<p>🔍 <b>UI Element Identification</b></p>
        <p>To get reliable Playwright selectors for elements visible in your screenshot, use the <b>Playwright Inspector</b>:</p>
        ${this._codeBlock(`# Launch Inspector — hover over any element to get its locator
npx playwright codegen http://your-app.com

# Or pause inside a test to inspect
await page.pause();`, 'bash')}
        <p><b>Priority selector order (most to least resilient):</b></p>
        ${this._codeBlock(`// 1. Role-based (best)
await page.getByRole('button', { name: 'Add to Cart' }).click();

// 2. Label
await page.getByLabel('Username').fill('admin');

// 3. Placeholder
await page.getByPlaceholder('Search products').fill('laptop');

// 4. Text
await page.getByText('Sign In').click();

// 5. Test ID (if dev adds data-testid)
await page.getByTestId('submit-btn').click();

// 6. CSS/XPath (last resort)
await page.locator('#login-btn').click();`, 'typescript')}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          <button class="pwc-chip" data-q="write test cases for this screenshot">✏️ Write tests</button>
          <button class="pwc-chip" data-q="start recording">⏺ Start recording</button>
        </div>`;
    }

    _imgFallback (raw) {
      return `<p>🤔 <b>What would you like me to do with your screenshot?</b></p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
          ${[
            ['✏️ Write test cases',    'write test cases for this screenshot'],
            ['▶️ Execute test cases',  'execute test cases'],
            ['➕ Add as a step',       'add this as a test step'],
            ['🐛 Debug this failure',  'debug this failure'],
            ['🔍 Identify elements',   'identify UI elements in this screenshot'],
            ['📊 Generate report',     'generate report'],
          ].map(([l,q]) => `<button class="pwc-chip" data-q="${q}">${l}</button>`).join('')}
        </div>`;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ACTION HANDLERS — call real dashboard functions
    // ══════════════════════════════════════════════════════════════════════════

    _doRecordStart (raw) {
      // Extract URL if provided in prompt e.g. "start recording https://..."
      const urlMatch = raw.match(/https?:\/\/\S+/i);
      try {
        if (typeof global.showPage === 'function') global.showPage(1);
        // Pre-fill URL if user provided one
        if (urlMatch) {
          const urlEl = document.getElementById('appUrl');
          if (urlEl) urlEl.value = urlMatch[0];
        }
        if (typeof global.startRecording === 'function') {
          global.startRecording();
          const url = document.getElementById('appUrl')?.value || 'the configured URL';
          return `<p>⏺ <b>Recording started!</b></p>
            <p>Browser is launching for: <code style="background:#2d2d4a;padding:1px 6px;border-radius:3px;color:#c4b5fd">${this._escapeHtml(url)}</code></p>
            <ul>
              <li>Interact with your application in the opened browser</li>
              <li>Playwright will record every click, type, and navigation</li>
              <li>Say <b>"stop recording"</b> when done to save the test</li>
            </ul>`;
        }
        return `<p>⚠️ Please switch to the <b>Record &amp; Play</b> tab and click <b>Start Recording</b>.</p>`;
      } catch (e) {
        return `<p>❌ Error: ${this._escapeHtml(e.message)}</p>`;
      }
    }

    _doRecordStop () {
      try {
        if (typeof global.stopRecording === 'function') {
          global.stopRecording();
          return `<p>⏹ <b>Recording stopped!</b></p>
            <p>A dialog will appear to <b>name and save</b> your test case.</p>
            <p>After saving you can:</p>
            <ul>
              <li>Say <b>"capture the test"</b> to take UI screenshots for each step</li>
              <li>Say <b>"list my tests"</b> to see all saved test cases</li>
              <li>Say <b>"run all tests"</b> to execute the test suite</li>
            </ul>`;
        }
        return `<p>⚠️ No active recording session found.</p>`;
      } catch (e) {
        return `<p>❌ Error: ${this._escapeHtml(e.message)}</p>`;
      }
    }

    _doCapture (raw) {
      // Try to extract a test name from the prompt
      const data = global.testScenariosData || {};
      const allTests = Object.values(data).flat().filter(Boolean);
      if (!allTests.length) {
        return `<p>⚠️ No saved test cases found.</p>
          <p>Record a test first by saying <b>"start recording"</b>, then save it.</p>`;
      }
      // Check if user mentioned a specific test name
      const lower = raw.toLowerCase();
      const match = allTests.find(t => t.name && lower.includes(t.name.toLowerCase()));
      if (match) {
        // Navigate to Test Scenarios and trigger capture
        if (typeof global.showPage === 'function') global.showPage(2);
        if (typeof global.loadSavedTests === 'function' && typeof global.renderTestScenarios === 'function') {
          global.loadSavedTests().then(() => global.renderTestScenarios());
        }
        // Attempt to call captureScreenshotsForTest via fetch
        this._triggerCapture(match.name);
        return `<p>📸 <b>Capturing screenshots for: "${this._escapeHtml(match.name)}"</b></p>
          <p>Running the test headlessly and taking a screenshot after each step…</p>
          <p>Check the <b>Test Scenarios</b> tab — step cards will update with UI snapshots.</p>`;
      }
      // No specific test — show list to choose
      if (typeof global.showPage === 'function') global.showPage(2);
      let rows = allTests.slice(0, 8).map((t, i) =>
        `<tr><td style="padding:3px 8px;color:#94a3b8">${i+1}</td>
             <td style="padding:3px 8px;color:#e2e8f0">${this._escapeHtml(t.name||'—')}</td></tr>`
      ).join('');
      return `<p>📸 <b>Which test should I capture?</b></p>
        <p>Say <b>"capture [test name]"</b> or click a test in the <b>Test Scenarios</b> tab and use the 📸 Capture button.</p>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:8px">${rows}</table>`;
    }

    async _triggerCapture (testName) {
      try {
        const resp = await fetch('http://localhost:3456/get-saved-tests');
        const data = await resp.json();
        const stored = (data.tests || []).find(t => t.name === testName);
        if (!stored || !stored.playwrightCode) return;
        await fetch('http://localhost:3456/api/capture-screenshots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testName: stored.name, playwrightCode: stored.playwrightCode })
        });
      } catch (_) {}
    }

    _doRunAll () {
      // Kick off async execution and return immediately with a "running" placeholder
      const placeholderId = 'pwc-run-' + Date.now();
      // Async: POST to server, replace placeholder when done
      fetch('/api/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retries: 0, workers: 1, browser: 'chromium', headless: true })
      })
        .then(r => r.json())
        .then(data => {
          const el = document.getElementById(placeholderId);
          if (!el) return;
          const icon   = data.success ? '✅' : '❌';
          const secs   = data.duration ? (data.duration / 1000).toFixed(1) : '?';
          let summary  = `<p>${icon} <b>${data.message || (data.success ? 'Test suite started!' : 'Failed to start tests')}</b></p>`;
          if (secs !== '?') summary = `<p>${icon} <b>Test suite completed in ${secs}s</b></p>`;
          summary += `<table style="width:100%;font-size:12px;border-collapse:collapse;margin:6px 0">
            <tr>
              <td style="padding:4px 8px;color:#94a3b8">Total</td>
              <td style="padding:4px 8px;color:#e2e8f0;font-weight:bold">${data.total || 0}</td>
            </tr>
            <tr>
              <td style="padding:4px 8px;color:#94a3b8">Passed</td>
              <td style="padding:4px 8px;color:#22c55e;font-weight:bold">${data.passed || 0}</td>
            </tr>
            <tr>
              <td style="padding:4px 8px;color:#94a3b8">Failed</td>
              <td style="padding:4px 8px;color:#ef4444;font-weight:bold">${data.failed || 0}</td>
            </tr>
            ${data.skipped ? `<tr><td style="padding:4px 8px;color:#94a3b8">Skipped</td><td style="padding:4px 8px;color:#f59e0b;font-weight:bold">${data.skipped}</td></tr>` : ''}
          </table>`;
          if (data.error) {
            summary += `<p style="color:#ef4444;font-size:11px">⚠️ ${this._escapeHtml(data.error)}</p>`;
          }
          if (Array.isArray(data.tests) && data.tests.length) {
            const rows = data.tests.slice(0, 10).map(t =>
              `<tr>
                <td style="padding:2px 6px">${t.status === 'passed' ? '✅' : '❌'}</td>
                <td style="padding:2px 6px;color:#e2e8f0;font-size:11px">${this._escapeHtml(t.title)}</td>
              </tr>`
            ).join('');
            summary += `<table style="width:100%;border-collapse:collapse;margin-top:4px">${rows}</table>`;
            if (data.tests.length > 10) {
              summary += `<p style="color:#94a3b8;font-size:11px">...and ${data.tests.length - 10} more. Open the full report for details.</p>`;
            }
          }
          summary += `<p style="margin-top:8px">📊 <b>To view the full HTML report:</b></p>
            <div class="pwc-chips" style="margin-top:4px">
              <button class="pwc-chip" data-q="open report">Open HTML Report</button>
            </div>`;
          el.innerHTML = summary;
          // Re-wire chips inside the updated placeholder
          el.querySelectorAll('.pwc-chip[data-q]').forEach(chip => {
            chip.addEventListener('click', () => this.sendMessage(chip.dataset.q));
          });
        })
        .catch(err => {
          const el = document.getElementById(placeholderId);
          if (el) el.innerHTML = `<p>❌ Could not reach server: ${this._escapeHtml(err.message)}</p>
            <p style="font-size:11px;color:#94a3b8">Make sure the dashboard server is running, then open a terminal and run:<br>
            <code>npx playwright test</code></p>`;
        });

      return `<p>🚀 <b>Running all tests now…</b></p>
        <p style="color:#94a3b8;font-size:12px">This may take a minute or two depending on the number of tests.</p>
        <div id="${placeholderId}" style="margin-top:8px">
          <div style="display:flex;align-items:center;gap:8px;color:#94a3b8;font-size:12px">
            <span class="pwc-typing-dot" style="animation:pwc-bounce 1s infinite 0s"></span>
            <span class="pwc-typing-dot" style="animation:pwc-bounce 1s infinite .2s"></span>
            <span class="pwc-typing-dot" style="animation:pwc-bounce 1s infinite .4s"></span>
            <span>Executing test suite…</span>
          </div>
        </div>`;
    }

    _doRunTest (raw) {
      const data = global.testScenariosData || {};
      const allTests = Object.values(data).flat().filter(Boolean);
      const lower = raw.toLowerCase();
      const match = allTests.find(t => t.name && lower.includes(t.name.toLowerCase()));
      if (match) {
        if (typeof global.showPage === 'function') global.showPage(2);
        // Use the API directly — runTestCase(moduleIndex, tcIndex) signature doesn't accept a name
        const config = typeof global.getTestConfiguration === 'function'
          ? global.getTestConfiguration()
          : { retries: 0, workers: 1, browser: 'chromium', headless: true };
        fetch('http://localhost:3456/api/run-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testCaseName: match.name, testCaseId: match.id, ...config })
        }).catch(() => {});
        return `<p>▶️ <b>Running: "${this._escapeHtml(match.name)}"</b></p>
          <p>Check the terminal for live test output.</p>
          <p>Say <b>"open report"</b> when done.</p>`;
      }
      if (!allTests.length) {
        return `<p>⚠️ No saved tests found. Say <b>"start recording"</b> to create one.</p>`;
      }
      let rows = allTests.slice(0,6).map((t,i) =>
        `<tr><td style="padding:3px 8px;color:#94a3b8">${i+1}</td>
             <td style="padding:3px 8px;color:#e2e8f0">${this._escapeHtml(t.name||'—')}</td></tr>`
      ).join('');
      return `<p>▶️ <b>Which test to run?</b></p>
        <p>Say <b>"run [test name]"</b> or click <b>Run</b> in the Test Scenarios tab.</p>
        <table style="width:100%;font-size:12px;border-collapse:collapse">${rows}</table>`;
    }

    _doStopTests () {
      fetch('/api/stop-tests', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          const el = document.getElementById('pwc-stop-result');
          if (el) el.innerHTML = data.success
            ? `<p style="color:#22c55e">✅ ${this._escapeHtml(data.message || 'Test execution stopped.')}</p>`
            : `<p style="color:#ef4444">⚠️ ${this._escapeHtml(data.message || 'No tests were running.')}</p>`;
        })
        .catch(() => {});
      return `<p>⏹️ <b>Stopping test execution…</b></p>
        <div id="pwc-stop-result" style="margin-top:6px;color:#94a3b8;font-size:12px">Sending stop signal to server…</div>
        <p style="color:#64748b;font-size:11px;margin-top:8px">If tests do not stop, press <b>Ctrl+C</b> in the terminal.</p>`;
    }

    async _doExportTests (raw) {
      console.log('[CHATBOT EXPORT] Starting export...');
      
      // Auto-load tests if not already loaded
      const data = global.testScenariosData || {};
      if (Object.keys(data).length === 0) {
        console.log('[CHATBOT EXPORT] testScenariosData empty, loading tests...');
        if (typeof global.loadSavedTests === 'function') {
          await global.loadSavedTests();
        }
      }
      
      const loadedData = global.testScenariosData || {};
      console.log('[CHATBOT EXPORT] testScenariosData:', loadedData);
      console.log('[CHATBOT EXPORT] Object.keys:', Object.keys(loadedData));
      const allTests = Object.values(loadedData).flat().filter(Boolean);
      console.log('[CHATBOT EXPORT] allTests count:', allTests.length);
      
      if (!allTests.length) {
        return `<p>⚠️ No tests found to export.</p>
          <p>Say <b>"start recording"</b> to create some tests first.</p>
          <p style="color:#64748b;font-size:11px">Debug: window.testScenariosData keys: ${Object.keys(global.testScenariosData || {}).join(', ')}</p>`;
      }

      // Determine export format from user input
      const lower = raw.toLowerCase();
      const format = lower.includes('csv') ? 'csv' : 'excel';

      // Generate export data
      const csvData = this._generateTestsCSV(allTests);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `playwright-tests-${new Date().toISOString().split('T')[0]}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return `<p>📥 <b>Exporting ${allTests.length} test case(s)</b></p>
        <p>✅ Tests exported successfully as CSV file!</p>
        <p style="color:#64748b;font-size:12px">File downloaded: <code>playwright-tests-${new Date().toISOString().split('T')[0]}.csv</code></p>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:8px">
          <tr><td style="padding:4px 8px;color:#94a3b8">Total Tests:</td>
              <td style="padding:4px 8px;color:#e2e8f0;font-weight:bold">${allTests.length}</td></tr>
          <tr><td style="padding:4px 8px;color:#94a3b8">Format:</td>
              <td style="padding:4px 8px;color:#e2e8f0">CSV (Excel compatible)</td></tr>
        </table>
        <p style="color:#64748b;font-size:11px;margin-top:8px">💡 You can open this file in Microsoft Excel, Google Sheets, or any spreadsheet application.</p>`;
    }

    _generateTestsCSV (tests) {
      // CSV header
      let csv = 'Test ID,Test Name,Description,Category,Steps,Created Date\n';
      
      // Add each test as a row
      tests.forEach(test => {
        const testId = this._escapeCSV(test.name || '');
        const testName = this._escapeCSV(test.name || '');
        const description = this._escapeCSV(test.description || 'No description');
        const category = 'Recorded Test';
        const steps = this._escapeCSV(test.steps ? test.steps.length + ' steps' : 'N/A');
        const date = new Date().toISOString().split('T')[0];
        
        csv += `${testId},${testName},${description},${category},${steps},${date}\n`;
      });
      
      return csv;
    }

    _escapeCSV (str) {
      if (typeof str !== 'string') return '';
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    _doUpdateTest (raw) {
      const data = global.testScenariosData || {};
      const allTests = Object.values(data).flat().filter(Boolean);
      
      if (!allTests.length) {
        return `<p>⚠️ No tests found to update.</p>
          <p>Say <b>"start recording"</b> to create some tests first.</p>`;
      }

      const lower = raw.toLowerCase();
      const match = allTests.find(t => t.name && lower.includes(t.name.toLowerCase()));

      if (match) {
        // Navigate to Test Scenarios tab
        if (typeof global.showPage === 'function') global.showPage(1);
        return `<p>✏️ <b>Update Test: "${this._escapeHtml(match.name)}"</b></p>
          <p>I've navigated to the <b>Test Scenarios</b> tab. To update this test:</p>
          <ol style="margin:8px 0;padding-left:20px;color:#94a3b8;font-size:12px">
            <li>Find the test "${this._escapeHtml(match.name)}" in the list</li>
            <li>Click the <b>✏️ Edit</b> button</li>
            <li>Modify the test steps, code, or assertions</li>
            <li>Click <b>💾 Save Changes</b> when done</li>
          </ol>
          <p style="color:#64748b;font-size:11px">💡 You can add new steps, edit existing ones, or delete steps you don't need.</p>`;
      }

      // Show available tests
      const rows = allTests.slice(0, 8).map((t, i) =>
        `<tr><td style="padding:3px 8px;color:#94a3b8">${i + 1}</td>
             <td style="padding:3px 8px;color:#e2e8f0">${this._escapeHtml(t.name || '—')}</td></tr>`
      ).join('');

      return `<p>✏️ <b>Which test would you like to update?</b></p>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin:8px 0">${rows}</table>
        <p>Say <b>"update test [test name]"</b> or manually navigate to the Test Scenarios tab and click the Edit button.</p>`;
    }

    _doSaveTest (raw) {
      const data = global.testScenariosData || {};
      const allTests = Object.values(data).flat().filter(Boolean);
      
      if (!allTests.length) {
        return `<p>⚠️ No tests found to save.</p>`;
      }

      // Navigate to Test Scenarios tab
      if (typeof global.showPage === 'function') global.showPage(1);

      return `<p>💾 <b>Saving Test Scenarios</b></p>
        <p>To save a test case:</p>
        <ol style="margin:8px 0;padding-left:20px;color:#94a3b8;font-size:12px">
          <li>Go to the <b>Test Scenarios</b> tab (opened for you)</li>
          <li>Click <b>✏️ Edit</b> on the test you want to save</li>
          <li>Make your changes</li>
          <li>Click <b>💾 Save Changes</b></li>
        </ol>
        <p>✅ All changes are automatically persisted to the server and test files.</p>
        <p style="color:#64748b;font-size:11px">💡 Test scenarios are saved to <code>test-cases-store.json</code> and generated as Playwright spec files in <code>src/tests/</code></p>`;
    }

    _doDeleteTest (raw) {
      const data = global.testScenariosData || {};
      const allTests = Object.values(data).flat().filter(Boolean);
      
      if (!allTests.length) {
        return `<p>⚠️ No tests found to delete.</p>`;
      }

      const lower = raw.toLowerCase();
      const match = allTests.find(t => t.name && lower.includes(t.name.toLowerCase()));

      if (match) {
        // Navigate to Test Scenarios tab
        if (typeof global.showPage === 'function') global.showPage(1);
        return `<p>🗑️ <b>Delete Test: "${this._escapeHtml(match.name)}"</b></p>
          <p>I've navigated to the <b>Test Scenarios</b> tab. To delete this test:</p>
          <ol style="margin:8px 0;padding-left:20px;color:#94a3b8;font-size:12px">
            <li>Find the test "${this._escapeHtml(match.name)}" in the list</li>
            <li>Click the <b>🗑️ Delete</b> button</li>
            <li>Confirm the deletion in the popup</li>
          </ol>
          <p style="color:#ef4444;font-size:11px">⚠️ Warning: This will permanently delete the test case, all its steps, and associated artifacts (spec files, screenshots, etc.).</p>`;
      }

      // Show available tests
      const rows = allTests.slice(0, 8).map((t, i) =>
        `<tr><td style="padding:3px 8px;color:#94a3b8">${i + 1}</td>
             <td style="padding:3px 8px;color:#e2e8f0">${this._escapeHtml(t.name || '—')}</td></tr>`
      ).join('');

      return `<p>🗑️ <b>Which test would you like to delete?</b></p>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin:8px 0">${rows}</table>
        <p>Say <b>"delete test [test name]"</b> or manually navigate to the Test Scenarios tab and click the Delete button.</p>
        <p style="color:#ef4444;font-size:11px">⚠️ Deletion is permanent and will remove all associated files.</p>`;
    }

    _doCaptureAssertions (raw) {
      const data = global.testScenariosData || {};
      const allTests = Object.values(data).flat().filter(Boolean);
      
      if (!allTests.length) {
        return `<p>⚠️ No tests found to capture assertions for.</p>
          <p>Say <b>"start recording"</b> to create some tests first.</p>`;
      }

      const lower = raw.toLowerCase();
      const captureType = lower.includes('snapshot') ? 'snapshot' : 
                         lower.includes('text') ? 'text' : 
                         lower.includes('code') ? 'code' : 'all';

      return `<p>📸 <b>Capturing Assertion ${captureType === 'all' ? 'Snapshots, Text & Code' : captureType.charAt(0).toUpperCase() + captureType.slice(1)}</b></p>
        <p>To capture assertions for your tests:</p>
        <ol style="margin:8px 0;padding-left:20px;color:#94a3b8;font-size:12px">
          <li><b>Go to Test Scenarios tab</b> - Navigate to see your test cases</li>
          <li><b>Select a test</b> - Click on the test you want to capture assertions for</li>
          <li><b>Click "🔍 View Details"</b> - Opens the detailed test panel</li>
          <li><b>Review assertions</b> - Each step shows:<br/>
            • <b>UI Snapshot</b> - Visual state of the page<br/>
            • <b>Assertion Text</b> - Expected behavior description<br/>
            • <b>Assertion Code</b> - Playwright expect() statements
          </li>
        </ol>
        <p><b>💡 Automatic Capture:</b></p>
        <ul style="margin:8px 0;padding-left:20px;color:#94a3b8;font-size:12px">
          <li>Assertions are auto-generated when you record tests</li>
          <li>Each action gets matching expect() statements</li>
          <li>Screenshots are captured during execution</li>
        </ul>
        <p><b>🎯 What Gets Captured:</b></p>
        <table style="width:100%;font-size:11px;border-collapse:collapse;margin-top:8px">
          <tr><td style="padding:4px 8px;color:#94a3b8">📸 Snapshots:</td>
              <td style="padding:4px 8px;color:#e2e8f0">UI state, element visibility</td></tr>
          <tr><td style="padding:4px 8px;color:#94a3b8">📝 Text:</td>
              <td style="padding:4px 8px;color:#e2e8f0">Assertion descriptions, validation messages</td></tr>
          <tr><td style="padding:4px 8px;color:#94a3b8">💻 Code:</td>
              <td style="padding:4px 8px;color:#e2e8f0">expect() statements, locators, matchers</td></tr>
        </table>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">
          <button class="pwc-chip" data-q="open test scenarios">📋 Go to Test Scenarios</button>
          <button class="pwc-chip" data-q="list my tests">📝 List All Tests</button>
          <button class="pwc-chip" data-q="run all tests">▶️ Run Tests</button>
        </div>`;
    }

    _doWriteTest (raw) {
      // Extract description — everything after "write a test" / "create a test case"
      const desc = raw
        .replace(/^(?:write|create|save|auto.?generate)\s+(?:a\s+)?(?:test\s*case|test)\s*/i, '')
        .trim();

      if (!desc || desc.length < 5) {
        return `<p>✏️ <b>Tell me what the test should do.</b></p>
          <p>For example:</p>
          <ul>
            <li>"write a test that logs in with admin/admin123"</li>
            <li>"create a test that searches for headphones and adds to cart"</li>
            <li>"write a test that verifies the homepage title"</li>
          </ul>`;
      }

      // Generate code from description
      const code = this._generateCodeFromDescription(desc);
      const tcNum = this._getTestCount() + 1;
      const tcName = `TC${String(tcNum).padStart(2,'0')}_Copilot_${desc.split(/\s+/).slice(0,3).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join('')}`;

      // Save via API
      this._saveGeneratedTest(tcName, desc, code);

      return `<p>✅ <b>Test case generated &amp; saved: <code style="color:#c4b5fd">${this._escapeHtml(tcName)}</code></b></p>
        <p>Description: <em>${this._escapeHtml(desc)}</em></p>
        ${this._codeBlock(code, 'typescript')}
        <p>The test has been saved to <b>Test Scenarios</b>. Say <b>"capture the test"</b> to add UI screenshots.</p>`;
    }

    _generateCodeFromDescription (desc) {
      const d = desc.toLowerCase();
      let url = 'http://advantageonlineshopping.com/';
      const urlMatch = desc.match(/https?:\/\/\S+/);
      if (urlMatch) url = urlMatch[0];

      const steps = [];
      steps.push(`  await page.goto('${url}');`);
      steps.push(`  await page.waitForLoadState('networkidle');`);

      if (/log.?in|sign.?in/.test(d)) {
        const uMatch = desc.match(/username[:\s]+(\S+)|user[:\s]+(\S+)/i);
        const pMatch = desc.match(/password[:\s]+(\S+)|pass[:\s]+(\S+)/i);
        const u = uMatch ? (uMatch[1]||uMatch[2]) : 'admin';
        const p = pMatch ? (pMatch[1]||pMatch[2]) : 'password';
        steps.push(`  await page.getByPlaceholder(/username/i).fill('${u}');`);
        steps.push(`  await page.getByPlaceholder(/password/i).fill('${p}');`);
        steps.push(`  await page.getByRole('button', { name: /sign in|login/i }).click();`);
        steps.push(`  await expect(page).toHaveURL(/dashboard|home|account/);`);
      }
      if (/search/.test(d)) {
        const qMatch = desc.match(/search\s+(?:for\s+)?["']?([a-z0-9 ]+)["']?/i);
        const q = qMatch ? qMatch[1].trim() : 'product';
        steps.push(`  await page.getByRole('searchbox').fill('${q}');`);
        steps.push(`  await page.keyboard.press('Enter');`);
        steps.push(`  await expect(page.locator('.results, .products, .search-results').first()).toBeVisible();`);
      }
      if (/add.?to.?cart|add.*cart/.test(d)) {
        steps.push(`  await page.locator('.product-item, .product-card').first().click();`);
        steps.push(`  await page.getByRole('button', { name: /add to cart/i }).click();`);
        steps.push(`  await expect(page.locator('.cart-count, .cart-badge')).not.toHaveText('0');`);
      }
      if (/checkout|payment/.test(d)) {
        steps.push(`  await page.getByRole('link', { name: /cart|checkout/i }).click();`);
        steps.push(`  await page.getByRole('button', { name: /checkout|place order/i }).click();`);
        steps.push(`  await expect(page).toHaveURL(/checkout|order/);`);
      }
      if (/title|heading|visible|exist/.test(d)) {
        const text = desc.match(/["']([^'"]+)['"]/)?.[1] || 'Welcome';
        steps.push(`  await expect(page.getByRole('heading').first()).toBeVisible();`);
        steps.push(`  await expect(page).toHaveTitle(/${text}/i);`);
      }
      if (/click/.test(d)) {
        const target = desc.match(/click\s+(?:on\s+)?(?:the\s+)?(.+)/i)?.[1] || 'button';
        steps.push(`  await page.getByText('${target}', { exact: false }).click();`);
      }

      if (steps.length <= 2) {
        steps.push(`  // TODO: Add test steps for: ${desc}`);
        steps.push(`  await expect(page).toHaveURL('${url}');`);
      }

      return `import { test, expect } from '@playwright/test';\n\ntest('${desc}', async ({ page }) => {\n${steps.join('\n')}\n});`;
    }

    async _saveGeneratedTest (name, desc, code) {
      try {
        const url = code.match(/page\.goto\(['"](.+?)['"]\)/)?.[1] || 'http://advantageonlineshopping.com/';
        await fetch('http://localhost:3456/save-testcase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: desc,
            steps: desc,
            playwrightCode: code,
            assertions: [],
            testCaseType: 'UI',
            browser: 'chromium',
            url,
            timestamp: Date.now(),
            detailedSteps: []
          })
        });
        if (typeof global.loadSavedTests === 'function' && typeof global.renderTestScenarios === 'function') {
          await global.loadSavedTests();
        }
      } catch (_) {}
    }

    _doNavigate (raw) {
      const r = raw.toLowerCase();
      const pages = [
        { rx: /dashboard|home|main/,            idx: 0, name: 'Dashboard' },
        { rx: /record|play|codegen/,             idx: 1, name: 'Record & Play' },
        { rx: /test\s*scenario|saved\s*test|test\s*case/, idx: 2, name: 'Test Scenarios' },
        { rx: /api\s*test|rest\s*api|api/,       idx: 3, name: 'API Tests' },
        { rx: /report/,                          idx: 4, name: 'Reports' },
        { rx: /config|setting/,                  idx: 5, name: 'Configuration' },
      ];
      const dest = pages.find(p => p.rx.test(r));
      if (dest && typeof global.showPage === 'function') {
        global.showPage(dest.idx);
        return `<p>✅ Navigated to the <b>${dest.name}</b> tab.</p>`;
      }
      return `<p>📍 <b>Where would you like to go?</b></p>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          ${pages.map(p => `<tr>
            <td style="padding:4px 8px;color:#c4b5fd;cursor:pointer" onclick="window.showPage(${p.idx})">${p.name}</td>
            <td style="padding:4px 8px;color:#64748b">say "go to ${p.name.toLowerCase()}"</td>
          </tr>`).join('')}
        </table>`;
    }

    _doOpenReports () {
      // Navigate dashboard to Reports tab
      if (typeof global.showPage === 'function') global.showPage(4);
      if (typeof global.viewReports === 'function') global.viewReports();

      // Also ask the server to open the HTML report in the browser
      fetch('/open-html-report', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (!data.success) {
            // No report yet — chatbot already shows instructions below
            console.info('[Copilot] open-html-report:', data.message || 'no report found');
          }
        })
        .catch(() => {/* server may not be running */});

      return `<p>📊 <b>Opening Reports!</b></p>
        <p>The <b>Reports tab</b> in the dashboard has been opened.</p>
        <p>The Playwright HTML report should also open in your browser automatically.</p>
        <p style="margin-top:8px;color:#94a3b8;font-size:12px">
          <b>No report yet?</b> Run the tests first — say <b>"run all tests"</b> or use:
        </p>
        ${this._codeBlock('npx playwright test --reporter=html\nnpx playwright show-report', 'bash')}
        <div class="pwc-chips" style="margin-top:6px">
          <button class="pwc-chip" data-q="run all tests">Run All Tests</button>
        </div>`;
    }

    // ══════════════════════════════════════════════════════════════════════════

    async _genListTests () {
      console.log('[CHATBOT DEBUG] _genListTests called');
      
      // Auto-load tests if not already loaded
      const data = global.testScenariosData || {};
      if (Object.keys(data).length === 0) {
        console.log('[CHATBOT DEBUG] testScenariosData empty, loading tests...');
        if (typeof global.loadSavedTests === 'function') {
          await global.loadSavedTests();
        }
      }
      
      const loadedData = global.testScenariosData || {};
      console.log('[CHATBOT DEBUG] testScenariosData:', loadedData);
      console.log('[CHATBOT DEBUG] testScenariosData keys:', Object.keys(loadedData));
      const entries = Object.entries(loadedData);
      if (!entries.length) {
        return `<p>No test cases found yet.</p>
          <p>👉 Go to <b>Record &amp; Play</b>, record a session, and save a test case first!</p>`;
      }
      let rows = '';
      let total = 0;
      entries.forEach(([module, cases]) => {
        if (!Array.isArray(cases) || !cases.length) return;
        total += cases.length;
        rows += `<tr style="background:#2a1f5a">
          <td colspan="3" style="padding:5px 8px;font-weight:700;color:#c4b5fd;font-size:12px">
            📁 ${this._escapeHtml(module)} (${cases.length})
          </td></tr>`;
        cases.forEach((tc, i) => {
          rows += `<tr>
            <td style="padding:4px 8px;color:#94a3b8;font-size:11px">${i+1}</td>
            <td style="padding:4px 8px;color:#e2e8f0;font-size:12px">${this._escapeHtml(tc.name||'—')}</td>
            <td style="padding:4px 8px;color:#64748b;font-size:11px">${(tc.steps||[]).length} steps</td>
          </tr>`;
        });
      });
      return `<p><b>📋 Your Test Cases</b> <span class="pwc-tag">${total} total</span></p>
        <div style="overflow-x:auto;margin-top:8px">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="border-bottom:1px solid #3b3b5c">
            <th style="padding:5px 8px;color:#64748b;text-align:left;font-weight:600">#</th>
            <th style="padding:5px 8px;color:#64748b;text-align:left;font-weight:600">Name</th>
            <th style="padding:5px 8px;color:#64748b;text-align:left;font-weight:600">Steps</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        <p style="margin-top:10px;color:#64748b;font-size:11px">
          💡 Say <b>"Add step to &lt;test name&gt;"</b> to add a step to any test.
        </p>`;
    }

    _genAddStep (raw) {
      // Try to extract a test case name from the raw message
      const data = global.testScenariosData || {};
      const allTests = Object.values(data).flat();

      // Look for a test name mentioned in the message
      const found = allTests.find(tc =>
        raw.toLowerCase().includes((tc.name||'').toLowerCase())
      );

      if (allTests.length === 0) {
        return `<p>No test cases found to add a step to.</p>
          <p>Record and save a test case first, then come back!</p>`;
      }

      if (found) {
        return `<p>✅ Found test case: <b>${this._escapeHtml(found.name)}</b></p>
          <p>To add a step, use the <b>➕ Add Step</b> button in the <b>Test Scenarios</b> tab
          on that test case, then enter the step description and Playwright code.</p>
          <p><b>Example step code:</b></p>
          ${this._codeBlock(`await page.getByRole('button', { name: 'Submit' }).click();`, 'typescript')}
          <p>Or tell me what the step should do and I'll generate the code! 💡</p>`;
      }

      const list = allTests.slice(0,5).map(tc =>
        `<li><b>${this._escapeHtml(tc.name)}</b></li>`
      ).join('');
      return `<p>Which test case should I add a step to? Here are your tests:</p>
        <ul>${list}</ul>
        <p>Say something like: <b>"add step to ${allTests[0]?.name || 'My Test'}"</b></p>`;
    }

    _genLogin () {
      return `<p><b>🔐 Login Test</b></p>
        ${this._codeBlock(`import { test, expect } from '@playwright/test';

test.describe('Login Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://your-app.com/login');
  });

  test('successful login with valid credentials', async ({ page }) => {
    // Fill credentials
    await page.getByLabel('Username').fill('testuser@example.com');
    await page.getByLabel('Password').fill('SecurePass123!');

    // Submit
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Assert successful redirect
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText('Welcome')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Username').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpass');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
    await expect(page).toHaveURL(/login/); // stays on login
  });
});`, 'typescript')}
        <p>💡 <b>Tips:</b></p>
        <ul>
          <li>Use <code style="background:#2d2d4a;padding:1px 5px;border-radius:3px;font-size:11px">getByLabel</code> — most reliable for form fields</li>
          <li>Store credentials in <code style="background:#2d2d4a;padding:1px 5px;border-radius:3px;font-size:11px">.env</code> or fixtures, never hardcode</li>
        </ul>`;
    }

    _genCart () {
      return `<p><b>🛒 Add to Cart Test</b></p>
        ${this._codeBlock(`import { test, expect } from '@playwright/test';

test('add product to cart', async ({ page }) => {
  // Navigate to product catalog
  await page.goto('http://advantageonlineshopping.com/#/');

  // Click on a category
  await page.getByRole('link', { name: 'TABLETS' }).click();

  // Select a product
  await page.getByRole('link', { name: 'View Details' }).first().click();

  // Choose options
  await page.getByTitle('GRAY').click();

  // Set quantity and add to cart
  await page.getByRole('button', { name: 'ADD TO CART' }).click();

  // Assert cart updated
  await expect(page.locator('.cart-count')).not.toHaveText('0');
  await expect(page.getByText('CHECKOUT')).toBeVisible();
});`, 'typescript')}`;
    }

    _genSearch () {
      return `<p><b>🔍 Search Test</b></p>
        ${this._codeBlock(`import { test, expect } from '@playwright/test';

test('search for a product', async ({ page }) => {
  await page.goto('https://your-app.com');

  // Locate and use the search box
  await page.getByPlaceholder('Search…').fill('Tablet');
  await page.keyboard.press('Enter');

  // Assert results page
  await expect(page).toHaveURL(/search/);
  await expect(page.getByRole('heading', { name: /results/i })).toBeVisible();

  // Assert at least one result
  const results = page.locator('.product-card');
  await expect(results).toHaveCount({ min: 1 });
});`, 'typescript')}`;
    }

    _genRegister () {
      return `<p><b>📝 Registration Test</b></p>
        ${this._codeBlock(`import { test, expect } from '@playwright/test';

test('register a new user', async ({ page }) => {
  await page.goto('https://your-app.com/register');

  await page.getByLabel('First Name').fill('John');
  await page.getByLabel('Last Name').fill('Doe');
  await page.getByLabel('Email').fill(\`test+\${Date.now()}@example.com\`);
  await page.getByLabel('Password').fill('SecurePass123!');
  await page.getByLabel('Confirm Password').fill('SecurePass123!');

  // Agree to terms
  await page.getByRole('checkbox', { name: /terms/i }).check();

  await page.getByRole('button', { name: 'Register' }).click();

  // Assert success
  await expect(page).toHaveURL(/welcome|dashboard/);
  await expect(page.getByText('Account created')).toBeVisible();
});`, 'typescript')}
        <p>💡 Use <code style="background:#2d2d4a;padding:1px 5px;border-radius:3px;font-size:11px">Date.now()</code> for unique emails in each test run.</p>`;
    }

    _genApiTest () {
      return `<p><b>🔌 REST API Test</b></p>
        ${this._codeBlock(`import { test, expect } from '@playwright/test';

test('GET /api/products returns list', async ({ request }) => {
  const res = await request.get('https://api.example.com/products');

  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBeTruthy();
  expect(body.length).toBeGreaterThan(0);
  expect(body[0]).toHaveProperty('id');
});

test('POST /api/products creates a product', async ({ request }) => {
  const res = await request.post('https://api.example.com/products', {
    data: { name: 'New Product', price: 99.99, category: 'Electronics' },
    headers: { Authorization: 'Bearer your-token' }
  });

  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body).toMatchObject({ name: 'New Product' });
});`, 'typescript')}`;
    }

    _genGenericTest (raw) {
      // Try to extract a scenario description from the raw text
      const scenario = raw
        .replace(/gen(erate)?|create|write|build|new/gi, '')
        .replace(/\btest\b/gi, '')
        .trim() || 'feature workflow';
      const suiteName = this._titleCase(scenario.slice(0, 40));
      return `<p><b>🧪 Generated Test: ${this._escapeHtml(suiteName)}</b></p>
        ${this._codeBlock(`import { test, expect } from '@playwright/test';

test.describe('${suiteName}', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('https://your-app.com');
  });

  test('${this._escapeHtml(scenario)}', async ({ page }) => {
    // Step 1 — Navigate to the feature
    await page.goto('https://your-app.com/feature');

    // Step 2 — Perform the main action
    await page.getByRole('button', { name: 'Action' }).click();

    // Step 3 — Verify the result
    await expect(page.getByRole('heading')).toBeVisible();
    await expect(page).toHaveURL(/expected-path/);
  });

});`, 'typescript')}
        <p>✏️ Customize the URL, selectors, and assertions for your app.</p>
        <p>💡 Ask me for a <b>more specific test</b> — e.g., "generate a login test" or "generate a cart test".</p>`;
    }

    _genNavigate (raw) {
      const url = raw.match(/https?:\/\/[^\s"']+/)?.[0]
                || raw.match(/to\s+([\w.-]+\.\w+[^\s]*)/i)?.[1]
                || 'https://your-app.com';
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      return `<p><b>🔗 Navigate to a URL</b></p>
        ${this._codeBlock(`// Basic navigation
await page.goto('${fullUrl}');

// Wait for page to fully load (SPA-friendly)
await page.waitForLoadState('networkidle');

// Assert correct URL
await expect(page).toHaveURL('${fullUrl}');

// Assert page title
await expect(page).toHaveTitle(/Expected Title/);`, 'typescript')}
        <p>💡 Use <code style="background:#2d2d4a;padding:1px 5px;border-radius:3px;font-size:11px">networkidle</code> for Single Page Applications (React, Angular, Vue).</p>`;
    }

    _genClick (raw) {
      return `<p><b>🖱️ Click Elements</b></p>
        ${this._codeBlock(`// By role + name (most reliable ✅)
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('link',   { name: 'Home'   }).click();

// By visible text
await page.getByText('Accept All Cookies').click();

// By label (for form fields)
await page.getByLabel('Username').click();

// By placeholder
await page.getByPlaceholder('Search...').click();

// By CSS selector
await page.locator('#submit-btn').click();
await page.locator('.my-button').click();

// Force click (bypasses visibility checks — use sparingly)
await page.locator('#hidden-btn').click({ force: true });

// Right-click
await page.locator('element').click({ button: 'right' });

// Double-click
await page.locator('element').dblclick();`, 'typescript')}`;
    }

    _genFill (raw) {
      const field = raw.match(/["'](.+?)["']\s*field/i)?.[1]
                 || raw.match(/(\w+)\s+field/i)?.[1]
                 || 'fieldName';
      const value = raw.match(/(?:with|value|=)\s+["'](.+?)["']/i)?.[1] || 'your value';
      return `<p><b>⌨️ Fill Form Fields</b></p>
        ${this._codeBlock(`// By label — recommended ✅
await page.getByLabel('${this._escapeHtml(field)}').fill('${this._escapeHtml(value)}');

// By placeholder
await page.getByPlaceholder('Enter ${this._escapeHtml(field)}').fill('${this._escapeHtml(value)}');

// By role
await page.getByRole('textbox', { name: '${this._escapeHtml(field)}' }).fill('${this._escapeHtml(value)}');

// Clear + type (for fields that block .fill())
await page.locator('#${this._escapeHtml(field).replace(/\s+/g,'-')}').clear();
await page.locator('#${this._escapeHtml(field).replace(/\s+/g,'-')}').type('${this._escapeHtml(value)}');

// Assert value after fill
await expect(page.getByLabel('${this._escapeHtml(field)}')).toHaveValue('${this._escapeHtml(value)}');`, 'typescript')}`;
    }

    _genSelect (raw) {
      return `<p><b>📋 Select Dropdown Options</b></p>
        ${this._codeBlock(`// By label + option label
await page.getByLabel('Country').selectOption('United States');

// By value attribute
await page.locator('#country-select').selectOption({ value: 'us' });

// By index (0-based)
await page.locator('select').selectOption({ index: 2 });

// Multi-select
await page.locator('select[multiple]').selectOption(['Option A', 'Option B']);

// Assert selected value
await expect(page.locator('#country-select')).toHaveValue('us');`, 'typescript')}`;
    }

    _genAssert (raw) {
      const lower = raw.toLowerCase();
      const kind = lower.includes('url')     ? 'url'
                 : lower.includes('text')    ? 'text'
                 : lower.includes('value')   ? 'value'
                 : lower.includes('title')   ? 'title'
                 : lower.includes('count')   ? 'count'
                 : lower.includes('enable')  ? 'enabled'
                 : lower.includes('disable') ? 'disabled'
                 : lower.includes('check')   ? 'checked'
                 : 'visible';
      return `<p><b>✅ Playwright Assertions</b> — <span class="pwc-tag">${kind}</span></p>
        ${this._codeBlock(`// Visibility
await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
await expect(page.locator('#error-msg')).toBeHidden();

// URL & Title
await expect(page).toHaveURL('https://app.com/dashboard');
await expect(page).toHaveURL(/dashboard/);
await expect(page).toHaveTitle('My App - Dashboard');

// Text content
await expect(page.locator('h1')).toHaveText('Welcome Back!');
await expect(page.locator('.toast')).toContainText('saved');

// Input value
await expect(page.getByLabel('Email')).toHaveValue('user@test.com');

// Element states
await expect(page.getByRole('button', { name: 'Pay' })).toBeEnabled();
await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled();
await expect(page.getByRole('checkbox')).toBeChecked();

// Count
await expect(page.locator('.product-card')).toHaveCount(12);

// Soft assertions (test continues on failure)
await expect.soft(page.locator('.badge')).toBeVisible();`, 'typescript')}`;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // EXPLANATIONS
    // ══════════════════════════════════════════════════════════════════════════

    _explainLocators () {
      return `<p><b>🔍 Playwright Locator Strategies</b></p>
        <p><b>Priority order (best → worst):</b></p>
        ${this._codeBlock(`// 1️⃣ By Role — most resilient ✅
page.getByRole('button', { name: 'Sign In' })
page.getByRole('link',   { name: 'Home' })
page.getByRole('textbox', { name: 'Email' })

// 2️⃣ By Label — great for forms ✅
page.getByLabel('Password')

// 3️⃣ By Placeholder
page.getByPlaceholder('Search products...')

// 4️⃣ By Text
page.getByText('Welcome back!')
page.getByText('Accept', { exact: true })

// 5️⃣ By Test ID — set data-testid in your app ✅
page.getByTestId('submit-btn')

// 6️⃣ By Alt Text (images)
page.getByAltText('Company logo')

// 7️⃣ CSS Selector — use only when above don't work
page.locator('#submit')
page.locator('.btn-primary')
page.locator('button[type="submit"]')

// Chaining locators
page.locator('.modal').getByRole('button', { name: 'Confirm' })`, 'typescript')}`;
    }

    _explainFixtures () {
      return `<p><b>🔧 Playwright Fixtures</b></p>
        ${this._codeBlock(`// fixtures.ts — extend the base test
import { test as base } from '@playwright/test';

type Fixtures = { loggedInPage: Page };

export const test = base.extend<Fixtures>({
  loggedInPage: async ({ page }, use) => {
    // Setup: log in before test
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@test.com');
    await page.getByLabel('Password').fill('pass123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/dashboard/);

    // Hand page to the test
    await use(page);

    // Teardown (optional)
    await page.getByRole('button', { name: 'Logout' }).click();
  }
});

// my.test.ts — use the custom fixture
import { test } from './fixtures';
test('dashboard is visible', async ({ loggedInPage }) => {
  await expect(loggedInPage.getByRole('heading')).toBeVisible();
});`, 'typescript')}`;
    }

    _explainDebug () {
      return `<p><b>🐛 Debugging Playwright Tests</b></p>
        <div class="pwc-step-row"><span class="pwc-step-num">1</span>
        <span><b>UI Mode</b> — visual time-travel debugger</span></div>
        ${this._codeBlock(`npx playwright test --ui`, 'bash')}
        <div class="pwc-step-row"><span class="pwc-step-num">2</span>
        <span><b>Debug Mode</b> — pause + inspect</span></div>
        ${this._codeBlock(`npx playwright test --debug`, 'bash')}
        <div class="pwc-step-row"><span class="pwc-step-num">3</span>
        <span><b>Pause in test</b></span></div>
        ${this._codeBlock(`await page.pause(); // opens Playwright Inspector`, 'typescript')}
        <div class="pwc-step-row"><span class="pwc-step-num">4</span>
        <span><b>Screenshots &amp; Traces</b></span></div>
        ${this._codeBlock(`// playwright.config.ts
use: {
  screenshot: 'only-on-failure',
  trace:      'on-first-retry',
  video:      'retain-on-failure'
}`, 'typescript')}
        <div class="pwc-step-row"><span class="pwc-step-num">5</span>
        <span><b>View trace</b></span></div>
        ${this._codeBlock(`npx playwright show-trace test-results/trace.zip`, 'bash')}`;
    }

    _explainPOM () {
      return `<p><b>🏗️ Page Object Model (POM)</b></p>
        ${this._codeBlock(`// pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page:        Page;
  readonly emailInput:  Locator;
  readonly passInput:   Locator;
  readonly submitBtn:   Locator;
  readonly errorMsg:    Locator;

  constructor(page: Page) {
    this.page       = page;
    this.emailInput = page.getByLabel('Email');
    this.passInput  = page.getByLabel('Password');
    this.submitBtn  = page.getByRole('button', { name: 'Sign In' });
    this.errorMsg   = page.locator('.error-banner');
  }

  async goto()                    { await this.page.goto('/login'); }
  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passInput.fill(pass);
    await this.submitBtn.click();
  }
  async expectError(msg: string)  { await expect(this.errorMsg).toContainText(msg); }
}`, 'typescript')}
        ${this._codeBlock(`// login.test.ts — clean, readable test
import { test, expect } from '@playwright/test';
import { LoginPage }    from './pages/LoginPage';

test('valid login redirects to dashboard', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login('user@test.com', 'pass123');
  await expect(page).toHaveURL(/dashboard/);
});`, 'typescript')}`;
    }

    _explainParallel () {
      return `<p><b>⚡ Parallel Execution in Playwright</b></p>
        ${this._codeBlock(`// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  workers: 4,          // run 4 tests in parallel
  fullyParallel: true, // tests within a file also run in parallel

  // Sharding for CI (split across multiple machines)
  // Run: npx playwright test --shard=1/4  (on machine 1)
  //      npx playwright test --shard=2/4  (on machine 2)
});`, 'typescript')}
        <p>💡 <b>Tips:</b></p>
        <ul>
          <li>Each worker gets its own browser context — no state leaks</li>
          <li>Use <code style="background:#2d2d4a;padding:1px 5px;border-radius:3px;font-size:11px">test.describe.serial()</code> to force sequential in one file</li>
          <li>Shared state (DB, auth tokens) → use fixtures or unique test data</li>
        </ul>`;
    }

    _explainCodegen () {
      return `<p><b>🎬 Recording Tests with Playwright Codegen</b></p>
        <div class="pwc-step-row"><span class="pwc-step-num">1</span>
        <span>Use the <b>Start Recording</b> button above (opens Chromium + Inspector)</span></div>
        <div class="pwc-step-row"><span class="pwc-step-num">2</span>
        <span>Or run from terminal:</span></div>
        ${this._codeBlock(`npx playwright codegen https://your-app.com`, 'bash')}
        <div class="pwc-step-row"><span class="pwc-step-num">3</span>
        <span>Interact with the browser — Playwright generates code in real time</span></div>
        <div class="pwc-step-row"><span class="pwc-step-num">4</span>
        <span>Copy the code and paste it into the code box above</span></div>
        <p>💡 <b>Codegen options:</b></p>
        ${this._codeBlock(`# Specify browser
npx playwright codegen --browser=firefox https://app.com

# Save directly to file
npx playwright codegen --output=my-test.spec.ts https://app.com

# With device emulation
npx playwright codegen --device="iPhone 13" https://app.com`, 'bash')}`;
    }

    _explainReport () {
      return `<p>📊 <b>Playwright Report Templates</b></p>
        <p><b>1. Built-in HTML Reporter</b> — generates a beautiful interactive report:</p>
        ${this._codeBlock(`// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],  // also print to console
  ],
});`, 'typescript')}
        <p>Run tests &amp; open report:</p>
        ${this._codeBlock(`# Run tests
npx playwright test

# Open HTML report (auto-opens after test run)
npx playwright show-report

# Or specify a custom folder
npx playwright show-report playwright-report`, 'bash')}

        <p><b>2. Multiple Reporters at Once</b></p>
        ${this._codeBlock(`reporter: [
  ['html',  { outputFolder: 'playwright-report' }],
  ['json',  { outputFile: 'results/test-results.json' }],
  ['junit', { outputFile: 'results/junit.xml' }],
  ['dot'],  // minimal console output
],`, 'typescript')}

        <p><b>3. Allure Reporter</b> (rich test analytics):</p>
        ${this._codeBlock(`# Install
npm i -D allure-playwright allure-commandline

# playwright.config.ts
reporter: [['allure-playwright']],

# Generate & open
npx allure generate allure-results --clean -o allure-report
npx allure open allure-report`, 'bash')}

        <p><b>4. Custom Reporter Template</b></p>
        ${this._codeBlock(`// reporters/my-reporter.ts
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class MyReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    const icon = result.status === 'passed' ? '✅' : '❌';
    console.log(\`\${icon} \${test.title} — \${result.duration}ms\`);
  }
  onEnd(result: { status: string }) {
    console.log('\\n📋 Run finished:', result.status);
  }
}
export default MyReporter;

// playwright.config.ts
reporter: [['./reporters/my-reporter.ts']],`, 'typescript')}`;
    }

    _explainCiCd () {
      return `<p>🚀 <b>CI/CD Integration for Playwright</b></p>
        <p><b>GitHub Actions</b> — <code>.github/workflows/playwright.yml</code>:</p>
        ${this._codeBlock(`name: Playwright Tests
on:
  push:    { branches: [main, master] }
  pull_request: { branches: [main, master] }

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30`, 'yaml')}

        <p><b>Jenkins Pipeline</b>:</p>
        ${this._codeBlock(`pipeline {
  agent any
  stages {
    stage('Install') { steps { sh 'npm ci && npx playwright install --with-deps' } }
    stage('Test')    { steps { sh 'npx playwright test' } }
  }
  post {
    always {
      publishHTML(target: [reportDir: 'playwright-report', reportFiles: 'index.html', reportName: 'Playwright Report'])
    }
  }
}`, 'groovy')}`;
    }

    _genHelp () {
      return `<p>👋 <b>Playwright Copilot — Help</b></p>
        <p>Here's what you can ask me:</p>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          ${[
            ['🧪 Generate tests',  'generate login test, generate cart test, generate API test'],
            ['📋 List tests',      'list my tests, show test cases'],
            ['➕ Add step',        'add step to My Test'],
            ['🖱️ Click',          'how to click a button'],
            ['⌨️ Fill',           'how to fill a form, type in username field'],
            ['📋 Select',         'how to select dropdown'],
            ['✅ Assert',          'how to assert visible, expect URL'],
            ['🔍 Locators',        'explain locators, how to find elements'],
            ['🏗️ POM',            'explain page object model'],
            ['🔧 Fixtures',        'explain fixtures, beforeEach'],
            ['🐛 Debug',           'how to debug, enable traces'],
            ['⚡ Parallel',        'run tests in parallel'],
            ['🎬 Codegen',         'how to record tests'],
            ['📊 Reports',         'report template, allure report, html report'],
            ['🚀 CI/CD',           'github actions, jenkins pipeline'],
          ].map(([icon, q]) =>
            `<tr><td style="padding:4px 8px;color:#c4b5fd;white-space:nowrap">${icon}</td>
                 <td style="padding:4px 8px;color:#94a3b8">${q}</td></tr>`
          ).join('')}
        </table>`;
    }

    _genFallback (raw) {
      return `<p>🤔 I'm not sure about that specific question, but here are some things I can help with:</p>
        <ul>
          <li>Type <b>"generate login test"</b> — get a full test example</li>
          <li>Type <b>"list my tests"</b> — see your saved test cases</li>
          <li>Type <b>"help"</b> — see all commands</li>
          <li>Type <b>"explain locators"</b> — Playwright locator guide</li>
        </ul>
        <p style="color:#64748b;font-size:12px">Your question: "${this._escapeHtml(raw)}"</p>`;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // UTILITIES
    // ══════════════════════════════════════════════════════════════════════════

    _codeBlock (code, lang = 'typescript') {
      const escaped = this._escapeHtml(code);
      const highlighted = this._highlight(escaped, lang);
      return `<div class="pwc-code-wrap">
        <div class="pwc-code-toolbar">
          <span class="pwc-code-lang">${lang}</span>
          <button class="pwc-copy-btn">Copy</button>
        </div>
        <pre class="pwc-pre"><code class="pwc-code" data-raw="${escaped.replace(/"/g,'&quot;')}">${highlighted}</code></pre>
      </div>`;
    }

    /** Very lightweight syntax highlight — no external lib */
    _highlight (code, lang) {
      if (lang === 'bash') {
        return code
          .replace(/(#.*)$/gm, '<span class="pwc-cm">$1</span>')
          .replace(/\b(npx|node|npm|cd|ls)\b/g, '<span class="pwc-kw">$1</span>');
      }
      return code
        .replace(/(\/\/.*)$/gm, '<span class="pwc-cm">$1</span>')
        .replace(/\b(import|export|from|const|let|var|async|await|return|test|expect|describe|beforeEach|afterEach|type|interface|class|new|this)\b/g,
          '<span class="pwc-kw">$1</span>')
        .replace(/\b(page|request|context|browser)\b/g,
          '<span class="pwc-fn">$1</span>')
        .replace(/&#39;([^&#]*)&#39;|&quot;([^&]*)&quot;|`([^`]*)`/g,
          (m) => `<span class="pwc-str">${m}</span>`);
    }

    _escapeHtml (str) {
      return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
    }

    _copyToClipboard (text, btn) {
      const reset = () => { if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy'; }, 2000); } };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(reset).catch(() => this._execCopy(text, reset));
      } else {
        this._execCopy(text, reset);
      }
    }

    _execCopy (text, cb) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); if (cb) cb(); } catch (_) {}
      document.body.removeChild(ta);
    }

    _getTestCount () {
      const data = global.testScenariosData || {};
      return Object.values(data).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0);
    }

    _titleCase (str) {
      return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    }
  }

  // ─── Export ───────────────────────────────────────────────────────────────
  global.PlaywrightCopilot = PlaywrightCopilot;

})(window);



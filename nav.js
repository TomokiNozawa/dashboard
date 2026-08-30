// ─────────────────────────────────────────────────────────────
// NozaBoard 共通ナビゲーション
//   全ページ（index / task-board / materials / shift / property / uranai）で
//   同じ項目・同じ並び・同じショートカットを提供する。
//
//   使い方: 各ページの </body> 直前で <script src="nav.js"></script>
//   ページ固有の追加項目は、読み込み前に window.NAV_EXTRA で指定する。
//     例) window.NAV_EXTRA = [{ href:'task-board-demo.html', icon:'🎯', label:'デモ', cls:'side-nav-demo' }];
//
//   既存ページの見た目を壊さないため、
//   ・#sideNav / .mobile-bottom-nav が既にあれば「中身だけ」差し替える
//   ・要素が無いページに新規生成する時だけ、最低限のCSSを注入する
// ─────────────────────────────────────────────────────────────
(function () {
  if (window.__nozaNavLoaded) return;
  window.__nozaNavLoaded = true;

  var LOGO_SVG = '<svg viewBox="0 0 100 100" width="22" height="22" aria-hidden="true"><defs><linearGradient id="nozaNavG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5aadff"/><stop offset="100%" stop-color="#b88cff"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#nozaNavG)"/><text x="50" y="68" text-anchor="middle" fill="#fff" font-family="Inter,sans-serif" font-weight="700" font-size="52">N</text></svg>';

  var ITEMS = [
    { href: 'index.html',       icon: LOGO_SVG, raw: true, label: 'NozaBoard', short: 'Noza' },
    { href: 'task-board.html',  icon: '☑',      label: 'タスク' },
    { href: 'materials.html',   icon: '📦',     label: '教材' },
    { href: 'shift.html',       icon: '👥',     label: 'シフト' },
    { href: 'property.html',    icon: '🏠',     label: '物件' },
    { href: 'uranai.html',      icon: '🔮',     label: '占い' },
    { href: 'meishi.html',      icon: '📇',     label: '名刺' },
    { href: 'fp.html',          icon: '📘',     label: 'FP学習', short: 'FP' },
  ].concat(window.NAV_EXTRA || []);

  // ── 現在ページ判定 ──
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function isActive(item) {
    return item.href.toLowerCase() === here;
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ── サイドナビ（PC）──
  function sideNavHtml() {
    return ITEMS.map(function (it) {
      var icon = it.raw ? it.icon : '<span style="font-size:18px">' + esc(it.icon) + '</span>';
      var ext = it.external ? ' target="_blank" rel="noopener"' : '';
      return '<a class="side-nav-item' + (isActive(it) ? ' active' : '') + (it.cls ? ' ' + it.cls : '') +
        '" href="' + esc(it.href) + '"' + ext + ' title="' + esc(it.title || it.label) + '">' +
        icon + '<span>' + esc(it.label) + '</span></a>';
    }).join('');
  }

  // ── ボトムナビ（モバイル）──
  function mobileNavHtml() {
    return ITEMS.filter(function (it) { return !it.desktopOnly; }).map(function (it) {
      var icon = it.raw ? '📊' : it.icon;
      return '<a class="mbn-item' + (isActive(it) ? ' active' : '') + '" href="' + esc(it.href) + '">' +
        '<span class="mbn-icon">' + esc(icon) + '</span>' +
        '<span class="mbn-label">' + esc(it.short || it.label) + '</span></a>';
    }).join('');
  }

  var FALLBACK_CSS = '.side-nav{position:fixed;top:0;left:0;width:56px;height:100vh;background:#161b22;border-right:1px solid #30363d;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0;z-index:200;overflow:hidden;transition:width .2s ease}' +
    '.side-nav:hover{width:140px}' +
    '.side-nav-item{display:flex;align-items:center;gap:8px;width:100%;padding:10px 16px;color:#6e7681;text-decoration:none;font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;transition:all .2s;line-height:1}' +
    '.side-nav-item span:first-child,.side-nav-item svg{display:flex;align-items:center;justify-content:center;width:22px;height:22px;flex-shrink:0}' +
    '.side-nav-item:hover{background:#1c2129;color:#e6edf3}' +
    '.side-nav-item.active{color:#58a6ff;background:rgba(88,166,255,.08);border-right:2px solid #58a6ff}' +
    '.side-nav-item span:last-child{opacity:0;transition:opacity .15s}' +
    '.side-nav:hover .side-nav-item span:last-child{opacity:1}' +
    '.light .side-nav,body.light .side-nav{background:#fff;border-color:#d8dde4}' +
    '.light .side-nav-item,body.light .side-nav-item{color:#8b95a5}' +
    '.light .side-nav-item:hover,body.light .side-nav-item:hover{background:#f0f2f5;color:#1a1d23}' +
    '.mobile-bottom-nav{display:none;position:fixed;left:0;right:0;bottom:0;background:#161b22;border-top:1px solid #30363d;height:56px;z-index:900;padding-bottom:env(safe-area-inset-bottom);justify-content:space-around;align-items:stretch}' +
    '.mobile-bottom-nav .mbn-item{flex:1;min-width:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#6e7681;text-decoration:none;font-size:10px;font-weight:600;transition:color .15s}' +
    '.mobile-bottom-nav .mbn-item:hover,.mobile-bottom-nav .mbn-item:active{color:#e6edf3}' +
    '.mobile-bottom-nav .mbn-item.active{color:#58a6ff}' +
    '.mobile-bottom-nav .mbn-icon{font-size:20px;line-height:1}' +
    '.mobile-bottom-nav .mbn-label{font-size:10px}' +
    'body.light .mobile-bottom-nav{background:#fff;border-top-color:#d8dde4}' +
    'body.light .mobile-bottom-nav .mbn-item{color:#8b95a5}' +
    'body.light .mobile-bottom-nav .mbn-item.active{color:#5aadff}' +
    '@media(max-width:768px){.side-nav{display:none}.mobile-bottom-nav{display:flex}body{padding-left:0!important;padding-bottom:calc(56px + env(safe-area-inset-bottom))!important}}';

  var cssInjected = false;
  function injectFallbackCss() {
    if (cssInjected) return;
    cssInjected = true;
    var s = document.createElement('style');
    s.id = 'nozaNavCss';
    s.textContent = FALLBACK_CSS;
    document.head.appendChild(s);
  }

  function mount() {
    // サイドナビ: 既存があれば中身だけ差し替え、無ければ生成
    var side = document.getElementById('sideNav') || document.querySelector('nav.side-nav');
    if (side) {
      side.innerHTML = sideNavHtml();
    } else {
      injectFallbackCss();
      side = document.createElement('nav');
      side.id = 'sideNav';
      side.className = 'side-nav';
      side.innerHTML = sideNavHtml();
      document.body.prepend(side);
      if (!document.body.style.paddingLeft) document.body.style.paddingLeft = '56px';
    }

    // ボトムナビ
    var mbn = document.querySelector('nav.mobile-bottom-nav') || document.getElementById('mobileBottomNav');
    if (mbn) {
      mbn.innerHTML = mobileNavHtml();
    } else {
      injectFallbackCss();
      mbn = document.createElement('nav');
      mbn.id = 'mobileBottomNav';
      mbn.className = 'mobile-bottom-nav';
      mbn.innerHTML = mobileNavHtml();
      document.body.appendChild(mbn);
    }
  }

  // ── G → 数字 のページ間ジャンプ ────────────────────────────
  // 各ページが持っていた個別実装より先に捕まえて、全ページで同じ挙動にする
  var chord = false, chordTimer = null;
  function hint() {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:64px;right:20px;background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 16px;font-size:12px;color:#e6edf3;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.3);line-height:1.6';
    el.textContent = 'G → ' + ITEMS.slice(0, 9).map(function (it, i) { return (i + 1) + ':' + it.label; }).join(' ');
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2000);
  }
  window.addEventListener('keydown', function (e) {
    var t = document.activeElement;
    if (t && (['INPUT', 'TEXTAREA', 'SELECT'].indexOf(t.tagName) >= 0 || t.isContentEditable)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      e.stopImmediatePropagation();   // 各ページの旧G実装を二重発火させない
      chord = true;
      clearTimeout(chordTimer);
      chordTimer = setTimeout(function () { chord = false; }, 2000);
      hint();
      return;
    }
    if (chord && e.key >= '1' && e.key <= String(Math.min(ITEMS.length, 9))) {
      e.preventDefault();
      e.stopImmediatePropagation();
      chord = false;
      clearTimeout(chordTimer);
      location.href = ITEMS[parseInt(e.key, 10) - 1].href;
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();

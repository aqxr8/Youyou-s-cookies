/* box-builder.js - "Build your own box" on the menu page.
   The sizes are the menu items build-box-5 / build-box-9 / build-box-12 (price editable in the admin > Menu tab).
   The picked cookies are stored on the cart line (line.box.picks) and written into the order line's name by auth.js.
   Needs features.js (YYMenu, YYAddBoxToCart, YYBuildBoxSize). */
(function () {
  'use strict';

  var TXT = {
    en: {
      bannerTitle: 'Build your own box', bannerSub: 'Pick 5, 9 or 12 cookies for your box, or let us surprise you!', bannerBtn: 'Build my box', from: 'from {p} DH',
      title: 'Build your box', step1: '1. Choose your box', step2: '2. Fill it with your favourites', cookies: '{n} cookies',
      s5: 'Little Box', s9: 'Cozy Box', s12: 'Big Box', label: "Aya's box",
      chosen: '{n} / {N} chosen', more: 'Pick {n} more', full: 'Your box is full!', hint: 'Tap a cookie to put it in your box',
      surprise: 'Surprise me', again: 'Shuffle again', clear: 'Clear', add: 'Add box', close: 'Close', worth: 'Worth {w} DH - you pay {p} DH',
      trimmed: 'Your box got smaller, so we took out the extra cookies.', boom: 'Surprise! Your box is ready', added: 'Your box is in the cart', mixing: 'Picking for you...', remove: 'Remove', plus: 'Add', minus: 'Remove one', none: 'No cookies are available right now.'
    },
    fr: {
      bannerTitle: 'Compose ta box', bannerSub: 'Choisis 5, 9 ou 12 cookies pour ta box, ou laisse-nous te surprendre !', bannerBtn: 'Composer ma box', from: 'dès {p} DH',
      title: 'Compose ta box', step1: '1. Choisis ta box', step2: '2. Remplis-la avec tes préférés', cookies: '{n} cookies',
      s5: 'Petite box', s9: 'Box cosy', s12: 'Grande box', label: 'La box d\'Aya',
      chosen: '{n} / {N} choisis', more: 'Encore {n} à choisir', full: 'Ta box est pleine !', hint: 'Touche un cookie pour le mettre dans ta box',
      surprise: 'Surprends-moi', again: 'Mélanger encore', clear: 'Vider', add: 'Ajouter la box', close: 'Fermer', worth: 'Valeur {w} DH - tu paies {p} DH',
      trimmed: 'Ta box est plus petite, on a retiré les cookies en trop.', boom: 'Surprise ! Ta box est prête', added: 'Ta box est dans le panier', mixing: 'On choisit pour toi...', remove: 'Retirer', plus: 'Ajouter', minus: 'Retirer un', none: 'Aucun cookie disponible pour le moment.'
    },
    ar: {
      bannerTitle: 'جهّزي علبتك بنفسك', bannerSub: 'اختاري 5 أو 9 أو 12 بسكويت لعلبتك، أو دعينا نفاجئك!', bannerBtn: 'جهّز علبتي', from: 'ابتداءً من {p} درهم',
      title: 'جهّز علبتك', step1: '1. اختر علبتك', step2: '2. املأها بالمفضّل لديك', cookies: '{n} بسكويت',
      s5: 'علبة صغيرة', s9: 'علبة دافئة', s12: 'علبة كبيرة', label: 'علبة آية',
      chosen: 'تم اختيار {n} / {N}', more: 'اختر {n} أخرى', full: 'علبتك ممتلئة!', hint: 'اضغط على بسكويتة لوضعها في علبتك',
      surprise: 'فاجئني', again: 'اخلط من جديد', clear: 'تفريغ', add: 'أضف العلبة', close: 'إغلاق', worth: 'قيمتها {w} درهم - تدفع {p} درهم',
      trimmed: 'أصبحت علبتك أصغر، لذلك أزلنا البسكويت الزائد.', boom: 'مفاجأة! علبتك جاهزة', added: 'علبتك في السلة', mixing: 'جارٍ الاختيار...', remove: 'إزالة', plus: 'أضف', minus: 'أزل واحدة', none: 'لا يوجد بسكويت متاح حالياً.'
    }
  };
  var SAFE_IMG = /^(assets\/images\/[A-Za-z0-9._-]+|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+)$/;

  var state = { idx: 0, seq: [], busy: false, lastAdded: -1 };
  var root = null, lastFocus = null;

  function lang() { return (window.YYLang && window.YYLang()) || 'en'; }
  function t(k, v) {
    var s = (TXT[lang()] || TXT.en)[k] || TXT.en[k] || k;
    if (v) s = s.replace(/\{(\w+)\}/g, function (m, x) { return v[x]; });
    return s;
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function menu() { return window.YYMenu || { items: [], byId: {} }; }
  function sizes() {
    var size = window.YYBuildBoxSize || function () { return 0; };
    return menu().items.filter(function (i) { return size(i.id) && i.available !== false; })
      .map(function (i) { return { id: i.id, n: size(i.id), price: i.price, item: i }; })
      .sort(function (a, b) { return a.n - b.n; });
  }
  function cookies() { return menu().items.filter(function (i) { return i.category === 'cookies' && i.available !== false; }); }
  function locName(it) {
    var x = lang() === 'fr' ? it.nameFr : lang() === 'ar' ? it.nameAr : '';
    return x || it.name;
  }
  function img(it) { return SAFE_IMG.test(it.image || '') ? it.image : 'assets/images/classic-cookie.webp'; }
  function box() { var s = sizes(); return s[Math.min(state.idx, s.length - 1)] || null; }
  function countOf(id) { return state.seq.filter(function (x) { return x === id; }).length; }

  function toast(text) {
    var el = document.createElement('div');
    el.className = 'bb-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('data-i18n-skip', '');
    el.textContent = text;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 350); }, 2400);
  }

  // ---------------- banner on the menu page ----------------
  function renderBanner() {
    var host = document.getElementById('bb-banner');
    if (!host) return;
    var s = sizes();
    if (!s.length) { host.innerHTML = ''; host.hidden = true; return; }
    host.hidden = false;
    var min = Math.min.apply(null, s.map(function (x) { return x.price; }));
    host.innerHTML =
      '<div class="bb-banner" data-i18n-skip>' +
        '<div class="bb-banner-art" aria-hidden="true">' +
          '<img class="a1" src="assets/images/lotus-cookie.webp" alt="" loading="lazy" decoding="async">' +
          '<img class="a2" src="assets/images/kinder-cookie.webp" alt="" loading="lazy" decoding="async">' +
          '<img class="a3" src="assets/images/oreo-cookie.webp" alt="" loading="lazy" decoding="async">' +
        '</div>' +
        '<div class="bb-banner-text"><span class="bb-kicker">' + esc(t('from', { p: min })) + '</span><h3>' + esc(t('bannerTitle')) + '</h3><p>' + esc(t('bannerSub')) + '</p>' +
        '<div class="bb-chips">' + s.map(function (x) { return '<span>' + x.n + '</span>'; }).join('') + '</div></div>' +
        '<button type="button" class="bb-open btn btn-primary">' + esc(t('bannerBtn')) + '</button>' +
      '</div>';
  }

  // ---------------- modal ----------------
  function build() {
    root = document.createElement('div');
    root.className = 'bb-root';
    root.setAttribute('data-i18n-skip', '');
    root.hidden = true;
    root.innerHTML =
      '<div class="bb-overlay"></div>' +
      '<div class="bb-sheet" role="dialog" aria-modal="true" aria-labelledby="bb-title">' +
        '<header class="bb-head"><h2 id="bb-title"></h2><button type="button" class="bb-x" data-bb="close">&times;</button></header>' +
        '<div class="bb-body">' +
          '<section class="bb-left">' +
            '<h4 class="bb-step" id="bb-step1"></h4><div class="bb-sizes" id="bb-sizes"></div>' +
            '<div class="bb-tray-wrap"><div class="bb-tray" id="bb-tray"></div><div class="bb-confetti" id="bb-confetti" aria-hidden="true"></div></div>' +
            '<p class="bb-count" id="bb-count" aria-live="polite"></p>' +
          '</section>' +
          '<section class="bb-right"><h4 class="bb-step" id="bb-step2"></h4><div class="bb-tiles" id="bb-tiles"></div></section>' +
        '</div>' +
        '<footer class="bb-foot">' +
          '<div class="bb-worth" id="bb-worth"></div>' +
          '<div class="bb-actions">' +
            '<button type="button" class="bb-btn ghost" data-bb="clear" id="bb-clear"></button>' +
            '<button type="button" class="bb-btn surprise" data-bb="surprise" id="bb-surprise"><span id="bb-surprise-t"></span></button>' +
            '<button type="button" class="bb-btn add" data-bb="add" id="bb-add"></button>' +
          '</div>' +
        '</footer>' +
      '</div>';
    document.body.appendChild(root);

    root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-bb]');
      if (e.target.classList.contains('bb-overlay')) return close();
      if (a) {
        var k = a.getAttribute('data-bb');
        if (k === 'close') close();
        else if (k === 'clear') { state.seq = []; state.lastAdded = -1; render(); }
        else if (k === 'surprise') surprise();
        else if (k === 'add') addToCart();
        else if (k === 'size') setSize(parseInt(a.getAttribute('data-i'), 10));
        else if (k === 'plus') addCookie(a.getAttribute('data-id'));
        else if (k === 'minus') removeCookie(a.getAttribute('data-id'));
        else if (k === 'slot') removeAt(parseInt(a.getAttribute('data-i'), 10));
        return;
      }
      var tile = e.target.closest('.bb-tile');
      if (tile && !tile.classList.contains('off')) addCookie(tile.getAttribute('data-id'));
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !root.hidden) close(); });
  }

  function open(idx) {
    if (!sizes().length) return;
    if (!root) build();
    if (typeof idx === 'number') state.idx = idx;
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add('bb-lock');
    renderTiles();
    render();
    requestAnimationFrame(function () { root.classList.add('show'); var x = root.querySelector('.bb-x'); if (x) x.focus(); });
  }
  function close() {
    if (!root || root.hidden) return;
    root.classList.remove('show');
    document.documentElement.classList.remove('bb-lock');
    setTimeout(function () { root.hidden = true; }, 250);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ---------------- state changes ----------------
  function setSize(i) {
    var s = sizes();
    if (!s[i]) return;
    state.idx = i;
    if (state.seq.length > s[i].n) { state.seq = state.seq.slice(0, s[i].n); toast(t('trimmed')); }
    render();
  }
  function addCookie(id) {
    var b = box();
    if (!b || state.busy || state.seq.length >= b.n || !menu().byId[id]) return;
    state.seq.push(id);
    state.lastAdded = state.seq.length - 1;
    render();
  }
  function removeCookie(id) {
    if (state.busy) return;
    var i = state.seq.lastIndexOf(id);
    if (i < 0) return;
    state.seq.splice(i, 1);
    state.lastAdded = -1;
    render();
  }
  function removeAt(i) {
    if (state.busy || !(i >= 0 && i < state.seq.length)) return;
    state.seq.splice(i, 1);
    state.lastAdded = -1;
    render();
  }

  // pick the cookie we have the fewest of so far (random among ties) -> the surprise is as varied as possible
  function drawRandom() {
    var pool = cookies();
    if (!pool.length) return null;
    var min = Infinity;
    pool.forEach(function (c) { min = Math.min(min, countOf(c.id)); });
    var cand = pool.filter(function (c) { return countOf(c.id) === min; });
    return cand[Math.floor(Math.random() * cand.length)].id;
  }
  function surprise() {
    var b = box();
    if (!b || state.busy || !cookies().length) return;
    state.busy = true;
    if (state.seq.length >= b.n) state.seq = [];       // full box: shuffle everything again
    root.classList.add('rolling');
    var tick = function () {
      if (state.seq.length >= b.n) {
        state.busy = false;
        root.classList.remove('rolling');
        render();
        confetti();
        toast(t('boom'));
        return;
      }
      var id = drawRandom();
      if (!id) { state.busy = false; root.classList.remove('rolling'); return; }
      state.seq.push(id);
      state.lastAdded = state.seq.length - 1;
      render();
      setTimeout(tick, 150);
    };
    tick();
  }
  function confetti() {
    var host = document.getElementById('bb-confetti');
    if (!host) return;
    var colors = ['var(--caramel)', '#f3c6c6', '#e8c79b', '#ffffff', '#d9a96d'];
    for (var i = 0; i < 22; i++) {
      var s = document.createElement('span');
      var w = 6 + Math.random() * 7;
      s.style.setProperty('--w', w.toFixed(0) + 'px');
      s.style.setProperty('--h', (i % 3 === 0 ? w : w * 1.9).toFixed(0) + 'px');
      s.style.setProperty('--c', colors[i % colors.length]);
      s.style.setProperty('--br', i % 3 === 0 ? '50%' : '2px');
      s.style.setProperty('--dx', (Math.random() * 300 - 150).toFixed(0) + 'px');
      s.style.setProperty('--dy', (-50 - Math.random() * 180).toFixed(0) + 'px');
      s.style.setProperty('--r', (Math.random() * 540 - 270).toFixed(0) + 'deg');
      s.style.animationDelay = (Math.random() * 0.15).toFixed(2) + 's';
      host.appendChild(s);
    }
    setTimeout(function () { host.innerHTML = ''; }, 1400);
  }
  function addToCart() {
    var b = box();
    if (!b || state.busy || state.seq.length !== b.n || !window.YYAddBoxToCart) return;
    var map = {};
    state.seq.forEach(function (id) { map[id] = (map[id] || 0) + 1; });
    var picks = Object.keys(map).map(function (id) { return { id: id, qty: map[id] }; });
    if (!window.YYAddBoxToCart(b.id, picks)) return;
    state.seq = [];
    state.lastAdded = -1;
    close();
    toast(t('added'));
    setTimeout(function () { if (window.openBoxModal) window.openBoxModal(); }, 350);   // opens the cart panel
  }

  // ---------------- rendering ----------------
  function renderTiles() {
    var host = document.getElementById('bb-tiles');
    var list = cookies();
    host.innerHTML = list.length ? list.map(function (c) {
      return '<div class="bb-tile" data-id="' + esc(c.id) + '">' +
        '<span class="bb-badge" aria-hidden="true"></span>' +
        '<div class="bb-pic"><img src="' + esc(img(c)) + '" alt="" loading="lazy" decoding="async"></div>' +
        '<div class="bb-tname">' + esc(locName(c)) + '</div>' +
        '<div class="bb-step-row">' +
          '<button type="button" class="bb-mini" data-bb="minus" data-id="' + esc(c.id) + '" aria-label="' + esc(t('minus') + ': ' + locName(c)) + '">&minus;</button>' +
          '<span class="bb-qty">0</span>' +
          '<button type="button" class="bb-mini" data-bb="plus" data-id="' + esc(c.id) + '" aria-label="' + esc(t('plus') + ': ' + locName(c)) + '">+</button>' +
        '</div></div>';
    }).join('') : '<p class="bb-none">' + esc(t('none')) + '</p>';
  }

  function render() {
    if (!root || root.hidden) return;
    var s = sizes(), b = box();
    if (!b) return;
    var full = state.seq.length >= b.n;
    document.getElementById('bb-title').textContent = t('title');
    document.getElementById('bb-step1').textContent = t('step1');
    document.getElementById('bb-step2').textContent = t('step2');

    document.getElementById('bb-sizes').innerHTML = s.map(function (x, i) {
      var dots = '';
      for (var d = 0; d < x.n; d++) dots += '<i></i>';
      return '<button type="button" class="bb-size' + (i === state.idx ? ' on' : '') + '" data-bb="size" data-i="' + i + '" aria-pressed="' + (i === state.idx) + '">' +
        '<span class="bb-dots c' + x.n + '" aria-hidden="true">' + dots + '</span>' +
        '<b>' + esc(t('s' + x.n) !== 's' + x.n ? t('s' + x.n) : x.item.name) + '</b>' +
        '<small>' + esc(t('cookies', { n: x.n })) + '</small><em>' + x.price + ' DH</em></button>';
    }).join('');

    var slots = '';
    for (var i = 0; i < b.n; i++) {
      var id = state.seq[i], it = id && menu().byId[id];
      slots += it
        ? '<button type="button" class="bb-slot filled' + (i === state.lastAdded ? ' pop' : '') + '" data-bb="slot" data-i="' + i + '" title="' + esc(t('remove') + ': ' + locName(it)) + '" aria-label="' + esc(t('remove') + ': ' + locName(it)) + '"><img src="' + esc(img(it)) + '" alt=""></button>'
        : '<span class="bb-slot"><b>' + (i + 1) + '</b></span>';
    }
    var tray = document.getElementById('bb-tray');
    tray.className = 'bb-tray n' + b.n;
    tray.innerHTML = '<div class="bb-ribbon">' + esc(t('label')) + '</div><div class="bb-slots">' + slots + '</div>';

    var left = b.n - state.seq.length;
    document.getElementById('bb-count').textContent = state.seq.length === 0 ? t('hint') : (t('chosen', { n: state.seq.length, N: b.n }) + ' - ' + (full ? t('full') : t('more', { n: left })));

    document.querySelectorAll('#bb-tiles .bb-tile').forEach(function (tile) {
      var n = countOf(tile.getAttribute('data-id'));
      tile.querySelector('.bb-qty').textContent = n;
      tile.classList.toggle('has', n > 0);
      tile.classList.toggle('off', full && n === 0);
      tile.querySelector('.bb-badge').textContent = n > 0 ? n : '';
      tile.querySelector('[data-bb="minus"]').disabled = n === 0 || state.busy;
      tile.querySelector('[data-bb="plus"]').disabled = full || state.busy;
    });

    var worth = 0;
    state.seq.forEach(function (id) { var it = menu().byId[id]; if (it) worth += it.price; });
    document.getElementById('bb-worth').textContent = (full && worth > b.price) ? t('worth', { w: worth, p: b.price }) : '';

    var sp = document.getElementById('bb-surprise-t');
    sp.textContent = state.busy ? t('mixing') : (full ? t('again') : t('surprise'));
    document.getElementById('bb-clear').textContent = t('clear');
    document.getElementById('bb-clear').disabled = state.seq.length === 0 || state.busy;
    document.getElementById('bb-surprise').disabled = state.busy || !cookies().length;
    var add = document.getElementById('bb-add');
    add.disabled = !full || state.busy;
    add.textContent = full ? t('add') + ' - ' + b.price + ' DH' : t('more', { n: left });
    root.setAttribute('dir', lang() === 'ar' ? 'rtl' : 'ltr');
  }

  // ---------------- wiring ----------------
  function init() {
    renderBanner();
    document.addEventListener('click', function (e) {
      if (e.target.closest('#bb-banner .bb-open, #bb-banner .bb-banner-art')) open();
    });
    function refresh() { renderBanner(); if (root && !root.hidden) { if (state.idx >= sizes().length) state.idx = 0; renderTiles(); render(); } }
    window.addEventListener('menu-updated', refresh);
    document.addEventListener('yy:langchange', refresh);
    if (/[?&]build=1\b/.test(location.search) || location.hash === '#build-a-box') setTimeout(function () { open(); }, 600);
  }
  window.YYOpenBoxBuilder = open;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

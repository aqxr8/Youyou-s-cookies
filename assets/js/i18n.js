/* =========================================================
   Youyou's Cookies - i18n.js
   English / Français / العربية  (hand-written dictionary, no machine translation)
   - Picks the saved language (or the browser language on the first visit)
   - Translates static text AND text created later by the site scripts
   - Arabic switches the whole page to right-to-left
   ========================================================= */
(function () {
  "use strict";

  var LANGS = ["en", "fr", "ar"];
  var KEY = "youyou_lang";
  var ATTRS = ["placeholder", "title", "aria-label", "alt"];
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 0 };

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }

  /* ---------- dictionary ---------- */
  function norm(s) {
    return String(s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\s+/g, " ").trim();
  }
  var DICT = {};
  (window.YY_I18N_ROWS || []).forEach(function (r) { DICT[norm(r[0])] = { fr: r[1], ar: r[2] }; });

  var lang = "en";

  function pick(entry) { return entry ? entry[lang] : null; }

  function to24h(t) {
    var m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
    if (!m) return t;
    var h = parseInt(m[1], 10) % 12; if (/pm/i.test(m[3])) h += 12;
    return (h < 10 ? "0" : "") + h + ":" + m[2];
  }
  function num(n) { return n; }

  /* patterns for text that contains numbers / names. Each: [regex, fr(fn), ar(fn)] */
  var PATTERNS = [
    [/^(\d+(?:[.,]\d+)?)\s*(?:DH|dh)$/, function (m) { return m[1] + " DH"; }, function (m) { return m[1] + " درهم"; }],
    [/^From (\d+)\s*dh$/i, function (m) { return "À partir de " + m[1] + " DH"; }, function (m) { return "ابتداءً من " + m[1] + " درهم"; }],
    [/^Order #(\w+)$/, function (m) { return "Commande #" + m[1]; }, function (m) { return "الطلب #" + m[1]; }],
    [/^• (\d+)x (.+?) \((\d+(?:\.\d+)?) DH\)$/, function (m) { return "• " + m[1] + "x " + T(m[2]) + " (" + m[3] + " DH)"; }, function (m) { return "• " + m[1] + "x " + T(m[2]) + " (" + m[3] + " درهم)"; }],
    [/^\((\d+(?:\.\d+)?) DH each\)$/, function (m) { return "(" + m[1] + " DH l'unité)"; }, function (m) { return "(" + m[1] + " درهم للواحدة)"; }],
    [/^Sending receipt to (.+)\.\.\.$/, function (m) { return "Envoi du reçu à " + m[1] + "..."; }, function (m) { return "جارٍ إرسال الإيصال إلى " + m[1] + "..."; }],
    [/^Receipt sent to (.+)$/, function (m) { return "Reçu envoyé à " + m[1]; }, function (m) { return "تم إرسال الإيصال إلى " + m[1]; }],
    [/^Added (.+) to your box!$/, function (m) { return T(m[1]) + " ajouté à votre box !"; }, function (m) { return "تمت إضافة " + T(m[1]) + " إلى صندوقك!"; }],
    [/^(\d+) order\(s\) · (\d+(?:\.\d+)?) DH delivered$/, function (m) { return m[1] + " commande(s) · " + m[2] + " DH livrés"; }, function (m) { return m[1] + " طلب(ات) · " + m[2] + " درهم مُسلَّمة"; }],
    [/^Delivery Fee: (\d+(?:\.\d+)?) DH$/, function (m) { return "Frais de livraison : " + m[1] + " DH"; }, function (m) { return "رسوم التوصيل: " + m[1] + " درهم"; }],
    [/^Real Price: (.+) DH$/, function (m) { return "Prix réel : " + m[1] + " DH"; }, function (m) { return "السعر الأصلي: " + m[1] + " درهم"; }],
    [/^New Price: (.+) DH$/, function (m) { return "Nouveau prix : " + m[1] + " DH"; }, function (m) { return "السعر الجديد: " + m[1] + " درهم"; }],
    [/^Total: (.+) DH$/, function (m) { return "Total : " + m[1] + " DH"; }, function (m) { return "المجموع: " + m[1] + " درهم"; }],
    [/^Promo: (.+) \(-(.+) DH\)$/, function (m) { return "Promo : " + m[1] + " (-" + m[2] + " DH)"; }, function (m) { return "خصم: " + m[1] + " (-" + m[2] + " درهم)"; }],
    [/^Promo Code Used: (.+) \(-(.+) DH\)$/, function (m) { return "Code promo utilisé : " + m[1] + " (-" + m[2] + " DH)"; }, function (m) { return "رمز الخصم المستعمل: " + m[1] + " (-" + m[2] + " درهم)"; }],
    [/^Promo Code Used: (.+) \(🎁 Gift: (.+)\)$/, function (m) { return "Code promo utilisé : " + m[1] + " (🎁 Cadeau : " + m[2] + ")"; }, function (m) { return "رمز الخصم المستعمل: " + m[1] + " (🎁 هدية: " + m[2] + ")"; }],
    [/^Coupon (.+) applied successfully!$/, function (m) { return "Coupon " + m[1] + " appliqué avec succès !"; }, function (m) { return "تم تطبيق القسيمة " + m[1] + " بنجاح!"; }],
    [/^This coupon requires an order of at least (\d+) DH\.$/, function (m) { return "Ce coupon nécessite une commande d'au moins " + m[1] + " DH."; }, function (m) { return "تتطلب هذه القسيمة طلباً لا تقل قيمته عن " + m[1] + " درهم."; }],
    [/^Orders over (\d+) DH$/, function (m) { return "Commandes de plus de " + m[1] + " DH"; }, function (m) { return "الطلبات التي تزيد عن " + m[1] + " درهم"; }],
    [/^(\d+(?:\.\d+)?) DH spent$/, function (m) { return m[1] + " DH dépensés"; }, function (m) { return "تم إنفاق " + m[1] + " درهم"; }],
    [/^more to unlock (.+)$/, function (m) { return "de plus pour débloquer " + T(m[1]); }, function (m) { return "إضافية لفتح " + T(m[1]); }],
    [/^to get free delivery!$/, function () { return "pour obtenir la livraison gratuite !"; }, function () { return "للحصول على توصيل مجاني!"; }],
    [/^We are currently taking orders until (.+)$/, function (m) { return "Nous prenons des commandes jusqu'à " + to24h(m[1]); }, function (m) { return "نستقبل الطلبات حتى " + to24h(m[1]); }],
    [/^Open until (.+) \(Morocco time\)$/, function (m) { return "Ouvert jusqu'à " + to24h(m[1]) + " (heure du Maroc)"; }, function (m) { return "مفتوح حتى " + to24h(m[1]) + " (بتوقيت المغرب)"; }],
    [/^Opens at (.+) \(Morocco time\)$/, function (m) { return "Ouvre à " + to24h(m[1]) + " (heure du Maroc)"; }, function (m) { return "يفتح عند " + to24h(m[1]) + " (بتوقيت المغرب)"; }],
    [/^Expired on (.+)$/, function (m) { return "Expiré le " + m[1]; }, function (m) { return "انتهى في " + m[1]; }],
    [/^FREE GIFT: (.+)$/, function (m) { return "CADEAU OFFERT : " + m[1]; }, function (m) { return "هدية مجانية: " + m[1]; }],
    [/^Check out '(.+)' on the menu for (.+) →$/, function (m) { return "Découvrez « " + T(m[1]) + " » dans le menu pour " + T(m[2]) + " →"; }, function (m) { return "اكتشف '" + T(m[1]) + "' في القائمة بسعر " + T(m[2]) + " ←"; }],
    [/^Order #(\w+) will be cancelled and we won't prepare it\. This can't be undone, but you're always welcome to place a new order\.$/,
      function (m) { return "La commande #" + m[1] + " sera annulée et nous ne la préparerons pas. Cette action est irréversible, mais vous pouvez toujours passer une nouvelle commande."; },
      function (m) { return "سيتم إلغاء الطلب #" + m[1] + " ولن نقوم بتحضيره. لا يمكن التراجع عن هذا، لكن يمكنك دائماً تقديم طلب جديد."; }],
    [/^Order #(\w+) for (.+) will be marked as Cancelled and won't count as revenue\. You can switch it back to In Progress later\.$/,
      function (m) { return "La commande #" + m[1] + " de " + m[2] + " sera marquée comme annulée et ne comptera pas dans le chiffre d'affaires. Vous pourrez la remettre en cours plus tard."; },
      function (m) { return "سيتم وضع علامة «ملغى» على الطلب #" + m[1] + " الخاص بـ " + m[2] + " ولن يُحتسب ضمن الإيرادات. يمكنك إعادته إلى «قيد التحضير» لاحقاً."; }],
    [/^The promo code (.+) already exists\. Choose a different code\.$/, function (m) { return "Le code promo " + m[1] + " existe déjà. Choisissez un autre code."; }, function (m) { return "رمز الخصم " + m[1] + " موجود بالفعل. اختر رمزاً مختلفاً."; }],
    [/^Promo code (.+) saved successfully\. It should now appear in the list below\.$/, function (m) { return "Code promo " + m[1] + " enregistré. Il devrait apparaître dans la liste ci-dessous."; }, function (m) { return "تم حفظ رمز الخصم " + m[1] + ". سيظهر الآن في القائمة أدناه."; }]
  ];

  /* "2x Classic Cookie, 1x Lotus Cookie" */
  var ITEMS_RE = /^\d+x .+$/;
  function translateItems(s) {
    return s.split(/,\s*/).map(function (part) {
      var m = /^(\d+)x (.+)$/.exec(part);
      return m ? m[1] + "x " + T(m[2]) : T(part);
    }).join(lang === "ar" ? "، " : ", ");
  }

  /* core: translate a plain string (returns same string if unknown) */
  function T(str) {
    if (lang === "en" || str == null) return str;
    var s = String(str);
    var lead = /^\s*/.exec(s)[0], trail = /\s*$/.exec(s)[0];
    var core = norm(s);
    if (!core) return s;
    var hit = pick(DICT[core]);
    if (hit) return lead + hit + trail;
    for (var i = 0; i < PATTERNS.length; i++) {
      var m = PATTERNS[i][0].exec(core);
      if (m) return lead + PATTERNS[i][lang === "fr" ? 1 : 2](m) + trail;
    }
    if (core.indexOf(" | ") > -1) {           // page titles: "Menu | Youyou's Cookies | Made With Love"
      return lead + core.split(" | ").map(T).join(" | ") + trail;
    }
    if (/^\d+x /.test(core)) return lead + translateItems(core) + trail;
    if (s.indexOf("\n") > -1) {                // multi-line text (order summary)
      var changed = false;
      var lines = s.split("\n").map(function (ln) {
        var t = T(ln); if (t !== ln) changed = true; return t;
      });
      if (changed) return lines.join("\n");
    }
    return s;
  }
  window.YYT = T;
  window.YYLang = function () { return lang; };

  /* ---------- DOM translation ---------- */
  var textRec = new WeakMap();   // text node -> {orig, shown}
  var attrRec = new WeakMap();   // element   -> { attr: {orig, shown} }
  var observer = null;

  function skip(node) {
    var p = node.parentNode;
    return !p || (p.nodeType === 1 && SKIP_TAGS[p.nodeName] === 1) || (p.closest && p.closest("[data-i18n-skip]"));
  }

  function doText(node) {
    if (skip(node)) return;
    var rec = textRec.get(node);
    if (!rec || rec.shown !== node.data) rec = { orig: node.data, shown: node.data };
    var out = lang === "en" ? rec.orig : T(rec.orig);
    if (out !== node.data) node.data = out;
    rec.shown = node.data;
    textRec.set(node, rec);
  }

  function doAttrs(el) {
    var recs = attrRec.get(el) || {};
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var cur = el.getAttribute(a);
      var r = recs[a];
      if (!r || r.shown !== cur) r = { orig: cur, shown: cur };
      var out = lang === "en" ? r.orig : T(r.orig);
      if (out !== cur) el.setAttribute(a, out);
      r.shown = out;
      recs[a] = r;
    });
    if (el.nodeName === "INPUT" && /^(button|submit)$/i.test(el.type) && el.value) {
      var r2 = recs.value, cv = el.value;
      if (!r2 || r2.shown !== cv) r2 = { orig: cv, shown: cv };
      var o2 = lang === "en" ? r2.orig : T(r2.orig);
      if (o2 !== cv) el.value = o2;
      r2.shown = o2; recs.value = r2;
    }
    attrRec.set(el, recs);
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      doAttrs(root);                                   // placeholders etc. also on <textarea>
      if (SKIP_TAGS[root.nodeName] === 1) return;
    }
    var kids = root.childNodes;
    for (var i = 0; i < kids.length; i++) walk(kids[i]);
  }

  function translateMeta() {
    var map = {};
    document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]').forEach(function (m) {
      var r = m.__yy || (m.__yy = { orig: m.getAttribute("content") });
      m.setAttribute("content", lang === "en" ? r.orig : T(r.orig));
    });
  }

  function applyAll() {
    if (observer) observer.disconnect();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("data-lang", lang);
    if (lang === "ar") loadArabicFont();
    walk(document.documentElement);
    translateMeta();
    syncSwitchers();
    startObserver();
  }

  function startObserver() {
    if (!window.MutationObserver) return;
    if (!observer) {
      observer = new MutationObserver(function (records) {
        if (lang === "en") return;
        observer.disconnect();
        try {
          records.forEach(function (r) {
            if (r.type === "childList") r.addedNodes.forEach(walk);
            else if (r.type === "characterData") doText(r.target);
            else if (r.type === "attributes") doAttrs(r.target);
          });
        } finally { connect(); }
      });
    }
    connect();
  }
  function connect() {
    observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
  }

  /* ---------- Arabic font ---------- */
  var fontLoaded = false;
  function loadArabicFont() {
    if (fontLoaded) return; fontLoaded = true;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap";
    document.head.appendChild(l);
  }

  /* ---------- switcher ---------- */
  var LABELS = { en: "EN", fr: "FR", ar: "عربي" };
  var NAMES = { en: "English", fr: "Français", ar: "العربية" };

  function buildSwitcher(extraClass) {
    var wrap = document.createElement("div");
    wrap.className = "lang-switch " + (extraClass || "");
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Language");
    wrap.setAttribute("data-i18n-skip", "");
    LANGS.forEach(function (code) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lang-btn";
      b.setAttribute("data-lang", code);
      b.setAttribute("lang", code);
      b.title = NAMES[code];
      b.textContent = LABELS[code];
      b.addEventListener("click", function (e) { e.stopPropagation(); setLang(code); });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function syncSwitchers() {
    document.querySelectorAll(".lang-btn").forEach(function (b) {
      var on = b.getAttribute("data-lang") === lang;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function injectSwitchers() {
    if (document.querySelector(".lang-switch")) return;
    var ha = document.querySelector(".header-actions");
    if (ha) ha.insertBefore(buildSwitcher("lang-desktop desktop-action"), ha.firstChild);
    var ma = document.querySelector(".mobile-nav-actions");
    if (ma) ma.insertBefore(buildSwitcher("lang-mobile"), ma.firstChild);
    if (!ha && !ma) document.body.appendChild(buildSwitcher("lang-floating"));
  }

  function setLang(code) {
    if (LANGS.indexOf(code) < 0) return;
    lang = code;
    store(KEY, code);
    applyAll();
    document.dispatchEvent(new CustomEvent("yy:langchange", { detail: { lang: code } }));
  }
  window.YYSetLang = setLang;

  /* alert / confirm messages are plain strings, translate them too */
  var _alert = window.alert, _confirm = window.confirm;
  window.alert = function (m) { return _alert.call(window, T(m)); };
  window.confirm = function (m) { return _confirm.call(window, T(m)); };

  /* ---------- boot ---------- */
  function initialLang() {
    var saved = store(KEY);
    if (saved && LANGS.indexOf(saved) > -1) return saved;
    var nav = ((navigator.languages && navigator.languages[0]) || navigator.language || "en").slice(0, 2).toLowerCase();
    return LANGS.indexOf(nav) > -1 ? nav : "en";
  }

  // set direction before first paint to avoid a flash
  lang = initialLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.setAttribute("data-lang", lang);

  function boot() {
    injectSwitchers();
    applyAll();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

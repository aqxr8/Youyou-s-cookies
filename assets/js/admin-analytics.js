/* admin-analytics.js - charts for the admin dashboard (Analytics tab).
   Reads the live orders that auth.js publishes (window.__yyOrders + the "yy:orders" event).
   Plain SVG/HTML, no library, no network. Revenue = products only, delivery fees excluded (same rule as the top cards). */
(function () {
  'use strict';

  var TZ = 'Africa/Casablanca';
  var dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
  var hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false });
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var STATUS = [
    { key: 'Delivered', label: 'Delivered', color: 'var(--ok, #2e8b57)' },
    { key: 'Processing', label: 'In progress', color: 'var(--warn, #c98a1b)' },
    { key: 'Returned', label: 'Returned', color: '#5a6ec8' },
    { key: 'Cancelled', label: 'Cancelled', color: 'var(--bad, #c0443f)' }
  ];

  var state = { period: '30', basis: 'delivered', top: 'units', orders: [], dirty: true };

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toDate(ts) {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (ts instanceof Date) return ts;
    if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
    return null;
  }
  function num(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function fmt(n) { return num(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function dh(n) { return fmt(n) + ' DH'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function addDays(day, n) {
    var d = new Date(day + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function dayDiff(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000); }
  function dowOf(day) { return (new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7; }   // Monday = 0
  function weekStart(day) { return addDays(day, -dowOf(day)); }
  function bucketOf(day, g) { return g === 'day' ? day : (g === 'week' ? weekStart(day) : day.slice(0, 7)); }
  function shortDay(day) { return parseInt(day.slice(8, 10), 10) + ' ' + MONTHS[parseInt(day.slice(5, 7), 10) - 1]; }
  function labelOf(key, g) {
    if (g === 'month') return MONTHS[parseInt(key.slice(5, 7), 10) - 1] + " '" + key.slice(2, 4);
    return shortDay(key);
  }
  function longLabel(key, g) {
    if (g === 'month') return MONTHS[parseInt(key.slice(5, 7), 10) - 1] + ' ' + key.slice(0, 4);
    if (g === 'week') return 'Week of ' + shortDay(key) + ' ' + key.slice(0, 4);
    return shortDay(key) + ' ' + key.slice(0, 4);
  }
  function niceStep(v) {
    if (v <= 0) return 1;
    var exp = Math.pow(10, Math.floor(Math.log10(v))), f = v / exp;
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nf * exp;
  }

  // ---------- data ----------
  function normalize(list) {
    return (list || []).map(function (o) {
      var d = o.data || {};
      var dt = toDate(d.createdAt);
      if (!dt) return null;
      var day = dayFmt.format(dt);
      var hour = parseInt(hourFmt.format(dt), 10) % 24;
      var items = (Array.isArray(d.items) ? d.items : []).map(function (i) {
        var q = Number(i.quantity) || 0;
        return { name: String(i.name || 'Item'), qty: q, sales: (Number(i.price) || 0) * q };
      });
      return { day: day, hour: hour, dow: dowOf(day), status: d.status || 'Processing', revenue: Number(o.revenue) || 0, items: items };
    }).filter(Boolean);
  }
  function included(o) {
    return state.basis === 'delivered' ? o.status === 'Delivered' : (o.status !== 'Cancelled' && o.status !== 'Returned');
  }
  function today() { return dayFmt.format(new Date()); }

  function getRange() {
    var t = today(), p = state.period, start;
    if (p === 'all') {
      start = t;
      state.orders.forEach(function (o) { if (o.day < start) start = o.day; });
    } else if (p === '12m') {
      var y = +t.slice(0, 4), m = +t.slice(5, 7) - 11;
      while (m < 1) { m += 12; y--; }
      start = y + '-' + pad(m) + '-01';
    } else {
      start = addDays(t, -(parseInt(p, 10) - 1));
    }
    var span = dayDiff(start, t) + 1;
    var g = span <= 45 ? 'day' : (span <= 200 ? 'week' : 'month');
    var r = { start: start, end: t, span: span, g: g, prev: null };
    if (p !== 'all') {
      var pe = addDays(start, -1);
      r.prev = { start: addDays(pe, -(span - 1)), end: pe };
    }
    return r;
  }
  function inRange(o, s, e) { return o.day >= s && o.day <= e; }

  function totals(list) {
    var t = { revenue: 0, orders: 0, units: 0 };
    list.forEach(function (o) {
      t.revenue += o.revenue; t.orders += 1;
      o.items.forEach(function (i) { t.units += i.qty; });
    });
    return t;
  }

  // ---------- rendering ----------
  function kpis(cur, prev) {
    var avg = cur.orders ? cur.revenue / cur.orders : 0;
    function delta(c, p) {
      if (!prev) return '';
      if (!p) return c ? '<em class="an-delta up">new</em>' : '<em class="an-delta">-</em>';
      var pct = Math.round(((c - p) / p) * 100);
      if (pct === 0) return '<em class="an-delta">&#8212; 0%</em>';
      return '<em class="an-delta ' + (pct >= 0 ? 'up' : 'down') + '">' + (pct >= 0 ? '&#9650; ' : '&#9660; ') + Math.abs(pct) + '%</em>';
    }
    var pavg = prev && prev.orders ? prev.revenue / prev.orders : 0;
    function card(label, value, d) { return '<div class="an-kpi"><span>' + label + '</span><b>' + value + '</b>' + d + '</div>'; }
    $('an-kpis').innerHTML =
      card('Revenue', esc(dh(cur.revenue)), delta(cur.revenue, prev && prev.revenue)) +
      card('Orders', esc(fmt(cur.orders)), delta(cur.orders, prev && prev.orders)) +
      card('Average order', esc(dh(avg)), delta(avg, pavg)) +
      card('Items sold', esc(fmt(cur.units)), delta(cur.units, prev && prev.units));
  }

  function drawLine(buckets, g) {
    var box = $('an-line');
    var n = buckets.length;
    var W = Math.max(280, box.clientWidth || 640), H = 270;
    var pl = W < 420 ? 44 : 54, pr = 16, pt = 16, pb = 32;
    var maxV = 0;
    buckets.forEach(function (b) { if (b.revenue > maxV) maxV = b.revenue; });
    if (!maxV) {
      box.innerHTML = '<p class="an-empty">No revenue in this period yet.</p>';
      return;
    }
    var step = niceStep(maxV / 4), top = step * Math.ceil(maxV / step);
    var iw = W - pl - pr, ih = H - pt - pb;
    function X(i) { return n === 1 ? pl + iw / 2 : pl + iw * i / (n - 1); }
    function Y(v) { return pt + ih * (1 - v / top); }

    var grid = '';
    for (var v = 0; v <= top + 1e-9; v += step) {
      grid += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="an-grid-line"/>' +
        '<text x="' + (pl - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end" class="an-axis">' + esc(fmt(v)) + '</text>';
    }
    var maxLabels = Math.max(2, Math.floor(iw / 72)), every = Math.ceil(n / maxLabels), xl = '';
    for (var i = 0; i < n; i += every) {
      var lx = X(i), anchor = 'middle';
      if (lx + 24 > W) { lx = W - 2; anchor = 'end'; }
      xl += '<text x="' + lx + '" y="' + (H - 9) + '" text-anchor="' + anchor + '" class="an-axis">' + esc(labelOf(buckets[i].key, g)) + '</text>';
    }
    var pts = buckets.map(function (b, i) { return X(i).toFixed(1) + ',' + Y(b.revenue).toFixed(1); });
    var line = 'M' + pts.join(' L');
    var area = line + ' L' + X(n - 1).toFixed(1) + ',' + Y(0) + ' L' + X(0).toFixed(1) + ',' + Y(0) + ' Z';
    var dots = '';
    if (n <= 31) buckets.forEach(function (b, i) { dots += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(b.revenue).toFixed(1) + '" r="3" class="an-dot"/>'; });

    box.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Revenue over time">' +
      '<defs><linearGradient id="an-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent, #b85f58)" stop-opacity=".32"/><stop offset="1" stop-color="var(--accent, #b85f58)" stop-opacity="0"/></linearGradient></defs>' +
      grid + xl +
      '<path d="' + area + '" fill="url(#an-fill)"/>' +
      '<path d="' + line + '" class="an-line-path"/>' + dots +
      '<line id="an-guide" y1="' + pt + '" y2="' + (pt + ih) + '" class="an-guide" style="display:none"/>' +
      '<circle id="an-hot" r="5" class="an-hot" style="display:none"/>' +
      '</svg><div class="an-tip" id="an-tip" hidden></div>';

    var svg = box.querySelector('svg'), tip = $('an-tip'), guide = $('an-guide'), hot = $('an-hot');
    function move(ev) {
      var rect = svg.getBoundingClientRect();
      var px = (ev.clientX - rect.left) * (W / rect.width);
      var idx = n === 1 ? 0 : Math.round((px - pl) / iw * (n - 1));
      idx = Math.max(0, Math.min(n - 1, idx));
      var b = buckets[idx], x = X(idx), y = Y(b.revenue);
      guide.setAttribute('x1', x); guide.setAttribute('x2', x); guide.style.display = '';
      hot.setAttribute('cx', x); hot.setAttribute('cy', y); hot.style.display = '';
      tip.innerHTML = '<b>' + esc(longLabel(b.key, g)) + '</b><span>' + esc(dh(b.revenue)) + '</span><small>' + b.orders + ' order' + (b.orders === 1 ? '' : 's') + '</small>';
      tip.hidden = false;
      var tx = x / W * rect.width;
      tip.style.left = Math.max(8, Math.min(rect.width - tip.offsetWidth - 8, tx - tip.offsetWidth / 2)) + 'px';
      tip.style.top = Math.max(0, y / H * rect.height - tip.offsetHeight - 12) + 'px';
    }
    function leave() { tip.hidden = true; guide.style.display = 'none'; hot.style.display = 'none'; }
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', leave);
  }

  function drawTop(list) {
    var map = {};
    list.forEach(function (o) {
      o.items.forEach(function (i) {
        var m = map[i.name] || (map[i.name] = { name: i.name, units: 0, sales: 0 });
        m.units += i.qty; m.sales += i.sales;
      });
    });
    var key = state.top === 'sales' ? 'sales' : 'units';
    var rows = Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b[key] - a[key]; }).slice(0, 8);
    var box = $('an-top');
    if (!rows.length) { box.innerHTML = '<p class="an-empty">No sales in this period yet.</p>'; return; }
    var max = rows[0][key] || 1;
    box.innerHTML = rows.map(function (r, i) {
      var val = key === 'sales' ? dh(r.sales) : fmt(r.units);
      return '<div class="an-row"><span class="an-rank">' + (i + 1) + '</span>' +
        '<span class="an-name" title="' + esc(r.name) + '">' + esc(r.name) + '</span>' +
        '<div class="an-track"><i style="width:' + Math.max(3, Math.round(r[key] / max * 100)) + '%"' + (i === 0 ? ' class="first"' : '') + '></i></div>' +
        '<b>' + esc(val) + '</b></div>';
    }).join('');
  }

  function drawStatus(list) {
    var counts = {}, total = list.length;
    list.forEach(function (o) { counts[o.status] = (counts[o.status] || 0) + 1; });
    var box = $('an-status');
    if (!total) { box.innerHTML = '<p class="an-empty">No orders in this period yet.</p>'; return; }
    var R = 56, C = 2 * Math.PI * R, off = 0, segs = '';
    STATUS.forEach(function (s) {
      var c = counts[s.key] || 0;
      if (!c) return;
      var len = c / total * C;
      segs += '<circle r="' + R + '" cx="80" cy="80" fill="none" stroke="' + s.color + '" stroke-width="24" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 80 80)"/>';
      off += len;
    });
    var legend = STATUS.map(function (s) {
      var c = counts[s.key] || 0;
      return '<li><i style="background:' + s.color + '"></i><span>' + s.label + '</span><b>' + c + '</b><small>' + Math.round(c / total * 100) + '%</small></li>';
    }).join('');
    box.innerHTML = '<div class="an-donut"><svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="Orders by status">' + segs +
      '<text x="80" y="78" text-anchor="middle" class="an-donut-n">' + total + '</text><text x="80" y="98" text-anchor="middle" class="an-axis">orders</text></svg>' +
      '<ul class="an-legend">' + legend + '</ul></div>';
  }

  function drawColumns(id, values, labels, opts) {
    var box = $(id), max = Math.max.apply(null, values.concat([0]));
    if (!max) { box.innerHTML = '<p class="an-empty">No orders in this period yet.</p>'; return; }
    box.innerHTML = '<div class="an-cols' + (opts.thin ? ' thin' : '') + '">' + values.map(function (v, i) {
      var pct = Math.max(v ? 4 : 0, Math.round(v / max * 100));
      var showLbl = !opts.every || i % opts.every === 0;
      return '<div class="an-col" title="' + esc(opts.title(i) + ': ' + v + ' order' + (v === 1 ? '' : 's')) + '">' +
        '<span class="an-val">' + (v && !opts.thin ? v : '') + '</span>' +
        '<div class="an-bar"><i class="' + (v === max ? 'peak' : '') + '" style="height:' + pct + '%"></i></div>' +
        '<span class="an-lbl">' + (showLbl ? esc(labels[i]) : '') + '</span></div>';
    }).join('') + '</div>';
  }

  function render() {
    var pane = $('analytics-pane');
    if (!pane) return;
    if (!pane.classList.contains('active')) { state.dirty = true; return; }
    state.dirty = false;

    var r = getRange();
    var inc = state.orders.filter(included);
    var cur = inc.filter(function (o) { return inRange(o, r.start, r.end); });
    var prev = r.prev ? inc.filter(function (o) { return inRange(o, r.prev.start, r.prev.end); }) : null;
    kpis(totals(cur), prev ? totals(prev) : null);

    // revenue buckets (empty days filled with 0 so the line is continuous)
    var order = [], map = {};
    for (var d = r.start, guard = 0; d <= r.end && guard < 4000; d = addDays(d, 1), guard++) {
      var k = bucketOf(d, r.g);
      if (!map[k]) { map[k] = { key: k, revenue: 0, orders: 0 }; order.push(map[k]); }
    }
    cur.forEach(function (o) {
      var b = map[bucketOf(o.day, r.g)];
      if (b) { b.revenue += o.revenue; b.orders += 1; }
    });
    var gName = r.g === 'day' ? 'per day' : (r.g === 'week' ? 'per week' : 'per month');
    $('an-line-sub').textContent = gName;
    $('an-note').textContent = (state.basis === 'delivered'
      ? 'Counting delivered orders only. '
      : 'Counting every order that is not cancelled or returned (expected revenue). ') +
      'Revenue is products only, delivery fees not included.';
    drawLine(order, r.g);
    drawTop(cur);

    var all = state.orders.filter(function (o) { return inRange(o, r.start, r.end); });
    drawStatus(all);
    var busy = all.filter(function (o) { return o.status !== 'Cancelled'; });
    var dow = [0, 0, 0, 0, 0, 0, 0], hrs = [];
    for (var h = 0; h < 24; h++) hrs.push(0);
    busy.forEach(function (o) { dow[o.dow] += 1; hrs[o.hour] += 1; });
    var hl = hrs.map(function (_, i) { return pad(i); });
    drawColumns('an-dow', dow, DOW, { title: function (i) { return DOW[i]; } });
    drawColumns('an-hours', hrs, hl, { thin: true, every: 3, title: function (i) { return pad(i) + ':00'; } });
  }

  // ---------- wiring ----------
  function setOrders(list) { state.orders = normalize(list); render(); }
  function seg(groupId, attr, key) {
    var g = $(groupId);
    if (!g) return;
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button[' + attr + ']');
      if (!b) return;
      state[key] = b.getAttribute(attr);
      g.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x === b); });
      render();
    });
  }
  function init() {
    if (!$('analytics-pane')) return;
    seg('an-period', 'data-period', 'period');
    seg('an-basis', 'data-basis', 'basis');
    seg('an-top-toggle', 'data-top', 'top');
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-tab="analytics-pane"]');
      if (t) setTimeout(render, 0);
    });
    var timer;
    window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(render, 150); });
    window.addEventListener('yy:orders', function (e) { setOrders(e.detail); });
    if (window.__yyOrders) setOrders(window.__yyOrders);
  }
  window.YYAnalytics = { setOrders: setOrders, render: render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

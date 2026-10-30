/* =========================================================
   receipt-pdf.js - builds the PDF receipt in the customer's browser.
   Drawing it in the browser keeps Arabic letters joined and right-to-left.
   window.buildReceiptPdf(receipt) -> Promise<string|null>  (base64 of the PDF, or null if anything fails)
   ========================================================= */
(function () {
  "use strict";

  var LIBS = {
    html2canvas: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    jspdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
  };

  var TEXT = {
    en: { title: "Receipt", thanks: "Thank you for your order!", order: "Order", date: "Date", customer: "Customer",
      item: "Item", qty: "Qty", price: "Price", subtotal: "Subtotal", promo: "Promo code", delivery: "Delivery",
      free: "Free", total: "Total to pay", address: "Delivery address", phone: "Phone",
      pay: "Payment: cash on delivery. Delivery every day between 15:00 and 20:00 (Morocco time).",
      bye: "Made with love" },
    fr: { title: "Reçu", thanks: "Merci pour votre commande !", order: "Commande", date: "Date", customer: "Client",
      item: "Article", qty: "Qté", price: "Prix", subtotal: "Sous-total", promo: "Code promo", delivery: "Livraison",
      free: "Gratuite", total: "Total à payer", address: "Adresse de livraison", phone: "Téléphone",
      pay: "Paiement : à la livraison. Livraison tous les jours entre 15h00 et 20h00 (heure du Maroc).",
      bye: "Fait avec amour" },
    ar: { title: "إيصال", thanks: "شكراً على طلبك!", order: "الطلب", date: "التاريخ", customer: "الزبون",
      item: "المنتج", qty: "الكمية", price: "السعر", subtotal: "المجموع الفرعي", promo: "رمز الخصم", delivery: "التوصيل",
      free: "مجاني", total: "المبلغ المستحق", address: "عنوان التوصيل", phone: "الهاتف",
      pay: "الدفع: نقداً عند الاستلام. التوصيل كل يوم بين 15:00 و20:00 (بتوقيت المغرب).",
      bye: "صُنع بحب" }
  };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2); }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-yy-lib="' + src + '"]');
      if (existing && existing.getAttribute("data-loaded") === "1") return resolve();
      var s = existing || document.createElement("script");
      s.setAttribute("data-yy-lib", src);
      s.onload = function () { s.setAttribute("data-loaded", "1"); resolve(); };
      s.onerror = function () { reject(new Error("Could not load " + src)); };
      if (!existing) { s.src = src; document.head.appendChild(s); }
    });
  }

  function buildElement(r) {
    var lang = TEXT[r.lang] ? r.lang : "en";
    var t = TEXT[lang];
    var rtl = lang === "ar";
    var items = r.items || [];
    var subtotal = items.reduce(function (s, i) { return s + (Number(i.price) || 0) * (Number(i.quantity) || 0); }, 0);
    var discount = Math.min(Math.max(Number(r.discount) || 0, 0), subtotal);
    var delivery = Math.max(Number(r.deliveryFee) || 0, 0);
    var total = Math.max(0, subtotal - discount) + delivery;
    var when = "";
    try {
      when = new Date().toLocaleString(lang === "ar" ? "ar-MA-u-nu-latn" : lang === "fr" ? "fr-MA" : "en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca"
      });
    } catch (e) { when = new Date().toISOString().slice(0, 16).replace("T", " "); }

    var a = rtl ? "right" : "left", o = rtl ? "left" : "right";
    var font = rtl ? "'Cairo','Noto Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif" : "Arial,Helvetica,sans-serif";
    var cell = "padding:9px 0;border-bottom:1px solid #f0d9d3;";
    var rows = items.map(function (i) {
      return '<tr><td style="' + cell + "text-align:" + a + ';">' + esc(i.name) + "</td>" +
        '<td style="' + cell + 'text-align:center;">' + esc(i.quantity) + "</td>" +
        '<td dir="ltr" style="' + cell + "text-align:" + o + ';white-space:nowrap;">' + money(i.price * i.quantity) + " DH</td></tr>";
    }).join("");
    function line(label, value, strong) {
      var st = strong ? "font-weight:700;font-size:17px;color:#c0716a;" : "color:#7a5a52;";
      return '<tr><td colspan="2" style="padding:5px 0;text-align:' + a + ";" + st + '">' + label + "</td>" +
        '<td dir="ltr" style="padding:5px 0;text-align:' + o + ";white-space:nowrap;" + st + '">' + value + "</td></tr>";
    }

    var el = document.createElement("div");
    el.setAttribute("dir", rtl ? "rtl" : "ltr");
    el.setAttribute("data-i18n-skip", "");
    el.style.cssText = "position:fixed;left:-10000px;top:0;width:560px;background:#fff;color:#4a2b24;font-family:" + font + ";";
    el.innerHTML =
      '<div style="background:#c0716a;color:#fff;text-align:center;padding:26px 16px;">' +
        '<div style="font-size:28px;font-weight:700;">Youyou\'s Cookies</div>' +
        '<div style="font-size:13px;letter-spacing:1px;margin-top:4px;">MADE WITH LOVE</div></div>' +
      '<div style="padding:24px 28px 8px;text-align:' + a + ';">' +
        '<div style="font-size:22px;font-weight:700;margin-bottom:4px;">' + esc(t.title) + " " + '<span dir="ltr">' + esc(r.orderRef) + "</span></div>" +
        '<div style="color:#7a5a52;margin-bottom:12px;">' + esc(t.thanks) + "</div>" +
        '<div style="font-size:14px;line-height:1.7;"><strong>' + esc(t.date) + ":</strong> " + esc(when) +
        (r.name ? "<br><strong>" + esc(t.customer) + ":</strong> " + esc(r.name) : "") + "</div></div>" +
      '<div style="padding:8px 28px;"><table style="width:100%;border-collapse:collapse;font-size:14px;">' +
        '<tr><th style="padding:8px 0;border-bottom:2px solid #c0716a;text-align:' + a + ';">' + esc(t.item) + "</th>" +
        '<th style="padding:8px;border-bottom:2px solid #c0716a;text-align:center;">' + esc(t.qty) + "</th>" +
        '<th style="padding:8px 0;border-bottom:2px solid #c0716a;text-align:' + o + ';">' + esc(t.price) + "</th></tr>" +
        rows + line(esc(t.subtotal), money(subtotal) + " DH") +
        (r.promoCode && discount > 0 ? line(esc(t.promo) + ": " + esc(r.promoCode), "-" + money(discount) + " DH") : "") +
        line(esc(t.delivery), delivery > 0 ? money(delivery) + " DH" : esc(t.free)) +
        line(esc(t.total), money(total) + " DH", true) + "</table></div>" +
      '<div style="padding:14px 28px 4px;text-align:' + a + ';font-size:14px;line-height:1.7;">' +
        (r.address ? "<strong>" + esc(t.address) + ":</strong> " + esc(r.address) + "<br>" : "") +
        (r.phone ? "<strong>" + esc(t.phone) + ':</strong> <span dir="ltr">' + esc(r.phone) + "</span>" : "") + "</div>" +
      '<div style="padding:14px 28px 28px;text-align:' + a + ';font-size:13px;color:#7a5a52;line-height:1.6;">' +
        esc(t.pay) + '<br><br><strong style="color:#c0716a;">' + esc(t.bye) + " - Youyou's Cookies</strong></div>";
    return el;
  }

  window.buildReceiptPdf = async function (receipt) {
    var el = null;
    try {
      await Promise.all([loadScript(LIBS.html2canvas), loadScript(LIBS.jspdf)]);
      el = buildElement(receipt);
      document.body.appendChild(el);
      if (receipt.lang === "ar" && document.fonts && document.fonts.load) {
        try { await Promise.race([document.fonts.load("16px Cairo"), new Promise(function (r) { setTimeout(r, 2500); })]); } catch (e) { /* use fallback font */ }
      }
      var canvas = await window.html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      var JsPDF = window.jspdf && window.jspdf.jsPDF;
      if (!JsPDF) throw new Error("jsPDF missing");
      var doc = new JsPDF({ unit: "pt", format: "a4" });
      var pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight(), m = 30;
      var w = pw - m * 2, h = canvas.height * w / canvas.width;
      if (h > ph - m * 2) { w = w * (ph - m * 2) / h; h = ph - m * 2; }
      doc.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", (pw - w) / 2, m, w, h);
      var uri = doc.output("datauristring");
      var b64 = uri.split("base64,")[1];
      return b64 || null;
    } catch (err) {
      console.warn("PDF receipt could not be built:", err);
      return null;
    } finally {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  };
})();

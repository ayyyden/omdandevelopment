/*
  English / Spanish switch for /outdoor-remodel/.

  The page is written in English; each translatable element carries its Spanish next to it:
    data-es="…"              Spanish innerHTML
    data-es-placeholder="…"  Spanish placeholder
    data-es-aria="…"         Spanish aria-label
  Buttons with [data-lang-toggle] switch language. ?lang=es opens the page in Spanish
  (use it in Spanish ads); the choice is remembered for the next visit.
  booking.js reads OMD.lang / OMD.t(en, es) and re-renders on the "omd:lang" event.
*/
(function () {
  var KEY = "omd_lang";
  var TITLES = { en: document.title, es: "Remodelación de patios | Omdan Development" };

  function initial() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "es" || q === "en") return q;
    try { var s = localStorage.getItem(KEY); if (s === "es" || s === "en") return s; } catch (e) {}
    return "en";
  }

  var OMD = window.OMD = {
    lang: "en",
    t: function (en, es) { return OMD.lang === "es" ? es : en; },
    locale: function () { return OMD.lang === "es" ? "es-US" : "en-US"; },
    setLang: setLang
  };

  function swap(el, attr, esAttr) {
    var enAttr = "data-en-" + attr;
    if (!el.hasAttribute(enAttr)) el.setAttribute(enAttr, el.getAttribute(attr) || "");
    el.setAttribute(attr, OMD.lang === "es" ? el.getAttribute(esAttr) : el.getAttribute(enAttr));
  }

  function apply() {
    document.querySelectorAll("[data-es]").forEach(function (el) {
      if (el._en === undefined) el._en = el.innerHTML;
      el.innerHTML = OMD.lang === "es" ? el.getAttribute("data-es") : el._en;
    });
    document.querySelectorAll("[data-es-placeholder]").forEach(function (el) { swap(el, "placeholder", "data-es-placeholder"); });
    document.querySelectorAll("[data-es-aria]").forEach(function (el) { swap(el, "aria-label", "data-es-aria"); });
    document.querySelectorAll("[data-lang-toggle]").forEach(function (b) {
      var label = b.querySelector("[data-lang-label]"), short = b.querySelector("[data-lang-short]");
      if (label) label.textContent = OMD.lang === "es" ? "View in English" : "Ver en español";
      if (short) short.textContent = OMD.lang === "es" ? "EN" : "ES";
      b.setAttribute("lang", OMD.lang === "es" ? "en" : "es");
      b.setAttribute("aria-label", OMD.lang === "es" ? "View this page in English" : "Ver esta página en español");
    });
    document.documentElement.lang = OMD.lang;
    document.title = TITLES[OMD.lang];
    if (window.feather) feather.replace();   // icons inside swapped text
  }

  function setLang(l, user) {
    OMD.lang = l === "es" ? "es" : "en";
    try { localStorage.setItem(KEY, OMD.lang); } catch (e) {}
    apply();
    document.dispatchEvent(new CustomEvent("omd:lang", { detail: OMD.lang }));
    if (user && window.gtag) gtag("event", "lp_language", { language: OMD.lang });
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-lang-toggle]");
    if (b) { e.preventDefault(); setLang(OMD.lang === "es" ? "en" : "es", true); }
  });

  function start() {
    apply();
    if (OMD.lang !== "en") document.dispatchEvent(new CustomEvent("omd:lang", { detail: OMD.lang }));
  }
  OMD.lang = initial();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

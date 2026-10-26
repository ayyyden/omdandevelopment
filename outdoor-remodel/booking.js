/*
  Free-estimate booking for /outdoor-remodel/, one short step at a time:
  name + verified phone -> homeowner? -> address -> project + start -> day and time.

  LIVE mode: books through the booking backend (a Google Apps Script, called with
  brand "omdan") that keeps David's calendar.
  It texts a code to verify the phone, offers only open times and puts the visit on the calendar.

  FALLBACK mode: if that backend can't be reached or doesn't support brand "omdan" yet,
  the same steps still work: the phone isn't verified, the day and time are a preference
  (Sunday-Thursday, 8 AM-7 PM), and the request goes out by email through Web3Forms.

  Messages are in English or Spanish (L(en, es); the switch is i18n.js). Lead emails stay in English.

  On localhost it runs a demo backend (code 123456) so testing never books or texts anyone.
  Add ?mode=fallback to test the fallback.
*/
(function () {
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbwwPkux1ULLpyjN87uY0e3zLwwYHJ0dqjek4T62r40kQLDEggdWbmibJd8_yAWYW-DN/exec";
  var CONVERSION = "AW-17862403534/TTFSCOHa1Z4cEM7LusVC";
  var PHONE = "(951) 292-0703";
  var TZ = "America/Los_Angeles";
  var isLocal = location.protocol === "file:" || /^(localhost|127\.|192\.168\.)/.test(location.hostname);
  var params = new URLSearchParams(location.search);
  var DEMO = isLocal && params.get("mode") !== "fallback";
  var FORCE_FALLBACK = isLocal && params.get("mode") === "fallback";

  // Service area: every ZIP inside the area the owner marked on the map (Oct 2026): Ventura/Oxnard and Santa Clarita,
  // Lancaster/Palmdale, Victorville and Big Bear, east through Yucca Valley, Joshua Tree and Twentynine Palms, down to
  // Indio/Coachella/Mecca, Temecula, and the coast from Dana Point through Orange County and LA. ZIPs from US Census
  // 2023 ZCTA centre points; 92278, the Marine base, left out. Keep in step with OMDAN.zips in the backend (Code.gs).
  var ZIPS = {};
  ("90001 90002 90003 90004 90005 90006 90007 90008 90010 90011 90012 90013 90014 90015 90016 90017 90018 90019" +
    " 90020 90021 90022 90023 90024 90025 90026 90027 90028 90029 90031 90032 90033 90034 90035 90036 90037 90038" +
    " 90039 90040 90041 90042 90043 90044 90045 90046 90047 90048 90049 90052 90056 90057 90058 90059 90061 90062" +
    " 90063 90064 90065 90066 90067 90068 90069 90071 90073 90077 90079 90089 90094 90095 90201 90210 90211 90212" +
    " 90220 90221 90222 90230 90232 90240 90241 90242 90245 90247 90248 90249 90250 90254 90255 90260 90262 90263" +
    " 90265 90266 90270 90272 90274 90277 90278 90280 90290 90291 90292 90293 90301 90302 90303 90304 90305 90401" +
    " 90402 90403 90404 90405 90501 90502 90503 90504 90505 90506 90601 90602 90603 90604 90605 90606 90620 90621" +
    " 90623 90630 90631 90638 90639 90640 90650 90660 90670 90680 90701 90703 90706 90710 90712 90713 90715 90716" +
    " 90717 90720 90723 90731 90732 90740 90742 90743 90744 90745 90746 90747 90755 90802 90803 90804 90805 90806" +
    " 90807 90808 90810 90813 90814 90815 90822 90831 90840 91001 91006 91007 91008 91010 91011 91016 91020 91024" +
    " 91030 91040 91042 91046 91101 91103 91104 91105 91106 91107 91108 91125 91201 91202 91203 91204 91205 91206" +
    " 91207 91208 91210 91214 91301 91302 91303 91304 91306 91307 91311 91316 91320 91321 91324 91325 91326 91330" +
    " 91331 91335 91340 91342 91343 91344 91345 91350 91351 91352 91354 91355 91356 91360 91361 91362 91364 91367" +
    " 91371 91377 91381 91384 91387 91390 91401 91402 91403 91405 91406 91411 91423 91436 91501 91502 91504 91505" +
    " 91506 91601 91602 91604 91605 91606 91607 91608 91701 91702 91706 91708 91709 91710 91711 91722 91723 91724" +
    " 91730 91731 91732 91733 91737 91739 91740 91741 91744 91745 91746 91748 91750 91752 91754 91755 91759 91761" +
    " 91762 91763 91764 91765 91766 91767 91768 91770 91773 91775 91776 91780 91784 91786 91789 91790 91791 91792" +
    " 91801 91803 92201 92203 92210 92211 92220 92223 92230 92234 92236 92240 92241 92252 92253 92254 92256 92258" +
    " 92260 92262 92264 92268 92270 92274 92276 92277 92282 92284 92285 92301 92305 92307 92308 92313 92314 92315" +
    " 92316 92317 92320 92321 92322 92324 92325 92333 92335 92336 92337 92339 92341 92344 92345 92346 92350 92352" +
    " 92354 92356 92358 92359 92369 92371 92372 92373 92374 92376 92377 92378 92382 92385 92386 92391 92392 92394" +
    " 92395 92397 92399 92401 92404 92405 92407 92408 92410 92411 92415 92501 92503 92504 92505 92506 92507 92508" +
    " 92509 92518 92521 92530 92532 92536 92539 92543 92544 92545 92548 92549 92551 92553 92555 92557 92561 92562" +
    " 92563 92567 92570 92571 92582 92583 92584 92585 92586 92587 92590 92591 92592 92595 92596 92602 92603 92604" +
    " 92606 92610 92612 92614 92617 92618 92620 92624 92625 92626 92627 92629 92630 92637 92646 92647 92648 92649" +
    " 92651 92653 92655 92656 92657 92660 92661 92662 92663 92672 92673 92675 92676 92677 92678 92679 92683 92688" +
    " 92691 92692 92694 92697 92701 92703 92704 92705 92706 92707 92708 92780 92782 92801 92802 92804 92805 92806" +
    " 92807 92808 92821 92823 92831 92832 92833 92835 92840 92841 92843 92844 92845 92860 92861 92865 92866 92867" +
    " 92868 92869 92870 92879 92880 92881 92882 92883 92886 92887 93001 93003 93004 93010 93012 93015 93021 93030" +
    " 93033 93035 93036 93041 93043 93060 93063 93064 93065 93066 93510 93534 93535 93536 93543 93544 93550 93551" +
    " 93552 93553 93563 93591").split(" ").forEach(function (z) { ZIPS[z] = true; });
  var START = { asap: "As soon as possible", "1-3": "Within 1-3 months", "3plus": "3+ months out", planning: "Just planning" };
  var FALLBACK_TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

  function $(id) { return document.getElementById(id); }
  function L(en, es) { return window.OMD ? OMD.t(en, es) : en; }
  function loc() { return window.OMD ? OMD.locale() : "en-US"; }
  function lang() { return window.OMD ? OMD.lang : "en"; }
  var form = $("bkForm");
  if (!form) return;
  var loadedAt = Date.now();

  var state = {
    mode: "loading",       // "live" | "fallback"
    verifyOn: false,
    verified: false,
    token: "",
    days: {},              // "YYYY-MM-DD" -> ["08:00", ...]
    months: [], monthIndex: 0,
    date: "", time: "",
    availZip: null, availSeq: 0,
    resendTimer: null,
    step: 0
  };

  /* ---------- Backend ---------- */
  function api(method, payload) {
    if (DEMO) return demoApi(method, payload);
    var url = ENDPOINT, opts = { method: method, redirect: "follow" };
    if (method === "GET") url += "?" + new URLSearchParams(payload).toString();
    // text/plain keeps this a "simple" CORS request, which Apps Script accepts
    else { opts.body = JSON.stringify(payload); opts.headers = { "Content-Type": "text/plain;charset=utf-8" }; }
    return fetch(url, opts).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }

  function demoApi(method, p) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        if (method === "GET") {
          var days = [], now = new Date();
          for (var i = 1; i <= 35; i++) {
            var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            if (d.getDay() === 5 || d.getDay() === 6 || i % 9 === 4) continue;
            days.push({ date: ymd(d), slots: FALLBACK_TIMES.filter(function (t, n) { return (i + n) % 4 !== 0; }).map(function (t) { return { time: t }; }) });
          }
          return resolve({ ok: true, brands: true, phoneVerification: true, days: days });
        }
        if (p.action === "sendCode") { console.info("[demo] verification code is 123456"); return resolve({ ok: true }); }
        if (p.action === "verifyCode") return resolve(p.code === "123456" ? { ok: true, token: "demo" } : { ok: false, error: "bad_code" });
        if (p.action === "book") { console.info("[demo] booking", p); return resolve({ ok: true }); }
        resolve({ ok: false });
      }, method === "GET" ? 300 : 600);
    });
  }

  /* ---------- Errors ---------- */
  function err(field, msg) {
    var el = $(field + "-err");
    if (el) { el.innerHTML = msg || ""; el.classList.toggle("show", !!msg); }
    var input = $(field);
    if (input && input.tagName === "INPUT") {
      if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    }
    return !msg;
  }
  function CALL() { return L("call us at ", "llámenos al ") + '<a href="tel:9512920703" class="underline">' + PHONE + "</a>"; }

  /* ---------- Steps ---------- */
  var steps = Array.prototype.slice.call(form.querySelectorAll(".bk-step"));
  function show(n) {
    state.step = n;
    steps.forEach(function (s, i) { s.hidden = i !== n; });
    $("bkStop").hidden = true;
    form.hidden = false;
    $("bkTop").hidden = false;
    $("bkBack").disabled = n === 0;
    $("bkBack").style.visibility = n === 0 ? "hidden" : "visible";
    $("bkCount").textContent = L("Step ", "Paso ") + (n + 1) + L(" of ", " de ") + steps.length;
    $("bkBar").style.width = Math.round((n + 1) / steps.length * 100) + "%";
    if (n > 0) {
      var top = $("estimate").getBoundingClientRect().top;
      if (top < 0 || top > innerHeight * 0.6) $("estimate").scrollIntoView({ block: "start" });
      var h = steps[n].querySelector(".bk-q");
      if (h) h.focus({ preventScroll: true });
    }
    if (window.gtag) gtag("event", "lp_booking_step", { step: steps[n].getAttribute("data-step") });
  }
  function stop(title, text, backLabel, backTo) {
    form.hidden = true;
    $("bkTop").hidden = true;
    $("bkStopTitle").textContent = title;
    $("bkStopText").innerHTML = text;
    $("bkStopBack").textContent = backLabel;
    $("bkStopBack").onclick = function () { show(backTo); };
    $("bkStop").hidden = false;
    $("bkStop").focus();
  }
  $("bkBack").addEventListener("click", function () { if (state.step > 0) show(state.step - 1); });

  /* ---------- Step 1: name and phone ---------- */
  var phone = $("bkPhone"), code = $("bkCode");
  function digits(v) {
    var d = String(v || "").replace(/\D/g, "");
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    return d.slice(0, 10);
  }
  function fmtPhone(d) {
    if (d.length < 4) return d;
    if (d.length < 7) return "(" + d.slice(0, 3) + ") " + d.slice(3);
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  }
  function validPhone(d) { return /^[2-9]\d{2}[2-9]\d{6}$/.test(d); }
  function e164() { return "+1" + digits(phone.value); }

  phone.addEventListener("input", function () {
    phone.value = fmtPhone(digits(phone.value));
    if (validPhone(digits(phone.value))) err("bkPhone", "");
  });

  function busy(btn, on, label) {
    clearTimeout(btn._slow);
    if (on) {
      if (!btn.dataset.label) btn.dataset.label = btn.textContent;
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      btn.innerHTML = '<span class="bk-spin" aria-hidden="true"></span>';
      btn.appendChild(document.createTextNode(label));
      // a slow server answer shouldn't look frozen: reassure after a few seconds
      btn._slow = setTimeout(function () { if (btn.disabled) btn.lastChild.nodeValue = L("Almost done…", "Ya casi…"); }, 4000);
    } else {
      btn.textContent = btn.dataset.label || btn.textContent;
      delete btn.dataset.label;
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
    }
  }

  function resendTimer() {
    clearInterval(state.resendTimer);
    var left = 30, b = $("bkResend");
    function tick() {
      if (left > 0) { b.disabled = true; b.textContent = L("Send a new code in ", "Pedir otro código en ") + left + "s"; left--; }
      else { b.disabled = false; b.textContent = L("Send a new code", "Pedir otro código"); clearInterval(state.resendTimer); }
    }
    tick();
    state.resendTimer = setInterval(tick, 1000);
  }

  function sendCode() {
    var d = digits(phone.value);
    if (!validPhone(d)) { err("bkPhone", L("Enter a 10-digit US phone number.", "Escriba un número de EE. UU. de 10 dígitos.")); phone.focus(); return; }
    err("bkPhone", ""); err("bkCode", "");
    var btn = $("bkSend");
    busy(btn, true, L("Sending…", "Enviando…"));
    api("POST", { action: "sendCode", phone: e164(), lang: lang(), brand: "omdan" }).then(function (res) {
      busy(btn, false);
      if (res.ok) {
        $("bkCodeRow").hidden = false;
        $("bkPhoneHelp").textContent = L("We texted a 6-digit code to ", "Le mandamos un código de 6 dígitos al ") + fmtPhone(d) + ".";
        resendTimer();
        code.value = "";
        code.focus();
      } else {
        err("bkPhone", res.error === "rate_limited" ? L("Too many tries. Wait a few minutes or ", "Demasiados intentos. Espere unos minutos o ") + CALL() + "."
          : res.error === "invalid_phone" ? L("Enter a 10-digit US mobile number.", "Escriba un número de celular de EE. UU. de 10 dígitos.")
          : res.error === "not_mobile" ? L("That number can't receive texts. Please use a cell phone number.", "Ese número no recibe mensajes. Use un número de celular.")
          : L("We couldn't send a code right now. Try again in a minute or ", "No pudimos mandar el código ahorita. Intente en un minuto o ") + CALL() + ".");
      }
    }).catch(function () { busy(btn, false); err("bkPhone", L("We couldn't send a code right now. Try again in a minute or ", "No pudimos mandar el código ahorita. Intente en un minuto o ") + CALL() + "."); });
  }

  function verifyCode() {
    var c = code.value.replace(/\D/g, "");
    if (c.length !== 6) { err("bkCode", L("Enter the 6-digit code.", "Escriba el código de 6 dígitos.")); code.focus(); return; }
    var btn = $("bkVerify");
    busy(btn, true, L("Checking…", "Revisando…"));
    api("POST", { action: "verifyCode", phone: e164(), code: c }).then(function (res) {
      busy(btn, false);
      if (res.ok && res.token) {
        state.verified = true;
        state.token = res.token;
        err("bkCode", ""); err("bkPhone", "");
        markVerified(true);
        if (window.gtag) gtag("event", "lp_phone_verified");
      } else {
        err("bkCode", res.error === "rate_limited" ? L("Too many tries. Wait a few minutes or ", "Demasiados intentos. Espere unos minutos o ") + CALL() + "."
          : L("That code didn't work. Check it, or send a new one.", "Ese código no funcionó. Revíselo o pida otro."));
        code.select();
      }
    }).catch(function () { busy(btn, false); err("bkCode", L("Something went wrong. Try again, or ", "Algo salió mal. Intente de nuevo o ") + CALL() + "."); });
  }

  function markVerified(on) {
    clearInterval(state.resendTimer);
    $("bkCodeRow").hidden = true;
    $("bkVerified").hidden = !on;
    $("bkSend").hidden = on || !state.verifyOn;
    $("bkPhoneHelp").hidden = on || !state.verifyOn;
    phone.readOnly = on;
  }

  $("bkSend").addEventListener("click", sendCode);
  $("bkResend").addEventListener("click", sendCode);
  $("bkVerify").addEventListener("click", verifyCode);
  code.addEventListener("input", function () {
    code.value = code.value.replace(/\D/g, "").slice(0, 6);
    if (code.value.length === 6) verifyCode();
  });
  code.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); verifyCode(); } });
  phone.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); if (state.verifyOn && !state.verified) sendCode(); else next1(); }
  });
  $("bkChange").addEventListener("click", function () {
    state.verified = false; state.token = "";
    markVerified(false);
    $("bkPhoneHelp").textContent = L("We'll text you a 6-digit code to confirm your number.", "Le enviaremos un código de 6 dígitos por mensaje para confirmar su número.");
    phone.focus(); phone.select();
  });

  function next1() {
    var name = $("bkName").value.trim();
    var ok = err("bkName", /\S+\s+\S+/.test(name) ? "" : L("Please enter your first and last name.", "Escriba su nombre y apellido."));
    var d = digits(phone.value);
    if (!validPhone(d)) ok = err("bkPhone", L("Enter a 10-digit US phone number.", "Escriba un número de EE. UU. de 10 dígitos.")) && ok;
    else if (state.verifyOn && !state.verified) ok = err("bkPhone", L("Please confirm your number: tap <b>Text me a code</b>.", "Confirme su número: toque <b>Mándenme un código</b>.")) && ok;
    if (state.mode === "loading") return;
    if (ok) show(1);
  }
  $("bkNext1").addEventListener("click", next1);

  /* ---------- Step 2: homeowner ---------- */
  form.querySelectorAll('input[name="homeowner"]').forEach(function (r) {
    r.addEventListener("change", function () {
      if (r.value === "no") {
        stop(L("Sorry, we can only help the homeowner.", "Lo sentimos, solo atendemos al dueño de la casa."),
          L("We do estimates for the owner of the home. If the owner wants a free estimate, they're welcome to book one or call us at ",
            "Hacemos estimados para el dueño de la casa. Si el dueño quiere un estimado gratis, con gusto puede agendarlo o llamarnos al ") + PHONE + ".",
          L("Change my answer", "Cambiar mi respuesta"), 1);
      } else {
        setTimeout(function () { show(2); }, 150);
      }
    });
  });

  /* ---------- Step 3: address (OpenStreetMap search, ZIP fixed by the US Census geocoder) ---------- */
  var street = $("bkStreet"), list = $("bkAddrList");
  var results = [], active = -1, addrTimer = null, addrAbort = null;

  function closeList() { list.hidden = true; list.innerHTML = ""; active = -1; street.setAttribute("aria-expanded", "false"); }
  function renderList() {
    list.innerHTML = "";
    if (!results.length) {
      var none = document.createElement("li");
      none.className = "bk-combo__note";
      none.textContent = L("No matches yet. Keep typing, or fill in the address yourself.", "Todavía no hay resultados. Siga escribiendo o escriba la dirección usted mismo.");
      list.appendChild(none);
    }
    results.forEach(function (r, i) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === active ? "true" : "false");
      li.textContent = r.line1;
      var small = document.createElement("small");
      small.textContent = r.line2;
      li.appendChild(small);
      li.addEventListener("mousedown", function (e) { e.preventDefault(); pick(i); });
      list.appendChild(li);
    });
    list.hidden = false;
    street.setAttribute("aria-expanded", "true");
  }
  function pick(i) {
    var r = results[i];
    if (!r) return;
    street.value = r.line1;
    $("bkCity").value = r.city || "";
    $("bkZip").value = r.zip || "";
    ["bkStreet", "bkCity", "bkZip"].forEach(function (f) { if ($(f).value) err(f, ""); });
    closeList();
    $("bkUnit").focus();
    if (r.guessed) fixZip(r);
  }
  var zipSeq = 0;
  function fixZip(r) {
    var seq = ++zipSeq, cb = "omdZip" + Date.now(), done = false, s = document.createElement("script");
    function cleanup() { done = true; try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
    window[cb] = function (data) {
      if (done) return;
      cleanup();
      var m = data && data.result && data.result.addressMatches && data.result.addressMatches[0];
      var zip = m && m.addressComponents && m.addressComponents.zip;
      if (zip && seq === zipSeq && street.value === r.line1 && $("bkZip").value === r.zip) $("bkZip").value = zip;
    };
    s.src = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=jsonp&callback=" + cb +
      "&address=" + encodeURIComponent(r.line1 + ", " + r.city + ", CA");
    s.onerror = cleanup;
    setTimeout(function () { if (!done) cleanup(); }, 8000);
    document.head.appendChild(s);
  }
  function searchAddress(q) {
    if (addrAbort) addrAbort.abort();
    addrAbort = "AbortController" in window ? new AbortController() : null;
    // the desert out to the Inland Empire (Ontario/Corona in the west), biased to the middle of it
    var url = "https://photon.komoot.io/api/?limit=6&lang=en&lat=33.9&lon=-116.9&bbox=-117.8,33.4,-115.6,34.45&q=" + encodeURIComponent(q);
    fetch(url, addrAbort ? { signal: addrAbort.signal } : {}).then(function (r) { return r.json(); }).then(function (data) {
      var seen = {}, typed = q.match(/^\s*(\d+[A-Za-z]?(?:-\d+)?)\s+\S/), typedNum = typed ? typed[1] : "";
      results = (data.features || []).map(function (f) {
        var p = f.properties || {};
        if (p.countrycode && p.countrycode !== "US") return null;
        var road = p.street || (p.type === "street" ? p.name : "");
        if (!road || (!p.housenumber && typedNum && p.type !== "street")) return null;
        var num = p.housenumber || typedNum, line1 = (num ? num + " " : "") + road;
        var city = p.city || p.town || p.village || p.district || p.county || "", zip = (p.postcode || "").slice(0, 5);
        if (seen[line1 + city]) return null;
        seen[line1 + city] = true;
        return { guessed: !p.housenumber && !!typedNum, line1: line1, line2: [city, "CA " + zip].filter(Boolean).join(", "), city: city, zip: zip };
      }).filter(Boolean);
      active = -1;
      if (document.activeElement === street) renderList();
    }).catch(function () { /* suggestions are a convenience; typing by hand still works */ });
  }
  street.addEventListener("input", function () {
    clearTimeout(addrTimer);
    var q = street.value.trim();
    if (q.length < 4) { closeList(); return; }
    addrTimer = setTimeout(function () { searchAddress(q); }, 260);
  });
  street.addEventListener("keydown", function (e) {
    if (list.hidden || !results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); active = (active + 1) % results.length; renderList(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = (active - 1 + results.length) % results.length; renderList(); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(active); }
    else if (e.key === "Escape") closeList();
  });
  street.addEventListener("blur", function () { setTimeout(closeList, 120); });
  $("bkZip").addEventListener("input", function () { this.value = this.value.replace(/\D/g, "").slice(0, 5); });

  $("bkNext3").addEventListener("click", function () {
    var ok = err("bkStreet", street.value.trim().length >= 5 && /\d/.test(street.value) ? "" : L("Enter the street address of the home.", "Escriba la dirección de la casa."));
    ok = err("bkCity", $("bkCity").value.trim().length >= 2 ? "" : L("Enter the city.", "Escriba la ciudad.")) && ok;
    var zip = $("bkZip").value.trim();
    ok = err("bkZip", /^\d{5}$/.test(zip) ? "" : L("Enter a 5-digit ZIP code.", "Escriba un código postal de 5 dígitos.")) && ok;
    if (!ok) return;
    if (!ZIPS[zip]) {
      if (window.gtag) gtag("event", "lp_out_of_area", { zip: zip });
      stop(L("Sorry, that's outside our service area.", "Lo sentimos, eso está fuera de nuestra área."),
        L("We don't work in ZIP code ", "Todavía no trabajamos en el código postal ") + zip +
        L(" yet. If you think that's a mistake, call us at ", ". Si cree que es un error, llámenos al ") + PHONE + ".",
        L("Change my address", "Cambiar mi dirección"), 2);
      return;
    }
    if (zip !== state.availZip) loadAvailability(zip);
    show(3);
  });

  /* ---------- Step 4: project and start ---------- */
  $("bkNext4").addEventListener("click", function () {
    var any = form.querySelectorAll('input[name="services"]:checked').length > 0;
    var ok = err("bkServices", any ? "" : L("Pick at least one.", "Escoja al menos uno."));
    ok = err("bkStart", form.querySelector('input[name="start"]:checked') ? "" : L("Pick when you'd like to start.", "Escoja cuándo quiere empezar.")) && ok;
    if (ok) show(4);
  });
  var pre = params.get("service");
  var preBox = pre && form.querySelector('input[name="services"][value="' + ({ general: "full-remodel" }[pre] || pre) + '"]');
  if (preBox) preBox.checked = true;

  /* ---------- Step 5: day and time ---------- */
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseYmd(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtDate(s, locale) { return parseYmd(s).toLocaleDateString(locale || loc(), { weekday: "long", month: "long", day: "numeric" }); }
  function fmtTime(hm, locale) { var p = hm.split(":"); return new Date(2000, 0, 1, +p[0], +p[1]).toLocaleTimeString(locale || loc(), { hour: "numeric", minute: "2-digit" }); }

  // Preference calendar for fallback mode: Sunday-Thursday, from tomorrow, 30 days out
  function fallbackDays() {
    var days = {}, now = new Date();
    for (var i = 1; i <= 30; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (d.getDay() !== 5 && d.getDay() !== 6) days[ymd(d)] = FALLBACK_TIMES.slice();
    }
    return days;
  }

  function setDays(days) {
    state.days = days;
    var keys = Object.keys(days).sort(), today = new Date(), months = [{ y: today.getFullYear(), m: today.getMonth() }];
    if (keys.length) {
      var last = parseYmd(keys[keys.length - 1]), y = months[0].y, m = months[0].m;
      while (y < last.getFullYear() || (y === last.getFullYear() && m < last.getMonth())) { m++; if (m > 11) { m = 0; y++; } months.push({ y: y, m: m }); }
      var first = parseYmd(keys[0]);
      state.monthIndex = Math.max(0, months.findIndex(function (x) { return x.y === first.getFullYear() && x.m === first.getMonth(); }));
    }
    state.months = months;
    if (state.date && !days[state.date]) { state.date = ""; state.time = ""; }
    if (state.time && days[state.date].indexOf(state.time) < 0) state.time = "";
    $("bkCalLoading").hidden = true;
    renderCalendar();
    renderSlots();
  }

  // Open times depend on the address (one salesman drives between visits), so they load per ZIP.
  function loadAvailability(zip) {
    if (state.mode === "fallback") { setDays(fallbackDays()); state.availZip = zip; return; }
    var seq = ++state.availSeq;
    state.availZip = zip;
    $("bkCalLoading").hidden = false;
    $("bkCalLoading").textContent = L("Loading open days…", "Cargando días disponibles…");
    $("bkCalGrid").innerHTML = "";
    $("bkSlotsWrap").hidden = true;
    api("GET", { action: "availability", zip: zip, brand: "omdan" }).then(function (res) {
      if (seq !== state.availSeq) return;
      if (!res.ok) throw new Error("bad response");
      var days = {};
      (res.days || []).forEach(function (d) { if (d.slots && d.slots.length) days[d.date] = d.slots.map(function (s) { return s.time || s; }); });
      setDays(days);
    }).catch(function () {
      if (seq !== state.availSeq) return;
      $("bkCalLoading").innerHTML = L("We couldn't load the open days. Refresh the page or ", "No pudimos cargar los días disponibles. Recargue la página o ") + CALL() + ".";
    });
  }

  function renderCalendar() {
    if (!state.months.length) return;
    var mm = state.months[state.monthIndex], first = new Date(mm.y, mm.m, 1);
    var month = first.toLocaleDateString(loc(), { month: "long", year: "numeric" });
    $("bkMonth").textContent = month.charAt(0).toUpperCase() + month.slice(1);
    $("bkPrev").disabled = state.monthIndex === 0;
    $("bkNextMonth").disabled = state.monthIndex >= state.months.length - 1;
    var grid = $("bkCalGrid");
    grid.innerHTML = "";
    for (var i = 0; i < first.getDay(); i++) grid.appendChild(document.createElement("span"));
    var anyOpen = false, daysIn = new Date(mm.y, mm.m + 1, 0).getDate();
    for (var d = 1; d <= daysIn; d++) {
      var key = ymd(new Date(mm.y, mm.m, d)), b = document.createElement("button");
      b.type = "button";
      b.className = "bk-day";
      b.textContent = d;
      b.dataset.date = key;
      b.disabled = !state.days[key];
      anyOpen = anyOpen || !b.disabled;
      b.setAttribute("aria-label", fmtDate(key));
      b.setAttribute("aria-pressed", key === state.date ? "true" : "false");
      grid.appendChild(b);
    }
    if (!anyOpen) {
      var note = document.createElement("p");
      note.className = "bk-cal__none";
      note.textContent = L("No open days left this month. Try the next month.", "Ya no hay días disponibles este mes. Revise el mes siguiente.");
      grid.appendChild(note);
    }
  }
  $("bkCalGrid").addEventListener("click", function (e) {
    var b = e.target.closest(".bk-day");
    if (!b || b.disabled) return;
    state.date = b.dataset.date;
    state.time = "";
    err("bkWhen", "");
    renderCalendar();
    renderSlots();
    $("bkSlotsWrap").scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  $("bkPrev").addEventListener("click", function () { if (state.monthIndex > 0) { state.monthIndex--; renderCalendar(); } });
  $("bkNextMonth").addEventListener("click", function () { if (state.monthIndex < state.months.length - 1) { state.monthIndex++; renderCalendar(); } });

  function renderSlots() {
    var wrap = $("bkSlotsWrap"), box = $("bkSlots");
    if (!state.date || !state.days[state.date]) { wrap.hidden = true; box.innerHTML = ""; return; }
    $("bkSlotsLabel").textContent = (state.mode === "live" ? L("Open times on ", "Horarios disponibles el ") : L("Times on ", "Horarios el ")) + fmtDate(state.date);
    box.innerHTML = "";
    state.days[state.date].forEach(function (hm) {
      var label = document.createElement("label"), input = document.createElement("input"), span = document.createElement("span");
      label.className = "chip relative";
      input.type = "radio"; input.name = "slot"; input.value = hm; input.checked = hm === state.time;
      input.addEventListener("change", function () { state.time = hm; err("bkWhen", ""); });
      span.textContent = fmtTime(hm);
      label.appendChild(input); label.appendChild(span);
      box.appendChild(label);
    });
    wrap.hidden = false;
  }

  /* ---------- Submit ---------- */
  function checked(name) {
    return Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
  }
  function attribution() {
    var a = {};
    ["gclid", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(function (k) {
      var v = params.get(k);
      try { if (v) sessionStorage.setItem("lp_" + k, v); else v = sessionStorage.getItem("lp_" + k); } catch (e) {}
      if (v) a[k] = v.slice(0, 300);
    });
    return a;
  }
  attribution();   // remember the ad click right away, in case they reload

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = err("bkWhen", state.date && state.time ? "" : L("Pick a day and a time.", "Escoja día y hora."));
    ok = err("bkConsent", $("bkConsentBox").checked ? "" : L("Please check the box so we can contact you about your estimate.", "Marque la casilla para que podamos contactarle sobre su estimado.")) && ok;
    if (!ok) return;
    var services = checked("services"), start = checked("start")[0] || "";
    var payload = {
      action: "book", brand: "omdan",
      fullName: $("bkName").value.trim(), phone: e164(), phoneToken: state.token,
      homeowner: "yes",
      street: street.value.trim(), unit: $("bkUnit").value.trim(), city: $("bkCity").value.trim(), state: "CA", zip: $("bkZip").value.trim(),
      services: services, start: start,
      date: state.date, time: state.time,
      lang: lang(), consent: true,
      company: $("bkCompany").value, elapsedMs: Date.now() - loadedAt,
      page: location.href.split("#")[0], attribution: attribution()
    };
    if (state.mode === "fallback") return sendFallback(payload);

    var btn = $("bkSubmit");
    busy(btn, true, L("Booking…", "Agendando…"));
    api("POST", payload).then(function (res) {
      busy(btn, false);
      if (res.ok) return booked(payload);
      if (res.error === "slot_taken") {
        state.time = "";
        loadAvailability(payload.zip);
        err("bkWhen", L("Sorry, that time was just booked. Please pick another one.", "Lo sentimos, alguien acaba de tomar esa hora. Escoja otra."));
      } else if (res.error === "not_verified") {
        state.verified = false; state.token = "";
        markVerified(false);
        show(0);
        err("bkPhone", L("Please confirm your number again: tap <b>Text me a code</b>.", "Confirme su número otra vez: toque <b>Mándenme un código</b>."));
      } else if (res.error === "out_of_area") {
        stop(L("Sorry, that's outside our service area.", "Lo sentimos, eso está fuera de nuestra área."),
          L("Call us at ", "Llámenos al ") + PHONE + L(" and we'll see what we can do.", " y vemos qué podemos hacer."),
          L("Change my address", "Cambiar mi dirección"), 2);
      } else {
        err("bkSubmitErr", L("Something went wrong and your estimate wasn't booked. Please try again, or ", "Algo salió mal y su estimado no se agendó. Intente de nuevo o ") + CALL() + ".");
      }
    }).catch(function () {
      busy(btn, false);
      err("bkSubmitErr", L("Something went wrong and your estimate wasn't booked. Please try again, or ", "Algo salió mal y su estimado no se agendó. Intente de nuevo o ") + CALL() + ".");
    });
  });

  // The request goes out by email through Web3Forms (the booking form's own action), then
  // /thankyou/ records the Google Ads conversion.
  function sendFallback(p) {
    var f = form;
    var human = f.querySelector('[name="h-captcha-response"]');
    if (human && !human.value) { err("bkSubmitErr", L("Please tick the \"I am human\" box above.", "Marque la casilla \"I am human\" de arriba.")); return; }
    var nice = fmtDate(p.date, "en-US") + " at " + fmtTime(p.time, "en-US");   // the email to the office stays in English
    var fields = {
      subject: "Google Ads Lead: estimate request, " + p.fullName + " (" + nice + ")",
      name: p.fullName, phone: fmtPhone(digits(p.phone)) + " (not verified)",
      homeowner: "Yes",
      address: [p.street, p.unit, p.city, "CA " + p.zip].filter(Boolean).join(", "),
      project: p.services.map(function (s) { return LABELS[s] || s; }).join(", "),
      wants_to_start: START[p.start] || p.start,
      preferred_time: nice + " (preference, not on the calendar yet: call to confirm)",
      gclid: p.attribution.gclid || "", fbclid: p.attribution.fbclid || "", utm_campaign: p.attribution.utm_campaign || "", utm_term: p.attribution.utm_term || "",
      service_page: params.get("service") || "general",
      language: p.lang === "es" ? "Spanish" : "English"
    };
    Object.keys(fields).forEach(function (k) {
      var i = f.querySelector('input[name="' + k + '"]');
      if (!i) { i = document.createElement("input"); i.type = "hidden"; i.name = k; f.appendChild(i); }
      i.value = fields[k];
    });
    if (window.gtag) gtag("event", "lp_form_submit", { mode: "fallback" });
    metaLead("request");
    busy($("bkSubmit"), true, L("Sending…", "Enviando…"));
    f.submit();
  }

  var LABELS = { turf: "Artificial turf", pavers: "Pavers", concrete: "Concrete", gravel: "Gravel / DG", "full-remodel": "Full yard remodel" };

  // Meta Pixel "Lead": once per page load, only for a request that was actually sent (never in the demo).
  // The eventID lets Meta drop a repeat of the same submission.
  var metaLeadSent = false;
  function metaLead(kind) {
    if (metaLeadSent || DEMO || typeof window.fbq !== "function") return;
    metaLeadSent = true;
    try {
      window.fbq("track", "Lead", { content_name: kind === "booking" ? "Estimate booked" : "Estimate requested",
        content_category: params.get("service") || "general" },
        { eventID: "omd-lead-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) });
    } catch (e) { /* tracking must never break the booking */ }
  }

  var conversionSent = false;
  function booked(p) {
    if (!conversionSent && !DEMO && window.gtag) {
      conversionSent = true;
      gtag("event", "conversion", { send_to: CONVERSION });
      gtag("event", "lp_booked", { service_page: params.get("service") || "general" });
    }
    metaLead("booking");
    state.booked = p;
    form.hidden = true;
    $("bkTop").hidden = true;
    renderDone();
    $("bkDone").hidden = false;
    $("bkDone").focus();
    $("estimate").scrollIntoView({ block: "start" });
  }

  function renderDone() {
    if (state.booked) $("bkWhenDone").textContent = fmtDate(state.booked.date) + L(" at ", " a las ") + fmtTime(state.booked.time);
  }

  /* ---------- Add to calendar (.ics) ---------- */
  function zonedToUtc(dateStr, hm) {
    var p = dateStr.split("-").map(Number), h = hm.split(":").map(Number), want = Date.UTC(p[0], p[1] - 1, p[2], h[0], h[1]), guess = want;
    for (var i = 0; i < 2; i++) {
      var parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date(guess)).reduce(function (o, x) { o[x.type] = x.value; return o; }, {});
      guess += want - Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
    }
    return new Date(guess);
  }
  function stamp(d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
  $("bkIcs").addEventListener("click", function () {
    var p = state.booked;
    if (!p) return;
    var start = zonedToUtc(p.date, p.time), end = new Date(start.getTime() + 3600000);
    var esc = function (s) { return s.replace(/([,;\\])/g, "\\$1"); };
    var addr = [p.street, p.unit, p.city, "CA " + p.zip].filter(Boolean).join(", ");
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Omdan Development//Estimate//EN", "METHOD:PUBLISH", "BEGIN:VEVENT",
      "UID:" + Date.now() + "@omdandevelopment.com", "DTSTAMP:" + stamp(new Date()), "DTSTART:" + stamp(start), "DTEND:" + stamp(end),
      "SUMMARY:" + esc(L("Free estimate with Omdan Development", "Estimado gratis con Omdan Development")),
      "DESCRIPTION:" + esc(L("Free on-site estimate. Questions or changes: ", "Estimado gratis en su casa. Preguntas o cambios: ") + PHONE + "."),
      "LOCATION:" + esc(addr), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    var a = document.createElement("a");
    a.href = url; a.download = "omdan-development-estimate.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  });

  /* ---------- Start: which mode? ---------- */
  function useFallback() {
    state.mode = "fallback";
    state.verifyOn = false;
    markVerified(false);
    renderModeText();
    // Web3Forms' spam check (hCaptcha) is only needed in this mode
    var s = document.createElement("script");
    s.src = "https://web3forms.com/client/script.js";
    s.async = true;
    document.body.appendChild(s);
    $("bkCaptchaWrap").hidden = false;
  }

  // Texts that depend on the mode (live booking vs. emailed request)
  function renderModeText() {
    var help = $("bkWhenHelp"), submit = $("bkSubmit");
    if (state.mode === "fallback") {
      help.textContent = L("Pick the day and time that works best. We visit Sunday through Thursday, 8 AM to 7 PM, and we'll call to confirm.",
        "Escoja el día y la hora que mejor le queden. Visitamos de domingo a jueves, de 8 AM a 7 PM, y le llamamos para confirmar.");
      if (!submit.disabled) submit.textContent = L("Request my free estimate", "Pedir mi estimado gratis");
    } else {
      help.textContent = L("We visit Sunday through Thursday. Days that are full are grayed out.", "Visitamos de domingo a jueves. Los días llenos aparecen en gris.");
      if (!submit.disabled) submit.textContent = L("Book my free estimate", "Agendar mi estimado gratis");
    }
  }

  // Language switch (i18n.js): redraw everything this script wrote
  document.addEventListener("omd:lang", function () {
    $("bkCount").textContent = L("Step ", "Paso ") + (state.step + 1) + L(" of ", " de ") + steps.length;
    renderModeText();
    renderCalendar();
    renderSlots();
    renderDone();
    if ($("bkCodeRow").hidden) $("bkPhoneHelp").textContent =   // not the "we texted a code to …" note
      L("We'll text you a 6-digit code to confirm your number.", "Le enviaremos un código de 6 dígitos por mensaje para confirmar su número.");
    // messages already on screen were written in the old language: clear them
    form.querySelectorAll(".field-error.show").forEach(function (e) { e.classList.remove("show"); e.innerHTML = ""; });
  });

  renderModeText();
  if (FORCE_FALLBACK) useFallback();
  else {
    // The backend must know brand "omdan" (it answers brands: true); otherwise texts and leads wouldn't be labelled Omdan.
    api("GET", { action: "availability", brand: "omdan" }).then(function (res) {
      if (!res.ok || !res.brands) return useFallback();
      state.mode = "live";
      state.verifyOn = res.phoneVerification !== false;
      markVerified(false);
    }).catch(useFallback);
  }
  show(0);
})();

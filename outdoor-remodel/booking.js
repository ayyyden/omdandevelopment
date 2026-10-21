/*
  Free-estimate booking for /outdoor-remodel/, one short step at a time:
  name + verified phone -> homeowner? -> address -> project + start -> day and time.

  LIVE mode: books through the booking backend (a Google Apps Script, called with
  brand "omdan") that keeps David's calendar.
  It texts a code to verify the phone, offers only open times and puts the visit on the calendar.

  FALLBACK mode: if that backend can't be reached or doesn't support brand "omdan" yet,
  the same steps still work: the phone isn't verified, the day and time are a preference
  (Sunday-Thursday, 8 AM-7 PM), and the request goes out by email through Web3Forms.

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

  // Service area: ZIP -> city (the Google Ads campaign's cities; 92278, the Marine base, left out)
  var ZIPS = {
    "92262": "Palm Springs", "92264": "Palm Springs", "92234": "Cathedral City", "92270": "Rancho Mirage",
    "92276": "Thousand Palms", "92210": "Indian Wells", "92211": "Palm Desert", "92260": "Palm Desert",
    "92253": "La Quinta", "92201": "Indio", "92203": "Indio", "92236": "Coachella",
    "92240": "Desert Hot Springs", "92241": "Desert Hot Springs", "92256": "Morongo Valley", "92284": "Yucca Valley",
    "92252": "Joshua Tree", "92277": "Twentynine Palms", "92230": "Cabazon", "92220": "Banning",
    "92223": "Cherry Valley", "92399": "Yucaipa"
  };
  var START = { asap: "As soon as possible", "1-3": "Within 1-3 months", "3plus": "3+ months out", planning: "Just planning" };
  var FALLBACK_TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

  function $(id) { return document.getElementById(id); }
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
  var CALL = 'call us at <a href="tel:9512920703" class="underline">' + PHONE + "</a>";

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
    $("bkCount").textContent = "Step " + (n + 1) + " of " + steps.length;
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
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = label; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
  }

  function resendTimer() {
    clearInterval(state.resendTimer);
    var left = 30, b = $("bkResend");
    function tick() {
      if (left > 0) { b.disabled = true; b.textContent = "Send a new code in " + left + "s"; left--; }
      else { b.disabled = false; b.textContent = "Send a new code"; clearInterval(state.resendTimer); }
    }
    tick();
    state.resendTimer = setInterval(tick, 1000);
  }

  function sendCode() {
    var d = digits(phone.value);
    if (!validPhone(d)) { err("bkPhone", "Enter a 10-digit US phone number."); phone.focus(); return; }
    err("bkPhone", ""); err("bkCode", "");
    var btn = $("bkSend");
    busy(btn, true, "Sending…");
    api("POST", { action: "sendCode", phone: e164(), lang: "en", brand: "omdan" }).then(function (res) {
      busy(btn, false);
      if (res.ok) {
        $("bkCodeRow").hidden = false;
        $("bkPhoneHelp").textContent = "We texted a 6-digit code to " + fmtPhone(d) + ".";
        resendTimer();
        code.value = "";
        code.focus();
      } else {
        err("bkPhone", res.error === "rate_limited" ? "Too many tries. Wait a few minutes or " + CALL + "."
          : res.error === "invalid_phone" ? "Enter a 10-digit US mobile number."
          : "We couldn't send a code right now. Try again in a minute or " + CALL + ".");
      }
    }).catch(function () { busy(btn, false); err("bkPhone", "We couldn't send a code right now. Try again in a minute or " + CALL + "."); });
  }

  function verifyCode() {
    var c = code.value.replace(/\D/g, "");
    if (c.length !== 6) { err("bkCode", "Enter the 6-digit code."); code.focus(); return; }
    var btn = $("bkVerify");
    busy(btn, true, "Checking…");
    api("POST", { action: "verifyCode", phone: e164(), code: c }).then(function (res) {
      busy(btn, false);
      if (res.ok && res.token) {
        state.verified = true;
        state.token = res.token;
        err("bkCode", ""); err("bkPhone", "");
        markVerified(true);
        if (window.gtag) gtag("event", "lp_phone_verified");
      } else {
        err("bkCode", res.error === "rate_limited" ? "Too many tries. Wait a few minutes or " + CALL + "." : "That code didn't work. Check it, or send a new one.");
        code.select();
      }
    }).catch(function () { busy(btn, false); err("bkCode", "Something went wrong. Try again, or " + CALL + "."); });
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
    $("bkPhoneHelp").textContent = "We'll text you a 6-digit code to confirm your number.";
    phone.focus(); phone.select();
  });

  function next1() {
    var name = $("bkName").value.trim();
    var ok = err("bkName", /\S+\s+\S+/.test(name) ? "" : "Please enter your first and last name.");
    var d = digits(phone.value);
    if (!validPhone(d)) ok = err("bkPhone", "Enter a 10-digit US phone number.") && ok;
    else if (state.verifyOn && !state.verified) ok = err("bkPhone", "Please confirm your number: tap <b>Text me a code</b>.") && ok;
    if (state.mode === "loading") return;
    if (ok) show(1);
  }
  $("bkNext1").addEventListener("click", next1);

  /* ---------- Step 2: homeowner ---------- */
  form.querySelectorAll('input[name="homeowner"]').forEach(function (r) {
    r.addEventListener("change", function () {
      if (r.value === "no") {
        stop("Sorry, we can only help the homeowner.",
          "We do estimates for the owner of the home. If the owner wants a free estimate, they're welcome to book one or call us at " + PHONE + ".",
          "Change my answer", 1);
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
      none.textContent = "No matches yet. Keep typing, or fill in the address yourself.";
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
    var url = "https://photon.komoot.io/api/?limit=6&lang=en&lat=33.85&lon=-116.5&bbox=-117.4,33.4,-115.6,34.4&q=" + encodeURIComponent(q);
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
    var ok = err("bkStreet", street.value.trim().length >= 5 && /\d/.test(street.value) ? "" : "Enter the street address of the home.");
    ok = err("bkCity", $("bkCity").value.trim().length >= 2 ? "" : "Enter the city.") && ok;
    var zip = $("bkZip").value.trim();
    ok = err("bkZip", /^\d{5}$/.test(zip) ? "" : "Enter a 5-digit ZIP code.") && ok;
    if (!ok) return;
    if (!ZIPS[zip]) {
      if (window.gtag) gtag("event", "lp_out_of_area", { zip: zip });
      stop("Sorry, that's outside our service area.",
        "We don't work in ZIP code " + zip + " yet. If you think that's a mistake, call us at " + PHONE + ".",
        "Change my address", 2);
      return;
    }
    if (zip !== state.availZip) loadAvailability(zip);
    show(3);
  });

  /* ---------- Step 4: project and start ---------- */
  $("bkNext4").addEventListener("click", function () {
    var any = form.querySelectorAll('input[name="services"]:checked').length > 0;
    var ok = err("bkServices", any ? "" : "Pick at least one.");
    ok = err("bkStart", form.querySelector('input[name="start"]:checked') ? "" : "Pick when you'd like to start.") && ok;
    if (ok) show(4);
  });
  var pre = params.get("service");
  var preBox = pre && form.querySelector('input[name="services"][value="' + ({ general: "full-remodel" }[pre] || pre) + '"]');
  if (preBox) preBox.checked = true;

  /* ---------- Step 5: day and time ---------- */
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseYmd(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtDate(s) { return parseYmd(s).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); }
  function fmtTime(hm) { var p = hm.split(":"); return new Date(2000, 0, 1, +p[0], +p[1]).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }

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
    $("bkCalLoading").textContent = "Loading open days…";
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
      $("bkCalLoading").innerHTML = "We couldn't load the open days. Refresh the page or " + CALL + ".";
    });
  }

  function renderCalendar() {
    if (!state.months.length) return;
    var mm = state.months[state.monthIndex], first = new Date(mm.y, mm.m, 1);
    $("bkMonth").textContent = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
      note.textContent = "No open days left this month. Try the next month.";
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
    $("bkSlotsLabel").textContent = (state.mode === "live" ? "Open times on " : "Times on ") + fmtDate(state.date);
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
    ["gclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(function (k) {
      var v = params.get(k);
      try { if (v) sessionStorage.setItem("lp_" + k, v); else v = sessionStorage.getItem("lp_" + k); } catch (e) {}
      if (v) a[k] = v.slice(0, 300);
    });
    return a;
  }
  attribution();   // remember the ad click right away, in case they reload

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = err("bkWhen", state.date && state.time ? "" : "Pick a day and a time.");
    ok = err("bkConsent", $("bkConsentBox").checked ? "" : "Please check the box so we can contact you about your estimate.") && ok;
    if (!ok) return;
    var services = checked("services"), start = checked("start")[0] || "";
    var payload = {
      action: "book", brand: "omdan",
      fullName: $("bkName").value.trim(), phone: e164(), phoneToken: state.token,
      homeowner: "yes",
      street: street.value.trim(), unit: $("bkUnit").value.trim(), city: $("bkCity").value.trim(), state: "CA", zip: $("bkZip").value.trim(),
      services: services, start: start,
      date: state.date, time: state.time,
      lang: "en", consent: true,
      company: $("bkCompany").value, elapsedMs: Date.now() - loadedAt,
      page: location.href.split("#")[0], attribution: attribution()
    };
    if (state.mode === "fallback") return sendFallback(payload);

    var btn = $("bkSubmit");
    busy(btn, true, "Booking…");
    api("POST", payload).then(function (res) {
      busy(btn, false);
      if (res.ok) return booked(payload);
      if (res.error === "slot_taken") {
        state.time = "";
        loadAvailability(payload.zip);
        err("bkWhen", "Sorry, that time was just booked. Please pick another one.");
      } else if (res.error === "not_verified") {
        state.verified = false; state.token = "";
        markVerified(false);
        show(0);
        err("bkPhone", "Please confirm your number again: tap <b>Text me a code</b>.");
      } else if (res.error === "out_of_area") {
        stop("Sorry, that's outside our service area.", "Call us at " + PHONE + " and we'll see what we can do.", "Change my address", 2);
      } else {
        err("bkSubmitErr", "Something went wrong and your estimate wasn't booked. Please try again, or " + CALL + ".");
      }
    }).catch(function () {
      busy(btn, false);
      err("bkSubmitErr", "Something went wrong and your estimate wasn't booked. Please try again, or " + CALL + ".");
    });
  });

  // The request goes out by email through Web3Forms (the booking form's own action), then
  // /thankyou/ records the Google Ads conversion.
  function sendFallback(p) {
    var f = form;
    var human = f.querySelector('[name="h-captcha-response"]');
    if (human && !human.value) { err("bkSubmitErr", "Please tick the \"I am human\" box above."); return; }
    var nice = fmtDate(p.date) + " at " + fmtTime(p.time);
    var fields = {
      subject: "Google Ads Lead: estimate request, " + p.fullName + " (" + nice + ")",
      name: p.fullName, phone: fmtPhone(digits(p.phone)) + " (not verified)",
      homeowner: "Yes",
      address: [p.street, p.unit, p.city, "CA " + p.zip].filter(Boolean).join(", "),
      project: p.services.map(function (s) { return LABELS[s] || s; }).join(", "),
      wants_to_start: START[p.start] || p.start,
      preferred_time: nice + " (preference, not on the calendar yet: call to confirm)",
      gclid: p.attribution.gclid || "", utm_campaign: p.attribution.utm_campaign || "", utm_term: p.attribution.utm_term || "",
      service_page: params.get("service") || "general"
    };
    Object.keys(fields).forEach(function (k) {
      var i = f.querySelector('input[name="' + k + '"]');
      if (!i) { i = document.createElement("input"); i.type = "hidden"; i.name = k; f.appendChild(i); }
      i.value = fields[k];
    });
    if (window.gtag) gtag("event", "lp_form_submit", { mode: "fallback" });
    $("bkSubmit").disabled = true;
    $("bkSubmit").textContent = "Sending…";
    f.submit();
  }

  var LABELS = { turf: "Artificial turf", pavers: "Pavers", concrete: "Concrete", gravel: "Gravel / DG", "full-remodel": "Full yard remodel" };

  var conversionSent = false;
  function booked(p) {
    if (!conversionSent && !DEMO && window.gtag) {
      conversionSent = true;
      gtag("event", "conversion", { send_to: CONVERSION });
      gtag("event", "lp_booked", { service_page: params.get("service") || "general" });
    }
    state.booked = p;
    form.hidden = true;
    $("bkTop").hidden = true;
    $("bkWhenDone").textContent = fmtDate(p.date) + " at " + fmtTime(p.time);
    $("bkDone").hidden = false;
    $("bkDone").focus();
    $("estimate").scrollIntoView({ block: "start" });
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
      "SUMMARY:" + esc("Free estimate with Omdan Development"),
      "DESCRIPTION:" + esc("Free on-site estimate. Questions or changes: " + PHONE + "."),
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
    $("bkWhenHelp").textContent = "Pick the day and time that works best. We visit Sunday through Thursday, 8 AM to 7 PM, and we'll call to confirm.";
    $("bkSubmit").textContent = "Request my free estimate";
    // Web3Forms' spam check (hCaptcha) is only needed in this mode
    var s = document.createElement("script");
    s.src = "https://web3forms.com/client/script.js";
    s.async = true;
    document.body.appendChild(s);
    $("bkCaptchaWrap").hidden = false;
  }

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

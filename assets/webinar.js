/* Webinar page: how long until it starts, the registration form, the phone sticky bar.
   The form posts JSON straight to its Make webhook (the form's action): Make scenario 10178828 saves the
   registration in the data store «Webinar 19 novembre - iscritti», tells info@ and sends the confirmation.
   On localhost it shows the confirmation without sending anything. */
(function () {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Thursday 19 November 2026, 17:00 to 17:45 in Rome (UTC+1) */
  const START = Date.parse("2026-11-19T16:00:00Z");
  const END = Date.parse("2026-11-19T16:45:00Z");

  /* ---------- «Tra 2 giorni», «Domani», «Oggi, tra 3 ore», counted on the Rome calendar ---------- */
  const romeDay = (t) => {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));
    return Date.parse(p + "T00:00:00Z");
  };
  document.querySelectorAll("[data-countdown]").forEach((el) => {
    const tick = () => {
      const now = Date.now();
      if (now >= END) { el.textContent = "Il webinar si è concluso"; return false; }
      if (now >= START) { el.textContent = "In diretta adesso"; return true; }
      const days = Math.round((romeDay(START) - romeDay(now)) / 86400000);
      if (days >= 2) el.textContent = "Tra " + days + " giorni";
      else if (days === 1) el.textContent = "Domani";
      else {
        const min = Math.ceil((START - now) / 60000);
        el.textContent = min > 90 ? "Oggi, tra " + Math.round(min / 60) + " ore" : min > 1 ? "Oggi, tra " + min + " minuti" : "Oggi, tra un minuto";
      }
      return true;
    };
    if (tick()) {
      const id = setInterval(() => { if (!tick()) clearInterval(id); }, 30000);
    }
  });

  /* ---------- Registration form ---------- */
  const form = document.querySelector("[data-webinar]");
  if (!form) return;
  const send = form.querySelector("[data-send]");
  const sendLabel = form.querySelector("[data-send-label]");
  const sendText = sendLabel.textContent;
  const error = form.querySelector("[data-error]");
  const invalid = form.querySelector("[data-invalid]");
  const seg = form.querySelector(".wb-seg");
  const sticky = document.querySelector("[data-sticky]");
  const local = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  let done = false;
  let attrib = null;
  try {
    attrib = JSON.parse(localStorage.getItem("rkw_attr"));
  } catch (e) {}

  /* Links to the form scroll to it and put the cursor in the first empty field */
  const firstEmpty = () => Array.from(form.querySelectorAll("input[type=text]:not([name=extra_field]), input[type=email]")).find((el) => !el.value) || form.querySelector("input[type=radio]");
  document.querySelectorAll("[data-to-form]").forEach((a) => {
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const nav = document.getElementById("site-nav");
      if (nav && nav.classList.contains("is-open")) document.querySelector("[data-toggle]")?.click();
      form.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      if (!done) setTimeout(() => firstEmpty()?.focus({ preventScroll: true }), reduced ? 0 : 500);
    });
  });

  /* Sticky bar on phones once the hero has scrolled away, hidden again while the form is on screen */
  if (sticky && "IntersectionObserver" in window) {
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target, e.isIntersecting));
      sticky.hidden = done || Array.from(seen.values()).some(Boolean);
    }, { threshold: 0.05 });
    io.observe(form);
    const hero = document.querySelector(".wb-head");
    if (hero) io.observe(hero);
  }

  /* Validation in Italian, next to the button */
  const fields = {
    name: { el: form.elements.name, label: "nome e cognome" },
    email: { el: form.elements.email, label: "email" },
    company: { el: form.elements.company, label: "azienda" },
    website: { el: form.elements.website, label: "sito web" },
  };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const siteOk = (v) => /^(https?:\/\/)?[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/i.test(v);
  const check = () => {
    const missing = [];
    const wrong = [];
    let first = null;
    Object.keys(fields).forEach((k) => {
      const el = fields[k].el;
      const v = el.value.trim();
      const empty = !v;
      const bad = !empty && ((k === "email" && !emailOk(v)) || (k === "website" && !siteOk(v)));
      el.setAttribute("aria-invalid", empty || bad ? "true" : "false");
      if (empty) missing.push(fields[k].label);
      if (bad) wrong.push(k === "email" ? "Controlla l'email, sembra incompleta." : "Controlla il sito, per esempio azienda.it.");
      if ((empty || bad) && !first) first = el;
    });
    const segOk = !!form.querySelector("input[name=segment]:checked");
    seg.classList.toggle("is-invalid", !segOk);
    if (!segOk) {
      missing.push("come ti iscrivi");
      first = first || form.querySelector("input[name=segment]");
    }
    if (missing.length || wrong.length) {
      const parts = [];
      if (missing.length) parts.push("Mancano: " + missing.join(", ") + ".");
      invalid.textContent = parts.concat(wrong).join(" ");
      invalid.hidden = false;
      first.focus();
      return false;
    }
    invalid.hidden = true;
    return true;
  };
  form.addEventListener("input", (ev) => {
    if (ev.target.getAttribute("aria-invalid") === "true") ev.target.setAttribute("aria-invalid", "false");
    if (ev.target.name === "segment") seg.classList.remove("is-invalid");
    if (!invalid.hidden && !form.querySelector('[aria-invalid="true"]') && !seg.classList.contains("is-invalid")) invalid.hidden = true;
  });

  /* Calendar: Google link and an .ics file, built here so they work without a server */
  const calTitle = "Webinar RankWit: ChatGPT apre i profili alle aziende";
  const calText = "Il link per collegarti arriva per email giovedì alle 16.";
  const g = form.querySelector("[data-cal-google]");
  const ics = form.querySelector("[data-cal-ics]");
  g.href = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(calTitle) +
    "&dates=20261119T160000Z/20261119T164500Z&details=" + encodeURIComponent(calText) + "&location=" + encodeURIComponent("Online");
  const icsBody = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RankWit//Webinar//IT", "BEGIN:VEVENT",
    "UID:webinar-20261119@rankwit.ai", "DTSTAMP:20261117T150000Z", "DTSTART:20261119T160000Z", "DTEND:20261119T164500Z",
    "SUMMARY:" + calTitle, "DESCRIPTION:" + calText.replace(/,/g, "\\,"), "LOCATION:Online",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  ics.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(icsBody);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!check()) return;
    send.disabled = true;
    sendLabel.textContent = "Invio in corso";
    error.hidden = true;
    const f = new FormData(form);
    const text = (k) => String(f.get(k) || "").trim();
    const params = new URLSearchParams(window.location.search);
    const payload = {
      form: "webinar-2026-11-19",
      webinar: "ChatGPT apre i profili alle aziende. E adesso che si fa?",
      webinar_date: "2026-11-19T17:00:00+01:00",
      submitted_at: new Date().toISOString(),
      name: text("name"),
      email: text("email"),
      company: text("company"),
      website: text("website"),
      segment: text("segment"),
      question: text("question"),
      extra_field: text("extra_field"),
      locale: "it",
      page_path: window.location.pathname,
      referrer: (attrib && attrib.referrer) || document.referrer || "direct",
    };
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
      payload[k] = params.get(k) || (attrib && attrib[k]) || "";
    });
    if (!local && !payload.extra_field) {
      try {
        const res = await fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(String(res.status));
      } catch (err) {
        send.disabled = false;
        sendLabel.textContent = sendText;
        error.hidden = false;
        return;
      }
    }
    done = true;
    if (sticky) sticky.hidden = true;
    form.querySelector(".wb-form-body:not(.wb-done)").hidden = true;
    const ok = form.querySelector(".wb-done");
    ok.hidden = false;
    ok.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    ok.querySelector("h2").focus({ preventScroll: true });
  });
})();

/* Webinar page: countdown, the animated example, the registration form, the phone sticky bar.
   The form, on www.rankwit.ai (and Cloudflare Pages previews), posts JSON to /api/webinar (functions/api/webinar.js),
   which forwards it to the Make webhook in WEBINAR_WEBHOOK. Anywhere else (the GitHub Pages preview, a local
   server) there is no endpoint: the page shows the confirmation without sending anything. */
(function () {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const START = Date.parse("2026-11-19T14:00:00Z");
  const END = Date.parse("2026-11-19T15:00:00Z");

  /* ---------- Countdown to Thursday 19 November 2026, 15:00 in Rome ---------- */
  document.querySelectorAll("[data-countdown]").forEach((box) => {
    const label = box.querySelector("[data-cd-label]");
    const f = (k) => box.querySelector('[data-cd="' + k + '"]');
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const now = Date.now();
      if (now >= END) {
        box.classList.add("is-live");
        label.textContent = "Il webinar si è concluso";
        return false;
      }
      if (now >= START) {
        box.classList.add("is-live");
        label.textContent = "In diretta adesso";
        return true;
      }
      let s = Math.floor((START - now) / 1000);
      const d = Math.floor(s / 86400); s -= d * 86400;
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60); s -= m * 60;
      f("d").textContent = d;
      f("h").textContent = pad(h);
      f("m").textContent = pad(m);
      f("s").textContent = pad(s);
      label.setAttribute("aria-label", "Inizia tra " + d + " giorni, " + h + " ore e " + m + " minuti");
      return true;
    };
    if (tick()) {
      const id = setInterval(() => { if (!tick()) clearInterval(id); }, 1000);
    }
  });

  /* ---------- The example: type the question, then the answer and the numbers appear ---------- */
  const demo = document.querySelector("[data-demo]");
  if (demo && !reduced && "IntersectionObserver" in window) {
    const ask = demo.querySelector("[data-demo-ask]");
    const steps = Array.from(demo.querySelectorAll(".wb-step"));
    const counters = Array.from(demo.querySelectorAll("[data-count-to]"));
    const full = ask.dataset.text || ask.textContent;
    demo.classList.add("is-waiting");
    const countUp = () => {
      counters.forEach((el) => {
        const to = Number(el.dataset.countTo);
        const t0 = performance.now();
        const run = (t) => {
          const p = Math.min(1, (t - t0) / 1100);
          el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(run);
        };
        requestAnimationFrame(run);
      });
    };
    const play = () => {
      counters.forEach((el) => { el.textContent = "0"; });
      ask.textContent = "";
      ask.classList.add("is-typing");
      let i = 0;
      const type = () => {
        ask.textContent = full.slice(0, ++i);
        if (i < full.length) return setTimeout(type, 26);
        ask.classList.remove("is-typing");
        steps.forEach((s, k) => s.style.setProperty("--d", (0.1 + k * 0.28).toFixed(2) + "s"));
        demo.classList.remove("is-waiting");
        setTimeout(countUp, 250 + steps.length * 280);
      };
      setTimeout(type, 200);
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        play();
      }
    }, { threshold: 0.35 });
    io.observe(demo);
  }

  /* ---------- Registration form ---------- */
  const form = document.querySelector("[data-webinar]");
  if (!form) return;
  const send = form.querySelector("[data-send]");
  const sendLabel = form.querySelector("[data-send-label]");
  const error = form.querySelector("[data-error]");
  const invalid = form.querySelector("[data-invalid]");
  const seg = form.querySelector(".wb-seg");
  const sticky = document.querySelector("[data-sticky]");
  const live = /(^|\.)rankwit\.ai$|\.pages\.dev$/.test(window.location.hostname);
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

  /* Sticky bar on phones while the form is off screen */
  if (sticky && "IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => { sticky.hidden = done || e.isIntersecting; });
    }, { threshold: 0.15 }).observe(form);
  }

  /* Validation in Italian, next to the fields */
  const fields = {
    name: { el: form.elements.name, label: "nome e cognome" },
    email: { el: form.elements.email, label: "email" },
    company: { el: form.elements.company, label: "struttura o azienda" },
  };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const list = (a) => (a.length > 1 ? a.slice(0, -1).join(", ") + " e " + a[a.length - 1] : a[0]);
  const check = () => {
    const missing = [];
    let badEmail = false;
    let first = null;
    Object.keys(fields).forEach((k) => {
      const el = fields[k].el;
      const v = el.value.trim();
      const empty = !v;
      const wrong = !empty && k === "email" && !emailOk(v);
      el.setAttribute("aria-invalid", empty || wrong ? "true" : "false");
      if (empty) missing.push(fields[k].label);
      if (wrong) badEmail = true;
      if ((empty || wrong) && !first) first = el;
    });
    const segOk = !!form.querySelector("input[name=segment]:checked");
    seg.classList.toggle("is-invalid", !segOk);
    if (!segOk) {
      missing.push("di cosa ti occupi");
      first = first || form.querySelector("input[name=segment]");
    }
    if (missing.length || badEmail) {
      const parts = [];
      if (missing.length) parts.push("Completa " + list(missing) + ".");
      if (badEmail) parts.push("L'email non sembra completa.");
      invalid.textContent = parts.join(" ");
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
  });

  /* Calendar: Google link and an .ics file, built here so they work without a server */
  const calTitle = "Webinar RankWit: Business Hub di ChatGPT per hotel e tour operator";
  const calText = "Il link della diretta arriva per email prima dell'inizio. Pagina: https://www.rankwit.ai/it/webinar";
  const g = form.querySelector("[data-cal-google]");
  const ics = form.querySelector("[data-cal-ics]");
  g.href = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(calTitle) +
    "&dates=20261119T140000Z/20261119T150000Z&details=" + encodeURIComponent(calText) + "&location=" + encodeURIComponent("Online");
  const icsBody = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RankWit//Webinar//IT", "BEGIN:VEVENT",
    "UID:webinar-20261119@rankwit.ai", "DTSTAMP:20261116T120000Z", "DTSTART:20261119T140000Z", "DTEND:20261119T150000Z",
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
      webinar: "Business Hub di ChatGPT: cosa cambia per hotel e tour operator",
      webinar_date: "2026-11-19T15:00:00+01:00",
      submitted_at: new Date().toISOString(),
      name: text("name"),
      email: text("email"),
      company: text("company"),
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
    if (live && !payload.extra_field) {
      try {
        const res = await fetch("/api/webinar", { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(String(res.status));
      } catch (err) {
        send.disabled = false;
        sendLabel.textContent = "Prenota il mio posto";
        error.hidden = false;
        return;
      }
    }
    done = true;
    if (sticky) sticky.hidden = true;
    form.querySelector(".panel-body.form").hidden = true;
    const ok = form.querySelector(".wb-done");
    ok.hidden = false;
    ok.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    ok.querySelector("h2").focus({ preventScroll: true });
  });
})();

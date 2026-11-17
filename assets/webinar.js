/* Webinar page: countdown, the animated example and the registration form.
   The form, on www.rankwit.ai (and Cloudflare Pages previews), posts JSON to /api/webinar (functions/api/webinar.js),
   which forwards it to the Make webhook in WEBINAR_WEBHOOK. Anywhere else (the GitHub Pages preview, a local
   server) there is no endpoint: the page shows the confirmation without sending anything. */
(function () {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Countdown to Thursday 19 November 2026, 15:00 in Rome ---------- */
  const START = Date.parse("2026-11-19T14:00:00Z");
  const END = Date.parse("2026-11-19T15:00:00Z");
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
      return true;
    };
    if (tick()) {
      const id = setInterval(() => { if (!tick()) clearInterval(id); }, 1000);
    }
  });

  /* ---------- The example: type the question, then the answer and the numbers appear ---------- */
  const demo = document.querySelector("[data-demo]");
  if (demo) {
    const ask = demo.querySelector("[data-demo-ask]");
    const steps = Array.from(demo.querySelectorAll(".wb-step"));
    const counters = Array.from(demo.querySelectorAll("[data-count-to]"));
    const full = ask.dataset.text || ask.textContent;
    const countUp = () => {
      counters.forEach((el) => {
        const to = Number(el.dataset.countTo);
        const t0 = performance.now();
        const run = (t) => {
          const p = Math.min(1, (t - t0) / 1200);
          el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(run);
        };
        requestAnimationFrame(run);
      });
    };
    const play = () => {
      if (reduced) {
        demo.classList.add("is-on");
        return;
      }
      counters.forEach((el) => { el.textContent = "0"; });
      ask.textContent = "";
      ask.classList.add("is-typing");
      let i = 0;
      const type = () => {
        ask.textContent = full.slice(0, ++i);
        if (i < full.length) return setTimeout(type, 28);
        ask.classList.remove("is-typing");
        steps.forEach((s, k) => s.style.setProperty("--d", (0.15 + k * 0.32).toFixed(2) + "s"));
        demo.classList.add("is-on");
        setTimeout(countUp, 300 + steps.length * 320);
      };
      setTimeout(type, 250);
    };
    if ("IntersectionObserver" in window && !reduced) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          play();
        }
      }, { threshold: 0.35 });
      io.observe(demo);
    } else {
      demo.classList.add("is-on");
    }
  }

  /* ---------- Registration form ---------- */
  const form = document.querySelector("[data-webinar]");
  if (!form) return;
  const send = form.querySelector("[data-send]");
  const error = form.querySelector("[data-error]");
  const live = /(^|\.)rankwit\.ai$|\.pages\.dev$/.test(window.location.hostname);
  let attrib = null;
  try {
    attrib = JSON.parse(localStorage.getItem("rkw_attr"));
  } catch (e) {}

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!form.reportValidity()) return;
    send.disabled = true;
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
        error.hidden = false;
        return;
      }
    }
    form.querySelector(".panel-body.form").hidden = true;
    const done = form.querySelector(".wb-done");
    done.hidden = false;
    done.scrollIntoView({ block: "center", behavior: "smooth" });
    done.querySelector("h2").focus({ preventScroll: true });
  });
})();

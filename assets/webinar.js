/* Webinar page: the registration form.
   On www.rankwit.ai (and Cloudflare Pages previews) it posts JSON to /api/webinar (functions/api/webinar.js),
   which forwards it to the Make webhook in WEBINAR_WEBHOOK. Anywhere else (the GitHub Pages preview, a local
   server) there is no endpoint: the page shows the confirmation without sending anything. */
(function () {
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

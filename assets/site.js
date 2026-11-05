/* RankWit website scripts. No dependencies. */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const IT = (document.documentElement.lang || "en").slice(0, 2) === "it";
  const LOCALE = IT ? "it-IT" : "en-US";

  /* ---------- First-touch attribution for the lead form, kept for this browser session only ---------- */
  const ATTRIB_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"];
  let attrib = null;
  try {
    attrib = JSON.parse(sessionStorage.getItem("rw_attrib") || "null");
    const p = new URLSearchParams(window.location.search);
    /* First page of the session, or a new campaign click (any utm_* or gclid in the address) */
    if (!attrib || ATTRIB_KEYS.some((k) => p.get(k))) {
      attrib = { landing_page: window.location.href.split("#")[0], referrer: document.referrer || "direct" };
      ATTRIB_KEYS.forEach((k) => { attrib[k] = p.get(k) || ""; });
      sessionStorage.setItem("rw_attrib", JSON.stringify(attrib));
    }
  } catch (e) {
    attrib = null;
  }

  /* ---------- Nav: scrolled state, light/dark by section, mobile menu ---------- */
  const nav = document.getElementById("nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const sections = document.querySelectorAll("[data-nav]");
    const themeIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) nav.classList.toggle("on-dark", e.target.dataset.nav === "dark");
        });
      },
      { rootMargin: "-1px 0px -92% 0px", threshold: 0 }
    );
    sections.forEach((s) => themeIO.observe(s));

    const toggle = nav.querySelector("[data-toggle]");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
        document.body.classList.toggle("menu-open", open);
      });
      nav.querySelectorAll(".nav-links a").forEach((a) =>
        a.addEventListener("click", () => {
          nav.classList.remove("is-open");
          document.body.classList.remove("menu-open");
        })
      );
    }
  }

  /* ---------- Reveal on scroll ---------- */
  const revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        e.target.querySelectorAll("[data-w]").forEach(fillBar);
        e.target.querySelectorAll("[data-count]").forEach(countUp);
        revealIO.unobserve(e.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));
  /* Anything already in the first viewport shows at once, whether or not the observer has fired yet */
  document.querySelectorAll(".reveal").forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add("in");
      el.querySelectorAll("[data-w]").forEach(fillBar);
      el.querySelectorAll("[data-count]").forEach(countUp);
    }
  });

  /* Bars and counters that live outside a .reveal still animate when seen */
  const looseIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (e.target.hasAttribute("data-w")) fillBar(e.target);
        if (e.target.hasAttribute("data-count")) countUp(e.target);
        looseIO.unobserve(e.target);
      });
    },
    { threshold: 0.3 }
  );
  document.querySelectorAll("[data-w], [data-count]").forEach((el) => {
    if (!el.closest(".reveal")) looseIO.observe(el);
  });

  function fillBar(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    requestAnimationFrame(() => {
      el.style.width = el.dataset.w + "%";
    });
  }

  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split(".")[1] || "").length;
    const fmt = (n) => n.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: "always" });
    if (reduce) {
      el.textContent = fmt(target);
      return;
    }
    const dur = 1100;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Prompt ticker: duplicate once for a seamless loop ---------- */
  document.querySelectorAll("[data-ticker] .ticker-track").forEach((track) => {
    track.innerHTML += track.innerHTML;
  });

  /* ---------- Prompt box: keep the query, go to the audit page ---------- */
  document.querySelectorAll("[data-promptbox]").forEach((form) => {
    form.addEventListener("submit", (ev) => {
      const q = form.querySelector("input[name=q]");
      if (q && !q.value.trim()) {
        ev.preventDefault();
        window.location.href = form.getAttribute("action");
      }
    });
  });

  /* ---------- Answer explorer: typed question, streamed answer, live metrics ---------- */
  const explorer = document.querySelector("[data-explorer]");
  if (explorer) {
    const engines = [
      { key: "openai", name: "ChatGPT" },
      { key: "gemini", name: "Gemini" },
      { key: "perplexity", name: "Perplexity" },
      { key: "claude", name: "Claude" },
      { key: "google", name: "AI Overviews" },
    ];

    const scenesEN = [
      {
        key: "florence",
        market: "Florence / boutique",
        engine: "openai",
        q: "Best boutique hotel in Florence under 250 euro a night?",
        answer: [
          "A few boutique hotels in Florence that usually stay under €250 a night:",
          "<span class='name'>A palazzo hotel in the Oltrarno</span> is the one guides mention most for its rooftop and quiet rooms.",
          "<span class='name'>A design hotel by the river</span> comes up for its restaurant and late checkout.",
          "<span class='name you'>Your hotel</span> near Santa Croce gets praise for breakfast and staff, and often has rooms around €210.",
        ],
        sources: [
          { d: "review site", hot: true },
          { d: "booking platform", hot: true },
          { d: "city guide" },
          { d: "travel magazine" },
        ],
        loss: "ChatGPT named you third. Gemini, Perplexity and AI Overviews answered the same question with three other hotels. Those travelers never saw your name.",
        vis: 31,
        delta: "-4 this week",
        pos: "3rd",
        posNote: "2nd last week",
        named: ["openai", "claude"],
        namedNote: "3 engines sent them elsewhere",
      },
      {
        key: "dolomites",
        market: "Dolomites / hiking",
        engine: "perplexity",
        q: "Which valley in the Dolomites is best for a week of hiking in July?",
        answer: [
          "For a week of hiking in July, three valleys come up again and again:",
          "<span class='name'>A valley with lifts running every day</span> is the one most guides link to, for its trail network.",
          "<span class='name you'>Your destination</span> is also cited, mainly for its mountain huts and quieter paths.",
          "<span class='name'>A valley further east</span> is the usual pick for families.",
        ],
        sources: [
          { d: "review site", hot: true },
          { d: "official tourism site", hot: true },
          { d: "forum thread" },
          { d: "guidebook" },
        ],
        loss: "You are named second. The guides the engines rely on describe the other valley in detail and give yours one line, so the answer follows them.",
        vis: 58,
        delta: "-6 this week",
        pos: "2nd",
        posNote: "1st until June",
        named: ["openai", "gemini", "perplexity", "claude"],
        namedNote: "1 engine sent them elsewhere",
      },
      {
        key: "amalfi",
        market: "Amalfi coast / romantic",
        engine: "gemini",
        q: "Romantic hotel on the Amalfi coast with a pool and a sea view",
        answer: [
          "The names that come up most for a romantic stay with a sea-view pool on the Amalfi coast:",
          "<span class='name'>A clifftop hotel in Praiano</span> is the most cited, for its infinity pool and sunset terrace.",
          "<span class='name'>A small inn in Positano</span> is often recommended for couples.",
          "<span class='miss'>Your hotel is not mentioned.</span> The two guides this answer relies on list four hotels, none of them yours.",
        ],
        sources: [
          { d: "travel magazine", hot: true },
          { d: "review site", hot: true },
          { d: "newspaper travel section" },
          { d: "booking platform" },
        ],
        loss: "Four engines out of five sent this traveler to a competitor. The pages they relied on do not mention you, so next week's answer will be the same.",
        vis: 9,
        delta: "-3 this week",
        pos: "none",
        posNote: "not named this week",
        named: ["claude"],
        namedNote: "4 engines sent them elsewhere",
      },
    ];

    const scenesIT = [
      {
        key: "florence",
        market: "Firenze / boutique",
        engine: "openai",
        q: "Qual è il miglior boutique hotel di Firenze sotto i 250 euro a notte?",
        answer: [
          "Ecco alcuni boutique hotel a Firenze che di solito restano sotto i 250 € a notte:",
          "<span class='name'>Un hotel in un palazzo d'Oltrarno</span> è il più citato dalle guide, per la terrazza e le camere silenziose.",
          "<span class='name'>Un hotel di design sul lungarno</span> viene consigliato per il ristorante e il late check-out.",
          "<span class='name you'>Il tuo hotel</span>, vicino a Santa Croce, piace per la colazione e il personale, e spesso ha camere intorno ai 210 €.",
        ],
        sources: [
          { d: "sito di recensioni", hot: true },
          { d: "piattaforma di prenotazione", hot: true },
          { d: "guida locale" },
          { d: "rivista di viaggi" },
        ],
        loss: "ChatGPT ti ha citato per terzo. Gemini, Perplexity e le Panoramiche AI di Google hanno risposto alla stessa domanda con altri tre hotel: quei viaggiatori il tuo nome non l'hanno mai visto.",
        vis: 31,
        delta: "-4 in una settimana",
        pos: "3°",
        posNote: "era 2° la settimana scorsa",
        named: ["openai", "claude"],
        namedNote: "3 motori hanno suggerito altri nomi",
      },
      {
        key: "dolomites",
        market: "Dolomiti / trekking",
        engine: "perplexity",
        q: "Qual è la valle migliore delle Dolomiti per una settimana di trekking a luglio?",
        answer: [
          "Per una settimana di trekking a luglio, tornano sempre tre valli:",
          "<span class='name'>Una valle con gli impianti aperti tutti i giorni</span> è quella che compare in più guide, per la rete di sentieri.",
          "<span class='name you'>La tua destinazione</span> viene citata soprattutto per i rifugi e i sentieri meno affollati.",
          "<span class='name'>Una valle più a est</span> è la scelta classica per le famiglie.",
        ],
        sources: [
          { d: "sito di recensioni", hot: true },
          { d: "sito turistico ufficiale", hot: true },
          { d: "forum di viaggio" },
          { d: "guida" },
        ],
        loss: "Sei citata per seconda. Le guide su cui si basano i motori descrivono l'altra valle nei dettagli e alla tua dedicano una riga, e la risposta fa lo stesso.",
        vis: 58,
        delta: "-6 in una settimana",
        pos: "2°",
        posNote: "prima fino a giugno",
        named: ["openai", "gemini", "perplexity", "claude"],
        namedNote: "1 motore ha suggerito altri nomi",
      },
      {
        key: "amalfi",
        market: "Costiera Amalfitana / romantico",
        engine: "gemini",
        q: "Hotel romantico in Costiera Amalfitana con piscina e vista mare",
        answer: [
          "Per un soggiorno romantico con piscina vista mare in Costiera, i nomi che tornano più spesso sono questi:",
          "<span class='name'>Un hotel a strapiombo sul mare a Praiano</span> è il più citato, per la piscina a sfioro e la terrazza al tramonto.",
          "<span class='name'>Una piccola locanda a Positano</span> viene spesso consigliata alle coppie.",
          "<span class='miss'>Il tuo hotel non compare.</span> Le due guide su cui si basa questa risposta elencano quattro hotel, e il tuo non c'è.",
        ],
        sources: [
          { d: "rivista di viaggi", hot: true },
          { d: "sito di recensioni", hot: true },
          { d: "pagine viaggi di un quotidiano" },
          { d: "piattaforma di prenotazione" },
        ],
        loss: "Quattro motori su cinque hanno mandato questo viaggiatore da un concorrente. Le pagine che usano non parlano di te, quindi anche la prossima settimana la risposta sarà la stessa.",
        vis: 9,
        delta: "-3 in una settimana",
        pos: "nessuna",
        posNote: "non citato questa settimana",
        named: ["claude"],
        namedNote: "4 motori hanno suggerito altri nomi",
      },
    ];
    const scenes = IT ? scenesIT : scenesEN;

    const $ = (sel) => explorer.querySelector(sel);
    const qEl = $("[data-ex-q]");
    const aEl = $("[data-ex-answer]");
    const sEl = $("[data-ex-sources]");
    const markEl = $("[data-ex-engine-mark] use");
    const visEl = $("[data-ex-vis]");
    const deltaEl = $("[data-ex-delta]");
    const posEl = $("[data-ex-pos]");
    const engEl = $("[data-ex-engines]");
    const barsEl = $("[data-ex-bars]");
    const marketEl = $("[data-ex-market]");

    let idx = 0;
    let timer = null;
    let running = false;

    const namedEl = $("[data-ex-named]");
    const posNoteEl = $("[data-ex-pos-note]");
    const namedNoteEl = $("[data-ex-named-note]");
    const lossEl = $("[data-ex-loss]");

    /* Chart, share and breadcrumb of the product window. Example data, keyed by scene. */
    const PLACE = {
      florence: [IT ? "Il tuo hotel" : "Your hotel", IT ? "Firenze" : "Florence"],
      dolomites: [IT ? "La tua destinazione" : "Your destination", IT ? "Dolomiti" : "Dolomites"],
      amalfi: [IT ? "Il tuo hotel" : "Your hotel", IT ? "Costiera Amalfitana" : "Amalfi coast"],
    };
    const TREND = {
      florence: { you: [38, 37, 38, 36, 35, 36, 35, 34, 35, 33, 35, 31], a: [36, 37, 38, 38, 40, 41, 40, 42, 43, 42, 43, 44], b: [26, 25, 27, 26, 26, 28, 27, 26, 27, 28, 26, 27] },
      dolomites: { you: [62, 63, 65, 64, 66, 65, 64, 63, 62, 64, 64, 58], a: [40, 41, 40, 42, 43, 44, 45, 46, 46, 47, 48, 49], b: [28, 29, 27, 28, 30, 29, 31, 30, 29, 30, 31, 30] },
      amalfi: { you: [15, 14, 15, 13, 12, 12, 13, 12, 11, 12, 12, 9], a: [64, 65, 66, 66, 67, 68, 68, 69, 70, 70, 71, 71], b: [40, 41, 42, 42, 43, 44, 44, 45, 45, 46, 46, 46] },
    };
    const SHARE = {
      florence: [["a", 44], ["you", 31], ["b", 27], ["c", 12]],
      dolomites: [["you", 58], ["a", 49], ["b", 30], ["c", 14]],
      amalfi: [["a", 71], ["b", 46], ["c", 28], ["you", 9]],
    };
    const COMP = (k) => (IT ? "Concorrente " : "Competitor ") + k.toUpperCase();
    const crumbEl = $("[data-ex-crumb]");
    const chartEl = $("[data-ex-chart]");
    const chartWrap = $("[data-ex-chart-wrap]");
    const legendEl = $("[data-ex-legend]");
    const shareEl = $("[data-ex-share]");
    const COLORS = { you: "#706ef8", a: "#403eb2", b: "#e39a12" };

    function drawChart(key) {
      if (!chartEl) return;
      const t = TREND[key];
      const W = 600, H = 190, L = 30, R = 14, T = 10, B = 24, max = 80;
      const x = (i) => L + (i * (W - L - R)) / 11;
      const y = (v) => T + (1 - v / max) * (H - T - B);
      const line = (arr) => arr.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
      const grid = [0, 20, 40, 60, 80]
        .map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}"/><text x="${L - 8}" y="${y(g) + 3}" text-anchor="end">${g}%</text>`)
        .join("");
      const wk = IT ? "S" : "W";
      const weeks = t.you
        .map((_, i) => (i % 2 === 1 || i === 11 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${wk}${32 + i}</text>` : ""))
        .join("");
      const area = line(t.you) + ` L${x(11)},${y(0)} L${x(0)},${y(0)} Z`;
      chartWrap.classList.remove("is-drawn");
      chartEl.innerHTML = `
        <defs><linearGradient id="youFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#706ef8" stop-opacity="0.22"/><stop offset="1" stop-color="#706ef8" stop-opacity="0"/></linearGradient></defs>
        <g class="grid">${grid}</g><g class="weeks">${weeks}</g>
        <path class="area" d="${area}" fill="url(#youFill)"/>
        <path class="series" pathLength="1" d="${line(t.b)}" stroke="${COLORS.b}" stroke-dasharray="1"/>
        <path class="series" pathLength="1" d="${line(t.a)}" stroke="${COLORS.a}"/>
        <path class="series you" pathLength="1" d="${line(t.you)}" stroke="${COLORS.you}"/>
        <circle class="end" cx="${x(11)}" cy="${y(t.you[11])}" r="4.5" fill="#fff" stroke="${COLORS.you}" stroke-width="3"/>`;
      legendEl.innerHTML = [
        ["you", PLACE[key][0]],
        ["a", COMP("a")],
        ["b", COMP("b")],
      ]
        .map(([k, label]) => `<span><i style="background:${COLORS[k]}"></i>${label}</span>`)
        .join("");
      requestAnimationFrame(() => requestAnimationFrame(() => chartWrap.classList.add("is-drawn")));
    }

    function renderShare(key) {
      if (!shareEl) return;
      const rows = SHARE[key];
      shareEl.innerHTML = rows
        .map(([k, v]) => {
          const you = k === "you";
          const who = you ? PLACE[key][0] : COMP(k);
          return `<div class="bar${you ? " you" : ""}"><span class="who">${who}</span><span class="track"><span class="fill" style="width:0"></span></span><span class="num">${v}%</span></div>`;
        })
        .join("");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => shareEl.querySelectorAll(".fill").forEach((f, i) => (f.style.width = rows[i][1] + "%")))
      );
    }

    function renderSide(s) {
      if (crumbEl) crumbEl.innerHTML = `${PLACE[s.key][0]}<i>/</i>${PLACE[s.key][1]}`;
      drawChart(s.key);
      renderShare(s.key);
      if (marketEl) marketEl.textContent = s.market;
      markEl.setAttribute("href", "#m-" + s.engine);
      visEl.textContent = s.vis + "%";
      if (deltaEl) {
        deltaEl.textContent = s.delta;
        deltaEl.className = "delta " + (s.delta.startsWith("-") ? "down" : "up");
      }
      posEl.textContent = s.pos;
      if (posNoteEl) posNoteEl.textContent = s.posNote || "";
      if (namedEl) namedEl.textContent = s.named.length + (IT ? " su 5" : " of 5");
      if (namedNoteEl) namedNoteEl.textContent = s.namedNote || "";
      if (!engEl || !barsEl) return;
      engEl.innerHTML = engines
        .map((e) => `<span class="e ${s.named.includes(e.key) ? "on" : "off"}"><svg><use href="#m-${e.key}"/></svg>${e.name}</span>`)
        .join("");
      barsEl.innerHTML = s.bars
        .map(
          (b) =>
            `<div class="bar${b.you ? " you" : ""}"><span class="who">${b.who}</span><span class="track"><span class="fill" style="width:0"></span></span><span class="num">${b.v}%</span></div>`
        )
        .join("");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          barsEl.querySelectorAll(".fill").forEach((f, i) => (f.style.width = s.bars[i].v + "%"));
        })
      );
    }

    function renderAnswer(s) {
      aEl.classList.remove("is-live");
      aEl.innerHTML = s.answer.map((p) => `<p>${p}</p>`).join("");
      if (sEl)
        sEl.innerHTML =
          `<span class="lbl">${IT ? "Fonti" : "Sources"}</span>` +
          s.sources.map((x) => `<span class="src${x.hot ? " hot" : ""}"><i></i>${x.d}</span>`).join("");
      requestAnimationFrame(() => requestAnimationFrame(() => aEl.classList.add("is-live")));
      if (lossEl) {
        lossEl.classList.remove("is-live");
        lossEl.innerHTML = `<svg><use href="#i-alert"/></svg><span>${s.loss}</span>`;
        clearTimeout(lossTimer);
        lossTimer = setTimeout(() => lossEl.classList.add("is-live"), reduce ? 0 : 1600);
      }
    }
    let lossTimer = null;

    function typeQuestion(text, done) {
      qEl.textContent = text;
      timer = setTimeout(done, reduce ? 0 : 250);
    }

    const tabs = document.querySelectorAll("[data-scene-tab]");
    function markTab(i) {
      tabs.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.sceneTab === scenes[i].key)));
    }
    tabs.forEach((t) =>
      t.addEventListener("click", () => {
        const i = scenes.findIndex((s) => s.key === t.dataset.sceneTab);
        if (i < 0) return;
        clearTimeout(timer);
        running = true;
        play(i);
      })
    );

    function play(i) {
      idx = i;
      markTab(i);
      const s = scenes[i];
      aEl.classList.remove("is-live");
      aEl.innerHTML = "";
      if (sEl) sEl.innerHTML = "";
      if (lossEl) lossEl.classList.remove("is-live");
      typeQuestion(s.q, () => {
        renderAnswer(s);
        renderSide(s);
        timer = setTimeout(() => play((i + 1) % scenes.length), reduce ? 7000 : 9500);
      });
    }

    const startIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !running) {
            running = true;
            play(idx);
          }
        });
      },
      { threshold: 0.2 }
    );
    startIO.observe(explorer);

    /* First paint: show scene 0 statically so nothing is empty before the observer fires */
    renderSide(scenes[0]);
    renderAnswer(scenes[0]);
    qEl.textContent = scenes[0].q;
    markTab(0);
  }

  /* ---------- Answer line: a hotel answer, then a destination answer; "you" appears whole, then is usually struck out ---------- */
  /* Never type the name letter by letter: partial words such as "your ho" read badly. */
  const line = document.querySelector("[data-answer-line]");
  if (line) {
    const engines = ["openai", "gemini", "perplexity", "claude", "google"];
    const kinds = IT
      ? {
          hotel: {
            you: "il tuo hotel",
            lost: "Il tuo hotel è rimasto fuori.",
            w: "4.6em",
            leads: ["Ti consiglio", "Di solito si sceglie tra", "Gli hotel più citati sono", "Da tenere d'occhio:", "Tra i più apprezzati ci sono"],
          },
          destination: {
            you: "la tua destinazione",
            lost: "La tua destinazione è rimasta fuori.",
            w: "7em",
            leads: ["Per un weekend tra le cantine, prova", "Per una settimana di trekking, valuta", "Di solito si sceglie tra", "Per mangiare bene e rallentare, prova", "Tra le mete più amate ci sono"],
          },
        }
      : {
      hotel: {
        you: "your hotel",
        lost: "Your hotel was left out.",
        w: "4.4em",
        leads: ["Three hotels worth a look:", "Travelers usually pick", "The most cited hotels are", "I would start with", "Popular picks include"],
      },
      destination: {
        you: "your destination",
        lost: "Your destination was left out.",
        w: "6.2em",
        leads: ["For a wine weekend, try", "For a week of hiking, go to", "Travelers usually choose between", "For food and slow travel, try", "Popular choices include"],
      },
    };
    const NAMED = IT ? "Questa volta ci sei." : "Named this time.";
    const use = line.querySelector(".al-eng use");
    const lead = line.querySelector(".al-lead");
    const you = line.querySelector(".al-you");
    const bar3 = line.querySelector(".al-bar3");
    const caption = document.querySelector("[data-al-caption]");
    const say = (text, kind) => {
      caption.textContent = text;
      caption.className = "al-caption " + kind + " is-show";
    };

    if (reduce) {
      line.classList.add("is-dropped");
      say(kinds.hotel.lost, "bad");
    } else {
      let v = 0;
      let n = 0;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const cycle = async () => {
        for (;;) {
          const k = kinds[n % 2 === 0 ? "hotel" : "destination"];
          const named = n % 4 === 3;
          use.setAttribute("href", "#m-" + engines[v]);
          lead.textContent = k.leads[v];
          you.textContent = k.you;
          bar3.style.setProperty("--w", k.w);
          caption.className = "al-caption";
          line.classList.add("is-reset");
          line.classList.remove("is-in", "is-lit", "is-strike", "is-dropped", "is-out");
          await wait(60);
          line.classList.remove("is-reset");
          await wait(1200);
          line.classList.add("is-in");
          await wait(1000);
          if (named) {
            line.classList.add("is-lit");
            say(NAMED, "ok");
          } else {
            line.classList.add("is-strike");
            await wait(900);
            line.classList.add("is-dropped");
            say(k.lost, "bad");
          }
          await wait(4200);
          line.classList.add("is-out");
          caption.classList.remove("is-show");
          await wait(480);
          v = (v + 1) % engines.length;
          n++;
        }
      };
      cycle();
    }
  }

  /* ---------- Product window rises flat as it scrolls into view ---------- */
  const appEl = document.querySelector("[data-app-stage] .app");
  if (appEl && !reduce) {
    let ticking = false;
    const rise = () => {
      ticking = false;
      const r = appEl.getBoundingClientRect();
      const vh = window.innerHeight;
      /* Starts straightening with the first scroll and is flat a third of a screen later */
      const p = Math.min(1, Math.max(0, (r.top - vh * 0.55) / (vh * 0.35)));
      appEl.style.setProperty("--rise", p.toFixed(3));
    };
    rise();
    window.addEventListener("scroll", () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(rise);
      }
    }, { passive: true });
    window.addEventListener("resize", rise);
  } else if (appEl) {
    appEl.style.setProperty("--rise", "0");
  }

  /* ---------- Giant answer: the third name becomes yours ---------- */
  const giant = document.querySelector("[data-giant]");
  if (giant) {
    const giantIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setTimeout(() => giant.classList.add("is-yours"), reduce ? 0 : 500);
        });
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: 0 }
    );
    giantIO.observe(giant);
  }

  /* ---------- Section entrance (v4) ---------- */
  const secIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        secIO.unobserve(e.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
  );
  document.querySelectorAll("section.sec").forEach((s) => {
    if (s.getBoundingClientRect().top < window.innerHeight * 0.9) s.classList.add("in");
    else secIO.observe(s);
  });

  /* ---------- How it works: each panel plays once when it comes into view ---------- */
  const flow = document.querySelector("[data-flow]");
  if (flow && "IntersectionObserver" in window) {
    flow.classList.add("js-on");
    const paneIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("play");
          paneIO.unobserve(e.target);
        });
      },
      { threshold: 0.3 }
    );
    flow.querySelectorAll(".flow-pane").forEach((p) => paneIO.observe(p));
  }

  /* ---------- Hotel page: what a direct booking is worth (v4) ---------- */
  const calc = document.querySelector("[data-calc]");
  if (calc) {
    const num = (n) => +calc.querySelector(`[name=${n}]`).value;
    const month = calc.querySelector("[data-calc-month]");
    const year = calc.querySelector("[data-calc-year]");
    const euro = (v) => (IT ? Math.round(v).toLocaleString(LOCALE, { useGrouping: "always" }) + " €" : "€" + Math.round(v).toLocaleString(LOCALE, { useGrouping: "always" }));
    const update = () => {
      calc.querySelectorAll("label").forEach((l) => {
        const i = l.querySelector("input");
        const o = l.querySelector("output");
        if (!i || !o) return;
        o.textContent = i.name === "rate" ? (IT ? i.value + " €" : "€" + i.value) : i.name === "comm" ? i.value + "%" : i.value;
      });
      const m = (num("rate") * num("nights") * num("n") * num("comm")) / 100;
      month.textContent = euro(m);
      year.textContent = euro(m * 12) + (IT ? " all'anno" : " a year");
    };
    calc.addEventListener("input", update);
    update();
  }

  /* ---------- Audit page: the request form, in four steps ---------- */
  /* LEAD_WEBHOOK is the Make webhook that receives each request as JSON (fields in README, "Lead form").
     Left empty, the page only shows the confirmation. */
  const LEAD_WEBHOOK = "";
  const auditForm = document.querySelector("[data-audit]");
  if (auditForm) {
    const steps = Array.from(auditForm.querySelectorAll(".fstep"));
    const back = auditForm.querySelector("[data-back]");
    const next = auditForm.querySelector("[data-next]");
    const send = auditForm.querySelector("[data-send]");
    const label = auditForm.querySelector("[data-step-label]");
    const error = auditForm.querySelector("[data-error]");
    const siteField = auditForm.querySelector("input[name=website]");
    let cur = 0;

    const show = (i, focus) => {
      cur = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach((s, k) => s.classList.toggle("is-on", k === cur));
      back.hidden = cur === 0;
      next.hidden = cur === steps.length - 1;
      send.hidden = cur !== steps.length - 1;
      if (label) label.textContent = (IT ? "Passo " : "Step ") + (cur + 1) + (IT ? " di " : " of ") + steps.length;
      if (focus) {
        const first = steps[cur].querySelector("input:not([type=radio]), select, textarea");
        if (first) first.focus({ preventScroll: true });
      }
    };
    const hostOf = (raw) => {
      const v = String(raw || "").trim();
      if (!v) return "";
      try {
        return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : "https://" + v).hostname.replace(/^www\./, "").toLowerCase();
      } catch (e) {
        return "";
      }
    };
    const checkSite = () => {
      const host = hostOf(siteField.value);
      siteField.setCustomValidity(host && /\.[a-z]{2,}$/i.test(host) ? "" : IT ? "Scrivi l'indirizzo del sito, per esempio nomehotel.it" : "Enter the website address, like hotelname.com");
    };
    siteField.addEventListener("input", () => siteField.setCustomValidity(""));
    const valid = (i) => {
      if (steps[i].contains(siteField)) checkSite();
      for (const el of steps[i].querySelectorAll("input, select, textarea")) {
        if (!el.checkValidity()) {
          el.reportValidity();
          return false;
        }
      }
      return true;
    };

    /* ?site= and ?segment= prefill the form (links from emails, QR codes, the booking page) */
    const params = new URLSearchParams(window.location.search);
    if (params.get("site")) siteField.value = params.get("site");
    const seg = auditForm.querySelector('input[name=segment][value="' + (params.get("segment") || "") + '"]');
    if (seg) seg.checked = true;

    show(0, false);
    next.addEventListener("click", () => {
      if (valid(cur)) show(cur + 1, true);
    });
    back.addEventListener("click", () => show(cur - 1, true));
    steps[0].addEventListener("change", (ev) => {
      if (ev.target.type === "radio") setTimeout(() => { if (cur === 0) show(1, true); }, 160);
    });
    auditForm.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !next.hidden && ev.target.tagName !== "TEXTAREA") {
        ev.preventDefault();
        next.click();
      }
    });

    auditForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      for (let i = 0; i < steps.length; i++) {
        if (!valid(i)) {
          show(i, true);
          return;
        }
      }
      send.disabled = true;
      error.hidden = true;
      const f = new FormData(auditForm);
      const text = (k) => String(f.get(k) || "").trim();
      const payload = {
        event: "created",
        submission_id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        submitted_at: new Date().toISOString(),
        step_completed: "contact",
        segment: text("segment"),
        segment_source: "user_selected",
        website_url: hostOf(f.get("website")),
        website_url_raw: text("website"),
        name: text("name"),
        email: text("email"),
        phone: text("phone"),
        heard_from: text("heard_from"),
        note: text("note"),
        locale: IT ? "it" : "en",
        page_path: window.location.pathname,
        subdomain_origin: window.location.hostname,
        user_agent: navigator.userAgent,
        call_booked: false,
        landing_page: attrib ? attrib.landing_page : window.location.href.split("#")[0],
        referrer: attrib ? attrib.referrer : document.referrer || "direct",
      };
      ATTRIB_KEYS.forEach((k) => { payload[k] = attrib ? attrib[k] || "" : ""; });
      if (LEAD_WEBHOOK && !text("company_website")) {
        try {
          const res = await fetch(LEAD_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          if (!res.ok) throw new Error(String(res.status));
        } catch (err) {
          send.disabled = false;
          error.hidden = false;
          return;
        }
      }
      auditForm.querySelector(".panel-body.form").hidden = true;
      auditForm.querySelector(".audit-done").hidden = false;
      if (label) label.textContent = IT ? "Ricevuta" : "Received";
      auditForm.querySelector(".audit-done").scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }
})();

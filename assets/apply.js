/* The application form on the job pages: sends the form, CV included, to /api/apply and says how it went. */
(function () {
  var it = document.documentElement.lang === "it";
  var T = it ? {
    sending: "Invio in corso", sent: "Candidatura inviata. Grazie: la leggiamo e ti rispondiamo per email.",
    big: "Il CV supera gli 8 MB. Caricane uno più leggero.",
    error: "Non siamo riusciti a inviare la candidatura. Riprova, oppure scrivici a info@rankwit.ai.",
  } : {
    sending: "Sending", sent: "Application sent. Thank you: we read it and reply by email.",
    big: "Your CV is over 8 MB. Please upload a lighter one.",
    error: "We could not send your application. Please try again, or write to info@rankwit.ai.",
  };
  document.querySelectorAll(".rw-monitor form").forEach(function (form) {
    var status = form.querySelector('[role="alert"]');
    var button = form.querySelector('button[type="submit"]');
    var label = button ? button.textContent : "";
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      var cv = form.querySelector('input[type="file"]');
      if (cv && cv.files[0] && cv.files[0].size > 8 * 1024 * 1024) { status.textContent = T.big; return; }
      var data = new FormData(form);
      var h1 = document.querySelector(".rw-monitor h1");
      var consent = form.querySelector('input[name="consent"]');
      var consentLabel = consent && form.querySelector('label[for="' + consent.id + '"]');
      data.append("role_title", h1 ? h1.textContent.trim() : "");
      data.append("role_url", location.origin + location.pathname);
      data.append("locale", it ? "it" : "en");
      data.append("consent_statement", consentLabel ? consentLabel.textContent.trim() : "");
      button.disabled = true;
      button.textContent = T.sending;
      status.textContent = "";
      fetch("/api/apply", { method: "POST", body: data }).then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        status.textContent = T.sent;
      }).catch(function () {
        status.textContent = T.error;
      }).then(function () {
        button.disabled = false;
        button.textContent = label;
      });
    });
  });
})();

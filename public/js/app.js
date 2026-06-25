(function () {
  "use strict";

  var form = document.getElementById("reg-form");
  var emailEl = document.getElementById("email");
  var hpEl = document.getElementById("hp");
  var btn = document.getElementById("submit-btn");
  var msg = document.getElementById("form-msg");
  var capture = document.getElementById("screen-capture");
  var success = document.getElementById("screen-success");

  var cfg = { googleCalendarUrl: "#", appleCalendarUrl: "#", icsUrl: "#", emailEnabled: false };

  // UTM desde la URL
  function getUtm() {
    var p = new URLSearchParams(location.search);
    return {
      source: p.get("utm_source"),
      medium: p.get("utm_medium"),
      campaign: p.get("utm_campaign"),
      content: p.get("utm_content"),
      term: p.get("utm_term"),
    };
  }

  fetch("/api/config")
    .then(function (r) { return r.json(); })
    .then(function (c) {
      cfg = c;
      document.getElementById("btn-google").href = c.googleCalendarUrl || "#";
      document.getElementById("btn-apple").href = c.appleCalendarUrl || c.icsUrl || "#";
    })
    .catch(function () {});

  function showError(text) {
    msg.textContent = text;
    msg.className = "msg err";
  }
  function clearError() {
    msg.textContent = "";
    msg.className = "msg";
  }

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function goSuccess(data) {
    // copy condicional honesto
    var note = document.getElementById("final-note");
    if (cfg.emailEnabled && data && data.emailed) {
      note.textContent = "Te hemos enviado una copia de esta información al correo que registraste.";
    } else {
      note.textContent = "Guarda esta pantalla y añade el evento a tu calendario para recibir el recordatorio del enlace de Zoom.";
    }

    var doSwap = function () {
      capture.classList.add("hidden");
      capture.setAttribute("aria-hidden", "true");
      success.classList.remove("hidden");
      success.setAttribute("aria-hidden", "false");
      window.scrollTo(0, 0);
      var t = document.getElementById("success-title");
      if (t && t.focus) t.focus();
      requestAnimationFrame(function () { success.classList.remove("fade-out"); });
    };

    if (prefersReduced) { doSwap(); return; }
    success.classList.add("fade-out");
    capture.classList.add("fade-out");
    setTimeout(doSwap, 200);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError();
    var email = (emailEl.value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError("Revisa tu correo e intenta de nuevo.");
      emailEl.focus();
      return;
    }

    btn.disabled = true;
    var original = btn.textContent;
    btn.textContent = "Guardando tu lugar...";

    fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, honeypot: hpEl.value, utm: getUtm() }),
    })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (res) {
        if (res.status === 200 && res.body && res.body.ok) {
          goSuccess(res.body);
        } else {
          showError((res.body && res.body.error) || "No pudimos guardar tu lugar. Intenta de nuevo.");
          btn.disabled = false;
          btn.textContent = original;
        }
      })
      .catch(function () {
        showError("Hubo un problema de conexión. Intenta de nuevo.");
        btn.disabled = false;
        btn.textContent = original;
      });
  });
})();

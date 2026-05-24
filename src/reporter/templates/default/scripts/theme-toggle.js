/* eslint-disable @typescript-eslint/no-unused-vars */
// Three-state theme cycle: system → light → dark → system.
// User choice persisted in localStorage; absent value = follow OS.
// Runs in <head> so data-theme is applied before any styled element paints.

(function () {
  var KEY = "unentropy-theme";
  var doc = document.documentElement;

  function readStored() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === "light" || v === "dark") return v;
    } catch (e) {}
    return "system";
  }

  function applyMode(mode) {
    if (mode === "system") {
      doc.removeAttribute("data-theme");
    } else {
      doc.setAttribute("data-theme", mode);
    }
  }

  // Apply stored choice immediately (head-time) to avoid flash.
  applyMode(readStored());

  function bind() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;

    var NEXT = { system: "light", light: "dark", dark: "system" };

    function setMode(mode) {
      applyMode(mode);
      btn.setAttribute("data-mode", mode);
      try {
        if (mode === "system") {
          localStorage.removeItem(KEY);
        } else {
          localStorage.setItem(KEY, mode);
        }
      } catch (e) {}
    }

    setMode(readStored());

    btn.addEventListener("click", function () {
      var current = btn.getAttribute("data-mode") || "system";
      setMode(NEXT[current]);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();

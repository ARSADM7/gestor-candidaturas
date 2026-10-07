/* ============================================================
   Gestor de Candidaturas — lógica
   Persistência em localStorage. Sem backend, sem dependências.
   Estrutura: constantes → store → render → eventos.
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "gestor-candidaturas:v1";

  /* Estados ordenados do mais recente ao mais antigo. */
  var STATUSES = [
    { value: "interesse", label: "Interesse", tone: "" },
    { value: "enviada", label: "Enviada", tone: "accent" },
    { value: "resposta", label: "Com resposta", tone: "warn" },
    { value: "entrevista", label: "Entrevista", tone: "warn" },
    { value: "oferta", label: "Oferta", tone: "ok" },
    { value: "recusada", label: "Recusada", tone: "danger" }
  ];

  /* ---------- DOM ---------- */
  var el = {
    list: document.getElementById("list"),
    empty: document.getElementById("empty"),
    search: document.getElementById("filter-search"),
    filterStatus: document.getElementById("filter-status"),
    statTotal: document.getElementById("stat-total"),
    statSent: document.getElementById("stat-sent"),
    statReplies: document.getElementById("stat-replies"),
    statOffers: document.getElementById("stat-offers"),
    dialog: document.getElementById("dialog"),
    form: document.getElementById("form"),
    dialogTitle: document.getElementById("dialog-title"),
    company: document.getElementById("f-company"),
    role: document.getElementById("f-role"),
    status: document.getElementById("f-status"),
    date: document.getElementById("f-date"),
    link: document.getElementById("f-link"),
    notes: document.getElementById("f-notes"),
    formError: document.getElementById("form-error"),
    btnNew: document.getElementById("btn-new"),
    btnCancel: document.getElementById("btn-cancel"),
    btnDelete: document.getElementById("btn-delete"),
    btnExport: document.getElementById("btn-export"),
    fileImport: document.getElementById("file-import")
  };

  var state = {
    items: [],
    editingId: null
  };

  /* ---------- Utilitários ---------- */
  function uid() {
    return "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(url) {
    try {
      var parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  function statusMeta(value) {
    for (var i = 0; i < STATUSES.length; i++) {
      if (STATUSES[i].value === value) return STATUSES[i];
    }
    return { value: value, label: value || "—", tone: "" };
  }

  function formatDate(iso) {
    if (!iso) return "";
    var parts = String(iso).split("-");
    if (parts.length !== 3) return iso;
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  /* ---------- Armazenamento ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isValid) : [];
    } catch (e) {
      return [];
    }
  }

  function isValid(item) {
    return (
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.company === "string" &&
      typeof item.role === "string"
    );
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
      return true;
    } catch (e) {
      alert(
        "Não foi possível guardar. O armazenamento do navegador pode estar cheio " +
          "ou bloqueado neste modo."
      );
      return false;
    }
  }

  /* ---------- Estatísticas ---------- */
  function computeStats() {
    var counts = { total: state.items.length, enviada: 0, resposta: 0, oferta: 0 };
    state.items.forEach(function (item) {
      if (item.status === "enviada") counts.enviada++;
      if (["resposta", "entrevista"].indexOf(item.status) !== -1) counts.resposta++;
      if (item.status === "oferta") counts.oferta++;
    });
    return counts;
  }

  function renderStats() {
    var s = computeStats();
    el.statTotal.textContent = String(s.total);
    el.statSent.textContent = String(s.enviada);
    el.statReplies.textContent = String(s.resposta);
    el.statOffers.textContent = String(s.oferta);
  }

  /* ---------- Filtros ---------- */
  function visibleItems() {
    var term = el.search.value.trim().toLowerCase();
    var status = el.filterStatus.value;

    return state.items
      .filter(function (item) {
        if (status && item.status !== status) return false;
        if (!term) return true;
        var haystack = [item.role, item.company, item.notes || ""]
          .join(" ")
          .toLowerCase();
        return haystack.indexOf(term) !== -1;
      })
      .sort(function (a, b) {
        return (b.date || "").localeCompare(a.date || "");
      });
  }

  /* ---------- Render ---------- */
  function render() {
    var items = visibleItems();

    el.list.innerHTML = items
      .map(function (item) {
        var meta = statusMeta(item.status);
        var link = "";
        if (item.link && safeUrl(item.link)) {
          link =
            '<a class="item__link" href="' +
            escapeHtml(item.link) +
            '" target="_blank" rel="noopener noreferrer">ver vaga</a>';
        }
        var notes = item.notes
          ? '<p class="item__notes">' + escapeHtml(item.notes) + "</p>"
          : "";
        var date = item.date ? formatDate(item.date) : "";

        return (
          '<li class="item" data-id="' +
          escapeHtml(item.id) +
          '" tabindex="0" role="button">' +
          '<div class="item__top">' +
          '<span class="item__role">' +
          escapeHtml(item.role) +
          "</span>" +
          '<span class="item__company">' +
          escapeHtml(item.company) +
          "</span>" +
          "</div>" +
          '<div class="item__meta">' +
          '<span class="badge" data-tone="' +
          escapeHtml(meta.tone) +
          '">' +
          escapeHtml(meta.label) +
          "</span>" +
          (date ? "<span>" + escapeHtml(date) + "</span>" : "") +
          link +
          "</div>" +
          notes +
          "</li>"
        );
      })
      .join("");

    el.empty.hidden = items.length !== 0;
    if (items.length === 0 && state.items.length > 0) {
      el.empty.textContent = "Nenhuma candidatura corresponde ao filtro.";
    } else {
      el.empty.innerHTML =
        "Ainda não há candidaturas registadas. Carrega em <strong>Nova candidatura</strong> para começar.";
    }

    renderStats();
  }

  /* ---------- Validação ---------- */
  function setError(field, message) {
    var span = document.querySelector('.field__error[data-for="' + field.id + '"]');
    if (span) span.textContent = message || "";
    field.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function validate() {
    var ok = true;

    if (!el.company.value.trim()) {
      setError(el.company, "Indica a empresa.");
      ok = false;
    } else {
      setError(el.company, "");
    }

    if (!el.role.value.trim()) {
      setError(el.role, "Indica o cargo.");
      ok = false;
    } else {
      setError(el.role, "");
    }

    var url = el.link.value.trim();
    if (url && !safeUrl(url)) {
      setError(el.link, "O link tem de começar por http:// ou https://");
      ok = false;
    } else {
      setError(el.link, "");
    }

    return ok;
  }

  /* ---------- Diálogo ---------- */
  function openDialog(item) {
    state.editingId = item ? item.id : null;

    el.dialogTitle.textContent = item ? "Editar candidatura" : "Nova candidatura";
    el.btnDelete.hidden = !item;

    el.company.value = item ? item.company : "";
    el.role.value = item ? item.role : "";
    el.status.value = item ? item.status : "interesse";
    el.date.value = item ? item.date || "" : today();
    el.link.value = item ? item.link || "" : "";
    el.notes.value = item ? item.notes || "" : "";

    el.formError.hidden = true;
    [el.company, el.role, el.link].forEach(function (f) {
      setError(f, "");
    });

    if (typeof el.dialog.showModal === "function") {
      el.dialog.showModal();
    } else {
      el.dialog.setAttribute("open", "");
    }
    el.company.focus();
  }

  function closeDialog() {
    if (typeof el.dialog.close === "function") {
      el.dialog.close();
    } else {
      el.dialog.removeAttribute("open");
    }
    state.editingId = null;
  }

  /* ---------- Guardar ---------- */
  function saveFromForm(event) {
    event.preventDefault();

    if (!validate()) {
      el.formError.hidden = false;
      el.formError.textContent = "Corrige os campos assinalados antes de guardar.";
      return;
    }

    var payload = {
      company: el.company.value.trim(),
      role: el.role.value.trim(),
      status: el.status.value,
      date: el.date.value || "",
      link: el.link.value.trim(),
      notes: el.notes.value.trim()
    };

    if (state.editingId) {
      state.items = state.items.map(function (item) {
        return item.id === state.editingId ? Object.assign({}, item, payload) : item;
      });
    } else {
      payload.id = uid();
      state.items.unshift(payload);
    }

    if (save()) {
      el.formError.hidden = true;
      closeDialog();
    }
    render();
  }

  function deleteCurrent() {
    if (!state.editingId) return;
    if (!confirm("Eliminar esta candidatura?")) return;

    state.items = state.items.filter(function (item) {
      return item.id !== state.editingId;
    });

    if (save()) closeDialog();
    render();
  }

  /* ---------- Importar / Exportar ---------- */
  function exportJson() {
    if (state.items.length === 0) {
      alert("Não há nada para exportar.");
      return;
    }

    var payload = {
      app: "gestor-candidaturas",
      version: 1,
      exportedAt: new Date().toISOString(),
      items: state.items
    };

    var blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "candidaturas-" + today() + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importJson(file) {
    var reader = new FileReader();

    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (e) {
        alert("O ficheiro não é um JSON válido.");
        return;
      }

      var incoming = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(incoming)) {
        alert("O ficheiro não tem a estrutura esperada.");
        return;
      }

      var clean = incoming.filter(isValid).map(function (item) {
        return {
          id: item.id || uid(),
          company: String(item.company),
          role: String(item.role),
          status: item.status || "interesse",
          date: item.date || "",
          link: item.link || "",
          notes: item.notes || ""
        };
      });

      if (clean.length === 0) {
        alert("Nenhuma candidatura válida encontrada no ficheiro.");
        return;
      }

      var replace = confirm(
        "Importadas " + clean.length + " candidaturas.\n\n" +
          "OK = substituir tudo o que está guardado agora\n" +
          "Cancelar = juntar às existentes"
      );

      if (replace) {
        state.items = clean;
      } else {
        var known = {};
        state.items.forEach(function (item) {
          known[item.id] = true;
        });
        clean.forEach(function (item) {
          if (!known[item.id]) state.items.push(item);
        });
      }

      if (save()) render();
    };

    reader.onerror = function () {
      alert("Não foi possível ler o ficheiro.");
    };

    reader.readAsText(file);
  }

  /* ---------- Arranque ---------- */
  function populateStatusOptions() {
    var markup = STATUSES.map(function (s) {
      return '<option value="' + s.value + '">' + s.label + "</option>";
    }).join("");
    el.status.innerHTML = markup;

    el.filterStatus.innerHTML =
      '<option value="">Todos</option>' +
      STATUSES.map(function (s) {
        return '<option value="' + s.value + '">' + s.label + "</option>";
      }).join("");
  }

  function init() {
    populateStatusOptions();
    state.items = load();

    el.btnNew.addEventListener("click", function () {
      openDialog(null);
    });
    el.btnCancel.addEventListener("click", closeDialog);
    el.btnDelete.addEventListener("click", deleteCurrent);
    el.form.addEventListener("submit", saveFromForm);
    el.btnExport.addEventListener("click", exportJson);

    el.fileImport.addEventListener("change", function () {
      if (el.fileImport.files && el.fileImport.files[0]) {
        importJson(el.fileImport.files[0]);
        el.fileImport.value = "";
      }
    });

    el.search.addEventListener("input", render);
    el.filterStatus.addEventListener("change", render);

    // Editar ao clicar no item
    el.list.addEventListener("click", function (event) {
      if (event.target.closest("a")) return; // deixa o link funcionar
      var li = event.target.closest(".item");
      if (!li) return;
      var id = li.getAttribute("data-id");
      var item = state.items.filter(function (i) { return i.id === id; })[0];
      if (item) openDialog(item);
    });

    el.list.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      var li = event.target.closest(".item");
      if (!li || li !== event.target) return;
      event.preventDefault();
      li.click();
    });

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
/* Smoke test da lógica do app.js — DOM mínimo, zero dependências.
   Correr: node test/smoketest.js */
"use strict";
const fs = require("fs");
const vm = require("vm");
const path = require("path");

let failures = 0;
function check(label, cond) {
  console.log((cond ? "  PASS  " : "  FALHA ") + label);
  if (!cond) failures++;
}

/* ---- DOM mínimo ---- */
function makeEl(tag) {
  const el = {
    tagName: (tag || "div").toUpperCase(),
    _attrs: {},
    style: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    children: [],
    value: "",
    textContent: "",
    innerHTML: "",
    hidden: false,
    files: null,
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k] !== undefined ? this._attrs[k] : null; },
    removeAttribute(k) { delete this._attrs[k]; },
    addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
    dispatch(ev, arg) { (this._listeners[ev] || []).forEach((f) => f.call(this, arg || { preventDefault() {}, target: this })); },
    focus() {},
    closest() { return null; },
    _listeners: {},
  };
  return el;
}

const store = {};
const byId = {};
["list","empty","filter-search","filter-status","stat-total","stat-sent","stat-replies",
 "stat-offers","dialog","form","dialog-title","f-company","f-role","f-status",
 "f-date","f-link","f-notes","form-error","btn-new","btn-cancel","btn-delete",
 "btn-export","file-import"].forEach((id) => { byId[id] = makeEl(); });

global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
URL: URLStub,
global.alert = (m) => { global.__lastAlert = m; };
global.confirm = () => global.__confirm !== false;
global.Blob = function () {};
const RealURL = require("url").URL;
function URLStub(u, b) { return new RealURL(u, b); }
URLStub.createObjectURL = () => "blob:x";
URLStub.revokeObjectURL = () => {};
global.FileReader = function () {};

const document = {
  readyState: "complete",
  getElementById: (id) => byId[id] || null,
  querySelector: (sel) => {
    const m = sel.match(/data-for="([^"]+)"/);
    return m ? makeEl("span") : null;
  },
  addEventListener() {},
  createElement: () => makeEl("a"),
  body: makeEl("body"),
};

const sandbox = {
  document, localStorage: global.localStorage, window: { matchMedia: () => ({ matches: false }) },
  alert: global.alert, confirm: global.confirm, Blob: global.Blob, URL: global.URL,
  FileReader: global.FileReader, console, URL: URLStub, Date, JSON, Math, String, Number,
  Object, Array, RegExp, Error, isNaN,
};
sandbox.globalThis = sandbox;

const file = path.join(__dirname, "..", "app.js");
vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });

/* ---- Testes ---- */
console.log("\n1. Persistência e escrita");
check("carrega 6 opções de estado no select",
  /option/.test(byId["f-status"].innerHTML) && byId["f-status"].innerHTML.includes("oferta"));
check("filtro de estado preenchido",
  byId["filter-status"].innerHTML.includes("Todos") && byId["filter-status"].innerHTML.includes("recusada"));

console.log("\n2. Validação bloqueia campos vazios");
byId["form"].dispatch("submit");
check("empresa vazia dá erro", byId["form-error"].hidden === false);
check("guardou nada no storage", !store["gestor-candidaturas:v1"]);

console.log("\n3. URL inválida é rejeitada");
byId["f-company"].value = "SDO";
byId["f-role"].value = "Desenvolvedor Web";
byId["f-link"].value = "javascript:alert(1)";
byId["form"].dispatch("submit");
check("rejeita javascript: URL", byId["form-error"].hidden === false);
check("ainda não guardou", !store["gestor-candidaturas:v1"]);

console.log("\n4. Gravação válida");
byId["f-link"].value = "https://saplic.com/vaga/x";
byId["f-date"].value = "2026-10-07";
byId["f-status"].value = "enviada";
byId["form"].dispatch("submit");
const saved = JSON.parse(store["gestor-candidaturas:v1"] || "[]");
check("gravou 1 candidatura", saved.length === 1);
check("guardou empresa e cargo", saved[0] && saved[0].company === "SDO" && saved[0].role === "Desenvolvedor Web");
check("gerou id único", !!(saved[0] && /^c_/.test(saved[0].id)));
check("escondeu o erro", byId["form-error"].hidden === true);

console.log("\n5. Escape de HTML (XSS na nota)");
byId["f-notes"].value = '<img src=x onerror="alert(1)">';
byId["form"].dispatch("submit");
const raw = byId["list"].innerHTML;
check("nota maliciosa escapada no render", !raw.includes("<img src=x"));
check("nota presente como texto", raw.includes("&lt;img"));

console.log("\n6. Estatísticas");
const items = JSON.parse(store["gestor-candidaturas:v1"]);
check("total = 2", byId["stat-total"].textContent === String(items.length));

console.log("\n7. Filtro de pesquisa");
byId["filter-search"].value = "zzzznadaencontrar";
byId["filter-search"].dispatch("input");
check("lista vazia com filtro sem resultados", byId["list"].innerHTML === "");
check("mensagem de filtro mostrado", byId["empty"].hidden === false);
byId["filter-search"].value = "SDO";
byId["filter-search"].dispatch("input");
check("filtro encontra o SDO", byId["list"].innerHTML.includes("SDO"));

console.log("\n" + (failures === 0
  ? "RESULTADO: todos os testes passaram"
  : "RESULTADO: " + failures + " teste(s) falharam"));
process.exit(failures === 0 ? 0 : 1);
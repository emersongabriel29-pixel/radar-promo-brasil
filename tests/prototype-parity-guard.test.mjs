import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const radarUi = await readFile(new URL("../public/radar.js", import.meta.url), "utf8");

test("Radar keeps its seven official top-level navigation areas", () => {
  for (const label of [
    '"dashboard", "Central"',
    '"radar", "Radar"',
    '"offers", "Ofertas"',
    '"publishing", "Publicações"',
    '"channels", "Canais"',
    '"reports", "Relatórios"',
    '"settings", "Configurações"',
  ]) {
    assert.ok(radarUi.includes(label), `missing official navigation entry: ${label}`);
  }
});

test("Radar retains product modules represented by prototype workflows", () => {
  for (const label of [
    "Monitoramento 24h",
    "Modo clone",
    "Criação rápida",
    "Ofertas e cupons",
    "Estúdio de IA",
    "Filas e agendamento",
    "Grupos e canais",
    "Integrações",
  ]) {
    assert.ok(radarUi.includes(label), `missing expected Radar module: ${label}`);
  }
});

test("prototype-only demo fixtures and browser-storage key are not copied into production UI source", () => {
  for (const demoOnly of [
    "investigationTemplate",
    "Fone Bluetooth com estojo",
    "RASCUNHO LOCAL — não publicado.",
    "Área de demonstração",
  ]) {
    assert.ok(!radarUi.includes(demoOnly), `prototype-only demo content leaked into Radar UI: ${demoOnly}`);
  }
});

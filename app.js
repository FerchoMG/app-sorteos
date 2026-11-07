import { addName, pickWinner, randomIndex, STORAGE_KEY, targetRotation, validForcedName } from "./roulette.js";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#wheel");
const ctx = canvas.getContext("2d");
const rotor = $("#wheel-rotor");
const spinButton = $("#spin-button");
const result = $("#result");
const list = $("#name-list");
const count = $("#participant-count");
const message = $("#form-message");
const input = $("#name-input");
const dialog = $("#settings-dialog");
const forcedSelect = $("#forced-name");
const modeSelect = $("#forced-mode");
const settingsMessage = $("#settings-message");

const colors = ["#c4f36a", "#f7a5a2", "#e8d9f7", "#fbdc78", "#a6dfda", "#f5b685", "#c4d5ff", "#e5edac"];
const fallback = { names: [], forcedName: "", forcedMode: "next" };
let state = loadState();
let rotation = 0;
let spinning = false;
let titleTaps = [];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const names = Array.isArray(saved.names) ? saved.names.filter((name) => typeof name === "string").slice(0, 20) : [];
    return { names, forcedName: validForcedName(names, saved.forcedName), forcedMode: saved.forcedMode === "always" ? "always" : "next" };
  } catch { return { ...fallback }; }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Still works if storage is disabled. */ }
}

function fitLabel(name, radius, sliceAngle) {
  const maxWidth = Math.max(48, radius * 0.49);
  let size = Math.min(35, Math.max(17, 700 / Math.max(state.names.length, 2)));
  ctx.font = `700 ${size}px Arial, sans-serif`;
  while (ctx.measureText(name).width > maxWidth && size > 14) {
    size -= 1;
    ctx.font = `700 ${size}px Arial, sans-serif`;
  }
  const available = Math.max(15, radius * 0.68 * sliceAngle);
  while (size > available && size > 14) {
    size -= 1;
    ctx.font = `700 ${size}px Arial, sans-serif`;
  }
  return size;
}

function drawWheel() {
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 12;
  ctx.clearRect(0, 0, size, size);
  const names = state.names.length ? state.names : ["Agrega nombres", "y gira"];
  const slice = (Math.PI * 2) / names.length;

  names.forEach((name, index) => {
    const start = -Math.PI / 2 + index * slice;
    const end = start + slice;
    const centerAngle = start + slice / 2;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    ctx.strokeStyle = "#42314d";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(centerAngle);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#34243f";
    fitLabel(name, radius, slice);
    ctx.translate(radius * 0.62, 0);
    if (centerAngle > Math.PI / 2 && centerAngle < Math.PI * 1.5) ctx.rotate(Math.PI);
    const fitted = name.length > 19 ? `${name.slice(0, 18)}…` : name;
    ctx.fillText(fitted, 0, 0, radius * 0.52);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "#42314d";
  ctx.lineWidth = 11;
  ctx.stroke();
}

function renderNames() {
  list.replaceChildren();
  state.names.forEach((name, index) => {
    const item = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "name-dot";
    dot.style.background = colors[index % colors.length];
    const label = document.createElement("span");
    label.className = "name-label";
    label.textContent = name;
    const remove = document.createElement("button");
    remove.className = "remove-button";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Quitar a ${name}`);
    remove.disabled = spinning;
    remove.addEventListener("click", () => {
      state.names.splice(index, 1);
      state.forcedName = validForcedName(state.names, state.forcedName);
      saveState();
      result.textContent = "La suerte está esperando tu giro.";
      render();
    });
    item.append(dot, label, remove);
    list.append(item);
  });
  count.textContent = `${state.names.length} ${state.names.length === 1 ? "PERSONA" : "PERSONAS"}`;
  spinButton.disabled = spinning || state.names.length < 2;
  input.disabled = spinning;
  $(".add-button").disabled = spinning;
}

function render() {
  drawWheel();
  renderNames();
}

$("#name-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (spinning) return;
  const next = addName(state.names, input.value);
  message.textContent = next.error;
  if (next.error) return;
  state.names = next.names;
  input.value = "";
  saveState();
  render();
  input.focus();
});

spinButton.addEventListener("click", () => {
  if (spinning || state.names.length < 2) return;
  spinning = true;
  renderNames();
  result.classList.remove("result-winner");
  result.textContent = "Girando…";

  const winner = pickWinner(state.names, state.forcedName, randomIndex);
  const index = state.names.indexOf(winner);
  rotation = targetRotation(rotation, index, state.names.length);
  rotor.style.transform = `rotate(${rotation}deg)`;

  rotor.addEventListener("transitionend", (event) => {
    if (event.propertyName !== "transform") return;
    spinning = false;
    result.innerHTML = "";
    const prefix = document.createElement("span");
    prefix.textContent = "¡LA PERSONA ELEGIDA ES!";
    const winnerText = document.createElement("strong");
    winnerText.textContent = winner;
    result.append(prefix, winnerText);
    result.classList.add("result-winner");
    if (state.forcedName && state.forcedMode === "next") {
      state.forcedName = "";
      saveState();
    }
    renderNames();
  }, { once: true });
});

function openSettings() {
  if (spinning) return;
  forcedSelect.replaceChildren(new Option("Sin resultado configurado", ""));
  state.names.forEach((name) => forcedSelect.add(new Option(name, name)));
  forcedSelect.value = state.forcedName;
  modeSelect.value = state.forcedMode;
  settingsMessage.textContent = "";
  dialog.showModal();
}

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (dialog.open) dialog.close(); else openSettings();
  }
});

$("#brand").addEventListener("click", () => {
  const now = Date.now();
  titleTaps = [...titleTaps.filter((time) => now - time < 3000), now];
  if (titleTaps.length >= 5) { titleTaps = []; openSettings(); }
});

$("#close-settings").addEventListener("click", () => dialog.close());
$("#clear-settings").addEventListener("click", () => {
  state.forcedName = "";
  state.forcedMode = "next";
  saveState();
  forcedSelect.value = "";
  modeSelect.value = "next";
  settingsMessage.textContent = "Elección eliminada.";
});
$("#settings-form").addEventListener("submit", (event) => {
  event.preventDefault();
  state.forcedName = validForcedName(state.names, forcedSelect.value);
  state.forcedMode = modeSelect.value === "always" ? "always" : "next";
  saveState();
  dialog.close();
});

render();

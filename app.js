const STORAGE_KEYS = {
  guests: "wedding_guests_v1",
  event: "wedding_event_v1"
};

const sampleGuests = [
  { GuestID: "WED-G001", GuestName: "Juan Dela Cruz", TableNumber: "01", TableName: "Table 01", GuestType: "Regular", Notes: "" },
  { GuestID: "WED-G002", GuestName: "Maria Santos", TableNumber: "01", TableName: "Table 01", GuestType: "Regular", Notes: "" },
  { GuestID: "WED-G003", GuestName: "Hon. Roberto Reyes", TableNumber: "P1", TableName: "Presidential Table 1", GuestType: "Presidential", Notes: "Escort personally" },
  { GuestID: "WED-G004", GuestName: "Dr. Elena Cruz", TableNumber: "P2", TableName: "Presidential Table 2", GuestType: "Presidential", Notes: "Escort personally" },
  { GuestID: "WED-G005", GuestName: "Carlo Lim", TableNumber: "02", TableName: "Table 02", GuestType: "Regular", Notes: "" },
  { GuestID: "WED-G006", GuestName: "Angela Tan", TableNumber: "02", TableName: "Table 02", GuestType: "Regular", Notes: "" }
];

let guests = [];
let stream = null;
let detector = null;
let scanning = false;
let lastScan = "";

const els = {
  totalGuests: document.getElementById("totalGuests"),
  checkedInGuests: document.getElementById("checkedInGuests"),
  notArrivedGuests: document.getElementById("notArrivedGuests"),
  vipGuests: document.getElementById("vipGuests"),
  scannerPanel: document.getElementById("scannerPanel"),
  searchPanel: document.getElementById("searchPanel"),
  tablesPanel: document.getElementById("tablesPanel"),
  openScannerBtn: document.getElementById("openScannerBtn"),
  openSearchBtn: document.getElementById("openSearchBtn"),
  openTablesBtn: document.getElementById("openTablesBtn"),
  startScannerBtn: document.getElementById("startScannerBtn"),
  stopScannerBtn: document.getElementById("stopScannerBtn"),
  preview: document.getElementById("preview"),
  scannerStatus: document.getElementById("scannerStatus"),
  manualCode: document.getElementById("manualCode"),
  manualLookupBtn: document.getElementById("manualLookupBtn"),
  scanResult: document.getElementById("scanResult"),
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  tableCards: document.getElementById("tableCards"),
  tableGuestList: document.getElementById("tableGuestList"),
  csvFile: document.getElementById("csvFile"),
  loadSampleBtn: document.getElementById("loadSampleBtn"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  resetCheckinsBtn: document.getElementById("resetCheckinsBtn"),
  eventTitle: document.getElementById("eventTitle"),
  eventMeta: document.getElementById("eventMeta"),
  eventTitleInput: document.getElementById("eventTitleInput"),
  eventMetaInput: document.getElementById("eventMetaInput"),
  saveEventBtn: document.getElementById("saveEventBtn"),
  offlineStatus: document.getElementById("offlineStatus")
};

function normalize(value) {
  return String(value || "").trim();
}

function saveGuests() {
  localStorage.setItem(STORAGE_KEYS.guests, JSON.stringify(guests));
  renderAll();
}

function loadGuests() {
  const saved = localStorage.getItem(STORAGE_KEYS.guests);
  if (saved) {
    guests = JSON.parse(saved);
  } else {
    guests = sampleGuests.map(g => ({ ...g, CheckedIn: "No", CheckedInAt: "" }));
    saveGuests();
  }
}

function loadEvent() {
  const saved = localStorage.getItem(STORAGE_KEYS.event);
  const event = saved ? JSON.parse(saved) : {
    title: "The Wedding Anniversary of Celebrant One & Celebrant Two",
    meta: "Monday • Venue Name"
  };
  els.eventTitle.textContent = event.title;
  els.eventMeta.textContent = event.meta;
  els.eventTitleInput.value = event.title;
  els.eventMetaInput.value = event.meta;
}

function saveEvent() {
  const event = {
    title: els.eventTitleInput.value || "Wedding Anniversary Guest Check-in",
    meta: els.eventMetaInput.value || "Monday • Venue Name"
  };
  localStorage.setItem(STORAGE_KEYS.event, JSON.stringify(event));
  loadEvent();
}

function showPanel(panel) {
  [els.scannerPanel, els.searchPanel, els.tablesPanel].forEach(p => p.classList.remove("active"));
  panel.classList.add("active");
}

function isCheckedIn(guest) {
  return normalize(guest.CheckedIn).toLowerCase() === "yes";
}

function isVip(guest) {
  const type = normalize(guest.GuestType).toLowerCase();
  const table = normalize(guest.TableName).toLowerCase();
  return type.includes("presidential") || type.includes("vip") || table.includes("presidential");
}

function renderStats() {
  const total = guests.length;
  const checked = guests.filter(isCheckedIn).length;
  const vip = guests.filter(isVip).length;
  els.totalGuests.textContent = total;
  els.checkedInGuests.textContent = checked;
  els.notArrivedGuests.textContent = total - checked;
  els.vipGuests.textContent = vip;
}

function findGuestByCode(code) {
  const key = normalize(code).toLowerCase();
  return guests.find(g => normalize(g.GuestID).toLowerCase() === key);
}

function resultHTML(guest) {
  const checked = isCheckedIn(guest);
  const vip = isVip(guest);
  return `
    <div class="resultCard ${vip ? "vipResult" : ""}">
      <div class="resultTitle">
        <h3>${vip ? "Presidential / VIP Guest" : "Guest Found"}</h3>
        <span class="badge ${checked ? "checked" : "not"}">${checked ? "Already Checked In" : "Not Checked In"}</span>
      </div>

      <div class="detailGrid">
        <div class="detail"><span>Guest Name</span><strong>${escapeHTML(guest.GuestName)}</strong></div>
        <div class="detail"><span>Assigned Table</span><strong>${escapeHTML(guest.TableName || guest.TableNumber)}</strong></div>
        <div class="detail"><span>Guest ID</span><strong>${escapeHTML(guest.GuestID)}</strong></div>
        <div class="detail"><span>Guest Type</span><strong>${escapeHTML(guest.GuestType || "Regular")}</strong></div>
        <div class="detail"><span>Status</span><strong>${checked ? "Checked in at " + escapeHTML(guest.CheckedInAt || "") : "Not yet arrived"}</strong></div>
        <div class="detail"><span>Notes</span><strong>${escapeHTML(guest.Notes || "-")}</strong></div>
      </div>

      ${vip ? `<p><strong>Instruction:</strong> Please assist or escort this guest personally.</p>` : ""}
      <div class="buttonRow">
        <button onclick="markCheckedIn('${encodeURIComponent(guest.GuestID)}')">${checked ? "Update Check-in Time" : "Mark as Checked In"}</button>
        <button class="ghost" onclick="undoCheckIn('${encodeURIComponent(guest.GuestID)}')">Undo Check-in</button>
      </div>
    </div>
  `;
}

function renderGuestResult(code) {
  const guest = findGuestByCode(code);
  if (!guest) {
    els.scanResult.innerHTML = `
      <div class="resultCard">
        <h3>Guest Not Found</h3>
        <p>No record matched: <strong>${escapeHTML(code)}</strong></p>
        <p>Try manual search by name or check the printed backup list.</p>
      </div>
    `;
    return;
  }
  els.scanResult.innerHTML = resultHTML(guest);
}

window.markCheckedIn = function(encodedId) {
  const id = decodeURIComponent(encodedId);
  const guest = findGuestByCode(id);
  if (!guest) return;
  guest.CheckedIn = "Yes";
  guest.CheckedInAt = new Date().toLocaleString();
  saveGuests();
  renderGuestResult(id);
};

window.undoCheckIn = function(encodedId) {
  const id = decodeURIComponent(encodedId);
  const guest = findGuestByCode(id);
  if (!guest) return;
  guest.CheckedIn = "No";
  guest.CheckedInAt = "";
  saveGuests();
  renderGuestResult(id);
};

function renderSearch() {
  const q = normalize(els.searchInput.value).toLowerCase();
  const filtered = guests.filter(g => {
    const haystack = `${g.GuestID} ${g.GuestName} ${g.TableNumber} ${g.TableName} ${g.GuestType} ${g.Notes}`.toLowerCase();
    return !q || haystack.includes(q);
  }).slice(0, 120);

  els.searchResults.innerHTML = filtered.map(g => `
    <div class="guestCard">
      <div>
        <strong>${escapeHTML(g.GuestName)}</strong><br>
        <span>${escapeHTML(g.GuestID)} • ${escapeHTML(g.TableName || g.TableNumber)} • ${escapeHTML(g.GuestType || "Regular")}</span>
      </div>
      <div>
        <span class="badge ${isCheckedIn(g) ? "checked" : "not"}">${isCheckedIn(g) ? "Checked In" : "Not Arrived"}</span>
        ${isVip(g) ? `<span class="badge vip">VIP</span>` : ""}
        <button onclick="showGuestFromSearch('${encodeURIComponent(g.GuestID)}')">Open</button>
      </div>
    </div>
  `).join("");
}

window.showGuestFromSearch = function(encodedId) {
  const id = decodeURIComponent(encodedId);
  showPanel(els.scannerPanel);
  renderGuestResult(id);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

function renderTables() {
  const grouped = {};
  guests.forEach(g => {
    const key = normalize(g.TableName || g.TableNumber || "No Table");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  });

  const tableNames = Object.keys(grouped).sort((a, b) => {
    const av = a.toLowerCase().includes("presidential") ? -1 : a.localeCompare(b, undefined, { numeric: true });
    return av;
  });

  els.tableCards.innerHTML = tableNames.map(name => {
    const list = grouped[name];
    const checked = list.filter(isCheckedIn).length;
    const vip = name.toLowerCase().includes("presidential") || list.some(isVip);
    return `
      <div class="tableCard ${vip ? "vipTable" : ""}" onclick="openTable('${encodeURIComponent(name)}')">
        <h3>${escapeHTML(name)}</h3>
        <p>${list.length} assigned guests</p>
        <strong>${checked} checked in</strong><br>
        <span>${list.length - checked} not arrived</span>
      </div>
    `;
  }).join("");
}

window.openTable = function(encodedName) {
  const name = decodeURIComponent(encodedName);
  const list = guests.filter(g => normalize(g.TableName || g.TableNumber || "No Table") === name);
  els.tableGuestList.innerHTML = `
    <div class="resultCard">
      <h3>${escapeHTML(name)}</h3>
      <ul>
        ${list.map(g => `<li>${isCheckedIn(g) ? "✓" : "○"} <strong>${escapeHTML(g.GuestName)}</strong> — ${escapeHTML(g.GuestID)} ${isVip(g) ? '<span class="badge vip">VIP</span>' : ""}</li>`).join("")}
      </ul>
    </div>
  `;
};

function renderAll() {
  renderStats();
  renderSearch();
  renderTables();
}

function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[s]));
}

function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      current.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (field || current.length) {
        current.push(field);
        rows.push(current);
      }
      field = "";
      current = [];
      if (char === "\r" && next === "\n") i++;
    } else {
      field += char;
    }
  }
  if (field || current.length) {
    current.push(field);
    rows.push(current);
  }

  const headers = rows.shift().map(h => normalize(h));
  return rows.filter(r => r.some(cell => normalize(cell))).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = normalize(row[i]));
    return {
      GuestID: obj.GuestID || obj["Guest ID"] || obj.guest_id || obj.ID || obj.Id || obj.id,
      GuestName: obj.GuestName || obj["Guest Name"] || obj.Name || obj.name,
      TableNumber: obj.TableNumber || obj["Table Number"] || obj.Table || obj.table,
      TableName: obj.TableName || obj["Table Name"] || obj.Table || obj.table,
      GuestType: obj.GuestType || obj["Guest Type"] || "Regular",
      Notes: obj.Notes || obj.notes || "",
      CheckedIn: obj.CheckedIn || obj["Checked In"] || "No",
      CheckedInAt: obj.CheckedInAt || obj["Checked In At"] || ""
    };
  }).filter(g => g.GuestID && g.GuestName);
}

async function startScanner() {
  if (!("BarcodeDetector" in window)) {
    els.scannerStatus.textContent = "This browser does not support native offline QR scanning. Use Android Chrome/Edge or use Manual Search.";
    return;
  }

  try {
    detector = new BarcodeDetector({ formats: ["qr_code"] });
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    els.preview.srcObject = stream;
    els.preview.style.display = "block";
    await els.preview.play();
    scanning = true;
    els.scannerStatus.textContent = "Scanner running. Point camera at guest QR code.";
    scanLoop();
  } catch (err) {
    els.scannerStatus.textContent = "Camera could not start. Check HTTPS, camera permission, or use manual search.";
    console.error(err);
  }
}

async function scanLoop() {
  if (!scanning || !detector || !els.preview.videoWidth) {
    if (scanning) requestAnimationFrame(scanLoop);
    return;
  }

  try {
    const codes = await detector.detect(els.preview);
    if (codes.length) {
      const code = codes[0].rawValue;
      if (code && code !== lastScan) {
        lastScan = code;
        renderGuestResult(code);
        els.scannerStatus.textContent = `Scanned: ${code}`;
        setTimeout(() => { lastScan = ""; }, 2200);
      }
    }
  } catch (err) {
    console.error(err);
  }

  if (scanning) requestAnimationFrame(scanLoop);
}

function stopScanner() {
  scanning = false;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  els.preview.style.display = "none";
  els.scannerStatus.textContent = "Scanner stopped.";
}

function exportCSV() {
  const headers = ["GuestID", "GuestName", "TableNumber", "TableName", "GuestType", "Notes", "CheckedIn", "CheckedInAt"];
  const rows = guests.map(g => headers.map(h => csvCell(g[h] || "")));
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wedding-checkin-export-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const str = String(value || "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function resetCheckins() {
  if (!confirm("Reset all check-ins? Do this only before final event testing or before actual event start.")) return;
  guests = guests.map(g => ({ ...g, CheckedIn: "No", CheckedInAt: "" }));
  saveGuests();
}

function updateOfflineStatus() {
  const secure = window.isSecureContext ? "Secure camera context" : "Not secure: camera may not work";
  const online = navigator.onLine ? "Online" : "Offline";
  const detectorStatus = ("BarcodeDetector" in window) ? "Scanner supported" : "Native scanner not supported";
  els.offlineStatus.textContent = `${online} • ${secure} • ${detectorStatus}`;
}

function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  }
}

els.openScannerBtn.addEventListener("click", () => showPanel(els.scannerPanel));
els.openSearchBtn.addEventListener("click", () => showPanel(els.searchPanel));
els.openTablesBtn.addEventListener("click", () => showPanel(els.tablesPanel));
els.startScannerBtn.addEventListener("click", startScanner);
els.stopScannerBtn.addEventListener("click", stopScanner);
els.manualLookupBtn.addEventListener("click", () => renderGuestResult(els.manualCode.value));
els.manualCode.addEventListener("keydown", e => { if (e.key === "Enter") renderGuestResult(els.manualCode.value); });
els.searchInput.addEventListener("input", renderSearch);
els.loadSampleBtn.addEventListener("click", () => {
  guests = sampleGuests.map(g => ({ ...g, CheckedIn: "No", CheckedInAt: "" }));
  saveGuests();
});
els.csvFile.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const parsed = parseCSV(text);
  if (!parsed.length) {
    alert("No valid guests found. Check your CSV headers.");
    return;
  }
  guests = parsed.map(g => ({ CheckedIn: "No", CheckedInAt: "", ...g }));
  saveGuests();
  alert(`${guests.length} guests imported successfully.`);
});
els.exportCsvBtn.addEventListener("click", exportCSV);
els.resetCheckinsBtn.addEventListener("click", resetCheckins);
els.saveEventBtn.addEventListener("click", saveEvent);
window.addEventListener("online", updateOfflineStatus);
window.addEventListener("offline", updateOfflineStatus);

loadGuests();
loadEvent();
renderAll();
updateOfflineStatus();
registerSW();

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "@/api";

const endpointCache = { url: "" };

const maxActiveAuctions = ref<number | null>(null);
const maxWonAuctions = ref<number | null>(null);
const nextAuctionIso = ref<string | null>(null);

const nextAuctionLocal = ref<string>(""); // YYYY-MM-DDTHH:mm
function formatDisplay(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${year} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const saving = ref(false);
const message = ref<{ type: "ok" | "err"; text: string } | null>(null);

/* ===== helpers: datetime-local <-> ISO ===== */
function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInputValue(local: string) {
  // local time -> ISO UTC (spójny zapis na backendzie)
  return new Date(local).toISOString();
}

/* ===== wykrywanie endpointu ustawień ===== */
async function resolveSettingsEndpoint(): Promise<string> {
  if (endpointCache.url) return endpointCache.url;

  const candidates = [
    "/settings",
    "/admin/settings",
    "/config",
    "/admin/config",
    "/app/settings",
  ];

  for (const url of candidates) {
    try {
      const res = await api.get(url);
      if (res.status >= 200 && res.status < 300) {
        endpointCache.url = url;
        return url;
      }
    } catch (e:any) {
      if (e?.response?.status === 404) continue; // próbujemy dalej
      // inne błędy (CORS/500) – i tak spróbujemy następnego
    }
  }
  throw new Error("Nie znaleziono endpointu ustawień (404 na wszystkich kandydatach).");
}

/* ===== mapowanie odpowiedzi -> pól na froncie ===== */
function normalizeSettings(data: any) {
  return {
    maxActiveAuctions: Number(data.maxActiveAuctions ?? data.max_active_auctions ?? data.maxActive ?? 0),
    maxWonAuctions: Number(data.maxWonAuctions ?? data.max_won_auctions ?? data.maxWon ?? 0),
    nextAuctionIso:
      data.nextAuctionIso ??
      data.nextAuctionAt ??
      data.nextAuctionDate ??
      data.nextAuction ??
      null,
  } as { maxActiveAuctions: number; maxWonAuctions: number; nextAuctionIso: string | null };
}

/* ===== LOAD ===== */
async function load() {
  message.value = null;
  try {
    const url = await resolveSettingsEndpoint();
    const { data } = await api.get(url);
    const norm = normalizeSettings(data);
    maxActiveAuctions.value = norm.maxActiveAuctions;
    maxWonAuctions.value = norm.maxWonAuctions;
    nextAuctionIso.value = norm.nextAuctionIso;
    nextAuctionLocal.value = nextAuctionIso.value ? toLocalInputValue(nextAuctionIso.value) : "";
  } catch (e:any) {
    console.error("Load settings failed", e);
    message.value = { type: "err", text: e?.message || "Nie udało się pobrać ustawień." };
  }
}

/* ===== SAVE z fallbackiem (PATCH -> PUT -> POST) ===== */
async function save() {
  saving.value = true;
  message.value = null;
  try {
    const url = await resolveSettingsEndpoint();

    // przygotuj payload z możliwymi nazwami – backend wybierze co zna
    const iso = nextAuctionLocal.value ? fromLocalInputValue(nextAuctionLocal.value) : null;
    const payload = {
      maxActiveAuctions: maxActiveAuctions.value,
      max_won_auctions: maxWonAuctions.value,           // alias snake_case
      maxWonAuctions: maxWonAuctions.value,             // alias camelCase
      nextAuctionIso: iso,
      nextAuctionAt: iso,                                // alias
      nextAuctionDate: iso,                              // alias
      nextAuction: iso,                                  // alias
    };

    const tryMethods = [
      () => api.patch(url, payload),
      () => api.put(url, payload),
      () => api.post(url, payload),
    ];

    let ok = false, lastErr:any = null;
    for (const fn of tryMethods) {
      try { const r = await fn(); ok = r.status >= 200 && r.status < 300; if (ok) break; }
      catch (e:any) { lastErr = e; if (e?.response?.status === 404 || e?.response?.status === 405) continue; else break; }
    }

    if (!ok) {
      const code = lastErr?.response?.status || "unknown";
      throw new Error(`Nie udało się zapisać ustawień (HTTP ${code}).`);
    }

    await load();
    message.value = { type: "ok", text: "Zapisano ustawienia." };
  } catch (e:any) {
    console.error("Save settings failed", e);
    message.value = { type: "err", text: e?.message || "Nie udało się zapisać ustawień." };
  } finally {
    saving.value = false;
  }
}

async function clearSchedule() {
  saving.value = true;
  message.value = null;
  try {
    const url = await resolveSettingsEndpoint();
    // wysyłamy różne klucze null – backend którykolwiek przyjmie
    const payload = { nextAuctionIso: null, nextAuctionAt: null, nextAuctionDate: null, nextAuction: null };
    // też z fallbackiem metody
    let ok = false;
    try { ok = (await api.patch(url, payload)).status < 300; } catch {}
    if (!ok) { try { ok = (await api.put(url, payload)).status < 300; } catch {} }
    if (!ok) { try { ok = (await api.post(url, payload)).status < 300; } catch {} }
    if (!ok) throw new Error("Nie udało się wyczyścić terminu.");

    await load();
    message.value = { type: "ok", text: "Termin wyczyszczony." };
  } catch (e:any) {
    console.error("Clear schedule failed", e);
    message.value = { type: "err", text: e?.message || "Nie udało się wyczyścić terminu." };
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="admin-dashboard">
    <h1>Panel administracyjny</h1>
    <div class="admin-layout">
      <section class="admin navbar">
        <aside class="admin-nav">
          <ul>
            <li><router-link to="/admin/create">Dodaj Aukcję</router-link></li>
            <li><router-link to="/admin">Aukcje</router-link></li>
            <li><router-link to="/admin/settings">Ustawienia</router-link></li>
          </ul>
        </aside>
      </section>

      <main class="admin-content">
        <h2>Ustawienia</h2>

        <div class="form">
          <label>
            Maks. aukcji na użytkownika:
            <input v-model.number="maxActiveAuctions" type="number" min="0" />
          </label>

          <label>
            Maks. wygranych aukcji:
            <input v-model.number="maxWonAuctions" type="number" min="0" />
          </label>

          <label>
            Data i godzina rozpoczęcia kolejnych aukcji:
            <input v-model="nextAuctionLocal" type="datetime-local" />
          </label>

          <div class="actions">
            <button class="btn primary" :disabled="saving" @click="save">
              {{ saving ? 'Zapisywanie…' : 'Zapisz' }}
            </button>
            <button class="btn" :disabled="saving" @click="clearSchedule">Wyczyść termin</button>
          </div>

          <p v-if="message" :class="['msg', message.type]">{{ message.text }}</p>
          <p class="hint">Aktualny termin: <strong>{{ nextAuctionIso ? formatDisplay(nextAuctionIso) : 'brak' }}</strong></p>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.admin-layout{ display:flex; gap:24px; }
.admin-nav ul{ list-style:none; padding:0; margin:0; }
.admin-nav a{ display:block; padding:8px 0; color:#0f3a5a; }
.form{ display:grid; gap:14px; max-width:460px; }
.form label{ display:grid; gap:6px; color:#334; font-weight:600; }
input{ padding:10px 12px; border:1px solid #c9d3dd; border-radius:8px; }
.actions{ display:flex; gap:10px; margin-top:6px; }
.btn{ padding:10px 16px; border-radius:8px; border:1px solid #c9d3dd; background:#0774e2; cursor:pointer; }
.btn:disabled{ opacity:.6; cursor:not-allowed; }
.btn.primary{ background:#0059b3; border-color:#0059b3; color:#fff; }
.msg{ margin:4px 0 0; font-weight:600; }
.msg.ok{ color:#0b7a0b; }
.msg.err{ color:#b00020; }
.hint{ margin-top:6px; color:#456; }
.admin-navbar { padding:40px 20px; text-align:left; }
.admin-nav { padding:40px 20px; text-align:left; }
</style>
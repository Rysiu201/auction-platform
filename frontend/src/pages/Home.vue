<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from "vue";
import { api } from "@/api";

const backend = import.meta.env.VITE_BACKEND_URL as string;

type Auction = {
  id: string;
  title: string;
  endsAt: string;
  basePrice: number;
  bids: { amount: number }[];
  images: { url: string; position: number }[];
  condition: string;
};

type Settings = {
  maxActiveAuctions: number;
  maxWonAuctions: number;
  nextAuctionIso: string | null; // ISO string albo null
};

const latest = ref<Auction[]>([]);
const settings = ref<Settings | null>(null);

let intervalId: number | null = null;

const targetMs = computed(() => {
  const iso = settings.value?.nextAuctionIso ?? null;
  return iso ? new Date(iso).getTime() : null;
});

const msLeft = ref(0);
const hasSchedule = computed(() => targetMs.value !== null);
const hasCountdown = computed(() => hasSchedule.value && msLeft.value > 0);
const auctionsActive = computed(() => hasSchedule.value && msLeft.value <= 0);

function updateMsLeft() {
  msLeft.value = targetMs.value ? Math.max(0, targetMs.value - Date.now()) : 0;
}

const formattedTime = computed(() => {
  const total = Math.floor(msLeft.value / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
});

function startCountdownToTarget() {
  stopCountdown();
  updateMsLeft();
  intervalId = window.setInterval(() => {
    updateMsLeft();
    if (msLeft.value <= 0) stopCountdown();
  }, 1000);
}

function stopCountdown() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/* ---- DATA ---- */
onMounted(async () => {
  try {
    const { data } = await api.get("/auctions", { params: { limit: 3, sort: "latest" } });
    latest.value = data;
  } catch { /* ignore */ }

  try {
    const { data } = await api.get("/settings");
    settings.value = data;
  } catch { settings.value = { maxActiveAuctions: 0, maxWonAuctions: 0, nextAuctionIso: null }; }

});

watch(targetMs, updateMsLeft, { immediate: true });

watch(hasCountdown, (val) => {
  if (val) {
    startCountdownToTarget();
  } else {
    stopCountdown();
  }
});

onBeforeUnmount(() => stopCountdown());

/* ---- helpers ---- */
function fmtPrice(g: number) { return (g / 100).toFixed(2); }
function currentPrice(a: Auction) {
  const top = a.bids.length ? Math.max(...a.bids.map(b => b.amount)) : 0;
  return fmtPrice(Math.max(a.basePrice, top));
}

function fmtDate(s: string) { return new Date(s).toLocaleString(); }

const conditionLabel: Record<string, string> = {
  NOWY: 'Nowy',
  BARDZO_DOBRY: 'Bardzo dobry',
  DOBRY: 'Dobry',
  USZKODZONY: 'Uszkodzony',
  DO_NAPRAWY: 'Do naprawy',
};

const conditionColor: Record<string, string> = {
  DO_NAPRAWY: '#FFA500',
  USZKODZONY: '#FF0000',
  DOBRY: '#FFFF00',
  BARDZO_DOBRY: '#00FFFF',
  NOWY: '#008000',
};
</script>

<template>
  <section class="home-hero">
    <h1 class="welcome">
      <strong>Witamy na Aukcji Sprzętu</strong>
      <span class="brand inline-brand">
        <span class="logo-alt">alt</span>
        <span class="logo-box"><span class="logo-k">kom</span></span>
        <span class="logo-om">software</span>
      </span>
    </h1>

    <p class="hero-subtitle">
      Dołącz do naszych licytacji firmowego sprzętu komputerowego – głównie laptopów używanych w różnym stanie technicznym. Każdy przedmiot ma indywidualny opis…
    </p>

    <div v-if="auctionsActive && latest.length" class="latest-auctions auction-grid">
      <router-link
        v-for="a in latest"
        :key="a.id"
        :to="`/auction/${a.id}`"
        class="auction-link"
      >
        <article class="auction-card">
          <div class="image-wrapper">
            <img
              v-if="a.images?.[0]"
              :src="`${backend}${a.images[0].url}`"
              alt=""
              class="auction-image"
            />
            <span class="condition-badge" :style="{ background: conditionColor[a.condition] }">
              {{ conditionLabel[a.condition] || a.condition }}
            </span>
          </div>
          <div class="auction-info">
            <h3 class="auction-title">{{ a.title }}</h3>
            <div class="auction-price">{{ currentPrice(a) }} PLN</div>
            <div class="auction-offers">{{ a.bids.length }} ofert</div>
          </div>
          <div class="auction-end">⏰ {{ fmtDate(a.endsAt) }}</div>
        </article>
      </router-link>
    </div>

    <div class="next-auctions"><strong>Następna Pula Aukcji:</strong></div>

    <p v-if="!hasSchedule" class="no-schedule">
      Termin nie został jeszcze wyznaczony.
    </p>
    <p v-else-if="auctionsActive" class="auction-running">
      Aktualnie trwa aukcja.
    </p>
    <div v-else class="countdown" role="timer" aria-live="polite">
      {{ formattedTime }}
    </div>

    <router-link v-if="auctionsActive && latest.length" to="/auctions" class="cta-button">Zobacz Aktualne Aukcje</router-link>
  </section>
</template>

<style scoped>
/* --- Hero layout --- */
.condition-badge{
  color:black
}
.home-hero{ display:flex; flex-direction:column; align-items:center; text-align:center; padding:clamp(48px,6vw,96px) 20px; }
.inline-brand{ margin-left:4px; }
.welcome{ white-space:normal; letter-spacing:.2px; }
.hero-subtitle{ max-width:900px; margin-top:18px; color:#4c5a67; }

.next-auctions{ margin:34px 0 12px; color:#506674; font-size:20px; }
.no-schedule{ color:#6b7c8a; margin-bottom:8px; }
.auction-running{ color:#fff; background:#0059b3; padding:4px 8px; border-radius:4px; font-weight:600; }

/* --- Latest auctions --- */
.latest-auctions{ margin-top:30px; }

.cta-button{ margin-top:36px; background:#0059b3; color:#fff; padding:14px 28px; border-radius:999px;
  transition:background-color .25s ease, transform .1s ease; display:inline-block; font-weight:700; }
.cta-button:hover{ background:#0066cc; transform:translateY(-1px); }

/* ================= Prosty licznik ================= */
.countdown{
  font:700 clamp(38px,6vw,78px)/1 ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
  margin-top:16px;
}
</style>

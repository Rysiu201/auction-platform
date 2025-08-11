<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from "vue";
import { api } from "@/api";

const backend = import.meta.env.VITE_BACKEND_URL as string;

type Auction = {
  id: string;
  title: string;
  basePrice: number;
  bids: { amount: number }[];
  images: { url: string; position: number }[];
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
</script>

<template>
  <section class="home-hero">
    <h1 class="welcome">
      Witamy na Aukcji Sprzętu
      <span class="brand inline-brand">
        <span class="logo-alt">alt</span>
        <span class="logo-box"><span class="logo-k">kom</span></span>
        <span class="logo-om">software</span>
      </span>
    </h1>

    <p class="hero-subtitle">
      Dołącz do naszych licytacji firmowego sprzętu komputerowego – głównie laptopów używanych w różnym stanie technicznym. Każdy przedmiot ma indywidualny opis…
    </p>

    <div v-if="auctionsActive && latest.length" class="latest-auctions">
      <article v-for="a in latest" :key="a.id" class="latest-card">
        <img v-if="a.images?.[0]" :src="`${backend}${a.images[0].url}`" alt="" class="latest-image" />
        <div class="latest-info">
          <router-link :to="`/auction/${a.id}`" class="latest-title">{{ a.title }}</router-link>
          <div class="latest-price">{{ currentPrice(a) }} PLN</div>
        </div>
      </article>
    </div>

    <div class="next-auctions">Następna Pula Aukcji:</div>

    <p v-if="!hasSchedule" class="no-schedule">
      Termin nie został jeszcze wyznaczony.
    </p>
    <p v-else-if="auctionsActive" class="no-schedule">
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
.home-hero{ display:flex; flex-direction:column; align-items:center; text-align:center; padding:clamp(48px,6vw,96px) 20px; }
.inline-brand{ margin-left:4px; }
.welcome{ white-space:normal; letter-spacing:.2px; }
.hero-subtitle{ max-width:900px; margin-top:18px; color:#4c5a67; }

.next-auctions{ margin:34px 0 12px; color:#506674; font-size:20px; }
.no-schedule{ color:#6b7c8a; margin-bottom:8px; }

/* --- Latest auctions --- */
.latest-auctions{ display:flex; gap:16px; margin-top:30px; flex-wrap:wrap; justify-content:center; }
.latest-card{ width:220px; text-align:left; }
.latest-image{ width:100%; height:140px; object-fit:cover; border-radius:10px; }
.latest-title{ font-weight:700; display:block; margin-top:8px; color:#24303a; }
.latest-price{ color:#556370; }

.cta-button{ margin-top:36px; background:#0059b3; color:#fff; padding:14px 28px; border-radius:999px;
  transition:background-color .25s ease, transform .1s ease; display:inline-block; font-weight:700; }
.cta-button:hover{ background:#0066cc; transform:translateY(-1px); }

/* ================= Prosty licznik ================= */
.countdown{
  font:700 clamp(38px,6vw,78px)/1 ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
  margin-top:16px;
}
</style>

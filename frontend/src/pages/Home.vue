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
  auctionCloseIso: string | null; // ISO zamknięcia lub null
};

const endingSoon = ref<Auction[]>([]);
const settings = ref<Settings | null>(null);

const now = ref(Date.now());
let intervalId: number | null = null;

async function loadSettings() {
  try {
    const { data } = await api.get("/settings");
    settings.value = data;
  } catch {
    settings.value = { maxActiveAuctions: 0, maxWonAuctions: 0, nextAuctionIso: null, auctionCloseIso: null };
  }
}

const targetMs = computed(() => {
  const iso = settings.value?.nextAuctionIso ?? null;
  return iso ? new Date(iso).getTime() : null;
});

const msLeft = computed(() => {
  const t = targetMs.value;
  return t ? Math.max(0, t - now.value) : 0;
});
const hasSchedule = computed(() => targetMs.value !== null);
const hasCountdown = computed(() => hasSchedule.value && msLeft.value > 0);
const closeMs = computed(() => {
  const iso = settings.value?.auctionCloseIso ?? null;
  return iso ? new Date(iso).getTime() : null;
});
const auctionsActive = computed(() => {
  const startReady = hasSchedule.value && msLeft.value <= 0;
  if (!startReady) return false;
  const c = closeMs.value;
  return c === null || now.value < c;
});
const auctionClosed = computed(() => {
  const c = closeMs.value;
  return c !== null && now.value >= c;
});

const formattedTime = computed(() => {
  const total = Math.floor(msLeft.value / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
});

/* ---- DATA ---- */
onMounted(async () => {
  try {
    const { data } = await api.get("/auctions", { params: { limit: 3 } });
    endingSoon.value = data;
  } catch { /* ignore */ }

  await loadSettings();
  intervalId = window.setInterval(() => { now.value = Date.now(); }, 1000);
  window.addEventListener('settings-change', loadSettings);
});

onBeforeUnmount(() => {
  if (intervalId) clearInterval(intervalId);
  window.removeEventListener('settings-change', loadSettings);
});

watch(auctionClosed, (val) => {
  if (val && settings.value) {
    settings.value.nextAuctionIso = null;
    settings.value.auctionCloseIso = null;
  }
});

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

    <div v-if="auctionsActive && endingSoon.length" class="ending-auctions">
      <p><strong>3 aukcje najbliższe zakończeniu</strong></p>
      <div class="auction-grid">
        <router-link
          v-for="a in endingSoon"
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
    </div>

    <div class="next-auctions"><strong>Następna Pula Aukcji:</strong></div>

    <p v-if="!hasSchedule" class="no-schedule">
      Termin nie został jeszcze wyznaczony.
    </p>
    <p v-else-if="auctionsActive" class="auction-running">
      Aktualnie trwa aukcja.
    </p>
    <p v-else-if="auctionClosed" class="auction-closed">
      Panel aukcyjny jest zamknięty.
    </p>
    <div v-else class="countdown" role="timer" aria-live="polite">
      {{ formattedTime }}
    </div>

    <router-link v-if="auctionsActive && endingSoon.length" to="/auctions" class="cta-button">Zobacz Aktualne Aukcje</router-link>
  </section>
</template>

<style scoped>
/* --- HERO / nagłówek --- */
.home-hero{
  display:flex;
  flex-direction:column;
  align-items:center;
  text-align:center;
  padding:clamp(48px,6vw,96px) 20px;
}
.inline-brand{ margin-left:4px; }
.welcome{ white-space:normal; letter-spacing:.2px; }
.hero-subtitle{ max-width:900px; margin-top:18px; color:#4c5a67; }

.next-auctions{ margin:34px 0 12px; color:#506674; font-size:20px; }
.no-schedule{ color:#6b7c8a; margin-bottom:8px; }
.auction-running{
  color:#fff; background:#0059b3; padding:4px 8px; border-radius:4px; font-weight:600;
}
.auction-closed{
  color:#b00020; font-weight:600;
}

/* ================== 3 aukcje najbliższe zakończeniu ================== */
.ending-auctions{ margin-top:30px; text-align:center; }
.auction-grid{
  margin-top: 30px;
  display:flex;
  justify-content:center;
  flex-wrap:wrap;
  gap: clamp(0.75rem, 2vw, 1.25rem);
}

/* link reset */
.auction-link{
  text-decoration:none;
  color:inherit;
}

/* karta */
.auction-card{
  position: relative;
  width: clamp(10rem, 12vw, 9rem);
  border-radius: 1.35rem;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0,0,0,.08);
  overflow: hidden;
  transition: transform .15s ease-in-out, box-shadow .15s ease-in-out;
}
.auction-card:hover{
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0,0,0,.12);
}

/* obrazek + kontekst dla badge */
.image-wrapper{
  position:relative;      /* kluczowe: badge liczy pozycję od obrazka, nie tytułu */
  aspect-ratio:16/9;
  overflow:hidden;
  background:#f3f4f6;
}
.auction-image{
  width:100%;
  height:100%;
  object-fit:cover;
}

/* badge stanu – w rogu obrazu */
.condition-badge{
  position:absolute;
  top:.5rem;
  left:.5rem;
  z-index:2;
  font-weight:700;
  font-size: clamp(.70rem, 1.5vw, .85rem);
  padding:.25rem .55rem;
  border-radius:.5rem;
  color:#111;               /* czytelny na jasnych kolorach */
  box-shadow:0 2px 8px rgba(0,0,0,.15);
  border:1px solid rgba(0,0,0,.08);
  line-height:1;
}

/* treść karty */
.auction-info{
  padding:.9rem .9rem 0 .9rem;
  text-align:left;
}
.auction-title{
  margin:0 0 .35rem 0;
  font-size: clamp(1rem, 2.2vw, 1.1rem);
  font-weight:700;
  color:#222;
}
.auction-price{
  font-weight:800;
  font-size: clamp(1rem, 2vw, 1.1rem);
  margin-bottom:.2rem;
}
.auction-offers{
  color:#6b7280;
  font-size:.9rem;
}

/* pasek końca aukcji */
.auction-end{
  background:#e74c3c;
  color:#fff;
  font-weight:600;
  text-align:center;
  padding:.55rem .75rem;
  border-top:1px solid rgba(0,0,0,.05);
  border-bottom-left-radius:.75rem;
  border-bottom-right-radius:.75rem;
  font-size: clamp(.8rem, 1.8vw, .9rem);
}

/* CTA */
.cta-button{
  margin-top:36px;
  background:#0059b3;
  color:#fff;
  padding:14px 28px;
  border-radius:999px;
  transition:background-color .25s ease, transform .1s ease;
  display:inline-block;
  font-weight:700;
}
.cta-button:hover{ background:#0066cc; transform:translateY(-1px); }

/* Licznik */
.countdown{
  font:700 clamp(38px,6vw,78px)/1 ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
  margin-top:16px;
}
</style>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch, nextTick } from "vue";
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

/* ---- FLIP CLOCK ---- */
type Unit = { label: string; digits: string[] };
const timeUnits = ref<Unit[]>([
  { label: "godz", digits: ["0", "0"] },
  { label: "min",  digits: ["0", "0"] },
  { label: "sek",  digits: ["0", "0"] },
]);

let intervalId: number | null = null;

const targetMs = computed(() => {
  const iso = settings.value?.nextAuctionIso ?? null;
  return iso ? new Date(iso).getTime() : null;
});

const nowMs = () => Date.now();
const msLeft = computed(() => {
  if (!targetMs.value) return 0;
  return Math.max(0, targetMs.value - nowMs());
});

const hasCountdown = computed(() => !!targetMs.value && msLeft.value > 0);
const auctionsActive = computed(() => !hasCountdown.value);

function renderFromMs(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  [hh, mm, ss].forEach((val, unitIdx) => {
    val.split("").forEach((digit, pos) => {
      if (timeUnits.value[unitIdx].digits[pos] !== digit) {
        flip(unitIdx, pos, digit);
      }
    });
  });
}

function flip(unitIdx: number, pos: number, nextDigit: string) {
  const unitEl = document.querySelectorAll(".flip-unit")[unitIdx];
  const card = unitEl?.querySelectorAll<HTMLElement>(".flip-card")[pos];
  if (!card) return;

  const top = card.querySelector<HTMLElement>(".top")!;
  const bottom = card.querySelector<HTMLElement>(".bottom")!;
  const nextTop = card.querySelector<HTMLElement>(".next-top")!;
  const nextBottom = card.querySelector<HTMLElement>(".next-bottom")!;

  nextTop.textContent = nextDigit;
  nextBottom.textContent = nextDigit;

  card.classList.add("flip-anim");
  setTimeout(() => {
    top.textContent = nextDigit;
    bottom.textContent = nextDigit;
    timeUnits.value[unitIdx].digits[pos] = nextDigit;
    card.classList.remove("flip-anim");
  }, 600);
}

function startCountdownToTarget() {
  stopCountdown();
  // pierwsze wyrenderowanie
  renderFromMs(msLeft.value);

  // korygowany interwał – liczymy za każdym razem od nowa
  intervalId = window.setInterval(() => {
    const left = msLeft.value;
    renderFromMs(left);
    if (left <= 0) stopCountdown();
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

watch(hasCountdown, async (val) => {
  if (val) {
    await nextTick();
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

    <!-- Gdy brak terminu -->
    <p v-if="!hasCountdown" class="no-schedule">
      Obecnie nie ma wyznaczonego terminu przyszłych aukcji.
    </p>

    <!-- Gdy odliczanie trwa -->
    <div v-else class="flip-clock" role="timer" aria-live="polite">
      <div class="flip-unit" v-for="unit in timeUnits" :key="unit.label">
        <div class="flip-card" v-for="(digit, i) in unit.digits" :key="i">
          <div class="card-face top">{{ digit }}</div>
          <div class="card-face bottom">{{ digit }}</div>
          <div class="card-face next-top">{{ digit }}</div>
          <div class="card-face next-bottom">{{ digit }}</div>
        </div>
        <span class="label">{{ unit.label }}</span>
      </div>
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

/* ================= FLIP CLOCK (pełny 3D) ================= */
.flip-clock{
  /* zmienne muszą być zdefiniowane na elemencie w zasięgu, nie w :root ze style scoped */
  --digit-w:clamp(52px,6.2vw,88px);
  --digit-h:clamp(76px,9vw,132px);
  --radius:14px;
  --font:clamp(38px,6vw,78px);
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
  --display:flex; gap:clamp(18px,2.6vw,28px); align-items:flex-end; user-select:none;
}
.flip-unit{ display:flex; flex-direction:column; align-items:center; }
.flip-unit .label{ margin-top:10px; font-size:13px; color:#6b7c8a; letter-spacing:.4px; }

.flip-card{ position:relative; width:var(--digit-w); height:var(--digit-h); margin:0 3px; perspective:1100px; }
.card-face{
  position:absolute; left:0; right:0; background:#1b222b; color:#ecf2f8;
  font:700 var(--font)/1 var(--mono); display:flex; align-items:center; justify-content:center;
  overflow:hidden; backface-visibility:hidden; will-change:transform; box-shadow:0 8px 18px rgba(0,0,0,.28);
}
.top{
  top:0; height:50%; border-radius:14px 14px 0 0; border-bottom:1px solid rgba(255,255,255,.08);
  transform-origin:bottom; background:linear-gradient(180deg,#171c22 0%, #1b222b 100%);
}
.bottom{
  bottom:0; height:50%; border-radius:0 0 14px 14px; border-top:1px solid rgba(255,255,255,.06);
  transform-origin:top; background:linear-gradient(180deg,#1b222b 0%, #15191f 100%);
}
.next-top{
  top:0; height:50%; border-radius:14px 14px 0 0; border-bottom:1px solid rgba(255,255,255,.08);
  transform-origin:bottom; transform:rotateX(90deg); background:linear-gradient(180deg,#171c22 0%, #1b222b 100%);
}
.next-bottom{
  bottom:0; height:50%; border-radius:0 0 14px 14px; border-top:1px solid rgba(255,255,255,.06);
  transform-origin:top; transform:rotateX(-90deg); background:linear-gradient(180deg,#1b222b 0%, #15191f 100%);
}
.flip-card::before{ content:""; position:absolute; left:0; right:0; top:50%; height:1px; transform:translateY(-.5px);
  background:rgba(255,255,255,.06); z-index:2; }
.flip-card::after{ content:""; position:absolute; inset:0; pointer-events:none;
  box-shadow:inset 0 18px 28px rgba(0,0,0,.35), inset 0 -18px 28px rgba(0,0,0,.35); border-radius:14px; }
.flip-card.flip-anim .top{ animation:flipTop .32s ease-in forwards; }
.flip-card.flip-anim .next-bottom{ animation:flipBottom .32s ease-out .30s forwards; }
@keyframes flipTop{ 0%{ transform:rotateX(0deg);} 100%{ transform:rotateX(-90deg);} }
@keyframes flipBottom{ 0%{ transform:rotateX(-90deg);} 100%{ transform:rotateX(0deg);} }

@media (max-width:540px){
  .flip-clock{ gap:16px; }
  .flip-unit .label{ font-size:12px; }
}
</style>
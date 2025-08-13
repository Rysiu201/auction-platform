<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { api } from "@/api";

const backend = import.meta.env.VITE_BACKEND_URL as string;

type Auction = {
  id: string;
  title: string;
  description: string;
  endsAt: string;
  images: { url: string; position: number }[];
  basePrice: number;
  minIncrement: number;
  bids: { amount: number }[];
  condition: string;
};

const auctions = ref<Auction[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const user = ref<any>(null);
const favoriteIds = ref<Set<string>>(new Set());
let refresh: number | null = null;

function loadUser() {
  const raw = localStorage.getItem("user");
  user.value = raw ? JSON.parse(raw) : null;
}
function onUserChange() { loadUser(); loadFavorites(); }

async function loadAuctions() {
  try {
    const { data } = await api.get("/auctions");
    auctions.value = data;
  } catch (e: any) {
    error.value = e?.message ?? "Błąd";
  } finally {
    loading.value = false;
  }
}

async function loadFavorites() {
  if (!user.value) return;
  try {
    const { data } = await api.get("/auctions/my");
    favoriteIds.value = new Set(data.map((a: any) => a.id));
  } catch {}
}

onMounted(async () => {
  loadUser();
  await loadAuctions();
  await loadFavorites();
  refresh = window.setInterval(() => { loadAuctions(); loadFavorites(); }, 5000);
  window.addEventListener("user-change", onUserChange);
});

onUnmounted(() => {
  if (refresh) clearInterval(refresh);
  window.removeEventListener("user-change", onUserChange);
});

function fmtDate(s: string) {
  return new Date(s).toLocaleString();
}

function fmtPrice(g: number) {
  return (g / 100).toFixed(2);
}

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

function currentPrice(a: Auction) {
  const top = a.bids.length ? Math.max(...a.bids.map((b) => b.amount)) : 0;
  return fmtPrice(Math.max(a.basePrice, top));
}

function isFavorite(id: string) {
  return favoriteIds.value.has(id);
}

async function toggleFavorite(a: Auction, e: Event) {
  e.preventDefault();
  e.stopPropagation();
  if (!user.value) return;
  if (isFavorite(a.id)) {
    await api.delete(`/auctions/${a.id}/favorite`);
    favoriteIds.value.delete(a.id);
  } else {
    await api.post(`/auctions/${a.id}/favorite`);
    favoriteIds.value.add(a.id);
  }
}
</script>

<template>
  <section class="page-section">
  <h1>Aktywne aukcje ({{ auctions.length }})</h1>

  <p v-if="loading">Ładowanie…</p>
  <p v-if="error" style="color:red">{{ error }}</p>

  <div
    v-if="!loading && auctions.length"
    class="auction-grid"
  >
    <router-link
      v-for="a in auctions"
      :key="a.id"
      :to="`/auction/${a.id}`"
      class="auction-link"
    >
      <article class="auction-card">
        <button
          v-if="user"
          class="fav-btn"
          @click="toggleFavorite(a, $event)"
          :class="
            isFavorite(a.id)
              ? 'text-amber-400 hover:text-amber-500'
              : 'text-slate-400 hover:text-slate-500'
          "
        >★</button>
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

  <p v-else-if="!loading && !auctions.length">Brak aktywnych aukcji.</p>
  </section>
</template>

<style scoped>
/* Sekcja */
.page-section{
  padding: 2.5rem 1.25rem;
  text-align: center;
}

/* Siatka kart – wyśrodkowana i responsywna */
.auction-grid{
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: clamp(0.75rem, 2vw, 1.25rem);
}

/* Link-karta reset */
.auction-link{
  text-decoration: none;
  color: inherit;
}

/* Karta */
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
  transform: translateY(-3px);
  box-shadow: 5px 10px 24px rgba(0,0,0,.12);
}

/* Ulubione (gwiazdka) */
.fav-btn{
  position: absolute;
  top: .5rem;
  right: .5rem;
  z-index: 3;
  background: transparent;
  border: 0;
  font-size: 1.1rem;
  cursor: pointer;
}

/* Obrazek – robimy z niego kontekst dla badge */
.image-wrapper{
  position: relative;              /* << kluczowe – badge liczy pozycję od wrappera */
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #f3f4f6;
}
.auction-image{
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Badge stanu – nie nachodzi na tytuł, siedzi w rogu obrazka */
.condition-badge{
  position: absolute;
  top: .5rem;
  left: .5rem;
  z-index: 2;
  font-weight: 700;
  font-size: clamp(.70rem, 1.5vw, .85rem);
  padding: .25rem .55rem;
  border-radius: .5rem;
  color: #111;                     /* czytelny tekst na jasnych kolorach stanów */
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
  line-height: 1;
  border: 1px solid rgba(0,0,0,.08);
}

/* Treść karty */
.auction-info{
  padding: .9rem .9rem 0 .9rem;
  text-align: left;
}
.auction-title{
  margin: 0 0 .35rem 0;
  font-size: clamp(1rem, 2.2vw, 1.1rem);
  font-weight: 700;
  color: #222;
}
.auction-price{
  font-weight: 800;
  font-size: clamp(1rem, 2vw, 1.1rem);
  margin-bottom: .2rem;
}
.auction-offers{
  color: #6b7280;
  font-size: .9rem;
}

/* Pasek końca aukcji */
.auction-end{
  background: #e74c3c;
  color: #fff;
  font-weight: 600;
  text-align: center;
  padding: .55rem .75rem;
  border-top: 1px solid rgba(0,0,0,.05);
  border-bottom-left-radius: .75rem;
  border-bottom-right-radius: .75rem;
  font-size: clamp(.8rem, 1.8vw, .9rem);
}
</style>


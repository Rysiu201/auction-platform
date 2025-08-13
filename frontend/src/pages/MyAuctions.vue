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
const favoriteIds = ref<Set<string>>(new Set());
let refresh: number | null = null;

async function load() {
  try {
    const { data } = await api.get("/auctions/my");
    auctions.value = data;
    favoriteIds.value = new Set(data.map((a: any) => a.id));
  } catch (e: any) {
    error.value = e?.message ?? "Błąd";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await load();
  refresh = window.setInterval(load, 5000);
});

onUnmounted(() => { if (refresh) clearInterval(refresh); });

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
  if (isFavorite(a.id)) {
    await api.delete(`/auctions/${a.id}/favorite`);
    favoriteIds.value.delete(a.id);
    auctions.value = auctions.value.filter(x => x.id !== a.id);
  } else {
    await api.post(`/auctions/${a.id}/favorite`);
    favoriteIds.value.add(a.id);
  }
}
</script>

<template>
  <section class="page-section">
  <h1>Moje aukcje ({{ auctions.length }})</h1>

  <p v-if="loading">Ładowanie…</p>
  <p v-if="error" style="color:red">{{ error }}</p>

  <div v-if="!loading && auctions.length" class="auction-grid">
    <router-link
      v-for="a in auctions"
      :key="a.id"
      :to="`/auction/${a.id}`"
      class="auction-link"
    >
      <article class="auction-card">
        <button class="fav-btn text-xl" @click="toggleFavorite(a, $event)">{{ isFavorite(a.id) ? '★' : '☆' }}</button>
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

  <p v-else-if="!loading && !auctions.length">Brak aukcji.</p>
  </section>
</template>

<style scoped>
.page-section { padding:40px 20px; text-align:center; }
.condition-badge{
  text-align: center;
  color:black;
}
</style>


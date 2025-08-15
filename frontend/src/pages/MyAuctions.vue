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

const favorites = ref<Auction[]>([]);
const won = ref<Auction[]>([]);
const outbid = ref<Auction[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const favoriteIds = ref<Set<string>>(new Set());
let refresh: number | null = null;

async function load() {
  try {
    const [favRes, wonRes, outbidRes] = await Promise.all([
      api.get("/auctions/my"),
      api.get("/auctions/my/won"),
      api.get("/auctions/my/outbid"),
    ]);
    favorites.value = favRes.data;
    won.value = wonRes.data;
    outbid.value = outbidRes.data;
    favoriteIds.value = new Set(favRes.data.map((a: any) => a.id));
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
    favorites.value = favorites.value.filter(x => x.id !== a.id);
  } else {
    await api.post(`/auctions/${a.id}/favorite`);
    favoriteIds.value.add(a.id);
  }
}
</script>

<template>
  <section class="page-section">
  <h1>Moje aukcje</h1>

  <p v-if="loading">Ładowanie…</p>
  <p v-if="error" style="color:red">{{ error }}</p>

  <div class="sections">
    <div class="auction-box">
      <h2>Obserwowane ({{ favorites.length }})</h2>
      <div v-if="!loading && favorites.length" class="auction-grid">
        <router-link
          v-for="a in favorites"
          :key="a.id"
          :to="`/auction/${a.id}`"
          class="auction-link"
        >
          <article class="auction-card">
            <button
              class="fav-btn text-xl"
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
      <p v-if="!loading && !favorites.length">Brak aukcji.</p>
    </div>

    <div class="auction-box">
      <h2>Zwyciężone ({{ won.length }})</h2>
      <div v-if="!loading && won.length" class="auction-grid">
        <router-link
          v-for="a in won"
          :key="a.id"
          :to="`/auction/${a.id}`"
          class="auction-link"
        >
          <article class="auction-card">
            <div class="image-wrapper">
              <img
                v-if="a.images?.[0]"
                :src="`${backend}${a.images[0].url}``
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
      <p v-if="!loading && !won.length">Brak aukcji.</p>
    </div>

    <div class="auction-box">
      <h2>Przebite ({{ outbid.length }})</h2>
      <div v-if="!loading && outbid.length" class="auction-grid">
        <router-link
          v-for="a in outbid"
          :key="a.id"
          :to="`/auction/${a.id}`"
          class="auction-link"
        >
          <article class="auction-card">
            <div class="image-wrapper">
              <img
                v-if="a.images?.[0]"
                :src="`${backend}${a.images[0].url}``
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
      <p v-if="!loading && !outbid.length">Brak aukcji.</p>
    </div>
  </div>
  </section>
</template>

<style scoped>
.page-section { padding:40px 20px; text-align:center; }
.sections { display:grid; gap:20px; }
.auction-box { background:#fff; padding:20px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
.auction-box h2 { margin-top:0; }
.condition-badge{
  text-align: center;
  color:black;
}
</style>


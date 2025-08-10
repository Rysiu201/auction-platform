<script setup lang="ts">
import { onMounted, ref } from "vue";
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

onMounted(async () => {
  try {
    const { data } = await api.get("/auctions");
    auctions.value = data;
  } catch (e: any) {
    error.value = e?.message ?? "Błąd";
  } finally {
    loading.value = false;
  }
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

function currentPrice(a: Auction) {
  const top = a.bids.length ? Math.max(...a.bids.map((b) => b.amount)) : 0;
  return fmtPrice(Math.max(a.basePrice, top));
}
</script>

<template>
  <section class="page-section">
  <h1>Aktywne aukcje</h1>

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
        <div class="image-wrapper">
          <img
            v-if="a.images?.[0]"
            :src="`${backend}${a.images[0].url}`"
            alt=""
            class="auction-image"
          />
          <span class="condition-badge">{{ conditionLabel[a.condition] || a.condition }}</span>
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
.page-section { padding:40px 20px; text-align:center; }
</style>

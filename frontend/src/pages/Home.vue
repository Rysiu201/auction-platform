<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "@/api";

const backend = import.meta.env.VITE_BACKEND_URL as string;

type Auction = {
  id: string;
  title: string;
  basePrice: number;
  bids: { amount: number }[];
  images: { url: string; position: number }[];
};

const latest = ref<Auction[]>([]);

onMounted(async () => {
  try {
    const { data } = await api.get("/auctions", {
      params: { limit: 3, sort: "latest" },
    });
    latest.value = data;
  } catch (e) {
    // ignore
  }
});

function fmtPrice(g: number) {
  return (g / 100).toFixed(2);
}

function currentPrice(a: Auction) {
  const top = a.bids.length ? Math.max(...a.bids.map((b) => b.amount)) : 0;
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
      Dołącz do naszych licytacji firmowego sprzętu komputerowego – głównie laptopów używanych w różnym stanie technicznym. Każdy przedmiot ma indywidualny opis, abyś mógł dokładnie poznać jego specyfikację i stan przed licytacją. Licytuj w czasie rzeczywistym i zdobądź sprzęt w korzystnej cenie. Sprawdź aktualne aukcje i złóż swoją ofertę już teraz!
    </p>

    <div v-if="latest.length" class="latest-auctions">
      <article v-for="a in latest" :key="a.id" class="latest-card">
        <img
          v-if="a.images?.[0]"
          :src="`${backend}${a.images[0].url}`"
          alt=""
          class="latest-image"
        />
        <div class="latest-info">
          <router-link :to="`/auction/${a.id}`" class="latest-title">
            {{ a.title }}
          </router-link>
          <div class="latest-price">{{ currentPrice(a) }} PLN</div>
        </div>
      </article>
    </div>

    <router-link to="/auctions" class="cta-button">Zobacz Aktualne Aukcje</router-link>
  </section>
</template>

<style scoped>
.home-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 20px;
}

.inline-brand {
  margin-left: 4px;
}

.welcome {
  white-space: normal;
}

.hero-subtitle {
  max-width: 800px;
  margin-top: 20px;
}

.cta-button {
  margin-top: 30px;
  background: #0059b3;
  color: #fff;
  padding: 12px 24px;
  border-radius: 25px;
  transition: background-color 0.3s;
  display: inline-block;
}

.cta-button:hover {
  background: #0066cc;
}

.latest-auctions {
  display: flex;
  gap: 16px;
  margin-top: 30px;
}

.latest-card {
  width: 200px;
  text-align: left;
}

.latest-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
}

.latest-title {
  font-weight: bold;
  display: block;
  margin-top: 8px;
}

.latest-price {
  color: #555;
}
</style>

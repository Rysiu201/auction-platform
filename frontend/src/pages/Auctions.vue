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
</script>

<template>
  <h1>Aktualne Aukcje</h1>

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
        <img
          v-if="a.images?.[0]"
          :src="`${backend}${a.images[0].url}`"
          alt=""
          class="auction-image"
        />
        <h3>{{ a.title }}</h3>
        <p>{{ a.description }}</p>
        <small>Kończy się: {{ fmtDate(a.endsAt) }}</small>
      </article>
    </router-link>
  </div>

  <p v-else-if="!loading && !auctions.length">Brak aktywnych aukcji.</p>
</template>

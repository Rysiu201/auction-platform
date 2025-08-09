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
  <h1>Aktywne aukcje</h1>

  <p v-if="loading">Ładowanie…</p>
  <p v-if="error" style="color:red">{{ error }}</p>

  <div
    v-if="!loading && auctions.length"
    style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px"
  >
    <router-link
      v-for="a in auctions"
      :key="a.id"
      :to="`/auction/${a.id}`"
      style="text-decoration:none;color:inherit"
    >
      <article style="border:1px solid #eee;border-radius:8px;padding:12px;transition:.15s box-shadow">
        <img
          v-if="a.images?.[0]"
          :src="`${backend}${a.images[0].url}`"
          alt=""
          style="width:100%;height:160px;object-fit:cover;border-radius:6px"
        />
        <h3 style="margin:8px 0 4px">{{ a.title }}</h3>
        <p style="color:#555;font-size:14px;min-height:40px">{{ a.description }}</p>
        <small>Kończy się: {{ fmtDate(a.endsAt) }}</small>
      </article>
    </router-link>
  </div>

  <p v-else-if="!loading && !auctions.length">Brak aktywnych aukcji.</p>
</template>
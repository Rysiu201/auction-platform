<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import { api } from "@/api";

const route = useRoute();
const id = route.params.id as string;

const backend = import.meta.env.VITE_BACKEND_URL as string;

const auction = ref<any>(null);
const topAmount = ref(0);         // grosze
const myBidPLN = ref<string>("");
const msg = ref<string | null>(null);

let timer: number | undefined;

function toPLN(g: number) {
  return (g / 100).toFixed(2);
}

async function loadFull() {
  const { data } = await api.get(`/auctions/${id}`);
  auction.value = data;
  topAmount.value = Math.max(data.basePrice, data.bids?.[0]?.amount || 0);
}

async function pollTop() {
  try {
    const { data } = await api.get(`/auctions/${id}/top`);
    topAmount.value = data.topAmount;
    if (auction.value) {
      auction.value.endsAt = data.endsAt;
      auction.value.status = data.status;
    }
  } catch {
    // no-op in dev
  }
}

async function placeBid() {
  msg.value = null;
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) {
    msg.value = "Zaloguj się, aby licytować";
    return;
  }
  try {
    const { data } = await api.post(`/auctions/${id}/bid`, {
      amountPLN: myBidPLN.value,
    });
    topAmount.value = data.topAmount;
    myBidPLN.value = "";
  } catch (e: any) {
    msg.value = e?.response?.data?.message ?? "Błąd licytacji";
  }
}

onMounted(async () => {
  await loadFull();
  timer = window.setInterval(pollTop, 2000);
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<template>
  <div v-if="auction">
    <h1 style="margin-bottom:8px">{{ auction.title }}</h1>

    <div style="display:flex; gap:16px; align-items:flex-start">
      <div style="display:flex; flex-direction:column; gap:8px">
        <img
          v-if="auction.images?.[0]"
          :src="`${backend}${auction.images[0].url}`"
          style="width:360px;height:240px;object-fit:cover;border-radius:8px"
        />
        <div v-if="auction.images?.length > 1" style="display:flex; gap:4px; flex-wrap:wrap">
          <img
            v-for="img in auction.images.slice(1)"
            :key="img.url"
            :src="`${backend}${img.url}`"
            style="width:80px;height:60px;object-fit:cover;border-radius:4px"
          />
        </div>
      </div>
      <div style="flex:1">
        <p style="margin:8px 0 16px">{{ auction.description }}</p>
        <div>Kończy się: {{ new Date(auction.endsAt).toLocaleString() }}</div>

        <div style="font-size:20px;margin:12px 0">
          Aktualna oferta: <b>{{ toPLN(topAmount) }} PLN</b>
          <span v-if="auction.status === 'ENDED'" style="color:#f66"> (aukcja zakończona)</span>
        </div>

        <div v-if="auction.status !== 'ENDED'" style="display:flex; gap:8px; align-items:center">
          <input v-model="myBidPLN" type="number" step="0.01" placeholder="Twoja oferta (PLN)" />
          <button @click="placeBid">Licytuj</button>
        </div>
        <p v-if="msg" style="color:red;margin-top:8px">{{ msg }}</p>
      </div>
    </div>
  </div>

  <p v-else>Ładowanie…</p>
</template>
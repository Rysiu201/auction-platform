<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from "vue";
import { useRoute } from "vue-router";
import { api } from "@/api";

const route = useRoute();
const id = route.params.id as string;

const backend = import.meta.env.VITE_BACKEND_URL as string;

const auction = ref<any>(null);
const topAmount = ref(0); // grosze
const myBidPLN = ref<string>("");
const msg = ref<string | null>(null);
const currentImg = ref(0);
const previewUrl = ref<string | null>(null);
const timeLeft = ref(0);
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

let pollTimer: number | undefined;
let countTimer: number | undefined;

const hasStarted = computed(() => {
  return auction.value ? new Date(auction.value.startsAt).getTime() <= Date.now() : false;
});

const formattedTimeLeft = computed(() => {
  const ms = timeLeft.value;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
});

function updateTimeLeft() {
  if (!auction.value) return;
  timeLeft.value = Math.max(0, new Date(auction.value.endsAt).getTime() - Date.now());
}

function toPLN(g: number) {
  return (g / 100).toFixed(2);
}

async function loadFull() {
  const { data } = await api.get(`/auctions/${id}`);
  auction.value = data;
  topAmount.value = Math.max(data.basePrice, data.bids?.[0]?.amount || 0);
  currentImg.value = 0;
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
  updateTimeLeft();
  pollTimer = window.setInterval(pollTop, 2000);
  countTimer = window.setInterval(updateTimeLeft, 1000);
});

onUnmounted(() => {
  if (pollTimer) window.clearInterval(pollTimer);
  if (countTimer) window.clearInterval(countTimer);
});

function openPreview(i: number) {
  if (!auction.value) return;
  previewUrl.value = `${backend}${auction.value.images[i].url}`;
}

function closePreview() {
  previewUrl.value = null;
}
</script>

<template>
  <div v-if="auction" class="auction-detail">
    <div class="gallery">
      <img
        v-if="auction.images?.[currentImg]"
        :src="`${backend}${auction.images[currentImg].url}`"
        alt=""
        class="main-image"
        @click="openPreview(currentImg)"
      />
      <div v-if="auction.images?.length > 1" class="thumbs">
        <img
          v-for="(img, i) in auction.images"
          :key="img.url"
          :src="`${backend}${img.url}`"
          :class="['thumb', { active: i === currentImg }]"
          @click="currentImg = i; openPreview(i)"
        />
      </div>
    </div>
    <div class="bid-panel">
      <h1 class="auction-title">{{ auction.title }}</h1>
      <span class="detail-condition" :style="{ background: conditionColor[auction.condition] }">
        {{ conditionLabel[auction.condition] || auction.condition }}
      </span>
      <p class="auction-desc">{{ auction.description }}</p>
      <div class="price-box">
        <span class="label">Aktualna oferta</span>
        <div class="price">{{ toPLN(topAmount) }} PLN</div>
      </div>
      <div class="timer">Start: {{ new Date(auction.startsAt).toLocaleString() }}</div>
      <div class="timer">Koniec: {{ new Date(auction.endsAt).toLocaleString() }}</div>
      <div v-if="hasStarted && auction.status !== 'ENDED'" class="timer">Pozostało: {{ formattedTimeLeft }}</div>
      <div v-if="auction.status !== 'ENDED' && hasStarted" class="bid-form">
        <input v-model="myBidPLN" type="number" step="0.01" placeholder="Twoja oferta (PLN)" />
        <button @click="placeBid">Licytuj</button>
        <p class="bid-hint">Min. przebicie: {{ toPLN(auction.minIncrement) }} PLN</p>
      </div>
      <p v-else-if="auction.status !== 'ENDED'" class="not-started">Aukcja jeszcze się nie rozpoczęła.</p>
      <div class="extra-info">
        <h3>Dodatkowe Informacje</h3>
        <ul class="options">
          <li v-if="auction.personalPickup">Odbiór osobisty</li>
          <li v-if="auction.courierShipping">Wysyłka kurierem</li>
          <li>Faktura: {{ auction.invoice ? 'możliwa' : 'brak' }}</li>
        </ul>
      </div>
      <p v-if="msg" class="error">{{ msg }}</p>
    </div>
  </div>
  <p v-else>Ładowanie…</p>
  <div v-if="previewUrl" class="img-preview" @click="closePreview">
    <img :src="previewUrl" alt="" />
  </div>
</template>

<style scoped>
.auction-desc {
  color: black
}
.auction-detail {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 24px;
}
.gallery {
  flex: 1;
}
.main-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 12px;
  cursor: zoom-in;
}
.thumbs {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.thumb {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  cursor: zoom-in;
  opacity: 0.7;
  transition: transform 0.2s, opacity 0.2s;
}
.thumb:hover {
  transform: scale(1.02);
  opacity: 1;
}
.thumb.active {
  border: 2px solid #ff4f64;
  opacity: 1;
}
.bid-panel {
  width: 100%;
  max-width: 420px;
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.auction-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.detail-condition {
  align-self: flex-start;
  color: rgb(0, 0, 0);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}
.price-box .label {
  font-size: 14px;
  color: #6b7280;
}
.price-box .price {
  font-size: 32px;
  font-weight: 700;
}
.timer {
  font-family: monospace;
  font-weight: 600;
}
.bid-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bid-form input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.options {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #6b7280;
}
.extra-info {
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 8px;
  background: #f9f9f9;
}
.extra-info h3 {
  margin: 0 0 8px;
  text-align: center;
}
.not-started {
  color: #6b7280;
}
.error {
  color: red;
}

.img-preview {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.img-preview img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}
</style>
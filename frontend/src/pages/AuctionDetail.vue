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
const user = ref<any>(null);
const isFavorite = ref(false);
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

const statusColor: Record<string, string> = {
  ACTIVE: 'bg-green-500',
  ENDED: 'bg-red-500',
  SCHEDULED: 'bg-yellow-500',
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

function statusClass(s: string) {
  return statusColor[s] || 'bg-gray-400';
}

function loadUser() {
  const raw = localStorage.getItem('user');
  user.value = raw ? JSON.parse(raw) : null;
}

async function loadFavoriteStatus() {
  if (!user.value) return;
  try {
    const { data } = await api.get('/auctions/my');
    isFavorite.value = data.some((a: any) => a.id === id);
  } catch {}
}

function onUserChange() {
  loadUser();
  loadFavoriteStatus();
}

async function toggleFavorite() {
  if (!user.value) return;
  if (isFavorite.value) {
    await api.delete(`/auctions/${id}/favorite`);
    isFavorite.value = false;
  } else {
    await api.post(`/auctions/${id}/favorite`);
    isFavorite.value = true;
  }
}

function nextImage() {
  if (!auction.value?.images?.length) return;
  currentImg.value = (currentImg.value + 1) % auction.value.images.length;
}

function prevImage() {
  if (!auction.value?.images?.length) return;
  currentImg.value = (currentImg.value - 1 + auction.value.images.length) % auction.value.images.length;
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
  loadUser();
  await loadFull();
  await loadFavoriteStatus();
  updateTimeLeft();
  pollTimer = window.setInterval(pollTop, 2000);
  countTimer = window.setInterval(updateTimeLeft, 1000);
  window.addEventListener('user-change', onUserChange);
});

onUnmounted(() => {
  if (pollTimer) window.clearInterval(pollTimer);
  if (countTimer) window.clearInterval(countTimer);
  window.removeEventListener('user-change', onUserChange);
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
  <div v-if="auction" class="max-w-5xl mx-auto p-4 flex flex-col md:flex-row gap-8">
    <div class="flex-1">
      <img
        v-if="auction.images?.[currentImg]"
        :src="`${backend}${auction.images[currentImg].url}`"
        alt=""
        class="w-full rounded-lg object-cover cursor-zoom-in"
        @click="openPreview(currentImg)"
      />
      <div v-if="auction.images?.length > 1" class="flex items-center gap-2 mt-4">
        <button @click="prevImage" class="px-2 py-1 border rounded">&lt;</button>
        <div class="flex overflow-x-auto gap-2">
          <img
            v-for="(img, i) in auction.images"
            :key="img.url"
            :src="`${backend}${img.url}`"
            @click="currentImg = i"
            :class="['h-20 w-20 object-cover rounded cursor-pointer border-2', i === currentImg ? 'border-blue-500' : 'border-transparent']"
          />
        </div>
        <button @click="nextImage" class="px-2 py-1 border rounded">&gt;</button>
      </div>
    </div>
    <div class="w-full md:w-96 flex flex-col gap-4">
      <div class="flex justify-between items-start">
        <h1 class="text-2xl font-bold">{{ auction.title }}</h1>
        <button v-if="user" class="text-2xl" @click="toggleFavorite">{{ isFavorite ? '★' : '☆' }}</button>
      </div>
      <span class="text-white text-xs font-semibold px-2 py-1 rounded" :class="statusClass(auction.status)">{{ auction.status }}</span>
      <span class="self-start text-xs font-semibold px-2 py-1 rounded" :style="{ background: conditionColor[auction.condition] }">
        {{ conditionLabel[auction.condition] || auction.condition }}
      </span>
      <p class="text-gray-700">{{ auction.description }}</p>
      <div>
        <div class="text-sm text-gray-500">Aktualna oferta</div>
        <div class="text-3xl font-bold">{{ toPLN(topAmount) }} PLN</div>
      </div>
      <div class="space-y-1 text-sm">
        <div>📅 Start: {{ new Date(auction.startsAt).toLocaleString() }}</div>
        <div>📅 Koniec: {{ new Date(auction.endsAt).toLocaleString() }}</div>
        <div v-if="hasStarted && auction.status !== 'ENDED'">🕒 Pozostało: {{ formattedTimeLeft }}</div>
      </div>
      <div v-if="auction.status !== 'ENDED' && hasStarted" class="flex flex-col gap-2">
        <input v-model="myBidPLN" type="number" step="0.01" placeholder="Twoja oferta (PLN)" class="border rounded p-2" />
        <button @click="placeBid" class="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">Licytuj</button>
        <p class="text-sm text-gray-500">Min. przebicie: {{ toPLN(auction.minIncrement) }} PLN</p>
      </div>
      <p v-else-if="auction.status !== 'ENDED'" class="text-gray-500">Aukcja jeszcze się nie rozpoczęła.</p>
      <div class="border rounded p-4 bg-gray-50">
        <h3 class="font-semibold mb-2 text-center">Dodatkowe Informacje</h3>
        <ul class="space-y-1 text-gray-600">
          <li v-if="auction.personalPickup">🚗 Odbiór osobisty</li>
          <li v-if="auction.courierShipping">📦 Wysyłka kurierem</li>
          <li>🧾 Faktura: {{ auction.invoice ? 'możliwa' : 'brak' }}</li>
        </ul>
      </div>
      <p v-if="msg" class="text-red-600">{{ msg }}</p>
    </div>
  </div>
  <p v-else>Ładowanie…</p>
  <div v-if="previewUrl" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" @click="closePreview">
    <img :src="previewUrl" alt="" class="max-w-full max-h-full object-contain" />
  </div>
</template>

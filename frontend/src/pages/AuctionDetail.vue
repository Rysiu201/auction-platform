<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api';

const route = useRoute();
const id = route.params.id as string;
const backend = import.meta.env.VITE_BACKEND_URL as string;

const auction = ref<any>(null);
const topAmount = ref(0); // grosze
const bidAmount = ref<string>('');
const msg = ref<string | null>(null);
const currentImg = ref(0);
const previewUrl = ref<string | null>(null);
const timeLeft = ref(0);
const user = ref<any>(null);
const isFavorite = ref(false);
const loading = ref(false);

const conditionLabel: Record<string, string> = {
  NOWY: 'Nowy',
  BARDZO_DOBRY: 'Bardzo dobry',
  DOBRY: 'Dobry',
  USZKODZONY: 'Uszkodzony',
  DO_NAPRAWY: 'Do naprawy',
};

const badgeBase =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium';
const badgeVariants = {
  statusActive: 'bg-green-100 text-green-800',
  statusEnded: 'bg-slate-200 text-slate-700',
  condition: 'bg-amber-100 text-amber-800',
  featured: 'bg-blue-100 text-blue-800',
};

let pollTimer: number | undefined;
let countTimer: number | undefined;

const hasStarted = computed(() =>
  auction.value ? new Date(auction.value.startsAt).getTime() <= Date.now() : false
);
const isEnded = computed(
  () => auction.value?.status === 'ENDED' || timeLeft.value <= 0
);

const minBidPLN = computed(
  () => (topAmount.value + (auction.value?.minIncrement || 0)) / 100
);

const formattedTimeLeft = computed(() => {
  const total = Math.floor(timeLeft.value / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
});

const bidError = computed(() => {
  if (!bidAmount.value) return null;
  if (Number(bidAmount.value) < minBidPLN.value)
    return `Oferta musi być ≥ ${minBidPLN.value.toFixed(2)} PLN`;
  return null;
});

const canBid = computed(
  () =>
    !bidError.value &&
    Number(bidAmount.value) >= minBidPLN.value &&
    !loading.value &&
    !isEnded.value &&
    hasStarted.value
);

function toPLN(g: number) {
  return (g / 100).toFixed(2);
}

function updateTimeLeft() {
  if (!auction.value) return;
  const diff = new Date(auction.value.endsAt).getTime() - Date.now();
  timeLeft.value = Math.max(0, diff);
  if (diff <= 0 && countTimer) window.clearInterval(countTimer);
}

function nextImage() {
  if (!auction.value?.images?.length) return;
  currentImg.value = (currentImg.value + 1) % auction.value.images.length;
}

function prevImage() {
  if (!auction.value?.images?.length) return;
  currentImg.value =
    (currentImg.value - 1 + auction.value.images.length) %
    auction.value.images.length;
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && previewUrl.value) {
    closePreview();
    return;
  }
  if (e.key === 'ArrowRight') nextImage();
  if (e.key === 'ArrowLeft') prevImage();
}

function openPreview(i: number) {
  if (!auction.value) return;
  previewUrl.value = `${backend}${auction.value.images[i].url}`;
}

function closePreview() {
  previewUrl.value = null;
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
    updateTimeLeft();
  } catch {}
}

async function placeBid() {
  msg.value = null;
  if (!canBid.value) return;
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) {
    msg.value = 'Zaloguj się, aby licytować';
    return;
  }
  loading.value = true;
  try {
    const { data } = await api.post(`/auctions/${id}/bid`, {
      amountPLN: bidAmount.value,
    });
    topAmount.value = data.topAmount;
    bidAmount.value = '';
  } catch (e: any) {
    msg.value = e?.response?.data?.message ?? 'Błąd licytacji';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  loadUser();
  await loadFull();
  await loadFavoriteStatus();
  updateTimeLeft();
  pollTimer = window.setInterval(pollTop, 2000);
  if (!isEnded.value) countTimer = window.setInterval(updateTimeLeft, 1000);
  window.addEventListener('user-change', onUserChange);
  window.addEventListener('keydown', onKey);
});

onUnmounted(() => {
  if (pollTimer) window.clearInterval(pollTimer);
  if (countTimer) window.clearInterval(countTimer);
  window.removeEventListener('user-change', onUserChange);
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div
    v-if="auction"
    class="max-w-7xl mx-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6"
  >
    <!-- Left column -->
    <div class="flex-1">
      <div
        class="relative bg-gray-100 rounded-xl shadow flex items-center justify-center cursor-zoom-in"
        @click="openPreview(currentImg)"
      >
        <img
          v-if="auction.images?.[currentImg]"
          :src="`${backend}${auction.images[currentImg].url}`"
          alt=""
          class="max-h-[480px] w-full object-contain rounded-xl"
        />
      </div>
      <div v-if="auction.images?.length > 1" class="relative mt-4">
        <button
          aria-label="Poprzednie zdjęcie"
          @click="prevImage"
          class="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow rounded-full w-10 h-10 flex items-center justify-center focus:outline-none focus-visible:ring"
        >
          <span class="sr-only">Poprzednie zdjęcie</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div class="overflow-x-auto flex gap-2 px-12">
          <button
            v-for="(img, i) in auction.images"
            :key="img.url"
            @click="currentImg = i"
            :class="[
              'flex-shrink-0 h-20 w-20 md:h-24 md:w-24 rounded-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              i === currentImg ? 'ring-2 ring-blue-500' : ''
            ]"
          >
            <img :src="`${backend}${img.url}`" alt="" class="object-cover w-full h-full" />
          </button>
        </div>
        <button
          aria-label="Następne zdjęcie"
          @click="nextImage"
          class="absolute right-0 top-1/2 -translate-y-1/2 bg-white shadow rounded-full w-10 h-10 flex items-center justify-center focus:outline-none focus-visible:ring"
        >
          <span class="sr-only">Następne zdjęcie</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Right column -->
    <div class="w-full lg:w-96">
      <div
        class="rounded-2xl bg-white/80 backdrop-blur shadow-lg p-6 space-y-4 sticky top-24"
      >
        <!-- Badges -->
        <div class="flex flex-wrap gap-2">
          <span
            :class="[
              badgeBase,
              auction.status === 'ENDED'
                ? badgeVariants.statusEnded
                : badgeVariants.statusActive,
            ]"
          >
            {{ auction.status === 'ENDED' ? 'Zakończona' : 'Aktywna' }}
          </span>
          <span :class="[badgeBase, badgeVariants.condition]">
            {{ conditionLabel[auction.condition] || auction.condition }}
          </span>
          <span v-if="auction.featured" :class="[badgeBase, badgeVariants.featured]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-3 h-3"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.383 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.384-2.46a1 1 0 00-1.176 0l-3.384 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.044 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z"
              />
            </svg>
            Wyróżniona
          </span>
        </div>

        <div class="flex justify-between items-start">
          <h2 class="text-2xl font-bold">{{ auction.title }}</h2>
          <button
            v-if="user"
            @click="toggleFavorite"
            :aria-label="isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'"
            class="text-2xl leading-none"
          >
            {{ isFavorite ? '★' : '☆' }}
          </button>
        </div>

        <p
          class="text-gray-700 text-sm"
          style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;"
        >
          {{ auction.description }}
        </p>

        <div>
          <span :class="[badgeBase, 'bg-slate-100 text-slate-700']">Aktualna oferta</span>
          <div class="mt-1 text-4xl font-bold">{{ toPLN(topAmount) }} PLN</div>
        </div>

        <div class="flex items-center gap-2 bg-amber-50 text-amber-900 rounded-lg px-3 py-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6l4 2"
            />
          </svg>
          <span>
            Pozostało:
            {{ formattedTimeLeft }}
          </span>
        </div>

        <div v-if="auction.status !== 'ENDED' && hasStarted" class="space-y-2">
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 select-none">PLN</span>
            <input
              v-model="bidAmount"
              type="number"
              class="w-full h-11 rounded-xl border pl-12 pr-3 focus:outline-none focus:ring"
              :min="minBidPLN"
            />
          </div>
          <p v-if="bidError" class="text-sm text-red-600">{{ bidError }}</p>
          <button
            @click="placeBid"
            :disabled="!canBid"
            :aria-disabled="!canBid"
            class="w-full h-11 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <span v-if="!loading">Licytuj</span>
            <span v-else class="animate-pulse">...</span>
          </button>
          <p class="text-sm text-gray-500">
            Min. przebicie: {{ toPLN(auction.minIncrement) }} PLN
          </p>
        </div>
        <p v-else-if="auction.status !== 'ENDED'" class="text-gray-500">
          Aukcja jeszcze się nie rozpoczęła.
        </p>

        <div class="grid grid-cols-3 gap-2 pt-2">
          <div class="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
            <span>🚗</span>
            <span class="text-xs mt-1">Odbiór</span>
          </div>
          <div class="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
            <span>📦</span>
            <span class="text-xs mt-1">Kurier</span>
          </div>
          <div class="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
            <span>🧾</span>
            <span class="text-xs mt-1">
              {{ auction.invoice ? 'Faktura' : 'Brak faktury' }}
            </span>
          </div>
        </div>

        <p v-if="msg" class="text-red-600 text-sm">{{ msg }}</p>
      </div>
    </div>
  </div>
  <p v-else>Ładowanie…</p>
  <div
    v-if="previewUrl"
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
    @click="closePreview"
  >
    <img :src="previewUrl" alt="" class="max-w-full max-h-full object-contain" />
  </div>
</template>


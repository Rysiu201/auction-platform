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
const previewOpen = ref(false);
const thumbOffset = ref(0);
const visibleThumbs = computed(() => {
  if (!auction.value?.images) return [];
  const imgs = auction.value.images;
  const n = imgs.length;
  return Array.from({ length: Math.min(4, n) }, (_, i) => {
    const index = (thumbOffset.value + i) % n;
    return { img: imgs[index], index };
  });
});
const timeLeft = ref(0);
const user = ref<any>(null);
const isFavorite = ref(false);
const loading = ref(false);
const settings = ref<{ auctionCloseIso: string | null; auctionCloseNoticeSec: number } | null>(null);
const now = ref(Date.now());
let settingsTimer: number | undefined;

async function loadSettings() {
  try {
    const { data } = await api.get('/settings');
    settings.value = data;
  } catch {}
}

const auctionClosed = computed(() => {
  const iso = settings.value?.auctionCloseIso;
  return iso ? new Date(iso).getTime() <= now.value : false;
});

const conditionLabel: Record<string, string> = {
  NOWY: 'Nowy',
  BARDZO_DOBRY: 'Bardzo dobry',
  DOBRY: 'Dobry',
  USZKODZONY: 'Uszkodzony',
  DO_NAPRAWY: 'Do naprawy',
};

const conditionColors: Record<string, string> = {
  NOWY: 'bg-green-100 text-green-800',
  BARDZO_DOBRY: 'bg-cyan-100 text-emerald-800',
  DOBRY: 'bg-amber-100 text-amber-800',
  USZKODZONY: 'bg-red-100 text-red-800',
  DO_NAPRAWY: 'bg-orange-100 text-orange-800',
};

const badgeBase =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium';
const badgeVariants = {
  statusActive: 'bg-green-100 text-green-800',
  statusEnded: 'bg-slate-200 text-slate-700',
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
    hasStarted.value &&
    !auctionClosed.value
);

const shippingOptionsCount = computed(() => {
  if (!auction.value) return 0;
  return [
    auction.value.personalPickup,
    auction.value.courierShipping,
    auction.value.invoice,
  ].filter(Boolean).length;
});

function toPLN(g: number) {
  return (g / 100).toFixed(2);
}

function updateTimeLeft() {
  if (!auction.value) return;
  const diff = new Date(auction.value.endsAt).getTime() - Date.now();
  timeLeft.value = Math.max(0, diff);
  if (diff <= 0 && countTimer) window.clearInterval(countTimer);
}

function setActive(i: number) {
  currentImg.value = i;
  thumbOffset.value = i;
}

function prevImage() {
  if (!auction.value?.images?.length) return;
  const n = auction.value.images.length;
  currentImg.value = (currentImg.value - 1 + n) % n;
  thumbOffset.value = currentImg.value;
}

function nextImage() {
  if (!auction.value?.images?.length) return;
  const n = auction.value.images.length;
  currentImg.value = (currentImg.value + 1) % n;
  thumbOffset.value = currentImg.value;
}

function onKey(e: KeyboardEvent) {
  if (!previewOpen.value) return;
  if (e.key === 'Escape') {
    closePreview();
  } else if (e.key === 'ArrowLeft') {
    prevImage();
  } else if (e.key === 'ArrowRight') {
    nextImage();
  }
}

function openPreview(i?: number) {
  if (typeof i === 'number') setActive(i);
  previewOpen.value = true;
}

function closePreview() {
  previewOpen.value = false;
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
  await loadSettings();
  settingsTimer = window.setInterval(() => { now.value = Date.now(); }, 1000);
  pollTimer = window.setInterval(pollTop, 2000);
  if (!isEnded.value) countTimer = window.setInterval(updateTimeLeft, 1000);
  window.addEventListener('user-change', onUserChange);
  window.addEventListener('keydown', onKey);
  window.addEventListener('settings-change', loadSettings);
});

onUnmounted(() => {
  if (pollTimer) window.clearInterval(pollTimer);
  if (countTimer) window.clearInterval(countTimer);
  if (settingsTimer) window.clearInterval(settingsTimer);
  window.removeEventListener('user-change', onUserChange);
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('settings-change', loadSettings);
});
</script>

<template>
  <div v-if="auction" class="max-w-7xl mx-auto p-4 lg:p-6 flex flex-col lg:flex-row lg:items-stretch gap-6">
    <!-- Left column -->
    <div class="flex-1 flex">
      <div class="rounded-2xl bg-white/80 backdrop-blur shadow-lg p-4 flex flex-col h-full">
        <div
          class="relative bg-gray-100 rounded-xl flex items-center justify-center cursor-zoom-in h-[480px]"
          @click="openPreview(currentImg)"
        >
          <img
            v-if="auction.images?.[currentImg]"
            :src="`${backend}${auction.images[currentImg].url}`"
            alt=""
            class="h-full w-full object-contain rounded-xl"
          />
        </div>

        <!-- GALERIA MINIATUREK -->
        <div v-if="auction.images?.length > 1" class="mt-4">
          <div class="relative select-none rounded-xl bg-white shadow p-2">
            <!-- lewa -->
            <button
              aria-label="Poprzednie zdjęcie"
              @click="prevImage"
              class="absolute left-1 top-1/2 -translate-y-1/2 z-10 grid place-items-center
                     h-9 w-9 rounded-full bg-slate-800/85 text-white shadow-md ring-1 ring-white/15
                     backdrop-blur transition hover:bg-slate-800 focus:outline-none
                     focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <svg width="18" height="18" viewBox="9 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 18L9 12l6-6"/>
              </svg>
            </button>

            <!-- pasek miniaturek -->
            <div class="flex gap-3 px-12 py-2 overflow-hidden">
              <button
                v-for="t in visibleThumbs"
                :key="t.index"
                @click="setActive(t.index)"
                :data-active="t.index === currentImg"
                class="relative shrink-0 aspect-square w-20 md:w-24 overflow-hidden
                       bg-transparent p-0 border-0 rounded-md
                       focus:outline-none ring-0
                       data-[active=true]:ring-2 data-[active=true]:ring-sky-500 data-[active=true]:ring-offset-2 data-[active=true]:ring-offset-white"
              >
                <img
                  :src="`${backend}${t.img.url}`"
                  :alt="t.img.alt || `Zdjęcie ${t.index+1}`"
                  class="block h-full w-full object-cover select-none"
                  draggable="false"
                />
              </button>
            </div>

            <!-- prawa -->
            <button
              aria-label="Następne zdjęcie"
              @click="nextImage"
              class="absolute right-1 top-1/2 -translate-y-1/2 z-10 grid place-items-center
                     h-9 w-9 rounded-full bg-slate-800/85 text-white shadow-md ring-1 ring-white/15
                     backdrop-blur transition hover:bg-slate-800 focus:outline-none
                     focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M0 6l6 6-6 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Right column -->
    <div class="w-full lg:w-96 flex">
      <div class="relative rounded-2xl bg-white/80 backdrop-blur shadow-lg p-7 space-y-2 sticky top-24 h-full flex flex-col">
        <!-- Ulubione -->
        <button
          v-if="user"
          @click="toggleFavorite"
          aria-label="Dodaj do ulubionych"
          class="absolute right-4 top-4 transition-transform hover:scale-110 focus:outline-none"
          :class="isFavorite ? 'text-amber-400 hover:text-amber-500' : 'text-slate-400 hover:text-slate-500'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 0 0 .95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.383 2.46a1 1 0 0 0-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.384-2.46a1 1 0 0 0-1.176 0l-3.384 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 0 0-.364-1.118L2.044 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 0 0 .95-.69l1.286-3.967z"/>
          </svg>
        </button>

        <!-- Badges -->
        <div class="space-y-2">
          <div>
            <div class="text-xs text-slate-500 mb-1">Status aukcji:</div>
            <span :class="[badgeBase, auction.status === 'ENDED' ? badgeVariants.statusEnded : badgeVariants.statusActive]">
              {{ auction.status === 'ENDED' ? 'Zakończona' : 'Aktywna' }}
            </span>
          </div>
          <div>
            <div class="text-xs text-slate-500 mb-1">Stan sprzętu:</div>
            <span :class="[badgeBase, conditionColors[auction.condition] || 'bg-slate-100 text-slate-800']">
              {{ conditionLabel[auction.condition] || auction.condition }}
            </span>
          </div>
          <div v-if="auction.featured">
            <span :class="[badgeBase, badgeVariants.featured]">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.383 2.46a1 1 0 0 0-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.384-2.46a1 1 0 0 0-1.176 0l-3.384 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 0 0-.364-1.118L2.044 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 0 0 .95-.69l1.286-3.967z"/></svg>
            Wyróżniona
            </span>
          </div>
        </div>

        <h2 class="text-2xl font-bold">{{ auction.title }}</h2>

        <p class="text-gray-700 text-sm"
           style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          {{ auction.description }}
        </p>

        <div>
          <span class="inline-flex items-center rounded-full bg-sky-100 text-sky-800 px-2.5 py-1 text-xs font-medium">Aktualna oferta</span>
          <div class="mt-1 text-4xl font-bold">{{ toPLN(topAmount) }} PLN</div>
        </div>

        <div v-if="auction.status !== 'ENDED' && hasStarted" class="flex items-center gap-2 rounded-lg bg-amber-50 text-amber-900 px-3 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3" />
          </svg>
          <span>Pozostało: {{ formattedTimeLeft }}</span>
        </div>

        <div v-if="auction.status !== 'ENDED' && hasStarted">
          <div v-if="!auctionClosed" class="space-y-2">
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 select-none">PLN</span>
              <input v-model="bidAmount" type="number" class="w-full h-11 rounded-xl border pl-12 pr-3 focus:outline-none focus:ring" :min="minBidPLN" />
            </div>
            <p v-if="bidError" class="text-sm text-red-600">{{ bidError }}</p>
            <button @click="placeBid" :disabled="!canBid" :aria-disabled="!canBid"
                    class="w-full h-11 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
              <span v-if="!loading">Licytuj</span>
              <span v-else class="animate-pulse">...</span>
            </button>
            <p class="text-sm text-gray-500">Min. przebicie: {{ toPLN(auction.minIncrement) }} PLN</p>
          </div>
          <p v-else class="text-gray-500">Dom aukcyjny jest zamknięty.</p>
        </div>
        <p v-else-if="auction.status !== 'ENDED'" class="text-gray-500">Aukcja jeszcze się nie rozpoczęła.</p>

        <div v-if="shippingOptionsCount" class="pt-4">
          <div class="rounded-xl bg-gray-50 p-4">
            <div class="text-sm font-medium mb-2">Dodatkowe Informacje</div>
            <div
              class="grid gap-2"
              :class="{
                'grid-cols-1': shippingOptionsCount === 1,
                'grid-cols-2': shippingOptionsCount === 2,
                'grid-cols-3': shippingOptionsCount === 3,
              }"
            >
              <div v-if="auction.personalPickup" class="flex flex-col items-center p-3 bg-white rounded-lg">
                <span>🚗</span><span class="text-xs mt-1">Odbiór Osobisty</span>
              </div>
              <div v-if="auction.courierShipping" class="flex flex-col items-center p-3 bg-white rounded-lg">
                <span>📦</span><span class="text-xs mt-1">Wysyłka Kurierem</span>
              </div>
              <div v-if="auction.invoice" class="flex flex-col items-center p-3 bg-white rounded-lg">
                <span>🧾</span><span class="text-xs mt-1">Możliwa Faktura</span>
              </div>
            </div>
          </div>
        </div>

        <p v-if="msg" class="text-red-600 text-sm">{{ msg }}</p>
      </div>
    </div>
  </div>

  <p v-else>Ładowanie…</p>

  <!-- PREVIEW -->
  <div
    v-if="previewOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
    @keyup.esc="closePreview"
    @click.self="closePreview"
  >
<!-- Close -->
<button
  aria-label="Zamknij podgląd"
  @click="closePreview"
  class="absolute top-6 right-6 flex items-center justify-center
         w-8 h-12 rounded-full                <!-- większy + zawsze idealne koło -->
         bg-white/10 text-white text-2xl       <!-- X większy -->
         leading-none                          <!-- brak dodatkowego odstępu -->
         hover:bg-white/20 focus:outline-none
         focus-visible:ring-2 focus-visible:ring-sky-400"
>
  <span class="pointer-events-none select-none">×</span>
</button>


    <!-- Prev -->
    <button
      aria-label="Poprzednie zdjęcie"
      @click.stop="prevImage"
      class="absolute left-4 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
      <svg width="18" height="18" viewBox="9 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 18L9 12l6-6"/>
      </svg>
    </button>

    <!-- Img -->
    <img
      v-if="auction.images?.[currentImg]"
      :src="`${backend}${auction.images[currentImg].url}`"
      alt=""
      class="max-h-[80vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
    />

    <!-- Next -->
    <button
      aria-label="Następne zdjęcie"
      @click.stop="nextImage"
      class="absolute right-4 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M0 6l6 6-6 6"/>
    </svg>
    </button>
  </div>
</template>

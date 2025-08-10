<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api';

const router = useRouter();
const user = computed(() => {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
});

const settings = ref<{ nextAuctionIso: string | null } | null>(null);
const now = ref(Date.now());
let timer: number | null = null;

onMounted(async () => {
  try { const { data } = await api.get('/settings'); settings.value = data; } catch {}
  timer = window.setInterval(() => { now.value = Date.now(); }, 1000);
});

onBeforeUnmount(() => { if (timer) clearInterval(timer); });

const auctionsActive = computed(() => {
  const iso = settings.value?.nextAuctionIso;
  if (!iso) return false;
  return new Date(iso).getTime() <= now.value;
});

function logout() {
  localStorage.removeItem('user');
  router.push('/');
  window.location.reload();
}
</script>

<template>
  <header class="topbar">
    <router-link to="/" class="brand" aria-label="Altkom Software">
      <span class="logo-alt">alt</span>
      <span class="logo-box"><span class="logo-k">kom</span></span>
      <span class="logo-om"> software</span>
    </router-link>
    <nav class="nav-links">
      <router-link to="/">Strona Główna</router-link>
      <router-link v-if="auctionsActive" to="/auctions">Aukcje</router-link>
      <router-link to="/info">Informacje</router-link>
      <router-link to="/contact">Kontakt</router-link>
    </nav>
    <div class="user-links">
      <router-link to="/admin" class="admin-link">Panel admina</router-link>
      <router-link v-if="!user" to="/login">Zaloguj</router-link>
      <span v-else class="welcome">Witaj, {{ user.name }}</span>
      <button v-if="user" class="btn small logout-btn" @click="logout">Wyloguj</button>
    </div>
  </header>
</template>

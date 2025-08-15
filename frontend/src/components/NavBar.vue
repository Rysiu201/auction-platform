<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api';

const router = useRouter();
const user = ref<any>(null);
function loadUser() {
  const raw = localStorage.getItem('user');
  user.value = raw ? JSON.parse(raw) : null;
}
const isAdmin = computed(() => user.value?.role === 'ADMIN');
const menuOpen = ref(false);

const settings = ref<{ nextAuctionIso: string | null; auctionCloseIso: string | null } | null>(null);
const now = ref(Date.now());
let timer: number | null = null;

async function loadSettings() {
  try { const { data } = await api.get('/settings'); settings.value = data; } catch {}
}

onMounted(async () => {
  loadUser();
  await loadSettings();
  timer = window.setInterval(() => { now.value = Date.now(); }, 1000);
  window.addEventListener('user-change', loadUser);
  window.addEventListener('settings-change', loadSettings);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  window.removeEventListener('user-change', loadUser);
  window.removeEventListener('settings-change', loadSettings);
});

const auctionsActive = computed(() => {
  const startIso = settings.value?.nextAuctionIso;
  const closeIso = settings.value?.auctionCloseIso;
  if (!startIso) return false;
  const start = new Date(startIso).getTime();
  const close = closeIso ? new Date(closeIso).getTime() : Infinity;
  return start <= now.value && now.value < close;
});

const closeCountdown = computed(() => {
  const closeIso = settings.value?.auctionCloseIso;
  if (!closeIso) return null;
  const ms = new Date(closeIso).getTime() - now.value;
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

function logout() {
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('user-change'));
  router.push('/');
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
      <div v-if="user">
        <div v-if="isAdmin" class="admin-dropdown">
          <button class="admin-link" @click="menuOpen = !menuOpen">Menu ▾</button>
          <div v-if="menuOpen" class="dropdown-menu">
            <router-link to="/admin" @click="menuOpen=false">Panel Admina</router-link>
            <router-link to="/my-auctions" @click="menuOpen=false">Moje Aukcje</router-link>
          </div>
        </div>
        <router-link v-else to="/my-auctions" class="user-link">Moje Aukcje</router-link>
      </div>
      <router-link class="login-button" v-if="!user" to="/login">Zaloguj</router-link>
      <span v-else class="welcome">Witaj, <strong class="username">{{ user.name }}</strong></span>
      <button v-if="user" class="btn logout-btn" @click="logout">Wyloguj</button>
    </div>
  </header>
  <div v-if="auctionsActive && closeCountdown" class="close-bubble">Zamknięcie za {{ closeCountdown }}</div>
</template>

<style scoped>
.admin-dropdown { position: relative; display:inline-block; }
.dropdown-menu { 
  position:absolute; 
  right:0; 
  background:#fff; 
  border:1px solid #c9d3dd; 
  display:flex; 
  flex-direction:column;
  border-radius: 1vh;
}
.dropdown-menu a { padding:6px 12px; white-space:nowrap; }
.login-button{
  justify-content: center;
  display: flex;
  background: #0059b3;
  border-color: #0059b3;
  align-items: center;
  width: 5vh;
  height: 2.5vh;
  margin-left: 1vh;
  margin-right: 1vh;
  border-radius: 1vh;
  border-width: 0.2vh;
  border-style: none;
  border-color: black;
  text-align: center;
  color: white;
}

.login-button:hover {
  background: #0073e6;
  border-color: #0073e6;
}

.username{
  font-weight: bold;
}

.user-link{
  justify-content: center;
  position:flex; 
  align-items: center;
  width: 8vh;
  height: 3.0vh;
  right:0; 
  background:#fff; 
  border:1vh solid slategray; 
  display:flex;
  border-radius: 2vh;
  text-align: center;
  border-width: 0.2vh;
  background-color: #65A30D;
  color: white
}

.user-link:hover{
  background: #79b623;
  border-color: #79b623;
}

.close-bubble {
  position: fixed;
  top: 10px;
  right: 10px;
  background: #ff4f64;
  color: #fff;
  padding: 6px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  z-index: 1000;
}
</style>

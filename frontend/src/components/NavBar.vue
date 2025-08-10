<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const user = computed(() => {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
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
      <span class="logo-alt">alt</span><span class="logo-kom">kom</span>
      <span class="logo-om">software</span>
    </router-link>
    <nav class="nav-links">
      <router-link to="/">Start</router-link>
      <router-link to="/auctions">Aukcje</router-link>
      <router-link to="/info">Informacje</router-link>
      <router-link to="/contact">Kontakt</router-link>
    </nav>
    <div class="user-links">
      <router-link v-if="user?.role==='ADMIN'" to="/admin" class="admin-link">Panel admina</router-link>
      <router-link v-if="!user" to="/login">Zaloguj</router-link>
      <span v-else class="welcome">Witaj, {{ user.name }}</span>
      <button v-if="user" class="btn small logout-btn" @click="logout">Wyloguj</button>
    </div>
  </header>
</template>

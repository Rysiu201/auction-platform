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
    <router-link to="/" class="brand">Altkom Software &amp; Consulting</router-link>
    <nav class="nav-links">
      <router-link to="/">Lista</router-link>
      <router-link v-if="user?.role==='ADMIN'" to="/create">Dodaj aukcję</router-link>
      <router-link v-if="user?.role==='ADMIN'" to="/admin">Panel admina</router-link>
    </nav>
    <div class="user-links">
      <router-link v-if="!user" to="/login">Zaloguj</router-link>
      <span v-else class="welcome">Witaj, {{ user.name }}</span>
      <button v-if="user" class="btn small" @click="logout">Wyloguj</button>
    </div>
  </header>
</template>

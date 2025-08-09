<script setup lang="ts">
import { computed } from "vue";

const user = computed(() => {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
});
</script>

<template>
  <header style="padding:12px;border-bottom:1px solid #eee;display:flex;gap:12px">
    <router-link to="/" style="font-weight:700;text-decoration:none;color:#111">Auctions</router-link>
    <nav style="margin-left:auto;display:flex;gap:10px">
      <router-link to="/">Lista</router-link>
      <router-link v-if="user?.role==='ADMIN'" to="/create">Dodaj aukcję</router-link>
      <router-link v-if="!user" to="/login">Zaloguj</router-link>
      <span v-else>Witaj, {{ user.name }}</span>
    </nav>
  </header>
  <main style="max-width:960px;margin:20px auto;padding:0 16px">
    <router-view />
  </main>
</template>

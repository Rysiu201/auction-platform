<script setup lang="ts">
import { useRoute } from "vue-router";
import NavBar from "@/components/NavBar.vue";

const route = useRoute();
</script>

<template>
  <NavBar />
  <main class="container">
    <!-- Remount widoków przy każdej zmianie ścieżki -->
    <RouterView :key="route.fullPath" />
  </main>
</template>

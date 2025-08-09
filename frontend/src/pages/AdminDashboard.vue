<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/api';

type Auction = {
  id: string;
  title: string;
};

const auctions = ref<Auction[]>([]);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const { data } = await api.get('/auctions');
    auctions.value = data;
  } catch (e: any) {
    error.value = e?.message ?? 'Błąd';
  }
});
</script>

<template>
  <section>
    <h1>Panel administracyjny</h1>
    <p v-if="error" style="color:red">{{ error }}</p>
    <ul>
      <li v-for="a in auctions" :key="a.id">{{ a.title }}</li>
    </ul>
  </section>
</template>


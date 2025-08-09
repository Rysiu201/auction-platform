<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/api';

type Winner = { amount: number; user: { name: string } } | null;
type Auction = { id: string; title: string; winnerBid?: Winner };
type Overview = {
  active: Auction[];
  ended: Auction[];
  noBids: Auction[];
};

const overview = ref<Overview | null>(null);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const { data } = await api.get('/auctions/admin/overview');
    overview.value = data;
  } catch (e: any) {
    error.value = e?.message ?? 'Błąd';
  }
});
</script>

<template>
  <section>
    <h1>Panel administracyjny</h1>
    <p v-if="error" style="color:red">{{ error }}</p>
    <div v-else-if="overview">
      <h2>Aktywne aukcje</h2>
      <ul>
        <li v-for="a in overview.active" :key="a.id">{{ a.title }}</li>
      </ul>

      <h2>Zakończone aukcje</h2>
      <ul>
        <li v-for="a in overview.ended" :key="a.id">
          {{ a.title }} - {{ a.winnerBid?.user.name }} -
          {{ (a.winnerBid?.amount || 0) / 100 }} PLN
        </li>
      </ul>

      <h2>Do ponownego wystawienia</h2>
      <ul>
        <li v-for="a in overview.noBids" :key="a.id">{{ a.title }}</li>
      </ul>
    </div>
  </section>
</template>


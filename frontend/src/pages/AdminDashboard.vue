<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/api';

type Winner = { amount: number; user: { name: string } } | null;
type Auction = {
  id: string;
  title: string;
  basePrice: number;
  startsAt: string;
  endsAt: string;
  winnerBid?: Winner;
};
type Overview = {
  active: Auction[];
  ended: Auction[];
  noBids: Auction[];
};

const overview = ref<Overview | null>(null);
const error = ref<string | null>(null);

const relistAuction = ref<Auction | null>(null);
const basePricePLN = ref('');
const minIncrementPLN = ref('');
const startsAt = ref('');
const endsAt = ref('');

function fmtDate(dt: string) {
  return new Date(dt).toLocaleString();
}
function fmtPrice(p: number) {
  return (p / 100).toFixed(2) + ' PLN';
}

async function fetchOverview() {
  try {
    const { data } = await api.get('/auctions/admin/overview');
    overview.value = data;
  } catch (e: any) {
    error.value = e?.message ?? 'Błąd';
  }
}

onMounted(fetchOverview);

function openRelist(a: Auction) {
  relistAuction.value = a;
  basePricePLN.value = '';
  minIncrementPLN.value = '';
  startsAt.value = '';
  endsAt.value = '';
}

async function submitRelist() {
  if (!relistAuction.value) return;
  try {
    await api.post(`/auctions/${relistAuction.value.id}/relist`, {
      basePricePLN: basePricePLN.value,
      minIncrementPLN: minIncrementPLN.value,
      startsAt: startsAt.value,
      endsAt: endsAt.value,
    });
    relistAuction.value = null;
    await fetchOverview();
  } catch (e: any) {
    alert(e?.response?.data?.message ?? 'Błąd');
  }
}
</script>

<template>
  <section class="admin-dashboard">
    <h1>Panel administracyjny</h1>
    <div class="admin-layout">
      <aside class="admin-nav">
        <ul>
          <li class="active"><router-link to="/admin">Aukcje</router-link></li>
        </ul>
      </aside>
      <main class="admin-content">
        <p v-if="error" style="color:red">{{ error }}</p>
        <div v-else-if="overview" class="auction-overview">
          <div class="overview-column">
            <h2>Aktywne</h2>
            <table>
              <tr><th>Tytuł</th><th>Koniec</th></tr>
              <tr v-for="a in overview.active" :key="a.id">
                <td>{{ a.title }}</td>
                <td>{{ fmtDate(a.endsAt) }}</td>
              </tr>
            </table>
          </div>
          <div class="overview-column">
            <h2>Zakończone</h2>
            <table>
              <tr><th>Tytuł</th><th>Zwycięzca</th><th>Kwota</th></tr>
              <tr v-for="a in overview.ended" :key="a.id">
                <td>{{ a.title }}</td>
                <td>{{ a.winnerBid?.user.name || '—' }}</td>
                <td>{{ fmtPrice(a.winnerBid?.amount || 0) }}</td>
              </tr>
            </table>
          </div>
          <div class="overview-column">
            <h2>Do ponownego wystawienia</h2>
            <table>
              <tr>
                <th>Tytuł</th>
                <th>Cena</th>
                <th>Start</th>
                <th>Koniec</th>
                <th></th>
              </tr>
              <tr v-for="a in overview.noBids" :key="a.id">
                <td>{{ a.title }}</td>
                <td>{{ fmtPrice(a.basePrice) }}</td>
                <td>{{ fmtDate(a.startsAt) }}</td>
                <td>{{ fmtDate(a.endsAt) }}</td>
                <td><button class="btn small" @click="openRelist(a)">Wystaw ponownie</button></td>
              </tr>
            </table>
          </div>
        </div>
      </main>
    </div>

    <div v-if="relistAuction" class="modal-backdrop">
      <div class="modal">
        <h3>Wystaw ponownie: {{ relistAuction.title }}</h3>
        <form @submit.prevent="submitRelist" class="form">
          <input v-model="basePricePLN" type="number" step="1" placeholder="Cena wywoławcza (PLN)" required />
          <input v-model="minIncrementPLN" type="number" step="1" placeholder="Min. przebitka (PLN)" required />
          <label>Data rozpoczęcia: <input v-model="startsAt" type="datetime-local" required /></label>
          <label>Data zakończenia: <input v-model="endsAt" type="datetime-local" required /></label>
          <div class="modal-actions">
            <button type="submit">Zapisz</button>
            <button type="button" @click="relistAuction = null">Anuluj</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>


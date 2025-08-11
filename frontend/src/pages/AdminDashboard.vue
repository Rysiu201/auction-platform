<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { api } from '@/api';
import { socket } from '@/socket';

type Winner = { amount: number; user: { name: string } } | null;
type Auction = {
  id: string;
  title: string;
  basePrice: number;
  startsAt: string;
  endsAt: string;
  winnerBid?: Winner;
  bids?: { amount: number; user?: { name: string } }[];
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

const editAuction = ref<any | null>(null);
const editTitle = ref('');
const editDescription = ref('');
const editBasePricePLN = ref('');
const editMinIncrementPLN = ref('');
const editStartsAt = ref('');
const editEndsAt = ref('');

function toLocalInput(dt: string) {
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISO(dt: string) {
  return dt ? new Date(dt).toISOString() : '';
}
function fmtDate(dt: string) {
  return new Date(dt).toLocaleString();
}
function fmtPrice(p: number) {
  return (p / 100).toFixed(2) + ' PLN';
}

function timeLeft(a: Auction) {
  const ms = new Date(a.endsAt).getTime() - now.value;
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
}

async function fetchOverview() {
  try {
    const { data } = await api.get('/auctions/admin/overview');
    overview.value = data;
    data.active.forEach(a => socket.emit('join-auction', a.id));
  } catch (e: any) {
    error.value = e?.message ?? 'Błąd';
  }
}

let timer: number | undefined;
let nowInterval: number | undefined;
const now = ref(Date.now());

function handleNewBid(payload: { auctionId: string; amount: number; user: { name: string } }) {
  const auction = overview.value?.active.find(a => a.id === payload.auctionId);
  if (auction) {
    auction.bids = [{ amount: payload.amount, user: { name: payload.user.name } }];
  }
}

onMounted(() => {
  fetchOverview();
  timer = window.setInterval(fetchOverview, 5000);
  nowInterval = window.setInterval(() => (now.value = Date.now()), 1000);
  socket.on('new-bid', handleNewBid);
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
  if (nowInterval) window.clearInterval(nowInterval);
  socket.off('new-bid', handleNewBid);
});

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
      startsAt: toISO(startsAt.value),
      endsAt: toISO(endsAt.value),
    });
    relistAuction.value = null;
    await fetchOverview();
  } catch (e: any) {
    alert(e?.response?.data?.message ?? 'Błąd');
  }
}

async function openEdit(a: Auction) {
  try {
    const { data } = await api.get(`/auctions/${a.id}`);
    editAuction.value = data;
    editTitle.value = data.title;
    editDescription.value = data.description;
    editBasePricePLN.value = String(data.basePrice / 100);
    editMinIncrementPLN.value = String(data.minIncrement / 100);
    editStartsAt.value = toLocalInput(data.startsAt);
    editEndsAt.value = toLocalInput(data.endsAt);
  } catch (e) {
    alert('Błąd pobierania aukcji');
  }
}

async function submitEdit() {
  if (!editAuction.value) return;
  try {
    await api.put(`/auctions/${editAuction.value.id}`, {
      title: editTitle.value,
      description: editDescription.value,
      basePricePLN: editBasePricePLN.value,
      minIncrementPLN: editMinIncrementPLN.value,
      startsAt: toISO(editStartsAt.value),
      endsAt: toISO(editEndsAt.value),
    });
    editAuction.value = null;
    await fetchOverview();
  } catch (e: any) {
    alert(e?.response?.data?.message ?? 'Błąd');
  }
}

async function deleteAuction(id: string) {
  if (!confirm('Usunąć aukcję?')) return;
  try {
    await api.delete(`/auctions/${id}`);
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
      <section class="admin navbar">
        <aside class="admin-nav">
          <ul>
            <li><router-link to="/admin/create">Dodaj Aukcję</router-link></li>
            <li><router-link to="/admin">Aukcje</router-link></li>
            <li><router-link to="/admin/settings">Ustawienia</router-link></li>
          </ul>
        </aside>
      </section>
      <main class="admin-content">
        <p v-if="error" style="color:red">{{ error }}</p>
        <div v-else-if="overview" class="auction-overview">
          <div class="overview-column">
            <h2>Aktywne</h2>
            <table>
              <thead>
                <tr><th>Tytuł</th><th>Cena</th><th>Zwycięzca</th><th>Pozostały czas</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="a in overview.active" :key="a.id">
                  <td>{{ a.title }}</td>
                  <td>{{ fmtPrice(Math.max(a.basePrice, a.bids?.[0]?.amount || 0)) }}</td>
                  <td>{{ a.bids?.[0]?.user?.name || '—' }}</td>
                  <td>{{ timeLeft(a) }}</td>
                  <td><button class="btn small" @click="openEdit(a)">Edytuj</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="overview-column">
            <h2>Zakończone</h2>
            <table>
              <thead>
                <tr><th>Tytuł</th><th>Zwycięzca</th><th>Kwota</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="a in overview.ended" :key="a.id">
                  <td>{{ a.title }}</td>
                  <td>{{ a.winnerBid?.user.name || '—' }}</td>
                  <td>{{ fmtPrice(a.winnerBid?.amount || 0) }}</td>
                  <td><button class="btn small" @click="deleteAuction(a.id)">Usuń</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="overview-column">
            <h2>Do ponownego wystawienia</h2>
            <table>
              <thead>
                <tr>
                  <th>Tytuł</th>
                  <th>Cena</th>
                  <th>Start</th>
                  <th>Koniec</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in overview.noBids" :key="a.id">
                  <td>{{ a.title }}</td>
                  <td>{{ fmtPrice(a.basePrice) }}</td>
                  <td>{{ fmtDate(a.startsAt) }}</td>
                  <td>{{ fmtDate(a.endsAt) }}</td>
                  <td>
                    <button class="btn small" @click="openRelist(a)">Wystaw ponownie</button>
                    <button class="btn small" @click="deleteAuction(a.id)">Usuń Aukcję</button>
                  </td>
                </tr>
              </tbody>
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
    <div v-if="editAuction" class="modal-backdrop">
      <div class="modal">
        <h3>Edytuj aukcję: {{ editTitle }}</h3>
        <form @submit.prevent="submitEdit" class="form">
          <input v-model="editTitle" placeholder="Tytuł" required />
          <textarea v-model="editDescription" placeholder="Opis" rows="4" required />
          <input v-model="editBasePricePLN" type="number" step="1" placeholder="Cena wywoławcza (PLN)" required />
          <input v-model="editMinIncrementPLN" type="number" step="1" placeholder="Min. przebitka (PLN)" required />
          <label>Data rozpoczęcia: <input v-model="editStartsAt" type="datetime-local" required /></label>
          <label>Data zakończenia: <input v-model="editEndsAt" type="datetime-local" required /></label>
          <div class="modal-actions">
            <button type="submit">Zapisz</button>
            <button type="button" @click="editAuction = null">Anuluj</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-navbar { padding:40px 20px; text-align:left; }

.admin-nav { padding:40px 20px; text-align:left; }
</style>


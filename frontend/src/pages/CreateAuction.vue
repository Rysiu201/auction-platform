<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/api";

const router = useRouter();
const title = ref(""); const description = ref("");
const basePricePLN = ref(""); const minIncrementPLN = ref("");
const reservePricePLN = ref(""); const startsAt = ref(""); const endsAt = ref("");
const mainImage = ref<File|null>(null);
const extraImages = ref<File[]>([]);
const mainPreview = ref<string>('');
const extraPreviews = ref<string[]>([]);
const ok = ref<string|null>(null); const error = ref<string|null>(null); const loading = ref(false);
const condition = ref('DOBRY');
const personalPickup = ref(false);
const courierShipping = ref(false);
const invoice = ref(false);

function toISO(dt: string) { return dt ? new Date(dt).toISOString() : ""; }

async function submit() {
  loading.value = true; ok.value = null; error.value = null;
  try {
    const fd = new FormData();
    fd.append("title", title.value);
    fd.append("description", description.value);
    fd.append("basePricePLN", basePricePLN.value);
    fd.append("minIncrementPLN", minIncrementPLN.value);
    if (reservePricePLN.value) fd.append("reservePricePLN", reservePricePLN.value);
    fd.append("condition", condition.value);
    fd.append("personalPickup", String(personalPickup.value));
    fd.append("courierShipping", String(courierShipping.value));
    fd.append("invoice", String(invoice.value));
    fd.append("startsAt", toISO(startsAt.value));
    fd.append("endsAt", toISO(endsAt.value));
    if (mainImage.value) fd.append("images", mainImage.value);
    extraImages.value.forEach(f => fd.append("images", f));

    const { data } = await api.post("/auctions", fd);
    ok.value = `Utworzono: ${data.title}`; setTimeout(() => router.push("/"), 700);
  } catch (e:any) {
    error.value = e?.response?.data?.message ?? "Błąd tworzenia (czy jesteś zalogowany jako ADMIN?)";
  } finally { loading.value = false; }
}

function onMain(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] || null;
  mainImage.value = file;
  mainPreview.value = file ? URL.createObjectURL(file) : '';
}

function onExtras(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || []);
  extraImages.value.push(...files);
  extraPreviews.value.push(...files.map(f => URL.createObjectURL(f)));
  (e.target as HTMLInputElement).value = '';
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
        <div class="create-auction-wrapper">
          <div class="create-auction-card">
            <h2>Nowa aukcja</h2>
            <form @submit.prevent="submit" class="form">
        <input v-model="title" placeholder="Tytuł" required />
        <textarea v-model="description" placeholder="Opis" rows="4" required />
        <div class="form-row">
          <input v-model="basePricePLN" type="number" step="1.0" placeholder="Cena wywoławcza (PLN)" required />
          <input v-model="minIncrementPLN" type="number" step="1.0" placeholder="Min. przebitka (PLN)" required />
          <input v-model="reservePricePLN" type="number" step="1.0" placeholder="Cena minimalna (opc.)" />
        </div>
        <div class="form-row">
          <label>Data Rozpoczęcia: <input v-model="startsAt" type="datetime-local" required /></label>
          <label>Data Zakończenia: <input v-model="endsAt" type="datetime-local" required /></label>
        </div>
        <label>Stan sprzętu:
          <select v-model="condition">
            <option value="NOWY">Nowy</option>
            <option value="BARDZO_DOBRY">Bardzo dobry</option>
            <option value="DOBRY">Dobry</option>
            <option value="USZKODZONY">Uszkodzony</option>
            <option value="DO_NAPRAWY">Do naprawy</option>
          </select>
        </label>
        <label class="check-line"><input type="checkbox" v-model="personalPickup" /> Odbiór osobisty</label>
        <label class="check-line"><input type="checkbox" v-model="courierShipping" /> Wysyłka kurierem</label>
        <label class="check-line"><input type="checkbox" v-model="invoice" /> Faktura dostępna</label>
        <label class="file-line">Główne zdjęcie: <input type="file" @change="onMain" /></label>
        <div class="preview-images" v-if="mainPreview">
          <img :src="mainPreview" />
        </div>
        <label class="file-line">Dodatkowe zdjęcia: <input type="file" multiple @change="onExtras" /></label>
        <div class="preview-images" v-if="extraPreviews.length">
          <img v-for="(src,i) in extraPreviews" :src="src" :key="i" />
        </div>
        <button :disabled="loading" type="submit">Utwórz aukcję</button>
        <p v-if="ok" style="color:green">{{ ok }}</p>
        <p v-if="error" style="color:red">{{ error }}</p>
            </form>
          </div>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.create-auction-wrapper{ width:100%; display:flex; justify-content:center; }
.create-auction-card{
  width:100%;
  max-width: 820px;         /* <<< realistyczna szerokość formularza */
  background:#fff;
  border:1px solid #dbe2ea;
  border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,.08);
  padding:24px;
}
.create-auction-card h2{ margin:0 0 16px; }

/* --- formularz --- */
.form{ display:grid; gap:12px; }
.form-row{ display:grid; gap:12px; grid-template-columns: repeat(3, 1fr); }
input, textarea, select{
  width:100%;
  padding:10px 12px;
  border:1px solid #cfd8e3;
  border-radius:8px;
  font:inherit;
  box-sizing:border-box;
}
textarea{ resize:vertical; min-height:100px; }
label{ display:flex; align-items:center; gap:8px; }

/* przyciski */
button[type="submit"]{
  background:#0059b3; color:#fff; border:0; padding:12px 16px;
  border-radius:8px; font-weight:700; cursor:pointer;
}
button[disabled]{ opacity:.6; cursor:not-allowed; }

/* podglądy */
.preview-images{ display:flex; gap:8px; flex-wrap:wrap; }
.preview-images img{
  width:120px; height:120px; object-fit:cover;
  border-radius:8px; border:1px solid #e5e7eb;
}

/* --- RWD --- */
@media (max-width: 1100px){
  .admin-layout{ grid-template-columns: 200px 1fr; }
}
@media (max-width: 900px){
  .admin-layout{ grid-template-columns: 1fr; }
  .admin-nav{ position:static; }
  .form-row{ grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px){
  .form-row{ grid-template-columns: 1fr; } /* na telefonie jedna kolumna */
}

/* --- Checkboksy: spójne z wyglądem, równe odstępy --- */
.check-line{
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-weight: 500;
  color: #374151;
}
.check-line input[type="checkbox"]{
  width: 18px;
  height: 18px;
  accent-color: #0059b3;     /* brandowy kolor */
  cursor: pointer;
}

/* --- Pola plików: label + pole w jednej linii, ładny przycisk --- */
.file-line{
  display: grid;
  grid-template-columns: 160px 1fr;   /* tekst etykiety | kontrolka */
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  color: #374151;
  font-weight: 500;
}
.file-line input[type="file"]{
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #cfd8e3;
  border-radius: 8px;
  background: #fff;
  font: inherit;
  box-sizing: border-box;
}
.file-line input[type="file"]::file-selector-button{
  margin-right: 10px;
  padding: 8px 12px;
  border: 1px solid #0059b3;
  background: #0059b3;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color .2s, border-color .2s;
}
.file-line input[type="file"]::file-selector-button:hover{
  background: #004a99;
  border-color: #004a99;
}

/* dopasowanie podpisów po lewej (Główne/Dodatkowe zdjęcia) */
.file-line { text-align: left; }

</style>


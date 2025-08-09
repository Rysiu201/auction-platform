<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/api";

const router = useRouter();
const title = ref(""); const description = ref("");
const basePricePLN = ref(""); const minIncrementPLN = ref("");
const reservePricePLN = ref(""); const startsAt = ref(""); const endsAt = ref("");
const mainImage = ref<File|null>(null);
const extraImages = ref<FileList|null>(null);
const mainPreview = ref<string>('');
const extraPreviews = ref<string[]>([]);
const ok = ref<string|null>(null); const error = ref<string|null>(null); const loading = ref(false);

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
    fd.append("startsAt", toISO(startsAt.value));
    fd.append("endsAt", toISO(endsAt.value));
    if (mainImage.value) fd.append("images", mainImage.value);
    if (extraImages.value) Array.from(extraImages.value).forEach(f => fd.append("images", f));

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
  const files = (e.target as HTMLInputElement).files;
  extraImages.value = files;
  extraPreviews.value = files ? Array.from(files).map(f => URL.createObjectURL(f)) : [];
}
</script>

<template>
  <div class="create-auction-wrapper">
    <div class="create-auction-card">
      <h1>Nowa aukcja</h1>
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
        <label>Główne zdjęcie: <input type="file" @change="onMain" /></label>
        <div class="preview-images" v-if="mainPreview">
          <img :src="mainPreview" />
        </div>
        <label>Dodatkowe zdjęcia: <input type="file" multiple @change="onExtras" /></label>
        <div class="preview-images" v-if="extraPreviews.length">
          <img v-for="(src,i) in extraPreviews" :src="src" :key="i" />
        </div>
        <button :disabled="loading" type="submit">Utwórz aukcję</button>
        <p v-if="ok" style="color:green">{{ ok }}</p>
        <p v-if="error" style="color:red">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

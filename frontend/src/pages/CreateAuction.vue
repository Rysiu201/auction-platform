<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/api";

const router = useRouter();
const title = ref(""); const description = ref("");
const basePricePLN = ref("1000"); const minIncrementPLN = ref("10");
const reservePricePLN = ref(""); const startsAt = ref(""); const endsAt = ref("");
const images = ref<FileList|null>(null);
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
    if (images.value) Array.from(images.value).forEach(f => fd.append("images", f));

    const { data } = await api.post("/auctions", fd);
    ok.value = `Utworzono: ${data.title}`; setTimeout(() => router.push("/"), 700);
  } catch (e:any) {
    error.value = e?.response?.data?.message ?? "Błąd tworzenia (czy jesteś zalogowany jako ADMIN?)";
  } finally { loading.value = false; }
}
</script>

<template>
  <h1>Nowa aukcja</h1>
  <form @submit.prevent="submit" class="form">
    <input v-model="title" placeholder="Tytuł" required />
    <textarea v-model="description" placeholder="Opis" rows="4" required />
    <div class="form-row">
      <input v-model="basePricePLN" type="number" step="0.01" placeholder="Cena wywoławcza (PLN)" required />
      <input v-model="minIncrementPLN" type="number" step="0.01" placeholder="Min. przebitka (PLN)" required />
      <input v-model="reservePricePLN" type="number" step="0.01" placeholder="Cena minimalna (opc.)" />
    </div>
    <div class="form-row">
      <label>Start: <input v-model="startsAt" type="datetime-local" required /></label>
      <label>Koniec: <input v-model="endsAt" type="datetime-local" required /></label>
    </div>
    <label>Zdjęcia: <input type="file" multiple @change="e => images = (e.target as HTMLInputElement).files" /></label>
    <button :disabled="loading" type="submit">Utwórz aukcję</button>
    <p v-if="ok" style="color:green">{{ ok }}</p>
    <p v-if="error" style="color:red">{{ error }}</p>
  </form>
</template>

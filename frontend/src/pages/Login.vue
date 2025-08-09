<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/api";

const router = useRouter();
const email = ref("admin@local.test");
const password = ref("Admin123!");
const loading = ref(false); const error = ref<string|null>(null);

async function submit() {
  loading.value = true; error.value = null;
  try {
    const { data } = await api.post("/auth/login", { email: email.value, password: password.value });
    localStorage.setItem("user", JSON.stringify(data));
    router.push("/");
  } catch (e:any) {
    error.value = e?.response?.data?.message ?? "Błąd logowania";
  } finally { loading.value = false; }
}
</script>

<template>
  <h1>Logowanie</h1>
  <form @submit.prevent="submit" class="login-form">
    <input v-model="email" type="email" placeholder="email" required />
    <input v-model="password" type="password" placeholder="hasło" required />
    <button :disabled="loading" type="submit">Zaloguj</button>
    <p v-if="error" style="color:red">{{ error }}</p>
  </form>
</template>

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

async function loginSSO() {
  loading.value = true; error.value = null;
  try {
    const { data } = await api.post("/auth/sso");
    localStorage.setItem("user", JSON.stringify(data));
    router.push("/");
  } catch (e:any) {
    error.value = e?.response?.data?.message ?? "Błąd logowania SSO";
  } finally { loading.value = false; }
}

async function loginLDAP() {
  loading.value = true; error.value = null;
  try {
    const { data } = await api.post("/auth/ldap", { username: email.value, password: password.value });
    localStorage.setItem("user", JSON.stringify(data));
    router.push("/");
  } catch (e:any) {
    error.value = e?.response?.data?.message ?? "Błąd logowania LDAP";
  } finally { loading.value = false; }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Logowanie</h1>
      <form @submit.prevent="submit" class="login-form">
        <input v-model="email" type="email" placeholder="email" required />
        <input v-model="password" type="password" placeholder="hasło" required />
        <button :disabled="loading" type="submit">Zaloguj</button>
      </form>
      <div class="alt-logins">
        <button type="button" @click="loginSSO">Zaloguj przez SSO</button>
        <button type="button" @click="loginLDAP">Zaloguj przez LDAP</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

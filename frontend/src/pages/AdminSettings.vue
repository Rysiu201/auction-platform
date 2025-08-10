<script setup lang="ts">
import { ref } from 'vue';

const maxActiveAuctions = ref('');
const maxWonAuctions = ref('');
</script>

<template>
  <section class="admin-dashboard">
    <h1>Panel administracyjny</h1>
    <div class="admin-layout">
      <aside class="admin-nav">
        <ul>
          <li><router-link to="/admin/create">Dodaj Aukcję</router-link></li>
          <li><router-link to="/admin">Aukcje</router-link></li>
          <li><router-link to="/admin/settings">Ustawienia</router-link></li>
        </ul>
      </aside>
      <main class="admin-content">
        <h2>Ustawienia</h2>
        <form class="form">
          <label>Maks. aukcji na użytkownika:
            <input v-model="maxActiveAuctions" type="number" />
          </label>
          <label>Maks. wygranych aukcji:
            <input v-model="maxWonAuctions" type="number" />
          </label>
        </form>
      </main>
    </div>
  </section>
</template>

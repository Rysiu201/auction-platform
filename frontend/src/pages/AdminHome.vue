<script setup lang="ts">
</script>

<template>
  <section class="admin-dashboard">
    <h1>Panel administracyjny</h1>
    <div class="admin-layout">
      <aside class="admin-nav">
        <ul>
          <li><router-link to="/admin/create">Dodaj Aukcję</router-link></li>
          <li><router-link to="/admin/auctions">Aukcje</router-link></li>
          <li><router-link to="/admin/settings">Ustawienia</router-link></li>
        </ul>
      </aside>
      <main class="admin-content">
        <p>Wybierz sekcję z menu po lewej.</p>
      </main>
    </div>
  </section>
</template>

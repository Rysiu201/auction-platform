<script setup lang="ts">
</script>

<template>
  <section class="home-hero">
    <h1 class="welcome">
      Witamy na Aukcji Sprzętu
      <span class="brand inline-brand">
        <span class="logo-alt">alt</span>
        <span class="logo-box"><span class="logo-k">kom</span></span>
        <span class="logo-om">software</span>
      </span>
    </h1>
    <p class="hero-subtitle">
      Dołącz do naszych licytacji firmowego sprzętu komputerowego – głównie laptopów używanych w różnym stanie technicznym. Każdy przedmiot ma indywidualny opis, abyś mógł dokładnie poznać jego specyfikację i stan przed licytacją. Licytuj w czasie rzeczywistym i zdobądź sprzęt w korzystnej cenie. Sprawdź aktualne aukcje i złóż swoją ofertę już teraz!
    </p>
    <router-link to="/auctions" class="cta-button">Zobacz Aktualne Aukcje</router-link>
  </section>
</template>

<style scoped>
.home-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 20px;
}

.inline-brand {
  margin-left: 4px;
}

.welcome {
  white-space: normal;
}

.hero-subtitle {
  max-width: 800px;
  margin-top: 20px;
}

.cta-button {
  margin-top: 30px;
  background: #0059b3;
  color: #fff;
  padding: 12px 24px;
  border-radius: 25px;
  transition: background-color 0.3s;
  display: inline-block;
}

.cta-button:hover {
  background: #0066cc;
}
</style>

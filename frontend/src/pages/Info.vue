<script setup lang="ts">
// brak logiki
</script>

<template>
  <div class="page">
    <!-- BODY -->
    <section class="info">
      <div class="container">
        <!-- hero -->
        <header class="hero">
          <h1>Informacje</h1>
          <p>
            Altkom Software – aukcje firmowych <strong>laptopów</strong>.
            Prosto, przejrzyście i bezpiecznie.
          </p>
        </header>

        <!-- Jak to działa -->
        <section aria-labelledby="how" class="block">
          <h2 id="how" class="h2">Jak działają aukcje</h2>
          <ol class="steps">
            <li class="step">
              <div class="badge">1</div>
              <div class="body">
                <p class="title">Logowanie</p>
                <p class="muted">Zaloguj się (SSO/konto) i zaakceptuj regulamin.</p>
              </div>
            </li>
            <li class="step">
              <div class="badge">2</div>
              <div class="body">
                <p class="title">Wybór aukcji</p>
                <p class="muted">Otwórz kartę laptopa i sprawdź opis, stan oraz zdjęcia.</p>
              </div>
            </li>
            <li class="step">
              <div class="badge">3</div>
              <div class="body">
                <p class="title">Licytacja</p>
                <p class="muted">Podaj kwotę ≥ minimalne przebicie. Najwyższa oferta prowadzi.</p>
              </div>
            </li>
            <li class="step">
              <div class="badge">4</div>
              <div class="body">
                <p class="title">Zakończenie</p>
                <p class="muted">Po zakończeniu wygrywa najwyższa ważna oferta.</p>
              </div>
            </li>
            <li class="step step--wide">
              <div class="badge">5</div>
              <div class="body">
                <p class="title">Odbiór i płatność</p>
                <p class="muted">
                  Szczegóły (forma płatności, odbiór osobisty/kurier, faktura) są widoczne na stronie aukcji.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <!-- Co licytujemy -->
        <section aria-labelledby="what" class="block">
          <h2 id="what" class="h2">Co licytujemy i jak opisujemy stan</h2>
          <div class="card">
            <p>
              Licytacje obejmują wyłącznie <strong>laptopy</strong> wycofywane z użytku firmowego.
              Każdy egzemplarz przechodzi weryfikację podstawowych funkcji oraz czyszczenie danych.
            </p>
            <ul class="pill-list">
              <li><span class="pill pill--ok">Nowy/Bardzo dobry/Dobry</span> – normalne ślady użycia, w pełni sprawny.</li>
              <li><span class="pill pill--warn">Uszkodzony/Do naprawy</span> – usterki opisane w aukcji, sprzedaż w stanie istniejącym.</li>
            </ul>
            <p class="footnote">Zdjęcia w aukcji prezentują realny stan konkretnego egzemplarza.</p>
          </div>
        </section>

        <!-- Zasady -->
        <section aria-labelledby="rules" class="block">
          <h2 id="rules" class="h2">Zasady licytacji</h2>
          <div class="card">
            <ul class="bullets">
              <li>Oferty są wiążące. Minimalne przebicie i czas zakończenia widoczne są na stronie aukcji.</li>
              <li>Wygrywa najwyższa ważna oferta złożona przed zakończeniem.</li>
              <li>Akcesoria i gwarancja – tylko jeśli są wyraźnie wskazane w opisie.</li>
              <li>Zwroty nie przysługują (sprzęt używany). Pytania techniczne – skontaktuj się przed licytacją.</li>
            </ul>
          </div>
        </section>

        <!-- FAQ -->
        <section aria-labelledby="faq" class="block">
          <h2 id="faq" class="h2">FAQ</h2>

          <details class="accordion" role="group">
            <summary class="accordion__summary">
              Jak długo trwa aukcja?
              <span class="chev" aria-hidden="true"></span>
            </summary>
            <div class="accordion__content">
              Termin startu i zakończenia jest podany na stronie danej aukcji.
            </div>
          </details>

          <details class="accordion" role="group">
            <summary class="accordion__summary">
              Czy mogę anulować ofertę?
              <span class="chev" aria-hidden="true"></span>
            </summary>
            <div class="accordion__content">
              Oferty są wiążące. W wyjątkowych sytuacjach napisz do obsługi przed zakończeniem aukcji.
            </div>
          </details>

          <details class="accordion" role="group">
            <summary class="accordion__summary">
              Czy wystawiacie fakturę?
              <span class="chev" aria-hidden="true"></span>
            </summary>
            <div class="accordion__content">
              Jeśli dla danej aukcji jest dostępna faktura, zobaczysz odpowiedni znacznik w opisie.
            </div>
          </details>

          <details class="accordion" role="group">
            <summary class="accordion__summary">
              Odbiór osobisty czy wysyłka?
              <span class="chev" aria-hidden="true"></span>
            </summary>
            <div class="accordion__content">
              Dostępne formy odbioru są wymienione w każdej aukcji (osobisty/kurier).
            </div>
          </details>
        </section>
      </div>
    </section>

    <!-- FOOTER (full width, zamyka stronę) -->
    <footer class="site-footer">
      <div class="footer-inner">
        <h2>Kontakt</h2>
        <p>Masz pytania? Napisz do nas – chętnie pomożemy przed licytacją.</p>
        <a class="btn" href="mailto:servicedesk@twojadomena.pl">Napisz do nas</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ===== Global reset dla odstępu pod stopką (scoped -> :global) */
:global(html, body) { height: 100%; }
:global(body) { margin: 0; }

/* ===== Layout 100svh + sticky footer */
.page{
  min-height: 100svh;          /* pełna wysokość widoczna */
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.info{
  flex: 1 0 auto;              /* wypełnia przestrzeń nad stopką */
  padding: 6svh 1.5rem;        /* skalowalne marginesy */
}
.container{ max-width: 960px; margin: 0 auto; }

/* ===== Typografia */
.hero { text-align: center; margin-bottom: 4svh; }
.hero h1 { font-size: 2rem; font-weight: 800; letter-spacing: .2px; }
.hero p { margin-top: .5rem; color: var(--muted); }
.h2 { font-size: 1.25rem; font-weight: 700; margin: 0 0 .75rem; }

/* ===== Steps */
.steps { display: grid; gap: .75rem; grid-template-columns: repeat(1,minmax(0,1fr)); }
@media (min-width: 640px){ .steps{ grid-template-columns: repeat(2,minmax(0,1fr)); } }
.step{ display:flex; gap:.75rem; background:var(--panel); border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow); padding: .9rem; }
.step--wide{ grid-column:1/-1; }
.badge{ flex:0 0 auto; width:2.5rem; height:2.5rem; display:grid; place-items:center; border-radius:999px; background: rgba(14,165,233,.15); color: var(--brand); font-weight:800; }
.body .title{ font-weight:600; }
.muted{ color:var(--muted); font-size:.9rem; }

/* ===== Cards */
.card{ background:var(--panel); border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow); padding:1rem; }
.pill-list{ list-style:none; padding:0; margin:.6rem 0; display:grid; gap:.5rem; grid-template-columns:repeat(1,minmax(0,1fr)); }
@media (min-width:640px){ .pill-list{ grid-template-columns:repeat(2,minmax(0,1fr)); } }
.pill{ display:inline-block; font-size:.75rem; padding:.25rem .5rem; border-radius:999px; margin-right:.4rem; }
.pill--ok{ background: var(--ok-bg); color: var(--ok-fg); }
.pill--warn{ background: var(--warn-bg); color: var(--warn-fg); }
.footnote{ color:var(--muted); font-size:.75rem; margin-top:.35rem; }
.bullets{ padding-left:1.1rem; margin:0; color:var(--text); }
.bullets li{ margin:.35rem 0; }

/* ===== Accordion z animacją */
.accordion{ background:var(--panel); border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow); margin-bottom:.6rem; overflow:hidden; }
.accordion__summary{
  list-style:none; user-select:none; cursor:pointer; padding:.9rem 1.1rem;
  font-weight:600; display:flex; align-items:center; justify-content:space-between;
}
.accordion__summary::-webkit-details-marker{ display:none; }
.accordion__content{
  overflow:hidden; max-height:0; padding:0 1.1rem; color:var(--muted);
  font-size:.9rem; line-height:1.5; transition:max-height .3s ease, padding .3s ease;
  border-top:1px dashed transparent;
}
details[open] .accordion__content{
  max-height: 30svh; padding:.6rem 1.1rem .9rem; border-top-color:var(--border);
}
.chev{ width:16px; height:16px; position:relative; }
.chev::before{
  content:\"\"; position:absolute; inset:0; border: solid var(--muted); border-width:0 2px 2px 0;
  transform: rotate(-45deg); margin:3px; transition: transform .3s ease;
}
details[open] .chev::before{ transform: rotate(45deg); }

/* ===== Footer – pełna szerokość, zero „ogona” pod spodem */
.site-footer{
  flex: 0 0 auto;
  width: 100%;
  background: #0f172a;
  color: #fff;
  padding: 4svh 1.5rem;
}
.footer-inner{ max-width: 960px; margin: 0 auto; text-align: center; }
.site-footer h2{ font-size:1.25rem; font-weight:700; margin:0 0 .75rem; }
.site-footer p{ margin:0 0 1rem; color:#cbd5e1; }
.btn{
  display:inline-flex; align-items:center; justify-content:center;
  padding:.6rem 1.1rem; border-radius:999px; background:#0ea5e9; color:#fff; font-weight:700;
  text-decoration:none; transition: background .2s ease;
}
.btn:hover{ background:#0284c7; }

/* ===== Theme tokens ===== */
:root{
  --bg:#f5f6f8;
  --panel: rgba(255,255,255,.9);
  --border:#e5e7eb;
  --shadow:0 6px 20px rgba(0,0,0,.08);
  --text:#0f172a;
  --muted:#64748b;
  --brand:#0ea5e9;
  --brand-dark:#0284c7;
  --ok-bg:#dcfce7; --ok-fg:#166534;
  --warn-bg:#fef3c7; --warn-fg:#b45309;
}
</style>
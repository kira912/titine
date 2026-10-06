<template>
  <section class="card stack empty">
    <AppIcon name="car" class="empty-icon" />
    <div>
      <h1>Commence par ta voiture</h1>
      <p class="muted" style="margin: 0">
        Il faut d'abord enregistrer ton véhicule pour suivre ses pleins et ses entretiens.
      </p>
    </div>
    <NuxtLink to="/" class="btn btn-primary btn-large">
      Ajouter mon véhicule
    </NuxtLink>
  </section>
</template>

<style scoped>
.empty { justify-items: start; }
.empty-icon { width: 44px; height: 44px; color: var(--accent); }
</style>

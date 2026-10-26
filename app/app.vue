<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <SiteNavigation v-if="route.path !== '/'" />
  <NuxtPage />
</template>

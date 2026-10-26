<script setup lang="ts">
import { siteNavigationItems } from '../utils/site-navigation'

const route = useRoute()
const menuOpen = ref(false)
const activeItem = computed(() => siteNavigationItems.find(item => item.to === route.path)?.id ?? '')

function closeMenu() {
  menuOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenu()
}

watch(() => route.fullPath, closeMenu)
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="catalog-navigation" @keydown.esc="closeMenu">
    <nav class="catalog-links" aria-label="Main navigation">
      <NuxtLink
        v-for="item in siteNavigationItems"
        :key="item.id"
        :to="item.to"
        :aria-current="activeItem === item.id ? 'page' : undefined"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>
    <button
      class="catalog-menu-toggle"
      type="button"
      aria-label="Toggle main navigation"
      aria-controls="catalog-mobile-links"
      :aria-expanded="menuOpen"
      @click="menuOpen = !menuOpen"
    >
      <span aria-hidden="true">{{ menuOpen ? '×' : '☰' }}</span>
    </button>
    <nav
      v-if="menuOpen"
      id="catalog-mobile-links"
      class="catalog-mobile-links"
      aria-label="Mobile main navigation"
    >
      <NuxtLink
        v-for="item in siteNavigationItems"
        :key="item.id"
        :to="item.to"
        :aria-current="activeItem === item.id ? 'page' : undefined"
        @click="closeMenu"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.catalog-navigation {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  justify-content: center;
  border-bottom: 1px solid #ecebe3;
  background: rgba(255, 254, 250, .97);
  box-shadow: 0 10px 30px -28px rgba(35, 58, 49, .55);
  backdrop-filter: blur(14px);
}

.catalog-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(18px, 3vw, 38px);
  min-height: 52px;
  padding: 0 20px;
}

.catalog-links a,
.catalog-mobile-links a {
  color: #5d6a5f;
  font: 500 12px 'DM Sans', sans-serif;
  letter-spacing: .02em;
  text-decoration: none;
}

.catalog-links a {
  position: relative;
  padding: 8px 0;
}

.catalog-links a::after {
  position: absolute;
  right: 100%;
  bottom: 0;
  left: 0;
  height: 2px;
  background: #bd795d;
  content: '';
  transition: right .22s ease;
}

.catalog-links a:hover,
.catalog-links a:focus-visible,
.catalog-links a[aria-current='page'] {
  color: #294236;
}

.catalog-links a:hover::after,
.catalog-links a:focus-visible::after,
.catalog-links a[aria-current='page']::after {
  right: 0;
}

.catalog-menu-toggle,
.catalog-mobile-links {
  display: none;
}

.catalog-navigation a:focus-visible,
.catalog-menu-toggle:focus-visible {
  outline: 2px solid #bd795d;
  outline-offset: 3px;
}

@media (max-width: 760px) {
  .catalog-navigation {
    justify-content: flex-end;
    flex-wrap: wrap;
    padding: 8px 16px;
  }

  .catalog-links {
    display: none;
  }

  .catalog-menu-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1px solid #e2e1d7;
    border-radius: 50%;
    background: #fffefa;
    color: #2f463a;
    font-size: 20px;
    cursor: pointer;
  }

  .catalog-mobile-links {
    display: grid;
    flex: 1 0 100%;
    gap: 2px;
    padding-top: 8px;
  }

  .catalog-mobile-links a {
    padding: 11px 4px;
    border-bottom: 1px solid #f1f0e9;
  }
}
</style>

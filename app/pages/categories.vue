<script setup lang="ts">
import { ofetch } from 'ofetch'

type Category = { id: string; name: string; slug: string; _count: { products: number } }

const categories = ref<Category[]>([])
const loading = ref(true)
const errorMessage = ref('')

async function loadCategories() {
  loading.value = true
  errorMessage.value = ''
  try {
    categories.value = await ofetch<Category[]>('/api/categories')
  } catch {
    errorMessage.value = 'Categories could not be loaded. Please check the database connection and try again.'
  } finally {
    loading.value = false
  }
}

onMounted(loadCategories)
</script>

<template>
  <main class="directory-page">
    <header class="page-heading">
      <p class="eyebrow">Browse the catalog</p>
      <h1>Categories</h1>
      <p>Choose a category to see its active products.</p>
    </header>
    <p v-if="loading" class="state" role="status">Loading categories…</p>
    <p v-else-if="errorMessage" class="state error" role="alert">{{ errorMessage }} <button type="button" @click="loadCategories()">Retry</button></p>
    <p v-else-if="!categories.length" class="state">No categories with active products are available yet.</p>
    <section v-else class="category-grid" aria-label="Product categories">
      <NuxtLink v-for="category in categories" :key="category.id" :to="{ path: '/shop', query: { category: category.slug } }" class="category-card">
        <span class="category-mark" aria-hidden="true">✿</span>
        <strong>{{ category.name }}</strong>
        <span>{{ category._count.products }} {{ category._count.products === 1 ? 'product' : 'products' }}</span>
        <span class="browse-link">Browse category →</span>
      </NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.directory-page{max-width:1100px;margin:auto;padding:45px 28px 80px;color:#293a30}.page-heading{margin-bottom:28px}.page-heading h1{margin:8px 0;font:600 clamp(32px,5vw,48px)/1.1 'Playfair Display',serif;color:#253b31}.page-heading>p:last-child{color:#73776e;font-size:13px}.eyebrow{text-transform:uppercase;letter-spacing:1.5px;color:#ab7155;font-size:10px;font-weight:700}.state{padding:22px;background:#f6f5ef;color:#73776e;font-size:13px}.error{color:#8f4536}.state button{margin-left:8px;border:0;background:none;color:inherit;font:600 11px 'DM Sans',sans-serif;text-decoration:underline;cursor:pointer}.category-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px}.category-card{display:grid;gap:10px;min-height:165px;padding:22px;border:1px solid #e5e5dc;background:#fffefa;color:#2e4336;text-decoration:none;transition:border-color .2s,background .2s}.category-card:hover,.category-card:focus-visible{border-color:#71836d;background:#f2f3ea}.category-mark{color:#bd795d;font-size:20px}.category-card strong{font:600 19px 'Playfair Display',serif}.category-card>span:not(.category-mark){color:#73776e;font-size:11px}.category-card .browse-link{color:#48634c}.category-card:focus-visible{outline:2px solid #bd795d;outline-offset:3px}@media(max-width:600px){.directory-page{padding:30px 18px 60px}.category-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.category-card{padding:15px;min-height:145px}}
</style>

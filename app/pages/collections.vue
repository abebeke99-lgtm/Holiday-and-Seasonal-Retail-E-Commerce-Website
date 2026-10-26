<script setup lang="ts">
import { ofetch } from 'ofetch'

type Collection = {
  id: string
  name: string
  slug: string
  description: string
  products: { product: { id: string; name: string; imageUrl: string; price: string } }[]
}

const collections = ref<Collection[]>([])
const loading = ref(true)
const errorMessage = ref('')

async function loadCollections() {
  loading.value = true
  errorMessage.value = ''
  try {
    collections.value = await ofetch<Collection[]>('/api/collections')
  } catch {
    errorMessage.value = 'Seasonal collections could not be loaded. Please check the database connection and try again.'
  } finally {
    loading.value = false
  }
}

onMounted(loadCollections)
</script>

<template>
  <main class="directory-page">
    <header class="page-heading">
      <p class="eyebrow">Curated for the calendar</p>
      <h1>Seasonal Collections</h1>
      <p>Explore active collections and the products selected for each one.</p>
    </header>
    <p v-if="loading" class="state" role="status">Loading seasonal collections…</p>
    <p v-else-if="errorMessage" class="state error" role="alert">{{ errorMessage }} <button type="button" @click="loadCollections()">Retry</button></p>
    <p v-else-if="!collections.length" class="state">There are no active seasonal collections yet.</p>
    <section v-else class="collection-grid" aria-label="Seasonal collections">
      <article v-for="collection in collections" :key="collection.id" class="collection-card">
        <div class="collection-copy">
          <p class="eyebrow">{{ collection.products.length }} {{ collection.products.length === 1 ? 'featured product' : 'featured products' }}</p>
          <h2>{{ collection.name }}</h2>
          <p>{{ collection.description }}</p>
          <NuxtLink :to="{ path: '/shop', query: { collection: collection.slug } }" class="collection-link">Browse this collection</NuxtLink>
        </div>
        <div v-if="collection.products.length" class="collection-products">
          <NuxtLink v-for="entry in collection.products.slice(0, 3)" :key="entry.product.id" :to="`/products/${entry.product.id}`">
            <img :src="entry.product.imageUrl" :alt="entry.product.name" loading="lazy" />
            <span>{{ entry.product.name }}</span>
            <small>${{ Number(entry.product.price).toFixed(2) }}</small>
          </NuxtLink>
        </div>
        <p v-else class="no-products">No active products in this collection yet.</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.directory-page{max-width:1160px;margin:auto;padding:45px 28px 80px;color:#293a30}.page-heading{margin-bottom:28px}.page-heading h1{margin:8px 0;font:600 clamp(32px,5vw,48px)/1.1 'Playfair Display',serif;color:#253b31}.page-heading>p:last-child{color:#73776e;font-size:13px}.eyebrow{text-transform:uppercase;letter-spacing:1.5px;color:#ab7155;font-size:10px;font-weight:700}.state,.no-products{padding:22px;background:#f6f5ef;color:#73776e;font-size:13px}.error{color:#8f4536}.state button{margin-left:8px;border:0;background:none;color:inherit;font:600 11px 'DM Sans',sans-serif;text-decoration:underline;cursor:pointer}.collection-grid{display:grid;gap:18px}.collection-card{display:grid;grid-template-columns:minmax(230px,.8fr) minmax(0,1.2fr);gap:24px;padding:24px;border:1px solid #e5e5dc;background:#fffefa}.collection-copy .eyebrow{margin:0;font-size:9px}.collection-copy h2{margin:8px 0;font:600 24px 'Playfair Display',serif;color:#253b31}.collection-copy>p:not(.eyebrow){color:#73776e;font-size:12px;line-height:1.7}.collection-link{display:inline-block;margin-top:8px;padding:11px 15px;background:#294236;color:#fff;font:600 11px 'DM Sans',sans-serif;text-decoration:none}.collection-products{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.collection-products a{display:grid;align-content:start;gap:7px;color:#344b3c;font-size:11px;text-decoration:none}.collection-products img{width:100%;height:130px;object-fit:cover;background:#f0efe8}.collection-products small{color:#73776e}@media(max-width:700px){.directory-page{padding:30px 18px 60px}.collection-card{grid-template-columns:1fr;padding:17px}.collection-products img{height:100px}}
</style>

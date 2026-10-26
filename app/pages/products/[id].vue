<script setup lang="ts">
import { ofetch } from 'ofetch'

type Product = {
  id: string
  name: string
  sku: string
  description: string
  price: string
  imageUrl: string
  category: { name: string }
  inventory: { quantity: number } | null
}

const route = useRoute()
const product = ref<Product | null>(null)
const errorMessage = ref('')
const notice = ref('')
onMounted(async () => {
  try {
    product.value = await ofetch<Product>(`/api/products/${encodeURIComponent(String(route.params.id))}`)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Product could not be loaded.'
  }
})

async function addToCart() {
  if (!product.value) return
  try {
    await ofetch('/api/cart/items', { method: 'POST', body: { productId: product.value.id, quantity: 1 } })
    notice.value = 'Added to your bag.'
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Sign in to add this item.'
  }
}

async function saveToWishlist() {
  if (!product.value) return
  try {
    await ofetch('/api/wishlist/items', { method: 'POST', body: { productId: product.value.id } })
    notice.value = 'Saved to your wishlist.'
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Sign in to save this item.'
  }
}
</script>

<template>
  <main class="detail-page">
    <header class="detail-top"><NuxtLink class="brand" to="/">season<span>mart</span></NuxtLink><NuxtLink to="/">← Back to the collection</NuxtLink></header>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-else-if="!product" class="loading">Loading product details…</p>
    <article v-else class="product-detail">
      <div class="detail-image"><img :src="product.imageUrl" :alt="product.name" /></div>
      <div class="detail-info"><p class="eyebrow">{{ product.category.name }} · {{ product.sku }}</p><h1>{{ product.name }}</h1><p class="detail-description">{{ product.description }}</p><strong class="detail-price">${{ Number(product.price).toFixed(2) }}</strong>
        <p class="detail-stock">{{ product.inventory?.quantity ? `${product.inventory.quantity} available` : 'Currently sold out' }}</p>
        <button class="detail-add" :disabled="!product.inventory?.quantity" @click="addToCart">Add to bag</button>
        <button class="detail-save" @click="saveToWishlist">♡ Save to wishlist</button>
        <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      </div>
    </article>
  </main>
</template>

<style scoped>
.detail-page{max-width:1100px;margin:auto;padding:25px 28px 80px;color:#293a30}.detail-top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e9e8de;padding-bottom:20px;margin-bottom:45px}.detail-top>a:last-child{font-size:12px;color:#576b5d;text-decoration:none}.product-detail{display:grid;grid-template-columns:1fr 1fr;gap:55px;align-items:center}.detail-image{background:#f0efe8;height:490px}.detail-image img{width:100%;height:100%;object-fit:cover}.detail-info h1{font:600 44px/1.15 'Playfair Display',serif;color:#263c31;margin:14px 0}.detail-description{font-size:13px;color:#797b72;line-height:1.8}.detail-price{display:block;font-size:20px;margin:25px 0 9px}.detail-stock{font-size:11px;color:#6c796a}.detail-add,.detail-save{display:block;width:min(330px,100%);height:46px;margin-top:12px;background:#294236;color:white;border:0;font:600 12px 'DM Sans',sans-serif;cursor:pointer}.detail-save{background:transparent;border:1px solid #cfd5ca;color:#455c49}.detail-add:disabled{opacity:.5;cursor:not-allowed}.loading,.error{padding:50px;color:#73776e}.error{color:#a54e3e}.notice{background:#edf2e8;padding:12px;font-size:12px;color:#354a38}@media(max-width:700px){.detail-page{padding:18px}.product-detail{grid-template-columns:1fr;gap:25px}.detail-image{height:340px}.detail-info h1{font-size:36px}}
</style>

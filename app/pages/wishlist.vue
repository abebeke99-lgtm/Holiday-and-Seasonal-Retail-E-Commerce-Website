<script setup lang="ts">
import { ofetch } from 'ofetch'

type SavedItem = { id: string; product: { id: string; name: string; imageUrl: string; price: string; slug: string; inventory: { quantity: number } | null } }
const user = ref<{ id: string } | null>(null)
const items = ref<SavedItem[]>([])
const message = ref('')
const notice = ref('')
const loading = ref(true)
onMounted(async () => {
  try {
    user.value = await ofetch<{ id: string }>('/api/auth/me')
    const list = await ofetch<{ items: SavedItem[] }>('/api/wishlist')
    items.value = list.items
  } catch {
    message.value = 'Sign in to view your saved products.'
  } finally {
    loading.value = false
  }
})
async function remove(id: string) {
  try {
    await ofetch(`/api/wishlist/items/${id}`, { method: 'DELETE' })
    items.value = items.value.filter(item => item.id !== id)
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Unable to remove this saved item.'
  }
}
async function addToCart(productId: string) {
  try {
    await ofetch('/api/cart/items', { method: 'POST', body: { productId, quantity: 1 } })
    notice.value = 'Added to your bag.'
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Unable to add this item to your bag.'
  }
}
</script>

<template>
  <main class="saved-page">
    <header class="account-top"><NuxtLink class="brand" to="/">season<span>mart</span></NuxtLink><NuxtLink to="/">← Continue shopping</NuxtLink></header>
    <p class="eyebrow">A little list of lovely things</p><h1>Your wishlist</h1>
    <p v-if="message" class="notice">{{ message }} <NuxtLink to="/">Sign in from the store</NuxtLink></p>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    <div v-if="loading" class="empty-list">Loading saved products…</div>
    <div v-else-if="!message && !items.length" class="empty-list">Your wishlist is waiting for something special.</div>
    <div v-else-if="!message" class="saved-grid">
      <article v-for="item in items" :key="item.id"><img :src="item.product.imageUrl" :alt="item.product.name" /><h2>{{ item.product.name }}</h2><p>${{ Number(item.product.price).toFixed(2) }}</p><div><button :disabled="!item.product.inventory?.quantity" @click="addToCart(item.product.id)">Add to bag</button><button class="remove" @click="remove(item.id)">Remove</button></div></article>
    </div>
  </main>
</template>

<style scoped>
.saved-page{max-width:1100px;margin:auto;padding:25px 28px 80px;color:#293a30}.account-top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e9e8de;padding-bottom:20px;margin-bottom:45px}.account-top>a:last-child{font-size:12px;color:#576b5d;text-decoration:none}.saved-page h1{font:600 42px 'Playfair Display',serif;margin:8px 0 28px}.saved-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:22px}.saved-grid article{border:1px solid #eeede5;padding-bottom:15px}.saved-grid img{width:100%;height:215px;object-fit:cover;background:#f0efe8}.saved-grid h2,.saved-grid p{margin:12px 14px;font:600 17px 'Playfair Display',serif}.saved-grid p{font:13px 'DM Sans',sans-serif}.saved-grid article div{display:flex;gap:8px;margin:0 14px}.saved-grid button{background:#294236;color:white;border:0;padding:10px 12px;font:11px 'DM Sans',sans-serif;cursor:pointer}.saved-grid button.remove{background:transparent;color:#667266}.saved-grid button:disabled{opacity:.5}.empty-list,.notice{padding:25px;background:#f4f4ed;color:#73776e;font-size:13px}.notice a{color:#375642}
</style>

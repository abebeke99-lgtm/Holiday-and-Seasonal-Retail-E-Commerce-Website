<script setup lang="ts">
import { ofetch } from 'ofetch'

type Order = { id: string; status: string; total: string; createdAt: string; items: { id: string; name: string; quantity: number; unitPrice: string }[]; payment: { status: string } | null }
const orders = ref<Order[]>([])
const message = ref('')
onMounted(async () => {
  try {
    orders.value = await ofetch<Order[]>('/api/orders')
  } catch {
    message.value = 'Sign in to view your order history.'
  }
})
</script>

<template>
  <main class="account-page">
    <header class="account-top"><NuxtLink class="brand" to="/">season<span>mart</span></NuxtLink><NuxtLink to="/">← Continue shopping</NuxtLink></header>
    <p class="eyebrow">Your SeasonMart</p><h1>Order history</h1>
    <p v-if="message" class="notice">{{ message }} <NuxtLink to="/">Sign in from the store</NuxtLink></p>
    <p v-else-if="!orders.length" class="empty-list">No orders yet. Find something seasonal in the store.</p>
    <article v-for="order in orders" v-else :key="order.id" class="order-card">
      <header><div><span>Order</span><strong>{{ order.id }}</strong></div><div><span>Placed</span><strong>{{ new Date(order.createdAt).toLocaleDateString() }}</strong></div><div><span>Status</span><strong>{{ order.status }}</strong></div><div><span>Total</span><strong>${{ Number(order.total).toFixed(2) }}</strong></div></header>
      <div v-for="item in order.items" :key="item.id" class="order-line"><span>{{ item.quantity }} × {{ item.name }}</span><span>${{ (Number(item.unitPrice) * item.quantity).toFixed(2) }}</span></div>
      <p class="payment-state">Payment: {{ order.payment?.status ?? 'Pending' }}. This site does not collect payment-card data.</p>
    </article>
  </main>
</template>

<style scoped>
.account-page{max-width:1000px;margin:auto;padding:25px 28px 80px;color:#293a30}.account-top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e9e8de;padding-bottom:20px;margin-bottom:45px}.account-top>a:last-child{font-size:12px;color:#576b5d;text-decoration:none}.account-page h1{font:600 42px 'Playfair Display',serif;margin:8px 0 28px}.order-card{border:1px solid #e9e8df;margin:18px 0;padding:20px}.order-card header{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;border-bottom:1px solid #eee;padding-bottom:15px}.order-card header div span,.order-card header div strong{display:block}.order-card header div span{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#919288}.order-card header div strong{font-size:12px;margin-top:6px}.order-line{display:flex;justify-content:space-between;padding:12px 0;font-size:12px}.payment-state{background:#f4f4ed;padding:11px;font-size:10px;color:#667066}.empty-list,.notice{padding:25px;background:#f4f4ed;color:#73776e;font-size:13px}.notice a{color:#375642}@media(max-width:580px){.account-page{padding:20px 15px}.order-card header{grid-template-columns:1fr 1fr}}
</style>

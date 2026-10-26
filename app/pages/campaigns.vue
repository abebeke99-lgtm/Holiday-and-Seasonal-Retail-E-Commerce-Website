<script setup lang="ts">
import { ofetch } from 'ofetch'

type Campaign = {
  id: string
  name: string
  description: string
  discountPct: number
  startsAt: string
  endsAt: string
}

const campaigns = ref<Campaign[]>([])
const loading = ref(true)
const errorMessage = ref('')

function formatDate(value: string) {
  return new Date(value).toLocaleDateString()
}

async function loadCampaigns() {
  loading.value = true
  errorMessage.value = ''
  try {
    campaigns.value = await ofetch<Campaign[]>('/api/campaigns')
  } catch {
    errorMessage.value = 'Campaigns could not be loaded. Please check the database connection and try again.'
  } finally {
    loading.value = false
  }
}

onMounted(loadCampaigns)
</script>

<template>
  <main class="directory-page">
    <header class="page-heading">
      <p class="eyebrow">Limited-time offers</p>
      <h1>Campaigns &amp; Deals</h1>
      <p>View current offers, their descriptions, and their scheduled dates.</p>
    </header>
    <p v-if="loading" class="state" role="status">Loading current campaigns…</p>
    <p v-else-if="errorMessage" class="state error" role="alert">{{ errorMessage }} <button type="button" @click="loadCampaigns()">Retry</button></p>
    <p v-else-if="!campaigns.length" class="state">There are no active campaigns right now.</p>
    <section v-else class="campaign-list" aria-label="Active campaigns">
      <details v-for="campaign in campaigns" :key="campaign.id" class="campaign-card">
        <summary>
          <span class="campaign-mark" aria-hidden="true">✳</span>
          <span class="campaign-title">{{ campaign.name }}</span>
          <strong v-if="campaign.discountPct" class="discount">{{ campaign.discountPct }}% OFF</strong>
        </summary>
        <div class="campaign-detail">
          <p>{{ campaign.description }}</p>
          <p><strong>Starts:</strong> {{ formatDate(campaign.startsAt) }} <span aria-hidden="true">·</span> <strong>Ends:</strong> {{ formatDate(campaign.endsAt) }}</p>
          <small>Offers are displayed as recorded in the campaign. Product prices and checkout totals are unchanged unless separately configured.</small>
        </div>
      </details>
    </section>
  </main>
</template>

<style scoped>
.directory-page{max-width:1000px;margin:auto;padding:45px 28px 80px;color:#293a30}.page-heading{margin-bottom:28px}.page-heading h1{margin:8px 0;font:600 clamp(32px,5vw,48px)/1.1 'Playfair Display',serif;color:#253b31}.page-heading>p:last-child{color:#73776e;font-size:13px}.eyebrow{text-transform:uppercase;letter-spacing:1.5px;color:#ab7155;font-size:10px;font-weight:700}.state{padding:22px;background:#f6f5ef;color:#73776e;font-size:13px}.error{color:#8f4536}.state button{margin-left:8px;border:0;background:none;color:inherit;font:600 11px 'DM Sans',sans-serif;text-decoration:underline;cursor:pointer}.campaign-list{display:grid;gap:12px}.campaign-card{border:1px solid #e5e5dc;background:#fffefa}.campaign-card summary{display:flex;align-items:center;gap:14px;padding:20px;cursor:pointer;list-style:none}.campaign-card summary::-webkit-details-marker{display:none}.campaign-mark{color:#bc805b;font-size:23px}.campaign-title{font:600 19px 'Playfair Display',serif;color:#253b31}.discount{margin-left:auto;color:#a86545;font-size:12px;white-space:nowrap}.campaign-detail{padding:0 20px 20px 57px;color:#73776e;font-size:12px;line-height:1.7}.campaign-detail>p{margin:6px 0 12px}.campaign-detail small{color:#8a8b80}@media(max-width:600px){.directory-page{padding:30px 18px 60px}.campaign-card summary{padding:15px;gap:10px}.campaign-title{font-size:16px}.campaign-detail{padding:0 15px 16px 48px}.discount{font-size:10px}}
</style>

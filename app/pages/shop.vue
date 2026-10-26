<script setup lang="ts">
import { ofetch } from 'ofetch'

type Product = {
  id: string
  name: string
  description: string
  price: string
  imageUrl: string
  category: { name: string }
  inventory: { quantity: number } | null
}

type Category = { id: string; name: string; slug: string }
type ProductResult = { items: Product[]; total: number; page: number; limit: number }

const route = useRoute()
const router = useRouter()
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const category = ref(typeof route.query.category === 'string' ? route.query.category : '')
const collection = ref(typeof route.query.collection === 'string' ? route.query.collection : '')
const sort = ref(typeof route.query.sort === 'string' ? route.query.sort : 'newest')
const page = ref(Math.max(1, Number(route.query.page) || 1))
const products = ref<ProductResult | null>(null)
const categories = ref<Category[]>([])
const loading = ref(true)
const categoriesLoading = ref(true)
const errorMessage = ref('')
const categoriesError = ref('')
const pageCount = computed(() => Math.ceil((products.value?.total ?? 0) / (products.value?.limit ?? 24)))

async function loadProducts(updateUrl = true) {
  loading.value = true
  errorMessage.value = ''
  const query = {
    q: search.value || undefined,
    category: category.value || undefined,
    collection: collection.value || undefined,
    sort: sort.value,
    page: page.value
  }

  try {
    if (updateUrl) await router.replace({ query })
    products.value = await ofetch<ProductResult>('/api/products', { query })
  } catch {
    errorMessage.value = 'Products could not be loaded. Check the database connection and try again.'
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  categoriesLoading.value = true
  categoriesError.value = ''
  try {
    categories.value = await ofetch<Category[]>('/api/categories')
  } catch {
    categoriesError.value = 'Categories could not be loaded.'
  } finally {
    categoriesLoading.value = false
  }
}

async function submitSearch() {
  page.value = 1
  await loadProducts()
}

async function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > pageCount.value) return
  page.value = nextPage
  await loadProducts()
}

onMounted(() => {
  void loadProducts(false)
  void loadCategories()
})
</script>

<template>
  <main class="shop-page">
    <header class="page-heading">
      <p class="eyebrow">Find something for every moment</p>
      <h1>Shop seasonal favorites</h1>
      <p>Search the live catalog, browse by category, and sort products your way.</p>
    </header>

    <form class="shop-controls" role="search" @submit.prevent="submitSearch">
      <label class="search-field">
        <span>Search products</span>
        <input v-model="search" type="search" maxlength="100" placeholder="Search by name or keyword" />
      </label>
      <label>
        <span>Category</span>
        <select v-model="category" @change="page = 1; collection = ''; loadProducts()">
          <option value="">All categories</option>
          <option v-for="item in categories" :key="item.id" :value="item.slug">{{ item.name }}</option>
        </select>
      </label>
      <label>
        <span>Sort by</span>
        <select v-model="sort" @change="page = 1; loadProducts()">
          <option value="newest">Newest</option>
          <option value="name">Name</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </label>
      <button type="submit">Search</button>
    </form>

    <p v-if="categoriesError" class="state error" role="alert">{{ categoriesError }} <button type="button" @click="loadCategories">Retry</button></p>
    <p v-else-if="categoriesLoading" class="state" role="status">Loading categories…</p>
    <p v-if="collection" class="active-filter">Showing products from seasonal collection: {{ collection }}</p>

    <p v-if="loading" class="state" role="status">Loading products…</p>
    <p v-else-if="errorMessage" class="state error" role="alert">{{ errorMessage }} <button type="button" @click="loadProducts()">Retry</button></p>
    <section v-else-if="!products?.items.length" class="state empty-state">
      <h2>No products found</h2>
      <p>Try another search or category. Products appear here when they are available in the catalog.</p>
    </section>
    <section v-else class="product-grid" aria-label="Products">
      <article v-for="product in products.items" :key="product.id" class="product-card">
        <NuxtLink class="product-image" :to="`/products/${product.id}`">
          <img :src="product.imageUrl" :alt="product.name" loading="lazy" />
        </NuxtLink>
        <p class="product-category">{{ product.category.name }}</p>
        <h2><NuxtLink :to="`/products/${product.id}`">{{ product.name }}</NuxtLink></h2>
        <p class="product-description">{{ product.description }}</p>
        <div class="product-footer">
          <strong>${{ Number(product.price).toFixed(2) }}</strong>
          <span>{{ product.inventory?.quantity ? `${product.inventory.quantity} in stock` : 'Sold out' }}</span>
        </div>
      </article>
    </section>

    <nav v-if="!loading && products?.items.length && pageCount > 1" class="pagination" aria-label="Product pages">
      <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">Previous</button>
      <span>Page {{ page }} of {{ pageCount }}</span>
      <button type="button" :disabled="page >= pageCount" @click="changePage(page + 1)">Next</button>
    </nav>
  </main>
</template>

<style scoped>
.shop-page{max-width:1200px;margin:auto;padding:45px 28px 80px;color:#293a30}.page-heading{margin-bottom:28px}.page-heading h1{margin:8px 0;font:600 clamp(32px,5vw,48px)/1.1 'Playfair Display',serif;color:#253b31}.page-heading>p:last-child{color:#73776e;font-size:13px}.eyebrow,.product-category{text-transform:uppercase;letter-spacing:1.5px;color:#ab7155;font-size:10px;font-weight:700}.shop-controls{display:grid;grid-template-columns:minmax(210px,1fr) minmax(150px,.5fr) minmax(150px,.5fr) auto;align-items:end;gap:12px;margin:24px 0 28px;padding:18px;background:#f4f4ed}.shop-controls label{display:grid;gap:7px;color:#5d6a5f;font-size:11px}.shop-controls input,.shop-controls select{height:40px;min-width:0;padding:0 10px;border:1px solid #deded3;background:#fffefa;color:#344238;font:12px 'DM Sans',sans-serif}.shop-controls>button,.pagination button{height:40px;padding:0 18px;border:0;background:#294236;color:#fff;font:600 11px 'DM Sans',sans-serif;cursor:pointer}.state{padding:22px;background:#f6f5ef;color:#73776e;font-size:13px}.error{color:#8f4536}.state button{margin-left:8px;border:0;background:none;color:inherit;font:600 11px 'DM Sans',sans-serif;text-decoration:underline;cursor:pointer}.empty-state h2{margin:0 0 8px;font:600 23px 'Playfair Display',serif;color:#293a30}.active-filter{color:#73776e;font-size:12px}.product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:22px}.product-card{min-width:0}.product-image{display:block;height:230px;overflow:hidden;background:#f0efe8}.product-image img{width:100%;height:100%;object-fit:cover;transition:transform .25s}.product-image:hover img{transform:scale(1.03)}.product-category{margin:14px 0 6px;font-size:9px}.product-card h2{margin:0;font:600 19px 'Playfair Display',serif}.product-card h2 a{color:#293a30;text-decoration:none}.product-description{min-height:38px;color:#808078;font-size:11px;line-height:1.6}.product-footer{display:flex;justify-content:space-between;gap:8px;color:#344b3c;font-size:12px}.product-footer span{color:#73776e;font-size:10px}.pagination{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:30px;color:#657064;font-size:12px}.pagination button{height:auto;padding:10px 14px}.pagination button:disabled{opacity:.45;cursor:not-allowed}@media(max-width:700px){.shop-page{padding:30px 18px 60px}.shop-controls{grid-template-columns:1fr 1fr}.search-field{grid-column:1/-1}.shop-controls>button{min-height:40px}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.product-image{height:170px}.product-card h2{font-size:16px}.product-footer{align-items:flex-start;flex-direction:column}}
</style>

<script setup lang="ts">
import { siteNavigationItems } from '../utils/site-navigation'
import { calculateCartSubtotal, findWishlistItem, type HomeWishlistItem } from '../utils/home-commerce'

type User = { id: string; name: string; email: string; role: 'CUSTOMER' | 'ADMIN' }
type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: string
  imageUrl: string
  category: { name: string; slug: string }
  inventory: { quantity: number } | null
}

const search = ref('')
const category = ref('')
const chosenCollection = ref('')
const sortOrder = ref('newest')
const page = ref(1)
const notice = ref('')
const authOpen = ref(false)
const registerMode = ref(false)
const cartOpen = ref(false)
const mobileMenuOpen = ref(false)
const searching = ref(false)
const searchError = ref('')
const authError = ref('')
const productsLoading = ref(false)
const checkoutPending = ref(false)
const wishlistPendingProductIds = ref<string[]>([])
const authForm = reactive({ name: '', email: '', password: '' })
const route = useRoute()
const router = useRouter()
const activeNavigationItem = computed(() => siteNavigationItems.find(item => item.to === route.path)?.id ?? '')
const initialSearch = typeof route.query.q === 'string' ? route.query.q : ''
const initialCategory = typeof route.query.category === 'string' ? route.query.category : ''
const initialCollection = typeof route.query.collection === 'string' ? route.query.collection : ''
search.value = initialSearch
category.value = initialCategory
chosenCollection.value = initialCollection
const { data: products, error: productsError, status: productsStatus } = await useFetch<{ items: Product[]; total: number; page: number; limit: number }>('/api/products', {
  query: { q: initialSearch || undefined, category: initialCategory || undefined, collection: initialCollection || undefined }
})
const catalogUnavailable = ref(Boolean(productsError.value))
const { data: categories, error: categoriesError, status: categoriesStatus, refresh: refreshCategories } = await useFetch<{ id: string; name: string; slug: string; _count: { products: number } }[]>('/api/categories')
const { data: campaigns, error: campaignsError, status: campaignsStatus, refresh: refreshCampaigns } = await useFetch<{ id: string; name: string; description: string; discountPct: number; startsAt: string; endsAt: string }[]>('/api/campaigns')
const { data: collections, error: collectionsError, status: collectionsStatus, refresh: refreshCollections } = await useFetch<{ id: string; name: string; slug: string; description: string; products: { product: Product }[] }[]>('/api/collections')
const { data: currentUser, refresh: refreshUser } = await useFetch<User | null>('/api/auth/me', { default: () => null })
const { data: cart, refresh: refreshCart, status: cartStatus, error: cartError } = await useFetch<{ items: { id: string; quantity: number; product: Product }[] }>('/api/cart', {
  immediate: !!currentUser.value,
  default: () => ({ items: [] })
})
const { data: wishlist, refresh: refreshWishlist, status: wishlistStatus, error: wishlistError } = await useFetch<{ items: HomeWishlistItem[] }>('/api/wishlist', {
  immediate: !!currentUser.value,
  default: () => ({ items: [] })
})
const cartCount = computed(() => cart.value?.items.reduce((count, item) => count + item.quantity, 0) ?? 0)
const wishlistCount = computed(() => wishlist.value?.items.length ?? 0)
const cartPending = computed(() => cartStatus.value === 'pending')
const wishlistPending = computed(() => wishlistStatus.value === 'pending')
const shoppingError = computed(() => Boolean(currentUser.value && (cartError.value || wishlistError.value)))
const pageCount = computed(() => Math.ceil((products.value?.total ?? 0) / (products.value?.limit ?? 24)))
const cartSubtotal = computed(() => calculateCartSubtotal(cart.value?.items ?? []))

function isInWishlist(productId: string) {
  return Boolean(wishlist.value && findWishlistItem(wishlist.value.items, productId))
}

function hideBrokenImage(event: Event) {
  if (event.currentTarget instanceof HTMLImageElement) {
    event.currentTarget.hidden = true
  }
}

async function refreshShopping() {
  if (!currentUser.value) return
  await Promise.allSettled([refreshCart(), refreshWishlist()])
}

watch(currentUser, (user) => {
  if (!user) {
    cart.value = { items: [] }
    wishlist.value = { items: [] }
  }
})

function openAuth(register: boolean) {
  registerMode.value = register
  authError.value = ''
  authOpen.value = true
  mobileMenuOpen.value = false
}

function closeOverlays() {
  authOpen.value = false
  cartOpen.value = false
  mobileMenuOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeOverlays()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

watch([cartOpen, authOpen], ([cart, auth]) => {
  if (!import.meta.client) return
  document.body.style.overflow = cart || auth ? 'hidden' : ''
})

watch(cartOpen, async (open) => {
  if (!open || !import.meta.client) return
  await nextTick()
  document.querySelector<HTMLButtonElement>('#cart-drawer .drawer-head button')?.focus()
})

watch(authOpen, async (open) => {
  if (!open || !import.meta.client) return
  await nextTick()
  document.querySelector<HTMLButtonElement>('.auth-modal .modal-close')?.focus()
})

async function loadProducts(options: { scroll?: boolean } = {}) {
  searchError.value = ''
  productsLoading.value = true
  try {
    const query = {
      q: search.value || undefined,
      category: category.value || undefined,
      collection: chosenCollection.value || undefined,
      sort: sortOrder.value,
      page: page.value > 1 ? page.value : undefined
    }
    await router.replace({ query })
    products.value = await $fetch<{ items: Product[]; total: number; page: number; limit: number }>('/api/products', {
      query: { q: search.value || undefined, category: category.value || undefined, collection: chosenCollection.value || undefined, sort: sortOrder.value, page: page.value }
    })
    catalogUnavailable.value = false
    if (options.scroll && import.meta.client) {
      await nextTick()
      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  } catch {
    searchError.value = 'Products could not be loaded right now. Please check the database connection and try again.'
    catalogUnavailable.value = true
  } finally {
    productsLoading.value = false
  }
}

async function submitSearch() {
  searching.value = true
  page.value = 1
  mobileMenuOpen.value = false
  await loadProducts({ scroll: true })
  searching.value = false
}

async function selectCategory(slug: string) {
  category.value = slug
  chosenCollection.value = ''
  page.value = 1
  await loadProducts({ scroll: true })
}

async function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > pageCount.value) return
  page.value = nextPage
  await loadProducts({ scroll: true })
}

async function addToCart(product: Product) {
  if (!currentUser.value) {
    openAuth(false)
    notice.value = 'Sign in to add items to your cart.'
    return
  }
  try {
    await $fetch('/api/cart/items', { method: 'POST', body: { productId: product.id, quantity: 1 } })
    await refreshCart()
    notice.value = `${product.name} added to your cart.`
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Unable to update your cart.'
  }
}

async function addToWishlist(product: Product) {
  if (!currentUser.value) {
    openAuth(false)
    notice.value = 'Sign in to save favorites.'
    return
  }
  if (wishlistPendingProductIds.value.includes(product.id)) return
  wishlistPendingProductIds.value = [...wishlistPendingProductIds.value, product.id]
  try {
    const savedItem = wishlist.value && findWishlistItem(wishlist.value.items, product.id)
    if (savedItem) {
      await $fetch(`/api/wishlist/items/${savedItem.id}`, { method: 'DELETE' })
      notice.value = `${product.name} removed from your wishlist.`
    } else {
      await $fetch('/api/wishlist/items', { method: 'POST', body: { productId: product.id } })
      notice.value = `${product.name} saved to your wishlist.`
    }
    await refreshWishlist()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Unable to update your wishlist.'
  } finally {
    wishlistPendingProductIds.value = wishlistPendingProductIds.value.filter(id => id !== product.id)
  }
}

async function submitAuth() {
  authError.value = ''
  try {
    const endpoint = registerMode.value ? '/api/auth/register' : '/api/auth/login'
    await $fetch(endpoint, { method: 'POST', body: authForm })
    authOpen.value = false
    notice.value = registerMode.value ? 'Your account is ready.' : 'Welcome back.'
    await refreshUser()
    await refreshShopping()
    authForm.password = ''
    mobileMenuOpen.value = false
  } catch (error) {
    authError.value = error instanceof Error ? error.message : 'Unable to sign in.'
  }
}

async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await refreshUser()
    cart.value = { items: [] }
    wishlist.value = { items: [] }
    mobileMenuOpen.value = false
    notice.value = 'You have signed out.'
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Unable to sign out.'
  }
}

async function removeCartItem(id: string) {
  try {
    await $fetch(`/api/cart/items/${id}`, { method: 'DELETE' })
    await refreshCart()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Unable to remove this item.'
  }
}

async function updateCartItem(id: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    notice.value = 'Choose a quantity between 1 and 99.'
    return
  }
  try {
    await $fetch(`/api/cart/items/${id}`, { method: 'PATCH', body: { quantity } })
    await refreshCart()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Unable to update your cart.'
  }
}

async function checkout() {
  if (checkoutPending.value) return
  checkoutPending.value = true
  try {
    const order = await $fetch<{ id: string }>('/api/checkout', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() }
    })
    await refreshCart()
    cartOpen.value = false
    notice.value = `Order ${order.id} created. Payment is pending; no card was charged.`
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Checkout could not be completed.'
  } finally {
    checkoutPending.value = false
  }
}
</script>

<template>
  <div class="site-shell" data-page="home">
    <a class="skip-link" href="#shop">Skip to products</a>
    <header class="site-header" @keydown.esc="closeOverlays">
      <div class="topbar">
        <button
          type="button"
          class="menu-toggle"
          aria-label="Toggle navigation menu"
          :aria-expanded="mobileMenuOpen"
          aria-controls="mobile-menu"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <svg class="icon-menu" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          <svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <NuxtLink class="brand" to="/" aria-label="SeasonMart home">season<span>mart</span></NuxtLink>
        <form class="search" role="search" :class="{ 'is-searching': searching }" :aria-busy="searching" @submit.prevent="submitSearch">
          <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          <label class="sr-only" for="site-search">Search products</label>
          <input id="site-search" v-model="search" type="search" name="q" aria-label="Search products" placeholder="Search products, categories..." autocomplete="off" />
          <span class="sr-only" role="status">{{ searching ? 'Searching products...' : '' }}</span>
          <button class="search-submit" aria-label="Search">⌕</button>
        </form>
        <nav class="nav-actions" aria-label="Account and shopping">
          <NuxtLink v-if="currentUser?.role === 'ADMIN'" class="nav-link admin-link" to="/admin">Admin</NuxtLink>
          <NuxtLink v-if="currentUser" class="nav-link account-link" to="/account" :title="`Signed in as ${currentUser.name}`">Account</NuxtLink>
          <NuxtLink class="icon-action wishlist-action" to="/wishlist" aria-label="Open wishlist" :title="`Wishlist (${wishlistCount})`">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" /></svg>
            <span class="count-badge" :class="{ 'is-loading': wishlistPending, 'is-zero': !wishlistCount }">{{ wishlistPending ? '...' : wishlistCount }}</span>
          </NuxtLink>
        <button v-if="currentUser" class="plain-button" @click="logout">Hi, {{ currentUser.name.split(' ')[0] }} · Sign out</button>
          <template v-else>
            <button class="nav-link plain-button" @click="openAuth(false)">Sign in</button>
            <button class="nav-link plain-button register-link" @click="openAuth(true)">Register</button>
          </template>
          <button class="icon-action cart-button" type="button" :aria-expanded="cartOpen" aria-controls="cart-drawer" aria-label="Open shopping cart" :title="`Shopping cart (${cartCount})`" @click="cartOpen = !cartOpen">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
            <span class="count-badge" :class="{ 'is-loading': cartPending, 'is-zero': !cartCount }">{{ cartPending ? '...' : cartCount }}</span>
          </button>
        </nav>
      </div>

      <nav class="primary-nav" aria-label="Shop navigation">
        <NuxtLink
          v-for="item in siteNavigationItems"
          :key="item.id"
          :to="item.to"
          :class="{ active: activeNavigationItem === item.id }"
          :aria-current="activeNavigationItem === item.id ? 'page' : undefined"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <p v-if="shoppingError" class="header-alert" role="alert">
        <span>Cart or wishlist data could not be loaded.</span>
        <button type="button" class="alert-action" @click="refreshShopping">Retry</button>
      </p>
      <p v-if="searchError" class="header-alert" role="alert">{{ searchError }}</p>

      <div v-if="mobileMenuOpen" id="mobile-menu" class="mobile-menu">
        <nav aria-label="Mobile navigation">
          <NuxtLink
            v-for="item in siteNavigationItems"
            :key="item.id"
            :to="item.to"
            :aria-current="activeNavigationItem === item.id ? 'page' : undefined"
            @click="mobileMenuOpen = false"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
        <div class="mobile-account">
          <NuxtLink v-if="currentUser?.role === 'ADMIN'" to="/admin" @click="mobileMenuOpen = false">Admin dashboard</NuxtLink>
          <NuxtLink v-if="currentUser" to="/account" @click="mobileMenuOpen = false">Account / Profile</NuxtLink>
          <NuxtLink v-if="currentUser" to="/wishlist" @click="mobileMenuOpen = false">Wishlist ({{ wishlistCount }})</NuxtLink>
          <button v-if="currentUser" type="button" @click="logout">Sign out</button>
          <template v-else>
            <button type="button" @click="openAuth(false)">Sign in</button>
            <button type="button" @click="openAuth(true)">Create account</button>
          </template>
        </div>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Make every season feel special</p>
          <h1>A little magic<br />for every moment.</h1>
          <p>Thoughtful finds for holidays, celebrations, and all the cozy days in between.</p>
          <NuxtLink to="#shop" class="primary-link">Shop now <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="hero-art" aria-label="Seasonal home decorations">
          <div class="sun"></div><div class="art-vase vase-one"></div><div class="art-vase vase-two"></div>
          <div class="art-leaf leaf-one"></div><div class="art-leaf leaf-two"></div>
          <span class="art-caption">GATHER · CELEBRATE · ENJOY</span>
        </div>
      </section>

      <section id="categories" class="catalog-section" aria-labelledby="categories-title">
        <div class="catalog-section-heading">
          <div><p class="eyebrow">Browse the store</p><h2 id="categories-title">Shop by category</h2></div>
        </div>
        <p v-if="categoriesStatus === 'pending'" class="catalog-message" role="status">Loading categories…</p>
        <p v-else-if="categoriesError" class="catalog-message error-state" role="alert">Categories could not be loaded. <button type="button" @click="refreshCategories()">Try again</button></p>
        <p v-else-if="!categories?.length" class="catalog-message">There are no categories with active products yet.</p>
        <div v-else class="category-grid">
          <button
            v-for="item in categories"
            :key="item.id"
            type="button"
            class="category-card"
            :aria-pressed="category === item.slug"
            @click="selectCategory(item.slug)"
          >
            <strong>{{ item.name }}</strong>
            <span>{{ item._count.products }} {{ item._count.products === 1 ? 'product' : 'products' }}</span>
          </button>
        </div>
      </section>

      <section id="collections" class="catalog-section collection-section" aria-labelledby="collections-title">
        <div class="catalog-section-heading">
          <div><p class="eyebrow">Made for the moment</p><h2 id="collections-title">Seasonal collections</h2></div>
        </div>
        <p v-if="collectionsStatus === 'pending'" class="catalog-message" role="status">Loading seasonal collections…</p>
        <p v-else-if="collectionsError" class="catalog-message error-state" role="alert">Seasonal collections could not be loaded. <button type="button" @click="refreshCollections()">Try again</button></p>
        <p v-else-if="!collections?.length" class="catalog-message">There are no active seasonal collections yet.</p>
        <div v-else class="collection-grid">
          <article v-for="item in collections" :key="item.id" class="collection-card">
            <div>
              <p class="eyebrow">{{ item.products.length }} {{ item.products.length === 1 ? 'featured product' : 'featured products' }}</p>
              <h3>{{ item.name }}</h3>
              <p>{{ item.description }}</p>
              <NuxtLink class="collection-action" :to="{ path: '/shop', query: { collection: item.slug } }">Shop this collection</NuxtLink>
            </div>
            <ul v-if="item.products.length" class="collection-products">
              <li v-for="entry in item.products.slice(0, 3)" :key="entry.product.id">
                <NuxtLink :to="`/products/${entry.product.id}`">{{ entry.product.name }}</NuxtLink>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="deals" class="catalog-section deals-section" aria-labelledby="deals-title">
        <div class="catalog-section-heading">
          <div><p class="eyebrow">Limited-time offers</p><h2 id="deals-title">Campaigns &amp; Deals</h2></div>
        </div>
        <p v-if="campaignsStatus === 'pending'" class="catalog-message" role="status">Loading current campaigns…</p>
        <p v-else-if="campaignsError" class="catalog-message error-state" role="alert">Campaigns could not be loaded. <button type="button" @click="refreshCampaigns()">Try again</button></p>
        <p v-else-if="!campaigns?.length" class="catalog-message">There are no active campaigns right now.</p>
        <div v-else class="campaign-row">
          <details v-for="campaign in campaigns" :key="campaign.id" class="campaign campaign-details">
            <summary>
              <span class="campaign-icon" aria-hidden="true">✳</span>
              <strong>{{ campaign.name }}</strong>
              <b v-if="campaign.discountPct">{{ campaign.discountPct }}% OFF</b>
            </summary>
            <p>{{ campaign.description }}</p>
            <small>{{ new Date(campaign.startsAt).toLocaleDateString() }} – {{ new Date(campaign.endsAt).toLocaleDateString() }}</small>
            <NuxtLink class="campaign-link" to="/campaigns">View campaign details</NuxtLink>
          </details>
        </div>
      </section>

      <section id="shop" class="shop-section">
        <div class="section-heading">
          <div><p class="eyebrow">Curated for the calendar</p><h2>Find your season</h2></div>
          <div class="category-select">
            <label for="category">Shop by</label>
            <select id="category" v-model="category" @change="selectCategory(category)">
              <option value="">All categories</option>
              <option v-for="item in categories" :key="item.id" :value="item.slug">{{ item.name }}</option>
            </select>
            <label for="sort">Sort by</label>
            <select id="sort" v-model="sortOrder" @change="page = 1; loadProducts()"><option value="newest">Newest</option><option value="name">Name</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select>
          </div>
        </div>

        <p v-if="notice" class="notice" role="status">{{ notice }}</p>
        <p v-if="productsLoading || productsStatus === 'pending'" class="catalog-message" role="status">Loading products…</p>
        <p v-else-if="catalogUnavailable" class="error-state" role="alert">
          The store could not load products. Check the database connection and try again.
          <button type="button" @click="loadProducts()">Try again</button>
        </p>
        <div v-else-if="!products?.items.length" class="empty-state">
          <span>✺</span><h3>{{ search || category || chosenCollection ? 'No matching products' : 'Your next favorite is waiting' }}</h3><p>{{ search || category || chosenCollection ? 'Try changing your search or filters.' : 'There are no products to show yet.' }}</p>
        </div>
        <div v-else class="product-grid">
          <article v-for="product in products.items" :key="product.id" class="product-card">
            <div class="product-image">
              <NuxtLink :to="`/products/${product.id}`"><img :src="product.imageUrl" :alt="product.name" loading="lazy" @error="hideBrokenImage" /></NuxtLink>
              <span class="stock-badge" :class="{ 'sold-out': !product.inventory?.quantity }">
                {{ product.inventory?.quantity ? `${product.inventory.quantity} in stock` : 'Sold out' }}
              </span>
              <button
                type="button"
                class="wishlist-button"
                :aria-label="isInWishlist(product.id) ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`"
                :aria-pressed="isInWishlist(product.id)"
                :disabled="wishlistPendingProductIds.includes(product.id)"
                @click="addToWishlist(product)"
              >{{ isInWishlist(product.id) ? '♥' : '♡' }}</button>
            </div>
            <div class="product-meta"><span>{{ product.category.name }}</span><span>✧</span></div>
            <h3><NuxtLink class="product-link" :to="`/products/${product.id}`">{{ product.name }}</NuxtLink></h3>
            <p class="description">{{ product.description }}</p>
            <div class="product-buy"><strong>${{ Number(product.price).toFixed(2) }}</strong>
              <button :disabled="!product.inventory?.quantity" @click="addToCart(product)">Add to bag <span>+</span></button>
            </div>
          </article>
        </div>
        <nav v-if="products?.items.length && pageCount > 1" class="pagination" aria-label="Product pages">
          <button type="button" :disabled="page <= 1 || productsLoading" @click="changePage(page - 1)">Previous</button>
          <span>Page {{ page }} of {{ pageCount }}</span>
          <button type="button" :disabled="page >= pageCount || productsLoading" @click="changePage(page + 1)">Next</button>
        </nav>
      </section>

      <section class="newsletter">
        <div><p class="eyebrow">Notes from the season</p><h2>Little joys, delivered.</h2><p>Explore the latest finds and offers from SeasonMart.</p><NuxtLink to="/campaigns">Explore current offers</NuxtLink></div>
        <span class="newsletter-flower" aria-hidden="true">✿</span>
      </section>
    </main>

    <footer>
      <NuxtLink class="brand" to="/" aria-label="SeasonMart home">season<span>mart</span></NuxtLink>
      <p>Made for celebrating the everyday.</p>
      <nav aria-label="Footer navigation">
        <NuxtLink v-for="item in siteNavigationItems" :key="item.id" :to="item.to">{{ item.label }}</NuxtLink>
      </nav>
      <small>© {{ new Date().getFullYear() }} SeasonMart</small>
    </footer>

    <div v-if="cartOpen" class="drawer-backdrop" @click.self="cartOpen = false">
      <aside id="cart-drawer" class="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div class="drawer-head"><h2 id="cart-title">Your bag <span>({{ cartCount }})</span></h2><button aria-label="Close cart" @click="cartOpen = false">×</button></div>
        <p v-if="!currentUser" class="empty-state">Sign in to see your saved cart.</p>
        <p v-else-if="cartPending" class="catalog-message" role="status">Loading your bag…</p>
        <p v-else-if="cartError" class="error-state" role="alert">Your bag could not be loaded. <button type="button" @click="refreshCart()">Try again</button></p>
        <p v-else-if="!cart?.items.length" class="empty-state">Your bag is ready for something lovely.</p>
        <div v-for="item in cart?.items" :key="item.id" class="cart-line">
          <img :src="item.product.imageUrl" :alt="item.product.name" />
          <div><strong>{{ item.product.name }}</strong><p>${{ (Number(item.product.price) * item.quantity).toFixed(2) }}</p><label class="quantity-control">Qty <input type="number" min="1" max="99" :value="item.quantity" @change="updateCartItem(item.id, Number(($event.target as HTMLInputElement).value))" /></label></div>
          <button type="button" :aria-label="`Remove ${item.product.name} from bag`" @click="removeCartItem(item.id)">×</button>
        </div>
        <div v-if="cart?.items.length" class="cart-subtotal"><span>Subtotal</span><strong>${{ cartSubtotal.toFixed(2) }}</strong></div>
        <button v-if="cart?.items.length" class="checkout-button" :disabled="checkoutPending" @click="checkout">{{ checkoutPending ? 'Placing order…' : 'Place order · payment pending' }}</button>
        <small v-if="cart?.items.length" class="payment-note">This demo records your order and inventory only. No payment details are collected.</small>
      </aside>
    </div>

    <div v-if="authOpen" class="modal-backdrop" @click.self="authOpen = false">
      <form class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" @submit.prevent="submitAuth">
        <button type="button" class="modal-close" aria-label="Close" @click="authOpen = false">×</button>
        <p class="eyebrow">Welcome to SeasonMart</p><h2 id="auth-title">{{ registerMode ? 'Create your account' : 'Sign in' }}</h2>
        <p v-if="authError" class="auth-error" role="alert">{{ authError }}</p>
        <label v-if="registerMode">Your name<input v-model="authForm.name" required maxlength="120" autocomplete="name" /></label>
        <label>Email address<input v-model="authForm.email" type="email" required autocomplete="email" /></label>
        <label>Password<input v-model="authForm.password" type="password" required :minlength="registerMode ? 12 : 1" :autocomplete="registerMode ? 'new-password' : 'current-password'" /></label>
        <button class="checkout-button">{{ registerMode ? 'Create account' : 'Sign in' }}</button>
        <button class="switch-auth" type="button" @click="registerMode = !registerMode; authError = ''">{{ registerMode ? 'Already a member? Sign in' : 'New here? Create an account' }}</button>
      </form>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');
:root{font-family:'DM Sans',sans-serif;color:#292c25;background:#fffefa;font-synthesis:none;text-rendering:optimizeLegibility}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:140px}body{margin:0}.site-shell{min-height:100vh}
.site-header{position:sticky;top:0;z-index:30;background:rgba(255,254,250,.97);border-bottom:1px solid #ecebe3;box-shadow:0 10px 30px -28px rgba(35,58,49,.55);backdrop-filter:blur(14px)}
.topbar{min-height:78px;padding:12px clamp(24px,7vw,110px);display:flex;align-items:center;gap:clamp(16px,3vw,34px)}
.brand{flex-shrink:0;font:600 25px 'Playfair Display',serif;letter-spacing:-1px;color:#233a31;text-decoration:none;transition:color .2s}.brand:hover{color:#294236}.brand span{color:#bd795d}
.menu-toggle{display:none;align-items:center;justify-content:center;width:40px;height:40px;border:1px solid #e2e1d7;border-radius:50%;background:#fffefa;color:#2f463a;cursor:pointer;flex-shrink:0}.menu-toggle svg{width:19px;height:19px}.menu-toggle .icon-close{display:none}.menu-toggle[aria-expanded="true"] .icon-menu{display:none}.menu-toggle[aria-expanded="true"] .icon-close{display:block}
.search{position:relative;display:flex;align-items:center;flex:1;max-width:590px;height:46px;padding:0 5px 0 15px;background:#f6f5ef;border:1px solid transparent;border-radius:999px;transition:background .2s,border-color .2s,box-shadow .2s}.search:focus-within{background:#fff;border-color:#bd795d;box-shadow:0 0 0 3px rgba(189,121,93,.14)}.search-icon{width:18px;height:18px;color:#818a80;flex-shrink:0}.search input{flex:1;min-width:0;height:100%;border:0;background:transparent;padding:0 10px;font:500 13px 'DM Sans',sans-serif;color:#2c382f;outline:none}.search input::placeholder{color:#989c92}.search input::-webkit-search-cancel-button{cursor:pointer}.search button{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;flex-shrink:0;border:0;border-radius:50%;background:#294236 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='6.5'/%3E%3Cpath d='m16 16 4.5 4.5'/%3E%3C/svg%3E") center/16px 16px no-repeat;color:transparent;font-size:0;cursor:pointer;transition:background-color .2s,transform .2s}.search button:hover{background-color:#1d3329}.search button:active{transform:scale(.94)}.search.is-searching button{background-image:none}.search.is-searching button::after{content:'';width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.nav-actions{display:flex;align-items:center;gap:clamp(8px,1.4vw,18px);margin-left:auto;flex-shrink:0}.nav-link,.plain-button{font:500 13px 'DM Sans',sans-serif;color:#313c34;text-decoration:none;border:0;background:none;cursor:pointer;padding:8px 2px;border-radius:3px;transition:color .2s}.nav-link:hover,.plain-button:hover{color:#bd795d}.register-link{color:#294236;border:1px solid #d7dad0;padding:8px 13px;border-radius:999px}.register-link:hover{background:#f2f3ea;border-color:#c9cec2}.admin-link{color:#7a5b3f;background:#f3ede3;padding:8px 12px;border-radius:999px;font-size:12px}.admin-link:hover{background:#ece2d4;color:#6a4a2e}
.icon-action{position:relative;display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border:1px solid #e2e1d7;border-radius:50%;background:#fffefa;color:#2f463a;text-decoration:none;cursor:pointer;transition:background .2s,border-color .2s,color .2s,transform .2s}.icon-action:hover{background:#f2f3ea;border-color:#c9cec2;color:#233a31}.icon-action:active{transform:scale(.96)}.icon-action svg{width:19px;height:19px}.cart-button{background:#263d33;border-color:#263d33;color:#fff}.cart-button:hover{background:#1d3329;border-color:#1d3329;color:#fff}
.count-badge{position:absolute;top:-5px;right:-5px;min-width:19px;height:19px;padding:0 5px;border:2px solid #fffefa;border-radius:999px;background:#bd795d;color:#fff;font:700 10px/19px 'DM Sans',sans-serif;text-align:center}.count-badge.is-zero{background:#8d9388}.count-badge.is-loading{background:#c9a58f}.cart-button .count-badge{background:#e4b98e;color:#263d33;border-color:#263d33}
.primary-nav{display:flex;align-items:center;justify-content:center;gap:clamp(18px,3vw,38px);padding:0 clamp(24px,7vw,110px) 12px}.primary-nav a{position:relative;padding:6px 0;color:#5d6a5f;font:500 12px 'DM Sans',sans-serif;letter-spacing:.02em;text-decoration:none;transition:color .2s}.primary-nav a::after{content:'';position:absolute;left:0;right:100%;bottom:0;height:2px;background:#bd795d;transition:right .22s ease}.primary-nav a:hover,.primary-nav a:focus-visible{color:#294236}.primary-nav a:hover::after,.primary-nav a:focus-visible::after{right:0}.primary-nav a.active{color:#294236;font-weight:700}.primary-nav a.active::after{right:0}
.header-alert{display:flex;align-items:center;justify-content:center;gap:10px;margin:0;padding:9px clamp(16px,4vw,30px);background:#f9e9e3;color:#8f4536;font-size:11px;border-top:1px solid #f0d7cf}.alert-action{border:0;background:none;color:#8f4536;font:600 11px 'DM Sans',sans-serif;text-decoration:underline;cursor:pointer;padding:0}
.mobile-menu{display:none}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.skip-link{position:absolute;left:16px;top:-100px;z-index:70;background:#294236;color:#fff;padding:10px 14px;font:600 12px 'DM Sans',sans-serif;text-decoration:none;border-radius:3px;transition:top .2s}.skip-link:focus{top:12px}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #bd795d;outline-offset:2px}
.hero{display:grid;grid-template-columns:1fr 1fr;min-height:450px;padding:0 clamp(24px,10vw,150px);align-items:center;background:#f2f3ea}.hero-copy{padding:52px 0}.eyebrow{text-transform:uppercase;letter-spacing:2px;color:#ab7155;font-size:10px;font-weight:700}.hero h1,.section-heading h2,.newsletter h2{font:600 clamp(38px,5vw,62px)/1.08 'Playfair Display',serif;color:#253b31;margin:18px 0}.hero-copy>p:not(.eyebrow){color:#73776e;line-height:1.8;max-width:390px;font-size:14px}.primary-link{display:inline-flex;gap:27px;margin-top:18px;background:#294236;color:white;text-decoration:none;padding:15px 20px;font-size:12px}.hero-art{height:340px;position:relative;overflow:hidden;background:#dbdfd0;display:flex;align-items:flex-end;justify-content:center}.sun{position:absolute;width:175px;height:175px;border-radius:50%;background:#e4b98e;right:19%;top:12%}.art-vase{z-index:1;position:absolute;bottom:25px;background:#798c77;border-radius:44% 44% 12% 12%;height:172px;width:105px}.vase-one{left:26%;background:#87957e}.vase-two{left:49%;height:130px;width:90px;background:#b87355}.art-leaf{z-index:2;position:absolute;left:46%;top:74px;width:3px;height:120px;background:#536d56;transform:rotate(-28deg)}.leaf-one:before,.leaf-two:before{content:'';position:absolute;width:42px;height:18px;top:20px;left:-36px;border-radius:90% 0 90% 0;background:#73866d;transform:rotate(-20deg)}.leaf-two{left:52%;top:65px;transform:rotate(25deg)}.leaf-two:before{left:0;transform:rotate(80deg)}.art-caption{position:absolute;bottom:13px;font-size:8px;letter-spacing:2px;color:#f7f4e8;z-index:3}
.campaign-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:15px;padding:27px clamp(24px,10vw,150px);border-bottom:1px solid #eeede5}.campaign{display:flex;align-items:center;gap:13px;padding:11px}.campaign-icon{color:#bc805b;font-size:24px}.campaign strong{font:600 15px 'Playfair Display',serif}.campaign p{font-size:11px;color:#85867c;margin:5px 0 0}.campaign>b{margin-left:auto;color:#a86545;font-size:11px;white-space:nowrap}
.collection-strip{display:flex;overflow:auto;gap:9px;padding:18px clamp(24px,10vw,150px);border-bottom:1px solid #eeede5}.collection-strip button{white-space:nowrap;border:1px solid #dcded2;background:transparent;padding:9px 15px;color:#546454;font:11px 'DM Sans',sans-serif;cursor:pointer}.collection-strip button.active{background:#304839;color:white;border-color:#304839}.wishlist-button{position:absolute;right:10px;top:9px;border:0;border-radius:50%;width:30px;height:30px;background:#fffefaed;color:#a76e51;font-size:20px;cursor:pointer}
.shop-section{padding:75px clamp(24px,10vw,150px);scroll-margin-top:140px}.section-heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:32px}.section-heading h2,.newsletter h2{font-size:38px;margin:8px 0 0}.category-select{font-size:12px;color:#777}.category-select select{margin-left:10px;padding:10px 25px 10px 12px;border:1px solid #deded3;background:#fffefa;font:inherit;color:#344238}.product-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:23px}.product-image{height:235px;background:#f0efe8;position:relative;overflow:hidden}.product-image img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.product-card:hover .product-image img{transform:scale(1.04)}.stock-badge{position:absolute;left:10px;top:10px;background:#fffefa;padding:7px 9px;font-size:9px;color:#536c56}.sold-out{color:#aa5f4d}.product-meta{display:flex;justify-content:space-between;color:#a7795f;text-transform:uppercase;letter-spacing:1.3px;font-size:9px;margin-top:17px}.product-card h3{font:600 18px 'Playfair Display',serif;margin:8px 0}.product-link{color:inherit;text-decoration:none}.product-link:hover{text-decoration:underline}.description{color:#808078;font-size:11px;line-height:1.6;min-height:35px}.product-buy{display:flex;justify-content:space-between;align-items:center;margin-top:13px}.product-buy strong{font-size:14px}.product-buy button{background:none;border:0;color:#344b3c;font:600 11px 'DM Sans',sans-serif;cursor:pointer}.product-buy button span{font-size:16px;margin-left:8px}.product-buy button:disabled{color:#aaa;cursor:not-allowed}
.empty-state,.error-state{text-align:center;padding:56px 20px;color:#7a7e74}.empty-state>span{font-size:32px;color:#a77859}.empty-state h3{font:600 23px 'Playfair Display',serif;color:#31483a}.error-state{color:#a54e3e}.notice{background:#edf2e8;padding:12px 16px;font-size:12px;color:#354a38}.newsletter{margin:0 clamp(24px,10vw,150px) 75px;padding:40px 50px;background:#e9eee3;display:flex;justify-content:space-between;align-items:center}.newsletter h2{font-size:32px}.newsletter p:not(.eyebrow){font-size:12px;color:#73776e}.newsletter-flower{font-size:70px;color:#b47b5b}footer{padding:28px clamp(24px,10vw,150px);border-top:1px solid #eae9df;display:flex;align-items:center;gap:24px}footer p,footer small{font-size:10px;color:#898a80}footer small{margin-left:auto}
.drawer-backdrop,.modal-backdrop{position:fixed;z-index:60;inset:0;background:#1e29228a;display:flex;justify-content:flex-end}.drawer{height:100%;width:min(430px,100%);background:#fffefa;padding:28px;overflow:auto}.drawer-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e7e5dc;padding-bottom:15px}.drawer-head h2,.auth-modal h2{font:600 26px 'Playfair Display',serif;margin:0;color:#2e4336}.drawer-head h2 span{font:400 13px 'DM Sans',sans-serif;color:#888}.drawer-head button,.cart-line>button,.modal-close{border:0;background:none;font-size:25px;cursor:pointer;color:#49584a}.cart-line{display:flex;gap:13px;align-items:center;padding:16px 0;border-bottom:1px solid #eee}.cart-line img{width:62px;height:62px;object-fit:cover}.cart-line strong{font:600 14px 'Playfair Display',serif}.cart-line p,.payment-note{font-size:10px;color:#818179}.quantity-control{display:flex;align-items:center;gap:6px;font-size:10px;color:#777}.quantity-control input{width:48px;padding:4px;border:1px solid #deded3}.checkout-button{width:100%;padding:14px;background:#294236;color:white;border:0;margin-top:20px;font:600 12px 'DM Sans',sans-serif;cursor:pointer}.payment-note{display:block;line-height:1.6;margin-top:10px}.modal-backdrop{justify-content:center;align-items:center;padding:20px}.auth-modal{position:relative;background:#fffefa;width:min(420px,100%);padding:40px}.modal-close{position:absolute;right:16px;top:10px}.auth-modal h2{margin:8px 0 25px}.auth-modal label{display:block;font-size:11px;color:#62675f;margin:14px 0}.auth-modal input{display:block;width:100%;margin-top:7px;height:42px;border:1px solid #deded3;padding:0 11px;font:inherit}.switch-auth{display:block;border:0;background:none;margin:15px auto 0;color:#536c56;font:12px 'DM Sans',sans-serif;cursor:pointer}.auth-error{margin:0 0 14px;padding:10px 12px;background:#f9e9e3;border-left:3px solid #c2765f;color:#8f4536;font-size:11px;line-height:1.5}
@media(max-width:1024px){.primary-nav{display:none}.nav-actions .nav-link,.nav-actions .plain-button{display:none}.menu-toggle{display:inline-flex}.mobile-menu{display:block;padding:4px 16px 18px;border-top:1px solid #ecebe3;background:#fffefa}.mobile-menu nav{display:grid;gap:2px}.mobile-menu nav a,.mobile-account a,.mobile-account button{display:block;width:100%;padding:11px 4px;border:0;border-bottom:1px solid #f1f0e9;background:none;color:#313c34;font:500 13px 'DM Sans',sans-serif;text-align:left;text-decoration:none;cursor:pointer}.mobile-account{margin-top:10px;padding-top:8px;border-top:1px solid #e7e5dc}.mobile-account button:last-child{color:#bd795d}}
@media(max-width:760px){.topbar{flex-wrap:wrap;min-height:0;padding:11px 16px;gap:10px 12px}.menu-toggle{order:0}.brand{order:1;font-size:23px}.nav-actions{order:2;gap:8px}.search{order:3;flex:1 0 100%;max-width:none;height:44px;padding-left:13px}.nav-actions .account-link{display:none}.icon-action{width:39px;height:39px}.header-alert{font-size:10px;padding:8px 14px}.skip-link{left:10px}}
@media(max-width:900px){.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{padding:0 5vw}.shop-section{padding:55px 5vw}.hero-art{height:280px}}@media(max-width:600px){.hero{grid-template-columns:1fr;padding:20px 20px 28px}.hero-copy{padding:20px 0}.hero-art{height:225px}.hero h1{font-size:43px}.section-heading{display:block}.category-select{margin-top:20px}.product-grid{gap:14px}.product-image{height:170px}.product-card h3{font-size:15px}.product-buy{align-items:flex-start;gap:6px;flex-direction:column}.campaign-row{padding:14px}.newsletter{margin:0 16px 40px;padding:25px}.newsletter-flower{font-size:44px}footer{padding:22px 16px;gap:10px}footer p{display:none}}
.catalog-section{padding:40px clamp(24px,10vw,150px);border-bottom:1px solid #eeede5;scroll-margin-top:145px}.catalog-section-heading{display:flex;align-items:end;justify-content:space-between;margin-bottom:22px}.catalog-section-heading h2{margin:8px 0 0;font:600 clamp(25px,3vw,36px)/1.12 'Playfair Display',serif;color:#253b31}.catalog-message{margin:0;padding:14px 16px;background:#f6f5ef;color:#73776e;font-size:12px}.category-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.category-card{display:grid;gap:8px;min-height:90px;padding:18px;text-align:left;border:1px solid #e5e5dc;background:#fffefa;color:#2e4336;cursor:pointer;transition:border-color .2s,background .2s}.category-card:hover,.category-card[aria-pressed='true']{border-color:#71836d;background:#f2f3ea}.category-card strong{font:600 16px 'Playfair Display',serif}.category-card span{color:#73776e;font-size:11px}.collection-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:15px}.collection-card{display:grid;align-content:space-between;gap:18px;padding:22px;border:1px solid #e5e5dc;background:#fffefa}.collection-card .eyebrow{margin:0;font-size:9px}.collection-card h3{margin:8px 0;font:600 22px 'Playfair Display',serif;color:#253b31}.collection-card>div>p:not(.eyebrow){color:#73776e;font-size:12px;line-height:1.7}.collection-action{margin-top:6px;padding:10px 14px;border:0;background:#294236;color:#fff;font:600 11px 'DM Sans',sans-serif;cursor:pointer}.collection-products{margin:0;padding-left:18px;color:#73776e;font-size:11px;line-height:1.9}.collection-products a{color:#48634c;text-decoration:none}.collection-products a:hover{text-decoration:underline}.deals-section .campaign-row{padding:0;border:0}.campaign small{display:block;margin-top:8px;color:#8a8b80;font-size:10px}.pagination{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:28px;color:#657064;font-size:12px}.pagination button{padding:9px 14px;border:1px solid #dcded2;background:#fffefa;color:#294236;font:500 11px 'DM Sans',sans-serif;cursor:pointer}.pagination button:disabled{opacity:.45;cursor:not-allowed}
.catalog-message button,.error-state button{margin-left:8px;border:0;background:none;color:#8f4536;font:600 11px 'DM Sans',sans-serif;text-decoration:underline;cursor:pointer}.campaign-details{display:block}.campaign-details summary{display:flex;align-items:center;gap:12px;cursor:pointer;list-style:none}.campaign-details summary::-webkit-details-marker{display:none}.campaign-details summary strong{font:600 15px 'Playfair Display',serif}.campaign-details summary>b{margin-left:auto;color:#a86545;font-size:11px;white-space:nowrap}.campaign-details>p{margin:10px 0 0 37px;color:#85867c;font-size:11px;line-height:1.6}.campaign-details>small{margin-left:37px}.campaign-link{display:inline-block;margin:10px 0 0 37px;color:#48634c;font-size:11px}
.collection-action{display:inline-block;text-decoration:none}.campaign-link:hover,footer nav a:hover,.newsletter a:hover{text-decoration:underline}
.cart-subtotal{display:flex;justify-content:space-between;margin-top:22px;padding-top:16px;border-top:1px solid #e7e5dc;color:#344238;font-size:13px}.cart-subtotal strong{font-size:15px}
.checkout-button:disabled{opacity:.65;cursor:wait}
footer nav{display:flex;flex-wrap:wrap;gap:10px 18px;margin-left:auto}footer nav a{color:#536454;font-size:10px;text-decoration:none}footer small{margin-left:0}
.newsletter a{display:inline-block;margin-top:10px;color:#48634c;font-size:11px}
@media(max-width:600px){.catalog-section{padding:32px 18px;scroll-margin-top:95px}.shop-section{scroll-margin-top:95px}.catalog-section-heading{margin-bottom:16px}.category-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.category-card{padding:13px;min-height:82px}.collection-grid{grid-template-columns:1fr}.pagination{gap:10px}.pagination button{padding:9px 10px}}
@media(max-width:760px){footer{align-items:flex-start;flex-wrap:wrap}footer nav{order:3;flex-basis:100%;margin-left:0}footer small{margin-left:auto}}
</style>

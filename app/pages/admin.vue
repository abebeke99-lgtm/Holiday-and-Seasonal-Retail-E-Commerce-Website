<script setup lang="ts">
import { ofetch } from 'ofetch'

type Product = { id: string; name: string; sku: string; slug: string; price: string; active: boolean; inventory: { quantity: number } | null; category: { name: string } }
type Category = { id: string; name: string; slug: string }
type InventoryRow = { productId: string; quantity: number; product: { name: string; sku: string } }
type Order = { id: string; status: string; total: string; createdAt: string; user: { name: string; email: string } }
type Campaign = { id: string; name: string; active: boolean; discountPct: number; startsAt: string; endsAt: string }
type Collection = { id: string; name: string; slug: string; active: boolean }
type Audit = { id: string; action: string; entity: string; entityId: string; createdAt: string; actor: { email: string } | null }
type AdminUser = { id: string; name: string; email: string; role: 'CUSTOMER' | 'STORE_MANAGER' | 'ADMIN'; active: boolean; createdAt: string }
type UserRole = AdminUser['role']
type Dashboard = {
  range: { from: string; to: string }
  lowStockThreshold: number
  lowStockCount: number
  metrics: {
    registeredUsers: number
    customers: number
    storeManagers: number
    activeProducts: number
    categories: number
    activeCollections: number
    activeCampaigns: number
    totalOrders: number
    pendingOrders: number
    completedOrders: number
    paidSales: number
  }
  lowStockProducts: { productId: string; quantity: number; product: { id: string; name: string; sku: string } }[]
  recentOrders: { id: string; status: string; total: string; createdAt: string; user: { name: string } }[]
  recentActivity: Audit[]
  trend: { date: string; orders: number; sales: number }[]
}

type AdminNavigationItem = { label: string; tab: string; icon: string }
const adminNavigationGroups: { label: string; items: AdminNavigationItem[] }[] = [
  { label: 'Overview', items: [{ label: 'Dashboard Overview', tab: 'overview', icon: '⌂' }] },
  { label: 'Users & access', items: [{ label: 'User Management', tab: 'users', icon: '♙' }] },
  { label: 'Catalog', items: [{ label: 'Products', tab: 'products', icon: '▣' }, { label: 'Categories', tab: 'categories', icon: '▦' }, { label: 'Collections', tab: 'collections', icon: '✿' }] },
  { label: 'Promotions', items: [{ label: 'Campaigns', tab: 'campaigns', icon: '✳' }] },
  { label: 'Operations', items: [{ label: 'Inventory', tab: 'inventory', icon: '▤' }, { label: 'Orders', tab: 'orders', icon: '▧' }] },
  { label: 'Security', items: [{ label: 'Audit Activity', tab: 'activity', icon: '◷' }] }
]

const user = ref<{ role: string; name: string } | null>(null)
const authorized = ref(false)
const message = ref('')
const loadError = ref('')
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const inventory = ref<InventoryRow[]>([])
const orders = ref<Order[]>([])
const campaigns = ref<Campaign[]>([])
const collections = ref<Collection[]>([])
const auditLogs = ref<Audit[]>([])
const users = ref<AdminUser[]>([])
const usersTotal = ref(0)
const usersPage = ref(1)
const usersPages = ref(1)
const usersSearch = ref('')
const usersRole = ref('')
const usersActive = ref('')
const usersSort = ref('createdAt')
const usersOrder = ref('desc')
const usersLoading = ref(false)
const dashboard = ref<Dashboard | null>(null)
const dashboardFrom = ref('')
const dashboardTo = ref('')
const lowStockThreshold = ref(5)
const tab = ref('overview')
const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const dashboardLoading = ref(false)
const activeAdminLabel = computed(() => adminNavigationGroups.flatMap(group => group.items).find(item => item.tab === tab.value)?.label ?? 'Dashboard Overview')
const editingProductId = ref('')
const editingCategoryId = ref('')
const productEdit = reactive({ name: '', sku: '', slug: '', price: 0, categoryId: '' })
const categoryEdit = reactive({ name: '', slug: '' })
const productForm = reactive({ name: '', sku: '', slug: '', description: '', price: 0, imageUrl: '', categoryId: '', quantity: 0 })
const categoryForm = reactive({ name: '', slug: '' })
const collectionForm = reactive({ name: '', slug: '', description: '' })
const campaignForm = reactive({ name: '', description: '', discountPct: 0, startsAt: '', endsAt: '' })
const userForm = reactive({ name: '', email: '', password: '', role: 'CUSTOMER' as UserRole })
const userEdit = reactive({ name: '', email: '', role: 'CUSTOMER' as UserRole, active: true })
const editingUserId = ref('')

async function loadDashboard() {
  dashboardLoading.value = true
  loadError.value = ''
  try {
    const query = {
      from: dashboardFrom.value || undefined,
      to: dashboardTo.value || undefined,
      lowStockThreshold: lowStockThreshold.value
    }
    const data = await Promise.all([
      ofetch<Product[]>('/api/admin/products'),
      ofetch<Category[]>('/api/admin/categories'),
      ofetch<InventoryRow[]>('/api/admin/inventory'),
      ofetch<{ items: Order[] }>('/api/admin/orders'),
      ofetch<Campaign[]>('/api/admin/campaigns'),
      ofetch<Collection[]>('/api/admin/collections'),
      ofetch<Audit[]>('/api/admin/audit-logs'),
      ofetch<Dashboard>('/api/admin/dashboard', { query })
    ])
    products.value = data[0]
    categories.value = data[1]
    inventory.value = data[2]
    orders.value = data[3].items
    campaigns.value = data[4]
    collections.value = data[5]
    auditLogs.value = data[6]
    dashboard.value = data[7]
  } catch {
    loadError.value = 'Dashboard data could not be loaded. Check database connectivity and your administrator access, then retry.'
    throw new Error(loadError.value)
  } finally {
    dashboardLoading.value = false
  }
}

async function loadUsers(page = usersPage.value) {
  usersLoading.value = true
  loadError.value = ''
  try {
    const data = await ofetch<{ items: AdminUser[]; total: number; page: number; pages: number }>('/api/admin/users', {
      query: {
        page,
        limit: 25,
        search: usersSearch.value || undefined,
        role: usersRole.value || undefined,
        active: usersActive.value || undefined,
        sort: usersSort.value,
        order: usersOrder.value
      }
    })
    users.value = data.items
    usersTotal.value = data.total
    usersPage.value = data.page
    usersPages.value = Math.max(1, data.pages)
  } catch {
    loadError.value = 'User accounts could not be loaded. Check your administrator access and retry.'
  } finally {
    usersLoading.value = false
  }
}

async function submit(action: () => Promise<unknown>, success: string) {
  try {
    await action()
    await loadDashboard()
    message.value = success
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'The request failed.'
  }
}

function selectTab(nextTab: string) {
  tab.value = nextTab
  sidebarOpen.value = false
  if (nextTab === 'users') void loadUsers(1)
}

async function logout() {
  try {
    await ofetch('/api/auth/logout', { method: 'POST' })
    await navigateTo('/')
  } catch {
    message.value = 'Could not sign out. Please retry.'
  }
}

async function createProduct() {
  await submit(async () => {
    await ofetch('/api/admin/products', { method: 'POST', body: productForm })
    Object.assign(productForm, { name: '', sku: '', slug: '', description: '', price: 0, imageUrl: '', categoryId: '', quantity: 0 })
  }, 'Product added.')
}

function beginProductEdit(product: Product) {
  editingProductId.value = product.id
  Object.assign(productEdit, {
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    price: Number(product.price),
    categoryId: categories.value.find(item => item.name === product.category.name)?.id ?? ''
  })
}

async function saveProductEdit(id: string) {
  await submit(
    () => ofetch(`/api/admin/products/${id}`, { method: 'PATCH', body: productEdit }),
    'Product updated.'
  )
  editingProductId.value = ''
}

function beginCategoryEdit(category: Category) {
  editingCategoryId.value = category.id
  Object.assign(categoryEdit, { name: category.name, slug: category.slug })
}

async function saveCategoryEdit(id: string) {
  await submit(
    () => ofetch(`/api/admin/categories/${id}`, { method: 'PATCH', body: categoryEdit }),
    'Category updated.'
  )
  editingCategoryId.value = ''
}

async function createUser() {
  await submit(async () => {
    await ofetch('/api/admin/users', { method: 'POST', body: userForm })
    Object.assign(userForm, { name: '', email: '', password: '', role: 'CUSTOMER' })
    await loadUsers(1)
  }, 'User account created.')
}

function beginUserEdit(account: AdminUser) {
  editingUserId.value = account.id
  Object.assign(userEdit, {
    name: account.name,
    email: account.email,
    role: account.role,
    active: account.active
  })
}

async function saveUserEdit(id: string) {
  const account = users.value.find(item => item.id === id)
  if (account?.active && (!userEdit.active || userEdit.role !== account.role) && !window.confirm('This changes account access. Continue?')) return
  await submit(async () => {
    await ofetch(`/api/admin/users/${id}`, { method: 'PATCH', body: userEdit })
    await loadUsers()
  }, 'User account updated.')
  editingUserId.value = ''
}

async function createCampaign() {
  const body = {
    ...campaignForm,
    startsAt: new Date(campaignForm.startsAt).toISOString(),
    endsAt: new Date(campaignForm.endsAt).toISOString()
  }
  await submit(
    () => ofetch<Campaign>('/api/admin/campaigns', { method: 'POST', body }),
    'Campaign added.'
  )
}

function saveInventory(event: SubmitEvent, productId: string) {
  if (!(event.currentTarget instanceof HTMLFormElement)) return
  const quantity = Number(new FormData(event.currentTarget).get('quantity'))
  return submit(
    () => ofetch<InventoryRow>('/api/admin/inventory', { method: 'PATCH', body: { productId, quantity, reason: 'Admin stock adjustment' } }),
    'Inventory updated.'
  )
}

onMounted(async () => {
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - 29)
  dashboardTo.value = now.toISOString().slice(0, 10)
  dashboardFrom.value = from.toISOString().slice(0, 10)
  try {
    user.value = await ofetch<{ role: string; name: string }>('/api/auth/me')
    if (user.value?.role !== 'ADMIN') return
    authorized.value = true
    await loadDashboard()
  } catch {
    if (!authorized.value) {
      loadError.value = 'Unable to load account. Sign in with an administrator account to continue.'
    }
  }
})
</script>

<template>
  <main class="admin-page">
    <header class="admin-top">
      <button v-if="authorized" type="button" class="sidebar-toggle" :aria-expanded="sidebarOpen" aria-controls="admin-sidebar" @click="sidebarOpen = !sidebarOpen">☰ <span class="sr-only">Toggle administrator menu</span></button>
      <NuxtLink class="brand" to="/" aria-label="SeasonMart home">season<span>mart</span></NuxtLink>
      <span v-if="authorized" class="top-user">{{ user?.name }} · Administrator</span>
      <NuxtLink to="/">← Back to store</NuxtLink>
      <button v-if="authorized" type="button" class="logout-button" @click="logout">Sign out</button>
    </header>
    <section v-if="!authorized" class="admin-denied"><p class="eyebrow">SeasonMart management</p><h1>Admin dashboard</h1><p>{{ loadError || 'Sign in with an administrator account to manage your store.' }}</p><NuxtLink to="/">Return to storefront</NuxtLink></section>
    <template v-else>
      <div class="admin-layout">
      <aside id="admin-sidebar" class="admin-sidebar" :class="{ 'is-open': sidebarOpen, 'is-collapsed': sidebarCollapsed }" aria-label="Administrator dashboard sections">
        <div class="sidebar-heading"><span>Workspace</span><button type="button" :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="sidebarCollapsed = !sidebarCollapsed">{{ sidebarCollapsed ? '›' : '‹' }}</button></div>
        <nav class="sidebar-nav" aria-label="Admin sections">
          <details v-for="group in adminNavigationGroups" :key="group.label" class="sidebar-group" :open="group.items.some(item => item.tab === tab)">
            <summary :title="sidebarCollapsed ? group.label : undefined">{{ group.label }}</summary>
            <button
              v-for="item in group.items"
              :key="item.tab"
              type="button"
              :class="{ selected: tab === item.tab }"
              :aria-current="tab === item.tab ? 'page' : undefined"
              :title="sidebarCollapsed ? item.label : undefined"
              @click="selectTab(item.tab)"
            >
              <span class="sidebar-icon" aria-hidden="true">{{ item.icon }}</span><span class="sidebar-label">{{ item.label }}</span>
            </button>
          </details>
        </nav>
        <div class="sidebar-note">Administrator tools use live store data.</div>
      </aside>
      <div v-if="sidebarOpen" class="sidebar-scrim" @click="sidebarOpen = false" />
      <div class="admin-content">
      <section class="admin-heading"><div><p class="eyebrow">Good day, {{ user?.name }}</p><h1>{{ activeAdminLabel }}</h1><p>Manage the catalog, stock, orders, and seasonal campaigns.</p></div><span class="admin-pill">Administrator</span></section>
      <p v-if="message" class="notice" role="status">{{ message }}</p>
      <p v-if="loadError" class="error-notice" role="alert">{{ loadError }} <button type="button" @click="submit(() => loadDashboard(), 'Dashboard refreshed.')">Retry</button></p>
      <section v-if="tab === 'overview'" class="admin-panel dashboard-panel">
        <div class="panel-title">
          <div><p class="eyebrow">Store performance</p><h2>Dashboard Overview</h2></div>
          <button type="button" class="refresh-button" :disabled="dashboardLoading" @click="submit(() => loadDashboard(), 'Dashboard refreshed.')">{{ dashboardLoading ? 'Refreshing…' : 'Refresh data' }}</button>
        </div>
        <form class="dashboard-filters" @submit.prevent="submit(() => loadDashboard(), 'Report updated.')">
          <label>From<input v-model="dashboardFrom" type="date" required /></label>
          <label>To<input v-model="dashboardTo" type="date" required /></label>
          <label>Low-stock threshold<input v-model.number="lowStockThreshold" type="number" min="0" max="100000" required /></label>
          <button type="submit" :disabled="dashboardLoading">Apply filters</button>
        </form>
        <p v-if="dashboardLoading && !dashboard" class="dashboard-state" role="status">Loading live dashboard metrics…</p>
        <p v-else-if="loadError && !dashboard" class="dashboard-state error-notice" role="alert">Dashboard data is unavailable. No placeholder statistics are shown.</p>
        <template v-else-if="dashboard">
          <div class="metric-grid">
            <article><span>Registered users</span><strong>{{ dashboard.metrics.registeredUsers }}</strong><small>{{ dashboard.metrics.customers }} customers · {{ dashboard.metrics.storeManagers }} store managers</small></article>
            <article><span>Active products</span><strong>{{ dashboard.metrics.activeProducts }}</strong><small>{{ dashboard.metrics.categories }} categories</small></article>
            <article><span>Collections</span><strong>{{ dashboard.metrics.activeCollections }}</strong><small>{{ dashboard.metrics.activeCampaigns }} current campaigns</small></article>
            <article><span>Total orders</span><strong>{{ dashboard.metrics.totalOrders }}</strong><small>{{ dashboard.metrics.pendingOrders }} pending</small></article>
            <article><span>Delivered orders</span><strong>{{ dashboard.metrics.completedOrders }}</strong><small>Fulfilment status</small></article>
            <article><span>Paid sales · database currency</span><strong>{{ dashboard.metrics.paidSales.toFixed(2) }}</strong><small>Only paid, non-cancelled orders · selected range</small></article>
          </div>
          <div class="dashboard-columns">
            <section class="dashboard-card">
              <h3>Sales and order trend</h3>
              <p class="data-caption">Sales include payments marked PAID for non-cancelled orders. No pending payments are counted.</p>
              <p v-if="!dashboard.trend.some(day => day.orders)" class="dashboard-state">No orders in this date range.</p>
              <div v-else class="trend-list">
                <div v-for="day in dashboard.trend" :key="day.date" class="trend-row">
                  <time :datetime="day.date">{{ new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}</time>
                  <div class="trend-track"><span :style="{ width: `${Math.max(day.orders / Math.max(...dashboard.trend.map(item => item.orders), 1) * 100, day.orders ? 4 : 0)}%` }" /></div>
                  <strong>{{ day.orders }}</strong>
                  <small>{{ day.sales.toFixed(2) }}</small>
                </div>
              </div>
            </section>
            <section class="dashboard-card">
              <h3>Low-stock products <small>{{ dashboard.lowStockCount }} total · ≤ {{ dashboard.lowStockThreshold }} units</small></h3>
              <p v-if="!dashboard.lowStockProducts.length" class="dashboard-state">No active products are below this threshold.</p>
              <ul v-else class="dashboard-list">
                <li v-for="row in dashboard.lowStockProducts" :key="row.productId"><span><strong>{{ row.product.name }}</strong><small>{{ row.product.sku }}</small></span><b>{{ row.quantity }} left</b></li>
              </ul>
            </section>
          </div>
          <div class="dashboard-columns">
            <section class="dashboard-card">
              <h3>Recent orders</h3>
              <p v-if="!dashboard.recentOrders.length" class="dashboard-state">No orders have been placed yet.</p>
              <ul v-else class="dashboard-list">
                <li v-for="order in dashboard.recentOrders" :key="order.id"><span><strong>{{ order.user.name }}</strong><small>{{ new Date(order.createdAt).toLocaleString() }} · {{ order.status }}</small></span><b>{{ Number(order.total).toFixed(2) }}</b></li>
              </ul>
            </section>
            <section class="dashboard-card">
              <h3>Recent administrator activity</h3>
              <p v-if="!dashboard.recentActivity.length" class="dashboard-state">No administrative activity recorded yet.</p>
              <ul v-else class="dashboard-list">
                <li v-for="entry in dashboard.recentActivity" :key="entry.id"><span><strong>{{ entry.action }} · {{ entry.entity }}</strong><small>{{ entry.actor?.email ?? 'System' }} · {{ new Date(entry.createdAt).toLocaleString() }}</small></span></li>
              </ul>
            </section>
          </div>
        </template>
      </section>
      <section v-if="tab === 'users'" class="admin-panel">
        <div class="panel-title">
          <div><p class="eyebrow">Accounts and access</p><h2>User Management <small>{{ usersTotal }} accounts</small></h2></div>
          <button type="button" class="refresh-button" :disabled="usersLoading" @click="loadUsers()">{{ usersLoading ? 'Loading…' : 'Refresh users' }}</button>
        </div>
        <form class="admin-form user-form" @submit.prevent="createUser">
          <input v-model.trim="userForm.name" autocomplete="name" placeholder="Full name" maxlength="120" required />
          <input v-model.trim="userForm.email" type="email" autocomplete="email" placeholder="Email address" maxlength="254" required />
          <input v-model="userForm.password" type="password" autocomplete="new-password" placeholder="Initial password (12+ characters)" minlength="12" maxlength="72" required />
          <select v-model="userForm.role" aria-label="New user's role">
            <option value="CUSTOMER">Customer</option>
            <option value="STORE_MANAGER">Store Manager</option>
            <option value="ADMIN">Administrator</option>
          </select>
          <button class="checkout-button" :disabled="usersLoading">Create user</button>
        </form>
        <form class="user-filters" @submit.prevent="loadUsers(1)">
          <label>Search<input v-model.trim="usersSearch" type="search" placeholder="Name or email" /></label>
          <label>Role<select v-model="usersRole"><option value="">All roles</option><option value="CUSTOMER">Customer</option><option value="STORE_MANAGER">Store Manager</option><option value="ADMIN">Administrator</option></select></label>
          <label>Status<select v-model="usersActive"><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select></label>
          <label>Sort by<select v-model="usersSort"><option value="createdAt">Created date</option><option value="name">Name</option><option value="email">Email</option><option value="role">Role</option></select></label>
          <label>Order<select v-model="usersOrder"><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
          <button type="submit" class="table-action" :disabled="usersLoading">Apply filters</button>
        </form>
        <p v-if="usersLoading && !users.length" class="dashboard-state" role="status">Loading user accounts…</p>
        <p v-else-if="!usersLoading && !users.length" class="dashboard-state">No users match these filters.</p>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              <tr v-for="account in users" :key="account.id">
                <td><input v-if="editingUserId === account.id" v-model.trim="userEdit.name" class="edit-input" maxlength="120" /><template v-else>{{ account.name }}</template></td>
                <td><input v-if="editingUserId === account.id" v-model.trim="userEdit.email" class="edit-input" type="email" maxlength="254" /><template v-else>{{ account.email }}</template></td>
                <td><select v-if="editingUserId === account.id" v-model="userEdit.role" class="edit-input"><option value="CUSTOMER">Customer</option><option value="STORE_MANAGER">Store Manager</option><option value="ADMIN">Administrator</option></select><template v-else>{{ account.role === 'ADMIN' ? 'Administrator' : account.role === 'STORE_MANAGER' ? 'Store Manager' : 'Customer' }}</template></td>
                <td><select v-if="editingUserId === account.id" v-model="userEdit.active" class="edit-input"><option :value="true">Active</option><option :value="false">Inactive</option></select><template v-else>{{ account.active ? 'Active' : 'Inactive' }}</template></td>
                <td>{{ new Date(account.createdAt).toLocaleDateString() }}</td>
                <td><template v-if="editingUserId === account.id"><button type="button" class="table-action" @click="saveUserEdit(account.id)">Save</button><button type="button" class="table-action" @click="editingUserId = ''">Cancel</button></template><button v-else type="button" class="table-action" @click="beginUserEdit(account)">Edit</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination-controls">
          <span>Page {{ usersPage }} of {{ usersPages }} · {{ usersTotal }} users</span>
          <div><button type="button" class="table-action" :disabled="usersPage <= 1 || usersLoading" @click="loadUsers(usersPage - 1)">Previous</button><button type="button" class="table-action" :disabled="usersPage >= usersPages || usersLoading" @click="loadUsers(usersPage + 1)">Next</button></div>
        </div>
        <p class="data-caption">Passwords are stored as bcrypt hashes and never returned by these APIs. Deactivating an account revokes access on its next request. The last active administrator cannot be demoted or deactivated.</p>
      </section>
      <section v-if="tab === 'products'" class="admin-panel">
        <div class="panel-title"><div><p class="eyebrow">Catalog</p><h2>Products <small>{{ products.length }}</small></h2></div></div>
        <form class="admin-form product-form" @submit.prevent="createProduct">
          <input v-model="productForm.name" placeholder="Product name" required />
          <input v-model="productForm.sku" placeholder="SKU" required />
          <input v-model="productForm.slug" placeholder="url-slug" required />
          <select v-model="productForm.categoryId" required><option value="" disabled>Category</option><option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option></select>
          <input v-model.number="productForm.price" type="number" min="0.01" step="0.01" placeholder="Price" required />
          <input v-model.number="productForm.quantity" type="number" min="0" placeholder="Opening stock" required />
          <input v-model="productForm.imageUrl" type="url" placeholder="Image URL" required />
          <input v-model="productForm.description" placeholder="Description" required />
          <button class="checkout-button">Add product</button>
        </form>
        <div class="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead>
          <tbody><tr v-for="product in products" :key="product.id"><td><input v-if="editingProductId === product.id" v-model="productEdit.name" class="edit-input" /><template v-else>{{ product.name }}</template></td><td><input v-if="editingProductId === product.id" v-model="productEdit.sku" class="edit-input" /><template v-else>{{ product.sku }}</template></td><td><select v-if="editingProductId === product.id" v-model="productEdit.categoryId" class="edit-input"><option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option></select><template v-else>{{ product.category.name }}</template></td><td><input v-if="editingProductId === product.id" v-model.number="productEdit.price" class="edit-input" type="number" min="0.01" step="0.01" /><template v-else>${{ Number(product.price).toFixed(2) }}</template></td><td>{{ product.inventory?.quantity ?? 0 }}</td><td>{{ product.active ? 'Active' : 'Archived' }}</td><td><button v-if="editingProductId === product.id" class="table-action" @click="saveProductEdit(product.id)">Save</button><button v-else class="table-action" :disabled="!product.active" @click="beginProductEdit(product)">Edit</button><button class="table-action" :disabled="!product.active" @click="submit(() => ofetch(`/api/admin/products/${product.id}`, { method: 'DELETE' }), 'Product archived.')">Archive</button></td></tr></tbody>
        </table></div>
      </section>
      <section v-else-if="tab === 'categories'" class="admin-panel">
        <div class="panel-title"><div><p class="eyebrow">Browse structure</p><h2>Categories</h2></div></div>
        <form class="admin-form compact-form" @submit.prevent="submit(() => ofetch('/api/admin/categories', { method: 'POST', body: categoryForm }), 'Category added.')"><input v-model="categoryForm.name" placeholder="Category name" required /><input v-model="categoryForm.slug" placeholder="url-slug" required /><button class="checkout-button">Add category</button></form>
        <div class="simple-list"><div v-for="item in categories" :key="item.id"><template v-if="editingCategoryId === item.id"><input v-model="categoryEdit.name" class="edit-input" /><input v-model="categoryEdit.slug" class="edit-input" /><button class="table-action" @click="saveCategoryEdit(item.id)">Save</button></template><template v-else><strong>{{ item.name }}</strong><span>/{{ item.slug }}</span><button class="table-action" @click="beginCategoryEdit(item)">Edit</button></template></div></div>
      </section>
      <section v-else-if="tab === 'inventory'" class="admin-panel">
        <div class="panel-title"><div><p class="eyebrow">Stock control</p><h2>Inventory</h2></div></div>
        <div class="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Available</th><th>Adjust quantity</th></tr></thead><tbody>
          <tr v-for="row in inventory" :key="row.productId"><td>{{ row.product.name }}</td><td>{{ row.product.sku }}</td><td>{{ row.quantity }}</td><td><form class="inline-form" @submit.prevent="saveInventory($event, row.productId)"><input name="quantity" type="number" min="0" :value="row.quantity" /><button class="table-action">Save</button></form></td></tr>
        </tbody></table></div>
        <p v-if="inventory.some(row => row.quantity < 5)" class="notice">Low-stock alert: one or more products have fewer than five units available.</p>
      </section>
      <section v-else-if="tab === 'orders'" class="admin-panel"><div class="panel-title"><div><p class="eyebrow">Customer purchases</p><h2>Orders</h2></div></div>
        <div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody><tr v-for="order in orders" :key="order.id"><td>{{ order.id }}</td><td>{{ order.user.name }}<small>{{ order.user.email }}</small></td><td>{{ new Date(order.createdAt).toLocaleDateString() }}</td><td>${{ Number(order.total).toFixed(2) }}</td><td>{{ order.status }}</td></tr></tbody></table></div>
      </section>
      <section v-else-if="tab === 'collections'" class="admin-panel"><div class="panel-title"><div><p class="eyebrow">Seasonal merchandising</p><h2>Collections</h2></div></div>
        <form class="admin-form compact-form" @submit.prevent="submit(() => ofetch('/api/admin/collections', { method: 'POST', body: { ...collectionForm, productIds: [] } }), 'Collection added.')"><input v-model="collectionForm.name" placeholder="Collection name" required /><input v-model="collectionForm.slug" placeholder="url-slug" required /><input v-model="collectionForm.description" placeholder="Description" /><button class="checkout-button">Add collection</button></form>
        <div class="simple-list"><div v-for="item in collections" :key="item.id"><strong>{{ item.name }}</strong><span>/{{ item.slug }}</span><button class="table-action" @click="submit(() => ofetch(`/api/admin/collections/${item.id}`, { method: 'PATCH', body: { active: !item.active } }), 'Collection updated.')">{{ item.active ? 'Deactivate' : 'Activate' }}</button></div></div>
      </section>
      <section v-else-if="tab === 'campaigns'" class="admin-panel"><div class="panel-title"><div><p class="eyebrow">Promotional calendar</p><h2>Campaigns</h2></div></div>
        <form class="admin-form campaign-form" @submit.prevent="createCampaign"><input v-model="campaignForm.name" placeholder="Campaign name" required /><input v-model="campaignForm.description" placeholder="Description" /><input v-model.number="campaignForm.discountPct" type="number" min="0" max="100" placeholder="Discount %" required /><label>Starts<input v-model="campaignForm.startsAt" type="datetime-local" required /></label><label>Ends<input v-model="campaignForm.endsAt" type="datetime-local" required /></label><button class="checkout-button">Add campaign</button></form>
        <div class="simple-list"><div v-for="item in campaigns" :key="item.id"><strong>{{ item.name }} · {{ item.discountPct }}%</strong><span>{{ item.active ? 'Active' : 'Inactive' }}</span><button class="table-action" @click="submit(() => ofetch(`/api/admin/campaigns/${item.id}`, { method: 'PATCH', body: { active: !item.active } }), 'Campaign updated.')">{{ item.active ? 'Deactivate' : 'Activate' }}</button></div></div>
      </section>
      <section v-else-if="tab === 'activity'" class="admin-panel"><div class="panel-title"><div><p class="eyebrow">Administrative history</p><h2>Audit activity</h2></div></div>
        <div class="simple-list"><div v-for="item in auditLogs" :key="item.id"><strong>{{ item.action }} · {{ item.entity }}</strong><span>{{ item.actor?.email ?? 'System' }} · {{ new Date(item.createdAt).toLocaleString() }}</span></div></div>
      </section>
      </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.admin-page{max-width:1180px;margin:auto;padding:25px 28px 80px;color:#293a30}.admin-top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e9e8de;padding-bottom:20px}.admin-top>a:last-child{font-size:12px;color:#576b5d;text-decoration:none}.admin-heading{display:flex;align-items:center;justify-content:space-between;padding:45px 0 27px}.admin-heading h1,.admin-denied h1{font:600 39px 'Playfair Display',serif;margin:8px 0}.admin-heading p:not(.eyebrow),.admin-denied p:not(.eyebrow){font-size:13px;color:#7b7d74}.admin-pill{background:#e8eee5;padding:9px 14px;border-radius:20px;font-size:10px;color:#47634d}.admin-tabs{display:flex;overflow:auto;gap:5px;border-bottom:1px solid #e4e4da;margin-bottom:25px}.admin-tabs button{background:none;border:0;padding:13px 16px;text-transform:capitalize;color:#85877e;font:500 12px 'DM Sans',sans-serif;cursor:pointer}.admin-tabs button.selected{color:#294236;border-bottom:2px solid #536c56}.admin-panel{background:#fff;border:1px solid #ecebe4;padding:25px}.panel-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}.panel-title h2{font:600 25px 'Playfair Display',serif;margin:4px 0}.panel-title h2 small{font:400 12px 'DM Sans',sans-serif;color:#888}.admin-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:25px}.admin-form input,.admin-form select{min-width:0;height:40px;padding:0 10px;border:1px solid #dfdfd6;background:white;font:11px 'DM Sans',sans-serif}.admin-form .checkout-button{margin:0;height:40px;padding:0 12px;white-space:nowrap}.product-form input:nth-of-type(8){grid-column:span 2}.compact-form{grid-template-columns:1fr 1fr auto}.campaign-form{grid-template-columns:repeat(3,minmax(0,1fr))}.campaign-form label{font-size:10px;color:#75776f}.campaign-form label input{display:block;width:100%;margin-top:5px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left;font-size:11px}th{text-transform:uppercase;letter-spacing:1px;color:#92938a;font-size:9px;font-weight:600}th,td{padding:13px 10px;border-bottom:1px solid #eeede6;white-space:nowrap}td small{display:block;color:#888;margin-top:4px}.table-action{border:0;background:#edf1e9;color:#3b5842;padding:7px 10px;font:11px 'DM Sans',sans-serif;cursor:pointer}.table-action:disabled{opacity:.5;cursor:default}.inline-form{display:flex;gap:7px}.inline-form input{width:70px;padding:5px;border:1px solid #ddd}.simple-list>div{display:flex;align-items:center;gap:14px;padding:14px 4px;border-bottom:1px solid #eeede6;font-size:12px}.simple-list span{color:#86877e}.simple-list .table-action{margin-left:auto}.admin-denied{text-align:center;padding:100px 15px}.admin-denied a{color:#42604a;font-size:12px}.notice{padding:12px;background:#eef2e9;color:#465a48;font-size:12px;margin:15px 0}@media(max-width:750px){.product-form,.campaign-form{grid-template-columns:repeat(2,minmax(0,1fr))}.compact-form{grid-template-columns:1fr}.product-form input:nth-of-type(8){grid-column:auto}.admin-panel{padding:15px}.admin-heading{padding-top:30px}.admin-heading h1{font-size:32px}}@media(max-width:480px){.admin-page{padding:18px 14px 50px}.product-form,.campaign-form{grid-template-columns:1fr}.admin-heading{align-items:flex-start;gap:10px}.simple-list>div{flex-wrap:wrap}}
.edit-input{max-width:130px;padding:7px;border:1px solid #ddd;font:11px 'DM Sans',sans-serif}
.admin-page{max-width:1440px;padding-top:18px}.admin-top{gap:15px}.admin-top>a:last-of-type{margin-left:auto}.sidebar-toggle,.logout-button,.refresh-button{border:1px solid #d9e2eb;border-radius:6px;background:#fff;color:#275b87;padding:9px 12px;font:600 12px 'DM Sans',sans-serif;cursor:pointer}.top-user{color:#53677a;font-size:12px}.admin-layout{display:grid;grid-template-columns:242px minmax(0,1fr);gap:24px;align-items:start;margin-top:22px}.admin-sidebar{position:sticky;top:18px;min-height:calc(100vh - 36px);padding:15px 10px;border:1px solid #e1e8ef;border-radius:10px;background:#f7f9fb;transition:width .2s}.sidebar-heading{display:flex;align-items:center;justify-content:space-between;padding:7px 10px 15px;color:#74869a;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase}.sidebar-heading button{border:0;background:none;color:#456b8e;font-size:21px;cursor:pointer}.sidebar-nav{display:grid;gap:4px}.sidebar-group summary{padding:10px 11px;color:#8292a0;font-size:9px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;cursor:pointer;list-style:none}.sidebar-group summary::-webkit-details-marker{display:none}.sidebar-group summary:focus-visible{outline:2px solid #3074b3;outline-offset:1px}.sidebar-group button{display:flex;align-items:center;gap:12px;width:100%;min-height:42px;padding:9px 11px;border:0;border-radius:6px;background:transparent;color:#53677a;text-align:left;font:500 12px 'DM Sans',sans-serif;cursor:pointer}.sidebar-group button:hover{background:#edf3f8;color:#245f92}.sidebar-group button.selected{background:#e5f0f8;color:#236ca6;font-weight:700}.sidebar-icon{display:grid;place-items:center;flex:0 0 21px;height:21px;color:#3074b3;font-size:17px}.sidebar-note{margin:22px 10px 6px;color:#8592a0;font-size:10px;line-height:1.6}.admin-sidebar.is-collapsed{width:72px}.admin-sidebar.is-collapsed .sidebar-heading{justify-content:center}.admin-sidebar.is-collapsed .sidebar-heading>span,.admin-sidebar.is-collapsed .sidebar-label,.admin-sidebar.is-collapsed .sidebar-note,.admin-sidebar.is-collapsed .sidebar-group summary{display:none}.admin-sidebar.is-collapsed .sidebar-group button{justify-content:center;padding:9px 4px}.admin-content{min-width:0}.admin-content .admin-heading{padding-top:18px}.admin-content>.admin-panel{margin-bottom:20px}.dashboard-panel{padding:22px}.dashboard-filters{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin:0 0 20px;padding:13px;background:#f6f8fa}.dashboard-filters label{display:grid;gap:5px;color:#60758a;font-size:10px}.dashboard-filters input{height:36px;padding:0 8px;border:1px solid #d9e2eb;border-radius:4px;background:#fff;color:#304d66;font:11px 'DM Sans',sans-serif}.dashboard-filters button{height:36px;padding:0 14px;border:0;border-radius:4px;background:#3074b3;color:#fff;font:600 11px 'DM Sans',sans-serif;cursor:pointer}.dashboard-filters button:disabled,.refresh-button:disabled{opacity:.6;cursor:wait}.refresh-button{padding:8px 11px}.metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}.metric-grid article{display:grid;gap:8px;min-height:116px;padding:16px;border:1px solid #e3eaf0;border-radius:7px;background:#fff}.metric-grid article>span{color:#718396;font-size:10px}.metric-grid article>strong{color:#275e8c;font:600 clamp(18px,2vw,25px) 'DM Sans',sans-serif;overflow-wrap:anywhere}.metric-grid article>small{color:#82909d;font-size:9px;line-height:1.5}.dashboard-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}.dashboard-card{min-width:0;padding:16px;border:1px solid #e3eaf0;border-radius:7px;background:#fff}.dashboard-card h3{margin:0 0 12px;color:#304e68;font:600 16px 'DM Sans',sans-serif}.dashboard-card h3 small{color:#8492a0;font-size:10px;font-weight:400}.dashboard-state,.data-caption{color:#84909a;font-size:11px;line-height:1.6}.data-caption{margin:-5px 0 13px}.trend-list{display:grid;gap:8px;max-height:300px;overflow:auto}.trend-row{display:grid;grid-template-columns:48px minmax(40px,1fr) 25px minmax(85px,auto);align-items:center;gap:8px;color:#677b8c;font-size:9px}.trend-row time{white-space:nowrap}.trend-track{height:8px;overflow:hidden;border-radius:10px;background:#edf2f6}.trend-track span{display:block;height:100%;border-radius:inherit;background:#70a6cf}.trend-row>strong{color:#365a79;text-align:right}.trend-row>small{text-align:right;white-space:nowrap}.dashboard-list{display:grid;gap:0;margin:0;padding:0;list-style:none}.dashboard-list li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 0;border-top:1px solid #edf0f2;color:#556b7c;font-size:10px}.dashboard-list li>span{display:grid;gap:4px;min-width:0}.dashboard-list li strong{overflow:hidden;color:#39566f;text-overflow:ellipsis}.dashboard-list li small{color:#84909a;font-size:9px}.dashboard-list li>b{color:#3074b3;white-space:nowrap}.error-notice{padding:12px;border:1px solid #f1d5d2;border-radius:5px;background:#fff5f4;color:#913f38;font-size:11px}.error-notice button{margin-left:8px;border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer}.admin-denied{min-height:65vh;display:grid;align-content:center;justify-items:center}.sidebar-scrim{display:none}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:850px){.admin-layout{grid-template-columns:200px minmax(0,1fr);gap:15px}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dashboard-columns{grid-template-columns:1fr}}
@media(max-width:640px){.admin-page{padding:12px 12px 45px}.admin-top{flex-wrap:wrap;gap:10px}.top-user{display:none}.admin-layout{display:block;margin-top:12px}.admin-sidebar{position:fixed;z-index:51;top:0;bottom:0;left:0;width:min(290px,82vw);min-height:0;height:100dvh;padding:18px 12px;border-radius:0 10px 10px 0;transform:translateX(-105%);transition:transform .2s ease;overflow:auto}.admin-sidebar.is-open{transform:translateX(0)}.admin-sidebar.is-collapsed{width:min(290px,82vw)}.admin-sidebar.is-collapsed .sidebar-heading{justify-content:space-between}.admin-sidebar.is-collapsed .sidebar-heading>span,.admin-sidebar.is-collapsed .sidebar-label,.admin-sidebar.is-collapsed .sidebar-note,.admin-sidebar.is-collapsed .sidebar-group summary{display:initial}.admin-sidebar.is-collapsed .sidebar-group button{justify-content:flex-start;padding:9px 11px}.sidebar-scrim{position:fixed;z-index:50;inset:0;display:block;background:#14223080}.admin-content .admin-heading{padding:20px 0}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.metric-grid article{padding:12px;min-height:105px}.dashboard-panel{padding:13px}.dashboard-filters{display:grid;grid-template-columns:1fr 1fr}.dashboard-filters label:nth-child(3){grid-column:span 2}.dashboard-filters button{grid-column:span 2}.panel-title{gap:10px}.panel-title h2{font-size:21px}.admin-heading h1{font-size:29px}.admin-heading .admin-pill{white-space:nowrap}.dashboard-card{padding:13px}}
@media(max-width:390px){.metric-grid{grid-template-columns:1fr}.dashboard-filters{grid-template-columns:1fr}.dashboard-filters label:nth-child(3),.dashboard-filters button{grid-column:auto}.trend-row{grid-template-columns:43px minmax(25px,1fr) 20px minmax(74px,auto);gap:5px}}
.user-form{grid-template-columns:repeat(5,minmax(0,1fr));align-items:center}
.user-filters{display:flex;flex-wrap:wrap;align-items:end;gap:10px;margin-bottom:16px;padding:13px;background:#f6f8fa}
.user-filters label{display:grid;gap:5px;color:#60758a;font-size:10px}
.user-filters input,.user-filters select{height:36px;min-width:120px;padding:0 8px;border:1px solid #d9e2eb;border-radius:4px;background:#fff;color:#304d66;font:11px 'DM Sans',sans-serif}
.user-filters button{height:36px}
.pagination-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;color:#718396;font-size:10px}
.pagination-controls>div{display:flex;gap:7px}
.admin-page button:focus-visible,.admin-page input:focus-visible,.admin-page select:focus-visible{outline:2px solid #3074b3;outline-offset:2px}
@media(max-width:1100px){.user-form{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:750px){.admin-layout{grid-template-columns:minmax(0,1fr)}.admin-sidebar{position:fixed;z-index:20;inset:0 auto 0 0;width:min(290px,84vw);min-height:100vh;border-radius:0;transform:translateX(-105%);transition:transform .2s}.admin-sidebar.is-open{transform:translateX(0)}.admin-sidebar.is-collapsed{width:min(290px,84vw)}.admin-sidebar.is-collapsed .sidebar-heading>span,.admin-sidebar.is-collapsed .sidebar-label,.admin-sidebar.is-collapsed .sidebar-note,.admin-sidebar.is-collapsed .sidebar-group summary{display:initial}.admin-sidebar.is-collapsed .sidebar-heading{justify-content:space-between}.admin-sidebar.is-collapsed .sidebar-group button{justify-content:flex-start;padding:9px 11px}.sidebar-scrim{position:fixed;z-index:19;inset:0;background:#172b3b66}.admin-top .top-user{display:none}.user-form{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:480px){.user-form,.user-filters{display:grid;grid-template-columns:1fr}.user-filters input,.user-filters select{width:100%}.pagination-controls{align-items:flex-start;flex-direction:column}.admin-heading{padding-right:5px}}
</style>

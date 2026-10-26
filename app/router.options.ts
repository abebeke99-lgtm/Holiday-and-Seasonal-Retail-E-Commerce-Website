import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig>{
  async scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (!to.hash) return { top: 0 }

    const element = await new Promise<HTMLElement | null>((resolve) => {
      const deadline = Date.now() + 3000
      const findTarget = () => {
        const target = document.getElementById(to.hash.slice(1))
        if (target || Date.now() >= deadline) {
          resolve(target)
          return
        }
        window.setTimeout(findTarget, 50)
      }
      findTarget()
    })

    return element ? { el: element, top: -140 } : { top: 0 }
  }
}

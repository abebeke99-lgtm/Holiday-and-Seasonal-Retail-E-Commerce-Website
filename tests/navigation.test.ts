import { describe, expect, it } from 'vitest'
import { siteNavigationItems } from '../app/utils/site-navigation'

describe('primary navigation', () => {
  it('provides five distinct destinations in the requested order', () => {
    expect(siteNavigationItems.map(item => item.label)).toEqual([
      'Home',
      'Shop',
      'Categories',
      'Seasonal Collections',
      'Campaigns & Deals'
    ])
    expect(new Set(siteNavigationItems.map(item => item.to)).size).toBe(5)
  })

  it('links each catalog item to its own route', () => {
    expect(siteNavigationItems.map(item => item.to)).toEqual([
      '/',
      '/shop',
      '/categories',
      '/collections',
      '/campaigns'
    ])
  })
})

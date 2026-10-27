export type AdminUserState = {
  id: string
  role: 'CUSTOMER' | 'STORE_MANAGER' | 'ADMIN'
  active: boolean
}

export function wouldRemoveLastActiveAdmin(
  current: AdminUserState,
  update: { role?: AdminUserState['role']; active?: boolean },
  activeAdminCount: number
): boolean {
  const remainsAdmin = (update.role ?? current.role) === 'ADMIN'
  const remainsActive = update.active ?? current.active
  return current.role === 'ADMIN' && current.active && (!remainsAdmin || !remainsActive) && activeAdminCount <= 1
}

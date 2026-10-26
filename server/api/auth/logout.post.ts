import { sessionFor } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const session = await sessionFor(event)
  await session.clear()
  return { success: true }
})

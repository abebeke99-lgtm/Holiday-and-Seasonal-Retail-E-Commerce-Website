import { createError, readBody, type H3Event } from 'h3'
import type { ZodType } from 'zod'

export async function validatedBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const result = schema.safeParse(await readBody(event))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body', data: result.error.flatten() })
  }
  return result.data
}

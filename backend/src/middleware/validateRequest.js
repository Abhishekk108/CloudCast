/**
 * Zod-based request validation middleware.
 *
 * validateBody(schema) validates req.body against a Zod schema and returns a
 * 400 + clear error message if validation fails. On success, req.body is
 * replaced with the parsed (coerced) output from Zod.
 *
 * Usage:
 *   router.post('/endpoint', validateBody(mySchema), controller)
 */

import { AppError } from './errorHandler.js'

/**
 * Validates req.body against a Zod schema.
 * @param {z.ZodSchema} schema
 */
export const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body)

  if (!result.success) {
    // Format Zod errors into a readable message
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ')

    return next(new AppError('VALIDATION_ERROR', `Invalid request body: ${issues}`, 400))
  }

  // Replace req.body with the parsed/coerced result (safe to use downstream)
  req.body = result.data
  next()
}

/**
 * Validates req.query against a Zod schema.
 * @param {z.ZodSchema} schema
 */
export const validateQuery = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.query)

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'query'}: ${issue.message}`)
      .join('; ')

    return next(new AppError('VALIDATION_ERROR', `Invalid query parameters: ${issues}`, 400))
  }

  req.query = result.data
  next()
}

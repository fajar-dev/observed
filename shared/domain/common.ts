import { z } from 'zod'

export const name = z.string().trim().min(1).max(120)

export const queryText = z.string().trim().min(1).max(25000)

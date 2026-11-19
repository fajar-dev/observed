import { z } from 'zod'

export const name = z.string().trim().min(1, 'Enter a name.').max(120)

export const queryText = z.string().trim().min(1).max(25000)

export const variableName = z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/).max(60)
  .refine(value => value !== 'prototype' && !Object.hasOwn(Object.prototype, value), 'Use a non-reserved variable name.')

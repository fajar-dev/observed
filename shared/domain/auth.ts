import type { UserPermissions } from './permissions'
import { z } from 'zod'

export const roles = ['admin', 'editor', 'viewer'] as const
export type Role = typeof roles[number]
export type AuthUser = { permissions?: UserPermissions, id: string, email: string, name: string, role: Role, enabled: boolean, realtimeAlertToasts: boolean, hasPassword: boolean, createdAt: string, lastSignInAt: string | null }
export type AuthSession = { id: string, createdAt: string, expiresAt: string, current: boolean, userAgent: string }
export type AuthProvider = 'google' | 'microsoft'
export type AuthConfiguration = { setupRequired: boolean, providers: AuthProvider[] }
export const passwordSchema = z.string().min(12, 'Use at least 12 characters.').max(128)
export const userInputSchema = z.object({
  email: z.email('Enter a valid email address.').trim().toLowerCase().max(254),
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  role: z.enum(roles),
  enabled: z.boolean().default(true),
  password: passwordSchema.optional()
})
export type UserInput = z.infer<typeof userInputSchema>
export const signInSchema = z.object({ email: z.email('Enter a valid email address.').trim().toLowerCase().max(254), password: z.string().min(1, 'Enter your password.').max(128) })
export const setupSchema = userInputSchema.pick({ email: true, name: true }).extend({ password: passwordSchema })
export const profileSchema = z.object({ name: z.string().trim().min(1, 'Enter your name.').max(100), currentPassword: z.string().max(128).optional(), password: passwordSchema.optional() })
export const canEdit = (role?: Role) => role === 'admin' || role === 'editor'

export const notificationPreferencesSchema = z.strictObject({ realtimeAlertToasts: z.boolean() })
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>

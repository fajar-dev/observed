type ApiFailure = { data?: { data?: { message?: string }, statusMessage?: string }, statusCode?: number, status?: number, statusMessage?: string, message?: string }
export function apiErrorMessage(error: unknown): string {
  if (!error) return 'The request could not be completed.'
  const failure = error as ApiFailure
  return failure.data?.data?.message || failure.data?.statusMessage || failure.statusMessage || failure.message || 'The request could not be completed.'
}
export function apiErrorStatus(error: unknown): number | undefined {
  const failure = error as ApiFailure | null
  return failure?.statusCode ?? failure?.status
}

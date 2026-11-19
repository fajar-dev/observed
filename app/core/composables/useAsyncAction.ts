export function useAsyncAction() {
  const busy = ref(false)
  const error = ref('')
  async function perform<T>(action: () => Promise<T>) {
    if (busy.value) return undefined
    busy.value = true
    error.value = ''
    try {
      return await action()
    } catch (failure) {
      error.value = apiErrorMessage(failure)
    } finally { busy.value = false }
  }
  return { busy, error, perform }
}

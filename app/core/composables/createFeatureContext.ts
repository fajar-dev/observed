import type { InjectionKey } from 'vue'

export function createFeatureContext<T>(factory: () => T, name: string) {
  const key: InjectionKey<T> = Symbol(name)
  return {
    provide() {
      const state = factory()
      provide(key, state)
      return state
    },
    use() {
      const state = inject(key)
      if (!state) throw new Error(`${name} must be used inside its feature view`)
      return state
    }
  }
}

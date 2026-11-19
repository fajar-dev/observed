import type { DataSource } from '#shared/domain/data-source'
import type { TelegramDestination } from '#shared/domain/telegram-destination'

export const useDataSources = () => useResourceCollection<DataSource>('data-sources')
export const useTelegramDestinations = () => useResourceCollection<TelegramDestination>('telegram-destinations')

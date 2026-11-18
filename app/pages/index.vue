<script setup lang="ts">
definePageMeta({ layout: 'app', breadcrumb: 'Overview' })
useSeoMeta({ title: 'gsi-one · Project Overview', description: 'Project overview, database topology, and service activity.' })
</script>

<template>
  <div class="mx-auto max-w-480 px-4 py-5 sm:px-8 sm:py-6 lg:px-12 lg:py-10">
    <div
      id="overview"
      class="grid scroll-mt-6 items-center gap-5 sm:gap-8 lg:grid-cols-2 lg:gap-10"
    >
      <section aria-labelledby="project-title">
        <h1
          id="project-title"
          class="mb-2 text-3xl font-semibold sm:mb-3 sm:text-4xl tracking-tight text-highlighted"
        >
          gsi-one
        </h1>
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="min-w-0 truncate text-sm text-muted sm:text-base">https://gsi-one.example.com</span>
          <UButton
            label="Copy"
            icon="i-lucide-copy"
            color="neutral"
            variant="outline"
            size="sm"
            class="shrink-0"
            href="#"
          />
        </div>

        <dl class="mt-5 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-x-4 sm:gap-y-5">
          <div class="flex min-w-0 items-start gap-2 max-sm:rounded-xl max-sm:border max-sm:border-default max-sm:bg-elevated/20 max-sm:p-2.5 sm:items-center sm:gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-md bg-elevated/50 sm:size-14 sm:rounded-lg sm:border sm:border-default sm:bg-elevated/30 text-emerald-600 dark:text-emerald-400">
              <UIcon
                name="i-lucide-activity"
                class="size-3.5 sm:size-5"
              />
            </span>
            <div class="min-w-0">
              <dt class="mb-0.5  text-xs text-muted uppercase sm:mb-1 sm:tracking-wider">
                Status
              </dt>
              <dd class="wrap-break-word text-xs font-medium sm:text-sm text-highlighted">
                Healthy
              </dd>
            </div>
          </div>
          <div class="flex min-w-0 items-start gap-2 max-sm:rounded-xl max-sm:border max-sm:border-default max-sm:bg-elevated/20 max-sm:p-2.5 sm:items-center sm:gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-md bg-elevated/50 sm:size-14 sm:rounded-lg sm:border sm:border-default sm:bg-elevated/30 text-muted">
              <UIcon
                name="i-lucide-cpu"
                class="size-3.5 sm:size-5"
              />
            </span>
            <div class="min-w-0">
              <dt class="mb-0.5  text-xs text-muted uppercase sm:mb-1 sm:tracking-wider">
                Compute size
              </dt>
              <dd>
                <UBadge
                  color="neutral"
                  variant="outline"
                  size="sm"
                  class="uppercase"
                >
                  Nano
                </UBadge>
              </dd>
            </div>
          </div>
          <div class="flex min-w-0 items-start gap-2 max-sm:rounded-xl max-sm:border max-sm:border-default max-sm:bg-elevated/20 max-sm:p-2.5 sm:items-center sm:gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-md bg-elevated/50 sm:size-14 sm:rounded-lg sm:border sm:border-default sm:bg-elevated/30 text-muted">
              <UIcon
                name="i-simple-icons-github"
                class="size-3.5 sm:size-5"
              />
            </span>
            <div class="min-w-0">
              <dt class="mb-0.5  text-xs text-muted uppercase sm:mb-1 sm:tracking-wider">
                GitHub
              </dt>
              <dd class="wrap-break-word text-xs font-medium sm:text-sm text-muted">
                No repository connected
              </dd>
            </div>
          </div>
          <div class="flex min-w-0 items-start gap-2 max-sm:rounded-xl max-sm:border max-sm:border-default max-sm:bg-elevated/20 max-sm:p-2.5 sm:items-center sm:gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-md bg-elevated/50 sm:size-14 sm:rounded-lg sm:border sm:border-default sm:bg-elevated/30 text-muted">
              <UIcon
                name="i-lucide-git-branch"
                class="size-3.5 sm:size-5"
              />
            </span>
            <div class="min-w-0">
              <dt class="mb-0.5  text-xs text-muted uppercase sm:mb-1 sm:tracking-wider">
                Recent branch
              </dt>
              <dd class="wrap-break-word text-xs font-medium sm:text-sm text-muted">
                No branches
              </dd>
            </div>
          </div>
          <div class="flex min-w-0 items-start gap-2 max-sm:rounded-xl max-sm:border max-sm:border-default max-sm:bg-elevated/20 max-sm:p-2.5 sm:items-center sm:gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-md bg-elevated/50 sm:size-14 sm:rounded-lg sm:border sm:border-default sm:bg-elevated/30 text-muted">
              <UIcon
                name="i-lucide-database"
                class="size-3.5 sm:size-5"
              />
            </span>
            <div class="min-w-0">
              <dt class="mb-0.5  text-xs text-muted uppercase sm:mb-1 sm:tracking-wider">
                Last migration
              </dt>
              <dd class="wrap-break-word text-xs font-medium sm:text-sm text-highlighted">
                fix_notification_mutation_rls
              </dd>
            </div>
          </div>
          <div class="flex min-w-0 items-start gap-2 max-sm:rounded-xl max-sm:border max-sm:border-default max-sm:bg-elevated/20 max-sm:p-2.5 sm:items-center sm:gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-md bg-elevated/50 sm:size-14 sm:rounded-lg sm:border sm:border-default sm:bg-elevated/30 text-muted">
              <UIcon
                name="i-lucide-archive"
                class="size-3.5 sm:size-5"
              />
            </span>
            <div class="min-w-0">
              <dt class="mb-0.5  text-xs text-muted uppercase sm:mb-1 sm:tracking-wider">
                Last backup
              </dt>
              <dd class="wrap-break-word text-xs font-medium sm:text-sm text-muted">
                No backups
              </dd>
            </div>
          </div>
        </dl>
      </section>

      <section
        id="database"
        aria-label="Database topology"
        class="relative grid min-h-54 scroll-mt-6 place-items-center rounded-xl border border-default bg-elevated/25 px-3 pt-13 pb-4 sm:min-h-72 sm:px-4 sm:pt-14 sm:pb-10 lg:min-h-110"
      >
        <div class="absolute inset-x-3 top-3 flex items-center justify-between gap-2 sm:inset-x-4">
          <span class="flex items-center gap-2 rounded-md border border-default bg-default px-2 py-1  text-xs text-muted">
            <span class="size-1.5 rounded-full bg-emerald-500" />
            Database
          </span>
          <UFieldGroup size="xs">
            <UButton
              href="#"
              label="Topology"
              icon="i-lucide-network"
              color="neutral"
            />
            <UButton
              href="#"
              label="Region"
              icon="i-lucide-globe"
              color="neutral"
              variant="subtle"
            />
          </UFieldGroup>
        </div>

        <UCard
          class="w-full max-w-85 shadow-sm"
          :ui="{ body: 'p-3 sm:p-3', footer: 'p-2 sm:p-2' }"
        >
          <div class="flex items-start gap-3">
            <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <UIcon
                name="i-lucide-database"
                class="size-5"
              />
            </span>
            <div class="flex-1">
              <h2 class="text-sm font-semibold text-highlighted">
                Primary Database
              </h2>
              <p class="mt-0.5 text-sm text-muted">
                Northeast Asia (Tokyo)
              </p>
              <p class="mt-0.5 text-xs text-muted">
                ap-northeast-1 · Nano
              </p>
            </div>
            <span
              class="grid h-6 w-8 place-items-center rounded border border-default"
              aria-label="Japan"
              role="img"
            >
              <span class="size-2.5 rounded-full bg-red-500" />
            </span>
          </div>
          <template #footer>
            <dl class="flex flex-wrap justify-between gap-x-2 gap-y-1 px-1 text-xs">
              <div class="flex gap-1">
                <dt class="text-muted">
                  CPU
                </dt>
                <dd class="font-medium text-highlighted">
                  2%
                </dd>
              </div>
              <div class="flex gap-1">
                <dt class="text-muted">
                  Disk
                </dt>
                <dd class="font-medium text-highlighted">
                  15%
                </dd>
              </div>
              <div class="flex gap-1">
                <dt class="text-muted">
                  RAM
                </dt>
                <dd class="font-medium text-highlighted">
                  50%
                </dd>
              </div>
              <div class="flex gap-1">
                <dt class="text-muted">
                  Connections
                </dt>
                <dd class="font-medium text-highlighted">
                  6/60
                </dd>
              </div>
            </dl>
          </template>
        </UCard>
      </section>
    </div>

    <section
      id="activity"
      aria-labelledby="activity-title"
      class="mt-6 scroll-mt-6 sm:mt-10 lg:mt-12"
    >
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="activity-title"
            class="text-lg font-semibold text-highlighted"
          >
            Request activity
          </h2>
          <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span><strong class="font-semibold text-highlighted">0</strong> Total requests</span>
            <span><strong class="font-semibold text-highlighted">0.0%</strong> Success rate</span>
          </div>
        </div>
        <UButton
          href="#"
          label="Last 60 minutes"
          icon="i-lucide-clock-3"
          trailing-icon="i-lucide-chevron-down"
          color="neutral"
          variant="outline"
          size="sm"
          class="sm:min-w-40"
        />
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:auto-cols-[calc((100%-2.25rem)/4)] xl:grid-flow-col xl:grid-cols-none xl:overflow-x-auto xl:p-1 2xl:auto-cols-fr">
        <UCard
          v-for="service in ['Postgres', 'Edge Functions', 'Auth', 'Storage', 'Realtime']"
          :key="service"
          class="min-w-0"
          :ui="{ body: 'p-3 sm:p-3', header: 'p-3 sm:p-3' }"
        >
          <template #header>
            <div class="flex flex-wrap justify-between gap-2">
              <div>
                <h3 class=" text-xs tracking-wide text-muted uppercase">
                  {{ service }}
                </h3>
                <p class="mt-0.5 text-xl font-semibold text-highlighted">
                  0
                </p>
              </div>
              <dl class="flex gap-3 text-right">
                <div>
                  <dt class="flex items-center gap-1 text-xs text-muted">
                    <span class="size-1.5 rounded-full bg-amber-500" /> Warnings
                  </dt>
                  <dd class="mt-0.5 text-sm">
                    0
                  </dd>
                </div>
                <div>
                  <dt class="flex items-center gap-1 text-xs text-muted">
                    <span class="size-1.5 rounded-full bg-red-500" /> Errors
                  </dt>
                  <dd class="mt-0.5 text-sm">
                    0
                  </dd>
                </div>
              </dl>
            </div>
          </template>
          <UEmpty
            icon="i-lucide-chart-no-axes-column"
            title="No data"
            description="Last 60 minutes"
            variant="naked"
            size="xs"
            class="rounded-md border border-dashed border-default bg-elevated/25"
          />
        </UCard>
      </div>
    </section>
  </div>
</template>

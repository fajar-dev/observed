const controls = {
  xs: { base: 'h-control-xs px-space-sm py-space-xs text-xs gap-space-xs', leadingIcon: 'size-icon-xs', trailingIcon: 'size-icon-xs' },
  sm: { base: 'h-control-sm px-space-md py-space-xs text-sm gap-space-sm', leadingIcon: 'size-icon-sm', trailingIcon: 'size-icon-sm' },
  md: { base: 'h-control-md px-space-lg py-space-sm text-sm gap-space-sm', leadingIcon: 'size-icon-md', trailingIcon: 'size-icon-md' },
  lg: { base: 'h-control-lg px-space-lg py-space-sm text-base gap-space-sm', leadingIcon: 'size-icon-md', trailingIcon: 'size-icon-md' },
  xl: { base: 'h-control-xl px-space-xl py-space-sm text-base gap-space-md', leadingIcon: 'size-icon-lg', trailingIcon: 'size-icon-lg' }
}
const field = { slots: { base: 'rounded-md font-normal' }, variants: { size: controls }, compoundVariants: [{ size: 'md' as const, class: 'md:text-sm' }], defaultVariants: { size: 'md' as const } }
const dialogOverlay = 'bg-overlay backdrop-blur-subtle'
const dialogSlots = {
  header: 'min-h-none px-space-lg pt-space-lg pb-space-sm pe-space-page sm:px-space-lg sm:pe-space-page',
  body: 'px-space-lg pt-space-sm pb-space-lg sm:px-space-lg sm:pt-space-sm sm:pb-space-lg',
  footer: 'justify-end gap-space-sm px-space-lg pt-none pb-space-lg sm:px-space-lg sm:pt-none sm:pb-space-lg',
  title: 'font-heading text-heading font-semibold',
  close: 'top-space-md end-space-md'
}
export default defineAppConfig({
  ui: {
    colors: { primary: 'blue', neutral: 'neutral' },
    button: {
      slots: { base: 'cursor-pointer justify-center rounded-md font-medium' }, variants: { size: controls },
      compoundVariants: [
        { size: 'xs', square: true, class: 'size-control-xs p-none' }, { size: 'sm', square: true, class: 'size-control-sm p-none' },
        { size: 'md', square: true, class: 'size-control-md p-none' }, { size: 'lg', square: true, class: 'size-control-lg p-none' }, { size: 'xl', square: true, class: 'size-control-xl p-none' }
      ], defaultVariants: { size: 'md' }
    },
    input: field, inputNumber: field, inputMenu: field, select: field, selectMenu: field,
    textarea: { slots: { base: 'rounded-md text-sm leading-relaxed' }, defaultVariants: { size: 'md' } },
    formField: { slots: { label: 'text-sm font-medium', description: 'text-sm', hint: 'text-xs', help: 'text-xs', error: 'text-xs', container: 'mt-space-sm' }, defaultVariants: { size: 'md' } },
    card: { slots: { root: 'rounded-sm bg-default shadow-none', header: 'p-space-lg', body: 'p-space-lg sm:p-space-lg', footer: 'p-space-md sm:p-space-md', title: 'font-heading text-heading font-semibold', description: 'text-sm text-muted' } },
    pageHeader: { slots: { root: 'border-none py-space-sm', title: 'font-heading text-title sm:text-title font-semibold tracking-tight', description: 'mt-space-sm text-sm sm:text-sm leading-relaxed text-muted', links: 'flex flex-wrap items-center gap-space-sm' } },
    modal: { variants: { fullscreen: { false: { content: 'divide-none' } }, overlay: { true: { overlay: dialogOverlay } } }, slots: { ...dialogSlots, content: 'rounded-xl shadow-xl' } },
    slideover: { slots: { ...dialogSlots, overlay: dialogOverlay, content: 'divide-none' } },
    tabs: { variants: { orientation: { horizontal: { list: 'w-full max-w-full' } } }, slots: { root: 'min-w-none max-w-full items-start', list: 'w-full max-w-full rounded-none p-none', trigger: 'rounded-none px-space-md py-space-sm text-sm font-medium sm:px-space-lg', indicator: 'rounded-none' }, defaultVariants: { size: 'md', variant: 'link' } },
    popover: { slots: { content: 'rounded-lg' } },
    empty: { slots: { root: 'rounded-xl p-space-xxl', title: 'font-heading text-heading font-semibold', description: 'text-sm leading-relaxed text-muted' } },
    toast: { slots: {
      root: 'rounded-lg border border-default bg-default p-space-lg shadow-lg ring-none gap-space-md',
      title: 'text-sm font-semibold text-highlighted',
      description: 'mt-space-xs text-xs leading-relaxed break-words text-muted',
      icon: 'size-icon-md shrink-none',
      actions: 'flex gap-space-sm shrink-none',
      close: 'p-none'
    } },
    badge: { slots: { base: 'rounded-sm font-medium' } },
    table: { slots: { th: 'bg-muted px-space-lg py-space-md text-xs font-medium text-muted', td: 'px-space-lg py-space-md text-sm font-normal' } },
    navigationMenu: { slots: { link: 'rounded-md font-medium', linkLeadingIcon: 'size-icon-md' } }
  }
})

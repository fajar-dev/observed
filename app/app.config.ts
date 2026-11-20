const controls = {
  xs: { base: 'h-control-xs px-space-sm py-space-xs text-xs gap-space-xs', leadingIcon: 'size-icon-xs', trailingIcon: 'size-icon-xs' },
  sm: { base: 'h-control-sm px-space-md py-space-xs text-sm gap-space-sm', leadingIcon: 'size-icon-sm', trailingIcon: 'size-icon-sm' },
  md: { base: 'h-control-md px-space-lg py-space-sm text-sm gap-space-sm', leadingIcon: 'size-icon-md', trailingIcon: 'size-icon-md' },
  lg: { base: 'h-control-lg px-space-lg py-space-sm text-base gap-space-sm', leadingIcon: 'size-icon-md', trailingIcon: 'size-icon-md' },
  xl: { base: 'h-control-xl px-space-xl py-space-sm text-base gap-space-md', leadingIcon: 'size-icon-lg', trailingIcon: 'size-icon-lg' }
}
const field = { slots: { base: 'rounded-md font-normal' }, variants: { size: controls }, compoundVariants: [{ size: 'md' as const, class: 'md:text-sm' }], defaultVariants: { size: 'md' as const } }
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
    modal: { slots: { content: 'rounded-xl shadow-xl', header: 'p-space-xl', body: 'p-space-xl sm:p-space-xl', footer: 'justify-end gap-space-sm p-space-lg sm:p-space-lg', title: 'font-heading text-heading font-semibold', description: 'mt-space-xs text-sm text-muted' } },
    slideover: { slots: { header: 'p-space-xl', body: 'p-space-xl sm:p-space-xl', footer: 'justify-end gap-space-sm p-space-lg sm:p-space-lg', title: 'font-heading text-heading font-semibold', description: 'mt-space-xs text-sm text-muted' } },
    tabs: { variants: { orientation: { horizontal: { list: 'w-fit max-w-full' } } }, slots: { root: 'items-start', list: 'w-fit max-w-full rounded-lg p-space-xs', trigger: 'rounded-md px-space-lg py-space-sm text-sm font-medium', indicator: 'rounded-md' }, defaultVariants: { size: 'md' } },
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

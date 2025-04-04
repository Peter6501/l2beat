import { z } from 'zod'

export interface FilterableEntry {
  filterable: FilterableValue[] | undefined
}
export type FilterableValue = {
  id: FilterableValueId
  value: string
}
export type FilterableValueId = z.infer<typeof FilterableValueId>
export const FilterableValueId = z.enum([
  'type',
  'stack',
  'stage',
  'purpose',
  'hostChain',
  'daLayer',
  'raas',
  'validatedBy',
])

export const filterIdToLabel: Record<FilterableValueId, string> = {
  type: 'Type',
  stack: 'Stack',
  stage: 'Stage',
  purpose: 'Purpose',
  hostChain: 'Host Chain',
  daLayer: 'DA Layer',
  raas: 'RaaS',
  validatedBy: 'Validated by',
}

export const filterIdToValues: Record<FilterableValueId, string> = {
  type: 'types',
  stack: 'stacks',
  stage: 'stages',
  purpose: 'purposes',
  hostChain: 'chains',
  daLayer: 'layers',
  raas: 'providers',
  validatedBy: 'validators',
}

export const emptyStateLabel = (filterId: FilterableValueId | undefined) => {
  return filterId
    ? `No ${filterIdToValues[filterId].toLowerCase()} found.`
    : 'No filters found.'
}

export const inputPlaceholder = (filterId: FilterableValueId | undefined) => {
  return filterId
    ? `Search ${filterIdToValues[filterId].toLowerCase()}...`
    : 'Search filters...'
}

const ALWAYS_FIRST_VALUES = ['No stack', 'Ethereum', 'NotApplicable']
export function filterValuesSortFn(a: string, b: string) {
  if (ALWAYS_FIRST_VALUES.includes(a)) return -1
  if (ALWAYS_FIRST_VALUES.includes(b)) return 1
  return a.localeCompare(b)
}

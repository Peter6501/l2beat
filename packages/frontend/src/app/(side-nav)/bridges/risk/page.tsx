import { getBridgesRiskEntries } from '~/server/features/bridges/get-bridges-risk-entries'
import { getDefaultMetadata } from '~/utils/metadata'
import { BridgesRiskPage } from './_page'

export const metadata = getDefaultMetadata({
  openGraph: {
    url: '/bridges/risk',
  },
})

export default async function Page() {
  const entries = await getBridgesRiskEntries()

  return <BridgesRiskPage entries={entries} />
}

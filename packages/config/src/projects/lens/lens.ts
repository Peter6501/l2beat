import { UnixTime } from '@l2beat/shared-pure'
import type { ScalingProject } from '../../internalTypes'
import { upcomingL2 } from '../../templates/upcoming'

export const lens: ScalingProject = upcomingL2({
  id: 'lens',
  capability: 'universal',
  addedAt: UnixTime(1716536821), // 2024-05-24T07:47:01Z
  display: {
    name: 'Lens',
    slug: 'lens',
    description:
      "Lens Network is the main social networking hub for the entire user base of Lens Protocol, built using ZKsync's ZK Stack technology.",
    purposes: ['Social'],
    category: 'Validium',
    stack: 'ZK Stack',
    links: {
      websites: ['https://lens.xyz'],
      apps: ['https://lens.xyz/mint'],
      documentation: ['https://lens.xyz/docs'],
      explorers: ['https://momoka.lens.xyz'],
      repositories: ['https://github.com/lens-protocol'],
      socialMedia: [
        'https://hey.xyz/u/lens',
        'https://x.com/lensprotocol',
        'https://discord.com/invite/lensprotocol',
      ],
    },
  },
})

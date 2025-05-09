import { ProjectId, UnixTime } from '@l2beat/shared-pure'
import type { ScalingProject } from '../../internalTypes'
import { upcomingL3 } from '../../templates/upcoming'

export const mxc: ScalingProject = upcomingL3({
  id: ProjectId('mxc'),
  capability: 'universal',
  addedAt: UnixTime(1710847645), // 2024-03-19T11:27:25Z
  hostChain: ProjectId('arbitrum'),
  display: {
    name: 'MXC Moonchain zkEVM',
    shortName: 'MXC',
    slug: 'mxc',
    stack: 'Taiko',
    description:
      'The MXC Moonchain zkEVM is an IoT-centric L3 on Arbitrum forked from the Taiko codebase. The review of this chain is delayed, see https://github.com/l2beat/l2beat/issues/4560 for more information.',
    purposes: ['Universal', 'IoT'],
    category: 'ZK Rollup',
    links: {
      websites: ['https://mxc.org/'],
      apps: [
        'https://erc20.moonchain.com/',
        'https://bridge.mxc.com/',
        'https://mxc.org/axs-app',
      ],
      documentation: ['https://doc.mxc.com'],
      explorers: ['https://explorer.moonchain.com'],
      repositories: ['https://github.com/MXCzkEVM'],
      socialMedia: [
        'https://x.com/mxcfoundation',
        'https://discord.com/invite/mxcfoundation',
        'https://t.me/mxcfoundation',
        'https://linkedin.com/company/mxc-foundation/',
        'https://facebook.com/MXCfoundation/',
        'https://youtube.com/c/MXCFoundation',
      ],
    },
  },
})

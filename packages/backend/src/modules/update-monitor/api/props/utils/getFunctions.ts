import { deduplicateAbi } from '@l2beat/discovery'
import type { ContractParameters } from '@l2beat/discovery-types'
import { EthereumAddress } from '@l2beat/shared-pure'
import { ethers } from 'ethers'

import { getAddresses } from './getAddresses'

export function getViewABI(
  contract: ContractParameters,
  discoveryABIs: Record<string, string[]>,
  eoas: EthereumAddress[],
): ethers.utils.Interface {
  // contracts without values do not have ABI in discovery.json
  if (contract.values === undefined) {
    return new ethers.utils.Interface([])
  }

  const addresses = getAddresses(contract)
    .filter((addr) => addr !== EthereumAddress.ZERO)
    .filter((addr) => !eoas.includes(addr))

  const abis = addresses
    .map((address) => {
      const abi = discoveryABIs[address.toString()]
      if (abi === undefined) {
        return []
      }
      return abi.filter((fn) => fn.includes(' view '))
    })
    .flat()

  return new ethers.utils.Interface(deduplicateAbi(abis))
}

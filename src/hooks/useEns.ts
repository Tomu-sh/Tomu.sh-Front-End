import { useEffect, useState } from 'react'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

// Create a public client connected to Ethereum mainnet for ENS resolution
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

/**
 * Custom hook to fetch ENS name for a given address
 * ENS names are stored on Ethereum mainnet, so we need to query that chain
 * even if the user is connected to Polygon
 */
export function useEns(address: string | undefined) {
  const [ensName, setEnsName] = useState<string | null>(null)
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchEnsData() {
      if (!address) {
        setEnsName(null)
        setEnsAvatar(null)
        return
      }

      setLoading(true)
      try {
        // Resolve ENS name from address (reverse lookup)
        const name = await publicClient.getEnsName({
          address: address as `0x${string}`,
        })
        setEnsName(name)

        // If we found an ENS name, try to get the avatar too
        if (name) {
          const avatar = await publicClient.getEnsAvatar({ name })
          setEnsAvatar(avatar)
        }
      } catch (error) {
        console.error('Error fetching ENS data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEnsData()
  }, [address])

  return { ensName, ensAvatar, loading }
}

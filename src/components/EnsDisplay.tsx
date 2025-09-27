import { useAccount } from 'wagmi'
import { useEns } from '../hooks/useEns'

interface EnsDisplayProps {
  showAvatar?: boolean
}

export function EnsDisplay({ showAvatar = true }: EnsDisplayProps) {
  const { address } = useAccount()
  const { ensName, ensAvatar, loading } = useEns(address)

  // If not connected or no ENS, don't show anything
  if (!address || (!ensName && !loading)) {
    return null
  }

  // Format the address for display (0x1234...5678)
  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  return (
    <div className='flex items-center gap-2'>
      {loading && (
        <div className='text-sm text-gray-500 dark:text-gray-400'>
          Loading ENS...
        </div>
      )}

      {!loading && ensName && (
        <div className='flex items-center gap-2'>
          {showAvatar && ensAvatar && (
            <img
              src={ensAvatar}
              alt={`${ensName} avatar`}
              className='w-5 h-5 rounded-full'
            />
          )}
          <span className='text-sm font-medium'>{ensName}</span>
        </div>
      )}
    </div>
  )
}

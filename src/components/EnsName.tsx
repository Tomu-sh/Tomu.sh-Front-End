import { useEns } from '../hooks/useEns'

interface EnsNameProps {
  address: string
  showAvatar?: boolean
  className?: string
}

/**
 * Component to display ENS name for an address
 * Falls back to shortened address if no ENS is available
 */
export function EnsName({
  address,
  showAvatar = true,
  className = '',
}: EnsNameProps) {
  const { ensName, ensAvatar, loading } = useEns(address)

  // Format the address for display (0x1234...5678)
  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  if (loading) {
    return (
      <span className={`text-gray-500 dark:text-gray-400 ${className}`}>
        Loading...
      </span>
    )
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {showAvatar && ensAvatar && (
        <img
          src={ensAvatar}
          alt={`${ensName || address} avatar`}
          className='w-4 h-4 rounded-full'
        />
      )}
      <span>{ensName || formatAddress(address)}</span>
    </div>
  )
}

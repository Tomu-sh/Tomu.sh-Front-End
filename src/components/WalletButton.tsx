import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useWallet } from '../services/wallet'
import { useEns } from '../hooks/useEns'
import { useAccount } from 'wagmi'

export function WalletButton() {
  // Use our wallet hook to get current state
  const { balance } = useWallet()
  const { address } = useAccount()
  const { ensName, ensAvatar } = useEns(address)

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected = ready && account && chain

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type='button'
                    className='bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors dark:bg-violet-600 dark:hover:bg-violet-500'
                  >
                    Connect Wallet
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type='button'
                    className='bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors'
                  >
                    Wrong network
                  </button>
                )
              }

              return (
                <div className='flex items-center gap-3'>
                  <div className='bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2'>
                    <span className='text-sm font-medium text-emerald-800 dark:text-emerald-300'>
                      ${((balance || 0) / 100).toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={openChainModal}
                    type='button'
                    className='flex items-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors'
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={openAccountModal}
                    type='button'
                    className='bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-2'
                  >
                    {ensAvatar && (
                      <img
                        src={ensAvatar}
                        alt={`ENS Avatar`}
                        className='w-4 h-4 rounded-full'
                      />
                    )}
                    {ensName || account.displayName}
                    {account.displayBalance && !ensName
                      ? ` (${account.displayBalance})`
                      : ''}
                  </button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

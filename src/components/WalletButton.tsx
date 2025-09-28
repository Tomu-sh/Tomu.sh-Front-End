import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useWallet } from '../services/wallet'
import { useEns } from '../hooks/useEns'
import { useAccount } from 'wagmi'
import { motion } from 'framer-motion'
import { TapButton } from '../components/ui/motion'

export function WalletButton() {
  // Use our wallet hook to get current state
  const { usdcBalance } = useWallet()
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
                  <TapButton
                    onClick={openConnectModal}
                    className='btn btn-primary bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 flex items-center gap-2'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-5 w-5'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
                      />
                    </svg>
                    Connect Wallet
                  </TapButton>
                )
              }

              if (chain.unsupported) {
                return (
                  <TapButton
                    onClick={openChainModal}
                    className='btn bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center gap-2'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-5 w-5'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                      />
                    </svg>
                    Wrong network
                  </TapButton>
                )
              }

              return (
                <div className='flex items-center gap-3'>
                  <motion.div
                    className='bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 
                    border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2 shadow-sm'
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <motion.span
                      className='text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1'
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        className='h-4 w-4'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                      ${((usdcBalance || 0) / 100).toFixed(2)} USDC
                    </motion.span>
                  </motion.div>

                  <TapButton
                    onClick={openChainModal}
                    className='flex items-center btn btn-secondary'
                  >
                    {chain.hasIcon && (
                      <motion.div
                        style={{
                          background: chain.iconBackground,
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 6,
                        }}
                        initial={{ rotate: -180, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 260,
                          damping: 20,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 18, height: 18 }}
                          />
                        )}
                      </motion.div>
                    )}
                    {chain.name}
                  </TapButton>

                  <TapButton
                    onClick={openAccountModal}
                    className='btn btn-secondary flex items-center gap-2'
                  >
                    {ensAvatar ? (
                      <motion.img
                        src={ensAvatar}
                        alt={`ENS Avatar`}
                        className='w-5 h-5 rounded-full'
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 260,
                          damping: 20,
                        }}
                      />
                    ) : (
                      <motion.div
                        className='w-5 h-5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold'
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 260,
                          damping: 20,
                        }}
                      >
                        {account.displayName?.substring(0, 1).toUpperCase()}
                      </motion.div>
                    )}
                    <span className='truncate max-w-[100px]'>
                      {ensName || account.displayName}
                    </span>
                  </TapButton>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

import React from 'react';

interface ChainLogoProps {
  className?: string;
  size?: number;
}

// Solana Logo Component
export const SolanaLogo: React.FC<ChainLogoProps> = ({ className = "", size = 16 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 32 32" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0)">
      <path 
        d="M26.2105 5.71948C25.7965 5.30548 25.2305 5.07248 24.6425 5.07248H3.29648C2.30448 5.07248 1.70548 6.20648 2.25648 6.99548L5.78848 12.2805C6.20248 12.6945 6.76848 12.9275 7.35648 12.9275H28.7025C29.6945 12.9275 30.2935 11.7935 29.7425 11.0045L26.2105 5.71948Z" 
        fill="url(#paint0_linear)"
      />
      <path 
        d="M26.2105 26.2805C25.7965 26.6945 25.2305 26.9275 24.6425 26.9275H3.29648C2.30448 26.9275 1.70548 25.7935 2.25648 25.0045L5.78848 19.7195C6.20248 19.3055 6.76848 19.0725 7.35648 19.0725H28.7025C29.6945 19.0725 30.2935 20.2065 29.7425 20.9955L26.2105 26.2805Z" 
        fill="url(#paint1_linear)"
      />
      <path 
        d="M5.78848 12.2805C6.20248 11.8665 6.76848 11.6335 7.35648 11.6335H28.7025C29.6945 11.6335 30.2935 12.7675 29.7425 13.5565L26.2105 18.8415C25.7965 19.2555 25.2305 19.4885 24.6425 19.4885H3.29648C2.30448 19.4885 1.70548 18.3545 2.25648 17.5655L5.78848 12.2805Z" 
        fill="url(#paint2_linear)"
      />
    </g>
    <defs>
      <linearGradient id="paint0_linear" x1="31.9984" y1="31.9984" x2="0.001568" y2="0.001568" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3"/>
        <stop offset="1" stopColor="#DC1FFF"/>
      </linearGradient>
      <linearGradient id="paint1_linear" x1="23.9984" y1="23.9984" x2="7.9984" y2="7.9984" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3"/>
        <stop offset="1" stopColor="#DC1FFF"/>
      </linearGradient>
      <linearGradient id="paint2_linear" x1="23.9984" y1="23.9984" x2="7.9984" y2="7.9984" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3"/>
        <stop offset="1" stopColor="#DC1FFF"/>
      </linearGradient>
      <clipPath id="clip0">
        <rect width="32" height="32" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

// Ethereum Logo Component
export const EthereumLogo: React.FC<ChainLogoProps> = ({ className = "", size = 16 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 32 32" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_eth)">
      <path 
        d="M16 2L15.853 2.499V21.151L16 21.298L24.5 16.623L16 2Z" 
        fill="#343434"
      />
      <path 
        d="M16 2L7.5 16.623L16 21.298V12.372V2Z" 
        fill="#8C8C8C"
      />
      <path 
        d="M16 23.224L15.906 23.339V29.655L16 29.894L24.504 18.55L16 23.224Z" 
        fill="#3C3C3B"
      />
      <path 
        d="M16 29.894V23.224L7.5 18.55L16 29.894Z" 
        fill="#8C8C8C"
      />
      <path 
        d="M16 21.298L24.5 16.623L16 12.372V21.298Z" 
        fill="#141414"
      />
      <path 
        d="M7.5 16.623L16 21.298V12.372L7.5 16.623Z" 
        fill="#393939"
      />
    </g>
    <defs>
      <clipPath id="clip0_eth">
        <rect width="32" height="32" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

// Helper function to get chain logo based on protocol
export const getChainLogo = (protocolId: string) => {
  if (protocolId.endsWith('_evm')) {
    return EthereumLogo;
  }
  return SolanaLogo;
};
export function ShopLogo({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Awning background */}
      <path
        d="M6 24L10 10H54L58 24H6Z"
        fill="#1877F2"
      />
      {/* White awning stripes */}
      <path d="M18 10L16 24H24L26 10H18Z" fill="#60A5FA" />
      <path d="M38 10L36 24H44L46 10H38Z" fill="#60A5FA" />
      {/* Awning scallops */}
      <path
        d="M6 24C6 27.3 9 30 12.5 30C16 30 19 27.3 19 24C19 27.3 22 30 25.5 30C29 30 32 27.3 32 24C32 27.3 35 30 38.5 30C42 30 45 27.3 45 24C45 27.3 48 30 51.5 30C55 30 58 27.3 58 24H6Z"
        fill="#1877F2"
      />
      {/* Storefront base building */}
      <path
        d="M10 30V54C10 55.1 10.9 56 12 56H52C53.1 56 54 55.1 54 54V30H10Z"
        fill="#3B82F6"
        fillOpacity="0.15"
      />
      <rect
        x="10"
        y="30"
        width="44"
        height="26"
        rx="2"
        stroke="#1E40AF"
        strokeWidth="4"
      />
      {/* Window */}
      <rect
        x="16"
        y="36"
        width="14"
        height="12"
        rx="1"
        fill="#93C5FD"
        stroke="#1E40AF"
        strokeWidth="3"
      />
      {/* Door */}
      <path
        d="M36 56V38C36 36.9 36.9 36 38 36H48V56H36Z"
        fill="#1E40AF"
      />
    </svg>
  )
}

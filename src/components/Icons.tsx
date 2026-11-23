import type { ReactNode } from 'react'

function Svg({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const IconIdeas = () => (
  <Svg>
    <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" />
    <path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </Svg>
)
export const IconBook = () => (
  <Svg>
    <path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z" />
    <path d="M5 17a3 3 0 013-3h11" />
  </Svg>
)
export const IconBookmark = () => (
  <Svg>
    <path d="M7 3h10v18l-5-4-5 4z" />
  </Svg>
)
export const IconChart = () => (
  <Svg>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Svg>
)
export const IconPlus = () => (
  <Svg>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const IconGear = () => (
  <Svg>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </Svg>
)
export const IconBack = () => (
  <Svg>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
)
export const IconRefresh = () => (
  <Svg size={18}>
    <path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7" />
  </Svg>
)
export const IconSearch = () => (
  <Svg size={18}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.2-4.2" />
  </Svg>
)
export const IconTimer = () => (
  <Svg size={16}>
    <circle cx="12" cy="13" r="7" />
    <path d="M12 9v4l2.5 1.5M9 3h6" />
  </Svg>
)
export const IconCheck = () => (
  <Svg size={16}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
)
export const IconClose = () => (
  <Svg size={18}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

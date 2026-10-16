import React from 'react';

interface SkullLogoProps {
  className?: string;
  size?: number;
}

export const SkullLogo: React.FC<SkullLogoProps> = ({ className = 'w-6 h-6', size }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="AI Heaven Skull Logo"
    >
      {/* Cranium Base */}
      <path
        d="M32 4C18.745 4 8 14.745 8 28C8 36.315 12.215 43.645 18.665 47.96C19.49 48.51 20 49.44 20 50.43V54C20 56.21 21.79 58 24 58H40C42.21 58 44 56.21 44 54V50.43C44 49.44 44.51 48.51 45.335 47.96C51.785 43.645 56 36.315 56 28C56 14.745 45.255 4 32 4Z"
        fill="#F4F4F5"
        stroke="#18181B"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      
      {/* Temporal Contours */}
      <path
        d="M13 32C13 22 21 10 32 10C43 10 51 22 51 32"
        stroke="#E4E4E7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Deep Shadow Eye Sockets */}
      <ellipse
        cx="23.5"
        cy="28.5"
        rx="6.5"
        ry="8"
        fill="#09090B"
      />
      <ellipse
        cx="40.5"
        cy="28.5"
        rx="6.5"
        ry="8"
        fill="#09090B"
      />
      
      {/* Eye Socket Inner Glimmer / Void Depth */}
      <circle cx="25" cy="27" r="1.5" fill="#27272A" />
      <circle cx="39" cy="27" r="1.5" fill="#27272A" />

      {/* Blood-Red Tears streaming from the eyes */}
      <path
        d="M24 35C24 35 22.5 39 23 44C23.3 47 24.5 49 24.5 50.5C24.5 51.3 23.9 52 23 52C22.1 52 21.5 51.3 21.5 50C21.5 48 23 43 23 37L24 35Z"
        fill="url(#bloodTearLeft)"
      />
      <path
        d="M40 35C40 35 41.5 39 41 44C40.7 47 39.5 49 39.5 50.5C39.5 51.3 40.1 52 41 52C41.9 52 42.5 51.3 42.5 50C42.5 48 41 43 41 37L40 35Z"
        fill="url(#bloodTearRight)"
      />
      
      {/* Tear Drops at Tip */}
      <circle cx="23" cy="51.5" r="1.5" fill="#EF4444" />
      <circle cx="41" cy="51.5" r="1.5" fill="#EF4444" />

      {/* Triangular Inverted Nasal Cavity */}
      <path
        d="M32 34L29 41.5H35L32 34Z"
        fill="#09090B"
      />

      {/* Teeth / Jaw Sockets */}
      <path
        d="M26 50V58M30 50V58M34 50V58M38 50V58"
        stroke="#18181B"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 53.5H42"
        stroke="#18181B"
        strokeWidth="1.5"
      />

      {/* Subtle Crimson Gradients */}
      <defs>
        <linearGradient id="bloodTearLeft" x1="24" y1="35" x2="22.5" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#991B1B" />
          <stop offset="0.7" stopColor="#DC2626" />
          <stop offset="1" stopColor="#EF4444" />
        </linearGradient>
        <linearGradient id="bloodTearRight" x1="40" y1="35" x2="41.5" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#991B1B" />
          <stop offset="0.7" stopColor="#DC2626" />
          <stop offset="1" stopColor="#EF4444" />
        </linearGradient>
      </defs>
    </svg>
  );
};

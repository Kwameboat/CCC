
import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  hideText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 120, hideText = false }) => {
  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_20px_rgba(197,146,53,0.3)]"
      >
        {/* Laurel Wreath - High Fidelity Recreation */}
        <g fill="#C59235">
          {/* Top Center Leaves */}
          <path d="M100 15 Q 112 30, 100 48 Q 88 30, 100 15" />
          <path d="M82 25 Q 88 40, 75 52 Q 62 38, 82 25" />
          <path d="M118 25 Q 112 40, 125 52 Q 138 38, 118 25" />
          
          {/* Right Branch Leaves */}
          <path d="M152 48 Q 148 62, 162 72 Q 175 60, 152 48" />
          <path d="M175 80 Q 165 92, 185 105 Q 195 90, 175 80" />
          <path d="M178 120 Q 165 130, 182 148 Q 195 135, 178 120" />
          <path d="M158 155 Q 145 160, 155 178 Q 170 170, 158 155" />
          
          {/* Left Branch Leaves */}
          <path d="M48 48 Q 52 62, 38 72 Q 25 60, 48 48" />
          <path d="M25 80 Q 35 92, 15 105 Q 5 90, 25 80" />
          <path d="M22 120 Q 35 130, 18 148 Q 5 135, 22 120" />
          <path d="M42 155 Q 55 160, 45 178 Q 30 170, 42 155" />
          
          {/* Branch Connectors */}
          <path d="M100 185 C 150 185, 185 150, 185 100" stroke="#C59235" strokeWidth="1.5" fill="none" />
          <path d="M100 185 C 50 185, 15 150, 15 100" stroke="#C59235" strokeWidth="1.5" fill="none" />
          <path d="M100 185 L 100 195" stroke="#C59235" strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Double Rings */}
        <circle cx="100" cy="100" r="62" stroke="#C59235" strokeWidth="4.5" />
        <circle cx="100" cy="100" r="55" stroke="#C59235" strokeWidth="1.5" />

        {/* Inner Flame/Leaf Motifs */}
        <g fill="#C59235">
          <path d="M85 145 C 80 130, 65 110, 50 100 C 60 115, 65 135, 75 145 Z" />
          <path d="M115 145 C 120 130, 135 110, 150 100 C 140 115, 135 135, 125 145 Z" />
          <path d="M100 152 C 95 135, 90 120, 90 100 C 95 125, 105 125, 110 100 C 110 120, 105 135, 100 152 Z" />
        </g>

        {/* Internal Positioning Dots */}
        <circle cx="78" cy="85" r="4" fill="#C59235" />
        <circle cx="122" cy="85" r="4" fill="#C59235" />
        <circle cx="100" cy="65" r="4" fill="#C59235" />

        {/* Central Wrought Cross */}
        <g stroke="#C59235" strokeWidth="6" strokeLinecap="round">
          <line x1="100" y1="55" x2="100" y2="155" />
          <line x1="72" y1="92" x2="128" y2="92" />
        </g>
        
        {/* Cross Terminals (Flory Style) */}
        <circle cx="100" cy="55" r="5.5" fill="#C59235" />
        <circle cx="72" cy="92" r="5.5" fill="#C59235" />
        <circle cx="128" cy="92" r="5.5" fill="#C59235" />
        <path d="M95 155 L 105 155 L 100 165 Z" fill="#C59235" /> {/* Bottom Point */}
      </svg>
      
      {!hideText && (
        <div className="mt-4 text-center">
          <span className="text-4xl font-serif font-black text-gold-500 tracking-[0.1em] uppercase block leading-none" style={{ fontFamily: 'Georgia, serif' }}>C.C.C</span>
          <div className="w-20 h-1 bg-gold-500 mx-auto mt-2 rounded-full opacity-80"></div>
        </div>
      )}
    </div>
  );
};

export default Logo;

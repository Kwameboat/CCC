import React from 'react';
import { CHURCH_NAME } from '../lib/brand';

interface LogoProps {
  className?: string;
  /** Height of the logo in pixels (width follows the logo's proportions). */
  size?: number;
  hideText?: boolean;
}

/** Official Charis Christian Center (C.C.C) logo. Source: public/images/ccc-logo.png */
export const LOGO_SRC = '/images/ccc-logo.png';
const LOGO_RATIO = 446 / 559; // width / height of the logo artwork

const Logo: React.FC<LogoProps> = ({ className = '', size = 120, hideText = false }) => {
  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <img
        src={LOGO_SRC}
        alt={`${CHURCH_NAME} logo`}
        width={Math.round(size * LOGO_RATIO)}
        height={size}
        style={{ height: size, width: 'auto' }}
        className="object-contain drop-shadow-[0_0_20px_rgba(197,146,53,0.3)] select-none"
        draggable={false}
      />

      {!hideText && (
        <div className="mt-4 text-center px-2">
          <span
            className="text-lg sm:text-xl font-serif font-black text-gold-500 tracking-[0.08em] uppercase block leading-snug"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {CHURCH_NAME}
          </span>
          <div className="w-20 h-1 bg-gold-500 mx-auto mt-2 rounded-full opacity-80"></div>
        </div>
      )}
    </div>
  );
};

export default Logo;

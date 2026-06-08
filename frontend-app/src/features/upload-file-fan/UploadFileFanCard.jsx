import { useId } from 'react';
import './uploadFileFanCard.css';

function buildIds(prefix) {
  return {
    symbolBase: `${prefix}-symbol-base`,
    symbolHover: `${prefix}-symbol-hover`,
    bg: `${prefix}-bg`,
    bgHover: `${prefix}-bg-hover`,
    inner: `${prefix}-inner`,
    innerHover: `${prefix}-inner-hover`,
    stroke: `${prefix}-stroke`,
    strokeHover: `${prefix}-stroke-hover`,
    bgClip: `${prefix}-bg-clip`,
    innerEffect: `${prefix}-inner-effect`,
    insetBlur: `${prefix}-inset-blur`,
    bottomGlowBlur: `${prefix}-bottom-glow-blur`,
    leftShadow: `${prefix}-left-shadow`,
    rightShadow: `${prefix}-right-shadow`,
  };
}

function SvgDefs({ ids }) {
  return (
    <svg
      aria-hidden="true"
      className="uploadFileFanCard__defs"
      focusable="false"
      width="0"
      height="0"
    >
      <defs>
        <linearGradient id={ids.bg} gradientUnits="userSpaceOnUse" x1="29" y1="73" x2="29" y2="1">
          <stop offset="0" stopColor="#737373" />
          <stop offset="1" stopColor="#404040" />
        </linearGradient>

        <linearGradient id={ids.bgHover} gradientUnits="userSpaceOnUse" x1="29" y1="73" x2="29" y2="1">
          <stop offset="0" stopColor="#5A2CFC" />
          <stop offset="1" stopColor="#AD6CFC" />
        </linearGradient>

        <linearGradient id={ids.inner} gradientUnits="userSpaceOnUse" x1="29" y1="24.36" x2="29" y2="48.9489">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#BDBDBD" />
        </linearGradient>

        <linearGradient id={ids.innerHover} gradientUnits="userSpaceOnUse" x1="29" y1="24.36" x2="29" y2="48.9489">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>

        <linearGradient id={ids.stroke} gradientUnits="userSpaceOnUse" x1="53.6318" y1="74.8505" x2="-0.1524" y2="3.9444">
          <stop offset="0" stopColor="#B3B3B3" />
          <stop offset="1" stopColor="#CCCCCC" />
        </linearGradient>

        <linearGradient id={ids.strokeHover} gradientUnits="userSpaceOnUse" x1="53.6318" y1="74.8505" x2="-0.1524" y2="3.9444">
          <stop offset="0" stopColor="#522F95" />
          <stop offset="1" stopColor="#E1ABFF" />
        </linearGradient>

        <clipPath id={ids.bgClip}>
          <path d="M41,1H9C4.6,1,1,4.6,1,9v56c0,4.4,3.6,8,8,8h40c4.4,0,8-3.6,8-8V17L41,1z" />
        </clipPath>

        <filter id={ids.innerEffect} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.6" floodColor="rgba(38, 18, 74, 0.55)" />
          <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="rgba(255, 255, 255, 0.98)" />
        </filter>

        <filter id={ids.insetBlur} x="-20%" y="-20%" width="140%" height="150%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>

        <filter id={ids.bottomGlowBlur} x="-30%" y="-30%" width="160%" height="180%">
          <feGaussianBlur stdDeviation="2.8" />
        </filter>

        <filter id={ids.leftShadow} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000" floodOpacity="0.34" />
        </filter>

        <filter id={ids.rightShadow} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000" floodOpacity="0.34" />
        </filter>

        <symbol id={ids.symbolBase} viewBox="0 0 58 74">
          <path fill={`url(#${ids.bg})`} d="M41,1H9C4.6,1,1,4.6,1,9v56c0,4.4,3.6,8,8,8h40c4.4,0,8-3.6,8-8V17L41,1z" />
          <g clipPath={`url(#${ids.bgClip})`}>
            <ellipse
              cx="29"
              cy="73.5"
              rx="25"
              ry="6"
              fill="#FFFFFF"
              fillOpacity="0.24"
              filter={`url(#${ids.bottomGlowBlur})`}
            />
          </g>
          <path
            fill={`url(#${ids.inner})`}
            d="M40.3,28.1h-2.4v-2.4c0-0.7-0.5-1.2-1.2-1.2s-1.2,0.5-1.2,1.2v2.4h-2.4
            c-0.7,0-1.2,0.5-1.2,1.2s0.5,1.2,1.2,1.2h2.4v2.4c0,0.7,0.5,1.2,1.2,1.2s1.2-0.5,1.2-1.2v-2.4h2.4c0.7,0,1.2-0.5,1.2-1.2
            S41,28.1,40.3,28.1z M39.1,35.8c-0.7,0-1.2,0.5-1.2,1.2v1.3l-1.6-1.6c-1.4-1.4-3.7-1.4-5.1,0L20.8,47.1h-0.7
            c-0.7,0-1.2-0.5-1.2-1.2V29.3c0-0.7,0.5-1.2,1.2-1.2H29c0.7,0,1.2-0.5,1.2-1.2c0-0.7-0.5-1.2-1.2-1.2h-8.9c-2,0-3.6,1.6-3.6,3.6
            v16.7c0,2,1.6,3.6,3.6,3.6h16.7c2,0,3.6-1.6,3.6-3.6v-4.8c0,0,0,0,0,0V37C40.3,36.3,39.8,35.8,39.1,35.8z M37.9,45.9
            c0,0.7-0.5,1.2-1.2,1.2H24.1l8.8-8.8c0.5-0.5,1.2-0.5,1.7,0l3.3,3.3V45.9z M21.3,34c0,2,1.6,3.6,3.6,3.6s3.6-1.6,3.6-3.6
            s-1.6-3.6-3.6-3.6S21.3,32.1,21.3,34z M26,34c0,0.7-0.5,1.2-1.2,1.2c-0.7,0-1.2-0.5-1.2-1.2s0.5-1.2,1.2-1.2C25.5,32.8,26,33.4,26,34z"
          />
          <path
            fill={`url(#${ids.stroke})`}
            d="M41.9,0.5C41.6,0.2,41.1,0,40.7,0H40H9C4,0,0,4,0,9v56c0,5,4,9,9,9h40c5,0,9-4,9-9V18v-0.7
            c0-0.5-0.2-0.9-0.5-1.3L41.9,0.5z M57,17H47c-3.3,0-6-2.7-6-6V1L57,17z M57,65c0,4.4-3.6,8-8,8H9c-4.4,0-8-3.6-8-8V9
            c0-4.4,3.6-8,8-8h31v10c0,3.9,3.1,7,7,7h10V65z"
          />
        </symbol>

        <symbol id={ids.symbolHover} viewBox="0 0 58 74">
          <g clipPath={`url(#${ids.bgClip})`}>
            <path fill={`url(#${ids.bgHover})`} d="M41,1H9C4.6,1,1,4.6,1,9v56c0,4.4,3.6,8,8,8h40c4.4,0,8-3.6,8-8V17L41,1z" />
            <ellipse
              cx="29"
              cy="73.5"
              rx="25"
              ry="6"
              fill="#FFFFFF"
              fillOpacity="0.42"
              filter={`url(#${ids.bottomGlowBlur})`}
            />
            <path
              d="M41,1H9C4.6,1,1,4.6,1,9v56c0,4.4,3.6,8,8,8h40c4.4,0,8-3.6,8-8V17L41,1z"
              fill="none"
              stroke="#000000"
              strokeOpacity="0.32"
              strokeWidth="3"
              filter={`url(#${ids.insetBlur})`}
            />
          </g>
          <path fill={`url(#${ids.bgHover})`} d="M41,1V11c0,3.3,2.7,6,6,6h10L41,1z" />
          <path
            filter={`url(#${ids.innerEffect})`}
            fill={`url(#${ids.innerHover})`}
            d="M40.3,28.1h-2.4v-2.4c0-0.7-0.5-1.2-1.2-1.2s-1.2,0.5-1.2,1.2v2.4h-2.4
            c-0.7,0-1.2,0.5-1.2,1.2s0.5,1.2,1.2,1.2h2.4v2.4c0,0.7,0.5,1.2,1.2,1.2s1.2-0.5,1.2-1.2v-2.4h2.4c0.7,0,1.2-0.5,1.2-1.2
            S41,28.1,40.3,28.1z M39.1,35.8c-0.7,0-1.2,0.5-1.2,1.2v1.3l-1.6-1.6c-1.4-1.4-3.7-1.4-5.1,0L20.8,47.1h-0.7
            c-0.7,0-1.2-0.5-1.2-1.2V29.3c0-0.7,0.5-1.2,1.2-1.2H29c0.7,0,1.2-0.5,1.2-1.2c0-0.7-0.5-1.2-1.2-1.2h-8.9c-2,0-3.6,1.6-3.6,3.6
            v16.7c0,2,1.6,3.6,3.6,3.6h16.7c2,0,3.6-1.6,3.6-3.6v-4.8c0,0,0,0,0,0V37C40.3,36.3,39.8,35.8,39.1,35.8z M37.9,45.9
            c0,0.7-0.5,1.2-1.2,1.2H24.1l8.8-8.8c0.5-0.5,1.2-0.5,1.7,0l3.3,3.3V45.9z M21.3,34c0,2,1.6,3.6,3.6,3.6s3.6-1.6,3.6-3.6
            s-1.6-3.6-3.6-3.6S21.3,32.1,21.3,34z M26,34c0,0.7-0.5,1.2-1.2,1.2c-0.7,0-1.2-0.5-1.2-1.2s0.5-1.2,1.2-1.2C25.5,32.8,26,33.4,26,34z"
          />
          <path
            fill={`url(#${ids.strokeHover})`}
            d="M41.9,0.5C41.6,0.2,41.1,0,40.7,0H40H9C4,0,0,4,0,9v56c0,5,4,9,9,9h40c5,0,9-4,9-9V18v-0.7
            c0-0.5-0.2-0.9-0.5-1.3L41.9,0.5z M57,17H47c-3.3,0-6-2.7-6-6V1L57,17z M57,65c0,4.4-3.6,8-8,8H9c-4.4,0-8-3.6-8-8V9
            c0-4.4,3.6-8,8-8h31v10c0,3.9,3.1,7,7,7h10V65z"
          />
        </symbol>
      </defs>
    </svg>
  );
}

function SideCard({ ids, side }) {
  const shadowId = side === 'left' ? ids.leftShadow : ids.rightShadow;
  const sideClassName = side === 'left'
    ? 'uploadFileFanCard__card uploadFileFanCard__card--left'
    : 'uploadFileFanCard__card uploadFileFanCard__card--right';

  return (
    <div className={sideClassName}>
      <svg className="uploadFileFanCard__cardSvg" viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
        <g filter={`url(#${shadowId})`}>
          <svg
            aria-hidden="true"
            className="uploadFileFanCard__fileArt uploadFileFanCard__fileArt--side"
            x="34"
            y="8"
            width="186"
            height="238"
            viewBox="0 0 58 74"
          >
            <use href={`#${ids.symbolBase}`} />
          </svg>
        </g>
      </svg>
    </div>
  );
}

function MainCard({ ids }) {
  return (
    <div className="uploadFileFanCard__card uploadFileFanCard__card--main">
      <svg className="uploadFileFanCard__cardSvg" viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
        <svg
          aria-hidden="true"
          className="uploadFileFanCard__fileArt uploadFileFanCard__fileArt--mainBase"
          x="34"
          y="8"
          width="186"
          height="238"
          viewBox="0 0 58 74"
        >
          <use href={`#${ids.symbolBase}`} />
        </svg>

        <svg
          aria-hidden="true"
          className="uploadFileFanCard__fileArt uploadFileFanCard__fileArt--mainHover"
          x="34"
          y="8"
          width="186"
          height="238"
          viewBox="0 0 58 74"
        >
          <use href={`#${ids.symbolHover}`} />
        </svg>
      </svg>
    </div>
  );
}

export function UploadFileFanCard({
  ariaLabel = 'Upload file animation',
  className = '',
  size = 520,
  style,
  type = 'button',
  ...props
}) {
  const reactId = useId();
  const ids = buildIds(`uploadFileFan${reactId.replace(/:/g, '')}`);
  const componentWidth = typeof size === 'number' ? `${size}px` : size;
  const mergedStyle = {
    '--upload-file-fan-width': componentWidth,
    ...style,
  };

  return (
    <button
      {...props}
      aria-label={ariaLabel}
      className={['uploadFileFanCard', className].filter(Boolean).join(' ')}
      style={mergedStyle}
      type={type}
    >
      <SvgDefs ids={ids} />

      <div className="uploadFileFanCard__scene" aria-hidden="true">
        <div className="uploadFileFanCard__fanAnchor">
          <SideCard ids={ids} side="left" />
          <SideCard ids={ids} side="right" />
        </div>

        <MainCard ids={ids} />
      </div>
    </button>
  );
}

const I = ({ d, fill }: { d: string; fill?: boolean }) => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const Back = () => <I d="M15 5l-7 7 7 7" />;
export const Undo = () => <I d="M8 5L4 9l4 4M4 9h10a6 6 0 010 12h-3" />;
export const Bulb = () => <I d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.800 1-2.500A6 6 0 0012 3z" />;
export const Restart = () => <I d="M4 12a8 8 0 108-8H8M11 1L8 4l3 3" />;
export const Sliders = () => <I d="M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6" />;
export const Chart = () => <I d="M5 20V10M12 20V4M19 20v-7" />;
export const Gear = () => <I d="M12 15.500a3.500 3.500 0 100-7 3.500 3.500 0 000 7zM19.400 13.500l1.600 1.200-2 3.400-1.900-.700a7.600 7.600 0 01-2 1.100L14.800 21h-4l-.300-2.500a7.600 7.600 0 01-2-1.100l-1.900.700-2-3.400 1.600-1.200a7.800 7.800 0 010-2.300L4.600 10l2-3.400 1.900.700a7.600 7.600 0 012-1.100L10.800 3h4l.300 2.500a7.600 7.600 0 012 1.100l1.900-.700 2 3.400-1.600 1.200c.1.800.1 1.500 0 2.300z" />;
export const Share = () => <I d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />;
export const Check = () => <I d="M5 12.500l4.500 4.500L19 7.500" />;
export const Close = () => <I d="M6 6l12 12M18 6L6 18" />;
export const Help = () => <I d="M9.500 9a2.500 2.500 0 114 2c-.900.700-1.500 1.200-1.500 2.500M12 17.500v.010M12 21a9 9 0 100-18 9 9 0 000 18z" />;

export const External = () => <I d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" />;

/** The GamedIn mark: four real game pieces on a charcoal tile. Fixed colours, it does not invert in dark mode. */
export const Logo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
    <rect width="64" height="64" rx="16" fill="#231E18" />
    <rect x="9" y="9" width="21.5" height="21.5" rx="6" fill="#7650DE" />
    <path d="M13 25.5 12 16.75 16.25 20.25 19.75 14.5 23.25 20.25 27.5 16.75 26.5 25.5Z" fill="#F7F0E1" stroke="#F7F0E1" strokeWidth="1.6" strokeLinejoin="round" />
    <rect x="33.5" y="9" width="21.5" height="21.5" rx="6" fill="#F7F0E1" />
    <circle cx="40.6" cy="16.1" r="4.3" fill="#F2A414" />
    <rect x="43.8" y="19.3" width="7.8" height="7.8" rx="2.2" fill="#2C6BD3" />
    <rect x="9" y="33.5" width="21.5" height="21.5" rx="6" fill="#F7F0E1" />
    <path d="M15 39.5H20.5Q24.5 39.5 24.5 43.5V49" fill="none" stroke="#EC6A2E" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="15" cy="39.5" r="3.4" fill="#231E18" />
    <rect x="33.5" y="33.5" width="21.5" height="21.5" rx="6" fill="#1A8466" />
    <rect x="38.6" y="38.6" width="11.3" height="11.3" rx="3" fill="#F7F0E1" />
  </svg>
);

/** The LarpedIn mark, for the cross-promo card. */
export const LarpedInMark = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
    <rect width="64" height="64" rx="16" fill="#231E18" />
    <path d="M25.25 26 24.25 17.25 28.5 20.75 32 15 35.5 20.75 39.75 17.25 38.75 26Z" fill="#EC6A2E" stroke="#EC6A2E" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M8 35Q8 26 17 26Q26 26 32 31Q38 26 47 26Q56 26 56 35Q56 48 46 49.5Q38 50.5 32 43.5Q26 50.5 18 49.5Q8 48 8 35Z" fill="#F7F0E1" />
    <rect x="14" y="32.5" width="12" height="9" rx="3.5" fill="#231E18" />
    <rect x="38" y="32.5" width="12" height="9" rx="3.5" fill="#231E18" />
    <circle cx="20" cy="37" r="2.7" fill="#EC6A2E" />
    <circle cx="44" cy="37" r="2.7" fill="#EC6A2E" />
  </svg>
);

/** A time like 1:23. Only the digits are tabular, so the colon keeps its natural width. */
export const Time = ({ text }: { text: string }) => {
  const [m, sec] = text.split(':');
  return <><span className="tnum">{m}</span>:<span className="tnum">{sec}</span></>;
};

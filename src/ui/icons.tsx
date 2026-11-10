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

export const Logo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
    <rect width="64" height="64" rx="15" className="logo-bg" />
    <rect x="13" y="13" width="17" height="17" rx="5" className="logo-tile" />
    <rect x="34" y="13" width="17" height="17" rx="5" className="logo-hot" />
    <rect x="13" y="34" width="17" height="17" rx="5" className="logo-tile" />
    <rect x="34" y="34" width="17" height="17" rx="5" className="logo-tile" />
  </svg>
);

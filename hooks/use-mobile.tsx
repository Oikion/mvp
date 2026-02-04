import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

type BreakpointState = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallMobile: boolean;
  activeBreakpoint: string;
};

/**
 * Hook to detect current viewport size and provide responsive design functionality
 * @returns Object with various viewport size indicators
 */
export function useMobile(): BreakpointState {
  const [state, setState] = React.useState<BreakpointState>({
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    isSmallMobile: true,
    activeBreakpoint: 'xs'
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      const width = window.innerWidth;
      
      let activeBreakpoint = 'xs';
      if (width >= 1536) activeBreakpoint = '2xl';
      else if (width >= 1280) activeBreakpoint = 'xl';
      else if (width >= TABLET_BREAKPOINT) activeBreakpoint = 'lg';
      else if (width >= MOBILE_BREAKPOINT) activeBreakpoint = 'md';
      else if (width >= 640) activeBreakpoint = 'sm';
      
      setState({
        isMobile: width < MOBILE_BREAKPOINT,
        isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
        isDesktop: width >= TABLET_BREAKPOINT,
        isSmallMobile: width < 640,
        activeBreakpoint,
      });
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return state;
}

export default useMobile;

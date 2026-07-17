import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface PanelRect {
  left: number;
  width: number;
}

// Shared state machine behind every "icon button that unfurls a small attached panel
// underneath it" in the app (tour share menu, header language switcher, ...): smooth
// max-height reveal instead of an instant popup, closes on scroll/outside-click/Escape, and
// handles the "can't transition into a just-mounted element's own initial style" problem via
// a forced-reflow layout effect instead of requestAnimationFrame (which browsers throttle or
// fully pause for backgrounded/hidden tabs).
export function useExpandingMenu(getPanelRect?: (buttonRect: DOMRect) => PanelRect) {
  const [open, setOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setPanelVisible(false);
      return;
    }
    const reposition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const { left, width } = getPanelRect ? getPanelRect(rect) : { left: rect.left, width: rect.width };
      setCoords({ top: rect.bottom, left, width });
    };
    reposition();
    if (hasOpenedOnce) {
      // The panel already exists in the DOM, already painted in its collapsed state from
      // before — flipping straight to visible here transitions normally.
      setPanelVisible(true);
    } else {
      // First time ever opening: the panel doesn't exist in the DOM yet, so there's nothing
      // to transition from. Mount it collapsed first; the layout effect below (which fires
      // once it's actually in the DOM) forces a reflow and then reveals it, which is what
      // gives the very first expand something to animate out of.
      setHasOpenedOnce(true);
    }
    const handleOutside = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) || buttonRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    // Any scroll closes the menu instead of chasing the button — repositioning on every
    // scroll frame reads as the panel sliding/lagging behind whatever it's attached to.
    const handleScroll = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', reposition);
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Fires once, synchronously after the panel's first-ever mount (before the browser paints).
  // Reading scrollHeight both measures the panel's natural height (unaffected by the max-height
  // clamp) and forces the collapsed layout to commit right then, so the very next style flip
  // (panelVisible=true) has an actual "from" state to transition out of.
  useLayoutEffect(() => {
    if (!hasOpenedOnce || !open) return;
    if (panelRef.current) {
      setExpandedHeight(panelRef.current.scrollHeight);
    }
    setPanelVisible(true);
  }, [hasOpenedOnce]);

  return { open, setOpen, hasOpenedOnce, panelVisible, expandedHeight, coords, buttonRef, panelRef };
}

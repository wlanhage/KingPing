'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export type NavLink = { href: string; label: string };
export type NavGroup = { label: string; links: NavLink[] };

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

/**
 * Huvudmenyn: de mest använda sidorna som knappar, resten i rullgardiner. Rullgardinen ritas i
 * <body> med position: fixed: i mobil är menyraden scrollbar och tonad med mask-image, och båda
 * klipper allt som ligger inuti raden.
 */
export function TopNav({ links, groups }: { links: NavLink[]; groups: NavGroup[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [position, setPosition] = useState<CSSProperties>({});
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(null), [pathname]);

  // Menyn ligger sist i <body>, så fokus flyttas dit när den öppnas; annars når tangentbordet den aldrig.
  useEffect(() => { if (open) menuRef.current?.querySelector('a')?.focus(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return;
      // Klick i menyn och menyradens egen sidledsscroll (mobil) ska inte stänga rullgardinen.
      const target = e.target instanceof Node ? e.target : null;
      const inside = !!target && (navRef.current?.contains(target) || menuRef.current?.contains(target));
      if ((e.type === 'pointerdown' || e.type === 'scroll') && inside) return;
      setOpen(null);
    };
    const events = ['pointerdown', 'keydown', 'resize', 'scroll'] as const;
    events.forEach((type) => window.addEventListener(type, close, type === 'scroll' ? { capture: true, passive: true } : undefined));
    return () => events.forEach((type) => window.removeEventListener(type, close, type === 'scroll' ? { capture: true } : undefined));
  }, [open]);

  function toggle(label: string, button: HTMLButtonElement) {
    if (open === label) return setOpen(null);
    const rect = button.getBoundingClientRect();
    const width = 220;
    setPosition({ top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), minWidth: width });
    setOpen(label);
  }

  return (
    <nav className='top-nav' ref={navRef}>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className='nav-pill' aria-current={isActive(pathname, l.href) ? 'page' : undefined}>{l.label}</Link>
      ))}
      {groups.map((g) => {
        const current = g.links.some((l) => isActive(pathname, l.href));
        return (
          <div key={g.label} className='nav-group'>
            <button type='button' className='nav-pill nav-trigger' aria-expanded={open === g.label} aria-haspopup='true' data-current={current || undefined} onClick={(e) => toggle(g.label, e.currentTarget)}>
              {g.label}<span aria-hidden className='nav-caret'>▾</span>
            </button>
            {open === g.label && createPortal(
              <div className='nav-menu' style={position} ref={menuRef}>
                {g.links.map((l) => (
                  <Link key={l.href} href={l.href} className='nav-menu-link' aria-current={isActive(pathname, l.href) ? 'page' : undefined}>{l.label}</Link>
                ))}
              </div>,
              document.body,
            )}
          </div>
        );
      })}
    </nav>
  );
}

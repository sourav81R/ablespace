'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { WorkspaceNavigation } from './workspace-navigation';
import { UserMenu } from './user-menu';

/** Sidebar width, shared by the rail and the main column's offset. */
const SIDEBAR_WIDTH = 'w-[248px]';

/**
 * The persistent desktop rail.
 *
 * Fixed positioning takes it out of flow, so the main column offsets itself by
 * the same width — that pairing is what stops the sidebar overlapping content
 * at any viewport size.
 */
function Sidebar() {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col border-r border-border bg-card lg:flex',
        SIDEBAR_WIDTH,
      )}
    >
      <SidebarContent />
    </aside>
  );
}

/**
 * The mobile drawer.
 *
 * Rendered only while open so its focus trap and overlay cannot interfere with
 * the page underneath, and the body scroll lock is released the moment it
 * closes.
 */
function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Stop the page behind the drawer from scrolling under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);

    // Move focus into the drawer so a keyboard user is not left behind it.
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-foreground/40"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        tabIndex={-1}
        className={cn(
          'relative flex h-full animate-slide-in-left flex-col border-r border-border bg-card focus:outline-none',
          SIDEBAR_WIDTH,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-2 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}

/** Brand, navigation and account menu — identical in both presentations. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <Link
          href="/tasks"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            A
          </span>
          <span className="text-sm font-semibold text-foreground">AbleSpace</span>
        </Link>
      </div>

      {/* The nav scrolls independently so a long list never pushes the account
          menu off the bottom of the rail. */}
      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        <WorkspaceNavigation onNavigate={onNavigate} />
      </div>

      <div className="shrink-0 border-t border-border p-2">
        <UserMenu />
      </div>
    </>
  );
}

/**
 * The bar above the page content.
 *
 * Carries the drawer trigger on small screens, which is the only way to reach
 * navigation there.
 */
function TopBar({ onOpenMenu, title }: { onOpenMenu: () => void; title?: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation"
        className="-ml-1 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-4.5 w-4.5" aria-hidden="true" />
      </button>

      {title && (
        <h1 className="min-w-0 truncate text-sm font-semibold text-foreground">{title}</h1>
      )}
    </header>
  );
}

/**
 * The authenticated application frame.
 *
 * The main column carries `min-w-0`, without which a wide table or board makes
 * the whole page scroll sideways instead of scrolling inside its own
 * container.
 */
export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on navigation, otherwise it stays open over the new page.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[248px]">
        <TopBar onOpenMenu={() => setMenuOpen(true)} title={title} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

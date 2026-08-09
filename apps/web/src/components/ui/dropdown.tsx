'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * A menu built on native focus behaviour rather than a headless library.
 *
 * Handles the three things a dropdown gets wrong most often: Escape closes it,
 * an outside click closes it, and focus returns to the trigger afterwards so
 * keyboard users are not dropped at the top of the document.
 */
export function Dropdown({
  trigger,
  children,
  align = 'start',
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuId = useId();

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        // No focus restore: the user is already looking elsewhere.
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      // Captures the trigger element so focus can return to it on close.
      onFocusCapture={(event) => {
        const target = event.target as HTMLElement;
        if (target.getAttribute('aria-haspopup') === 'menu') {
          triggerRef.current = target;
        }
      }}
    >
      {trigger({ open, toggle: () => setOpen((value) => !value), id: menuId })}

      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute z-50 mt-1 min-w-[200px] animate-slide-up rounded-lg border border-border bg-popover p-1 shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children(() => close())}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onSelect,
  icon,
  selected,
  destructive,
  disabled,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  icon?: React.ReactNode;
  selected?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
        'focus-visible:outline-none focus-visible:bg-muted',
        'disabled:pointer-events-none disabled:opacity-50',
        destructive
          ? 'text-danger hover:bg-danger-muted'
          : 'text-foreground hover:bg-muted',
      )}
    >
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  );
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 py-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

export function DropdownSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}

/**
 * A nested menu, used for Theme and Color Mode inside the user menu.
 *
 * Expands in place rather than flying out sideways: a flyout that opens past
 * the viewport edge is a common failure on narrow screens, and this avoids it
 * entirely.
 */
export function DropdownSubmenu({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        role="menuitem"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
      >
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-90',
          )}
          aria-hidden="true"
        />
      </button>

      {open && <div className="ml-2 border-l border-border pl-1.5">{children}</div>}
    </div>
  );
}

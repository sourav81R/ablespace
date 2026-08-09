'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderKanban, ListTodo, Settings } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const WORKSPACE_ITEMS: NavItem[] = [
  { href: '/tasks', label: 'Tasks', icon: <ListTodo className="h-4 w-4" /> },
  { href: '/projects', label: 'Projects', icon: <FolderKanban className="h-4 w-4" /> },
];

const SETTINGS_ITEMS: NavItem[] = [
  { href: '/settings/profile', label: 'Profile', icon: <Settings className="h-4 w-4" /> },
];

/**
 * The navigation list, shared by the desktop sidebar and the mobile drawer.
 *
 * Written once so the two can never drift — a duplicated nav is how a link
 * ends up on desktop but missing on mobile.
 */
export function WorkspaceNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-5" aria-label="Workspace">
      <Section title="Workspace" items={WORKSPACE_ITEMS} onNavigate={onNavigate} />
      <Section title="Settings" items={SETTINGS_ITEMS} onNavigate={onNavigate} />
    </nav>
  );
}

function Section({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div>
      <p className="mb-1 px-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          // A nested route such as /tasks/abc must keep Tasks highlighted, so
          // this matches the prefix rather than the exact path.
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-primary-muted font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

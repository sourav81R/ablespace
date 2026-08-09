'use client';

import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Moon, Palette, Sun, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { useSession } from '@/lib/api/use-session';
import { useTheme } from '@/lib/theme/theme-provider';
import { ACCENT_LABELS, ACCENT_SWATCHES, ACCENTS, THEME_MODES } from '@/lib/theme/theme';
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownSubmenu,
} from '@/components/ui/dropdown';
import { Avatar } from '@/components/ui/avatar';

/**
 * The account menu, carrying theme and colour controls.
 *
 * Both preferences apply instantly and persist, so there is no save step and
 * no confirmation to dismiss.
 */
export function UserMenu() {
  const router = useRouter();
  const { logout, isAnonymous } = useAuth();
  const { data: session } = useSession();
  const { mode, accent, setMode, setAccent } = useTheme();

  if (!session) return null;

  const { user } = session;

  return (
    <Dropdown
      align="start"
      className="w-[240px]"
      trigger={({ open, toggle, id }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          className="flex w-full items-center gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {user.displayName}
            </span>
            <span className="block truncate text-2xs text-muted-foreground">
              {isAnonymous ? 'Guest' : (user.email ?? user.provider.toLowerCase())}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      )}
    >
      {(close) => (
        <>
          <DropdownLabel>{session.workspace.name}</DropdownLabel>

          <DropdownItem
            icon={<UserIcon className="h-3.5 w-3.5" />}
            onSelect={() => {
              close();
              router.push('/settings/profile');
            }}
          >
            Profile
          </DropdownItem>

          <DropdownSeparator />

          <DropdownSubmenu
            label="Change Theme"
            icon={mode === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          >
            {THEME_MODES.map((option) => (
              <DropdownItem
                key={option}
                selected={mode === option}
                onSelect={() => setMode(option)}
                icon={
                  option === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />
                }
              >
                {option === 'dark' ? 'Dark' : 'Light'}
              </DropdownItem>
            ))}
          </DropdownSubmenu>

          <DropdownSubmenu label="Color Mode" icon={<Palette className="h-3.5 w-3.5" />}>
            {ACCENTS.map((option) => (
              <DropdownItem
                key={option}
                selected={accent === option}
                onSelect={() => setAccent(option)}
                icon={
                  <span
                    className="block h-3 w-3 rounded-full ring-1 ring-inset ring-black/10"
                    style={{ backgroundColor: ACCENT_SWATCHES[option] }}
                  />
                }
              >
                {ACCENT_LABELS[option]}
              </DropdownItem>
            ))}
          </DropdownSubmenu>

          <DropdownSeparator />

          <DropdownItem
            destructive
            icon={<LogOut className="h-3.5 w-3.5" />}
            onSelect={async () => {
              close();
              await logout();
              router.replace('/login');
            }}
          >
            Sign out
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}

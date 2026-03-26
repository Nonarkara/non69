'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/', label: 'DrNon' },
  { href: '/watch', label: 'Watch' },
  { href: '/philosophy', label: 'Philosophy' },
];

const privateLinks = [
  { href: '/cockpit', label: 'Cockpit' },
  { href: '/think', label: 'Think' },
  { href: '/communicate', label: 'Comm' },
  { href: '/reflect', label: 'Reflect' },
  { href: '/challenge', label: 'Daily' },
  { href: '/arena', label: 'Arena' },
  { href: '/simulate', label: 'Simulate' },
];

interface NavUser {
  displayName: string;
  isAdmin: boolean;
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<NavUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const response = await fetch('/api/auth/me', { cache: 'no-store' }).catch(() => null);
      if (!response || !response.ok) {
        if (!cancelled) {
          setUser(null);
        }
        return;
      }

      const data = await response.json().catch(() => null);
      if (!cancelled) {
        setUser(
          data?.user
            ? {
                displayName: data.user.display_name,
                isAdmin: Boolean(data.user.is_admin),
              }
            : null
        );
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    setUser(null);
    router.push('/');
    router.refresh();
  }

  const isCockpit = pathname === '/watch' || pathname === '/cockpit';

  return (
    <nav className={`border-b bg-black/95 backdrop-blur ${isCockpit ? 'border-green-900/20' : 'border-neutral-800'}`}>
      <div className={`mx-auto flex items-center justify-between gap-4 ${isCockpit ? 'px-3 py-1' : 'max-w-6xl px-4 min-h-14 py-3'}`}>
        <div className="flex items-center gap-1 flex-wrap">
          {!isCockpit && links.map(link => {
            const isActive = pathname === link.href;
            const isHome = link.href === '/';
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-sm transition-colors rounded ${
                  isHome
                    ? 'font-bold text-white tracking-wider mr-4 text-base'
                    : isActive
                      ? 'bg-[#d7d2c3] text-black font-medium'
                      : 'text-neutral-400 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {user &&
            privateLinks.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm transition-colors rounded ${
                    isActive
                      ? 'bg-[#d7d2c3] text-black font-medium'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

          {user && (
            <Link
              href="/profile"
              className={`px-3 py-1.5 text-sm transition-colors rounded ${
                pathname === '/profile'
                  ? 'bg-[#d7d2c3] text-black font-medium'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Profile
            </Link>
          )}

          {user?.isAdmin && (
            <Link
              href="/ops"
              className={`px-3 py-1.5 text-sm transition-colors rounded ${
                pathname === '/ops'
                  ? 'bg-[#d7d2c3] text-black font-medium'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Ops
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden sm:inline text-xs uppercase tracking-[0.18em] text-neutral-600">
                {user.displayName}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm rounded border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/access"
              className="px-3 py-1.5 text-sm rounded border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors"
            >
              Access
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

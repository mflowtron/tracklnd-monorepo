import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Instagram, Mail, MapPin, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';

const navLinks = [
  { label: 'Meets', to: '/meets' },
  { label: 'Works', to: '/works' },
];

export default function PublicLayout() {
  const { isAuthenticated, profile, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex-shrink-0">
            <img src="/tracklnd-logo.png" alt="Tracklnd" className="h-8 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname.startsWith(link.to) ? 'text-primary' : 'text-foreground/70'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account">Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()}>Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm">
                <Link to="/login">Sign In</Link>
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="block text-sm font-medium text-foreground/70 hover:text-primary"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="block text-sm font-medium" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <Link to="/account" className="block text-sm font-medium" onClick={() => setMobileOpen(false)}>Account</Link>
                <button className="block text-sm font-medium text-destructive" onClick={() => { logout(); setMobileOpen(false); }}>Sign Out</button>
              </>
            ) : (
              <Link to="/login" className="block text-sm font-medium text-primary" onClick={() => setMobileOpen(false)}>Sign In</Link>
            )}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 text-[15.5px]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex flex-col gap-2">
              <img
                src="/tracklnd-logo.png"
                alt="Tracklnd"
                className="h-7 w-auto brightness-0 invert"
              />
              <p className="text-sm text-background/60">The Heart of Racing</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 text-sm text-background/60">
              <a
                href="https://instagram.com/tracklandia"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-background transition-colors"
              >
                <Instagram className="h-4 w-4" />
                @tracklandia
              </a>
              <a
                href="mailto:hello@tracklnd.com"
                className="flex items-center gap-1.5 hover:text-background transition-colors"
              >
                <Mail className="h-4 w-4" />
                hello@tracklnd.com
              </a>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                Portland, OR
              </span>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-background/10 text-xs text-background/40">
            © 2025 Tracklnd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

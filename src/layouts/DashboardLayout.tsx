import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Calendar, FileText, UserCog, ImageIcon, Users,
  Menu, X, LogOut, User,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { label: 'Overview', to: '/dashboard/overview', icon: LayoutDashboard },
  { label: 'Meets', to: '/dashboard/meets', icon: Calendar },
  { label: 'Content', to: '/dashboard/content', icon: FileText },
  { label: 'Athletes', to: '/dashboard/athletes', icon: Users },
  { label: 'Users', to: '/dashboard/users', icon: UserCog, adminOnly: true },
  { label: 'Banners', to: '/dashboard/banners', icon: ImageIcon, adminOnly: true },
];

const pageTitles: Record<string, string> = {
  '/dashboard/overview': 'Overview',
  '/dashboard/meets': 'Meets',
  '/dashboard/content': 'Content',
  '/dashboard/athletes': 'Athletes',
  '/dashboard/users': 'Users',
  '/dashboard/banners': 'Banners',
};

export default function DashboardLayout() {
  const { profile, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const currentTitle = pageTitles[location.pathname] || (location.pathname.startsWith('/dashboard/meets/') ? 'Meet Details' : 'Dashboard');

  const visibleItems = sidebarItems.filter(item => !item.adminOnly || isAdmin);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <Link to="/">
            <img src="/tracklnd-logo.png" alt="Tracklnd" className="h-6 w-auto" />
          </Link>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="hidden md:block p-1 rounded hover:bg-accent">
          <Menu className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-1 text-[15px]">
        {visibleItems.map(item => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.display_name || 'User'}</p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {isAdmin ? 'Admin' : 'Viewer'}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-sidebar">
            <button className="absolute top-4 right-4 p-1" onClick={() => setMobileOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-background border-b border-border flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold">{currentTitle}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <button
              onClick={() => navigate('/dashboard/meets')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 transition-colors"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-xs font-semibold text-red-700">LIVE: Portland Track Festival</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/account" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 text-[15px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

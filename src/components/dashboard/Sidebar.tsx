import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Upload, 
  FolderOpen,
  BarChart3, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Upload, label: "Upload", path: "/dashboard/upload" },
  { icon: FolderOpen, label: "Library", path: "/dashboard/library" },
  { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-neutral-900 border-r border-neutral-800 flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-800">
        {!collapsed && (
          <Link to="/" className="font-semibold text-lg text-white">
            GrowthCopilot
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-violet-600 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-neutral-800">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

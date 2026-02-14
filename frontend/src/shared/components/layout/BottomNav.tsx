import { Home, Receipt, Plus, BarChart2, User } from 'lucide-react';
import { clsx } from 'clsx';

export function BottomNav() {
  const activeTab = 'home'; // Por enquanto estático

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'extract', icon: Receipt, label: 'Extrato' },
    { id: 'add', icon: Plus, label: '', isFab: true },
    { id: 'analytics', icon: BarChart2, label: 'Análises' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a0b2e]/90 backdrop-blur-lg border-t border-white/5 z-50 pb-safe">
      <div className="max-w-md mx-auto px-6 h-[80px] flex items-center justify-between relative">
        {navItems.map((item) => {
          if (item.isFab) {
            return (
              <div key={item.id} className="relative -top-6">
                <button className="w-14 h-14 rounded-full bg-gradient-to-r from-[#D946EF] to-[#3B82F6] shadow-lg shadow-purple-500/30 flex items-center justify-center text-white transform hover:scale-105 transition-transform">
                  <item.icon className="w-8 h-8" />
                </button>
              </div>
            );
          }

          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={clsx(
                "flex flex-col items-center gap-1 w-12 transition-colors",
                isActive ? "text-[#3B82F6]" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
      {/* Home Indicator (iOS) */}
      <div className="h-1 w-1/3 bg-white/20 rounded-full mx-auto mb-2"></div>
    </nav>
  );
}
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Music, Settings } from 'lucide-react';
import { BackgroundMintLovable } from '@/components/Decor/BackgroundMintLovable';

export function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <BackgroundMintLovable />
      <header className="bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="flex items-center space-x-2">
              <Music className="w-9 h-9 text-primary-600 animate-pulse-slow" />
              <span className="text-2xl font-bold text-gray-900">MuseGen</span>
            </Link>

            <nav className="flex space-x-3">
              <Link
                to="/"
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive('/')
                    ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                    : 'text-gray-700 hover:bg-primary-50 hover:ring-1 hover:ring-primary-300'
                }`}
              >
                <Music className="w-4 h-4 mr-2" />
                生成乐谱
              </Link>
              <Link
                to="/settings"
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive('/settings')
                    ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                    : 'text-gray-700 hover:bg-primary-50 hover:ring-1 hover:ring-primary-300'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                设置
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600">
            MuseGen - 卡林巴琴乐谱生成器 © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

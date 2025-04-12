import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen bg-black">
      <nav className="bg-[#111111] p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-white font-bold text-xl">Sol Charts</Link>
          <div className="flex space-x-4">
            <Link to="/" className="text-white hover:text-gray-300">Dashboard</Link>
            <Link to="/about" className="text-white hover:text-gray-300">About</Link>
          </div>
        </div>
      </nav>
      
      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />
      <Header />
      <main className="ml-16 pt-14 min-h-screen bg-zinc-950">
        <Outlet />
      </main>
    </div>
  );
}

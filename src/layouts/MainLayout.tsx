import { Outlet } from "react-router-dom";
import Navbar from "../components/navbar/component/Navbar";

export default function MainLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar />
      <main className="relative flex-1 overflow-hidden bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}

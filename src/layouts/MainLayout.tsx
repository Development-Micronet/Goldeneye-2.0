import { Outlet } from "react-router-dom";
import Navbar from "../components/navbar/component/Navbar";

export default function MainLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <main className="flex-1 relative overflow-hidden bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}

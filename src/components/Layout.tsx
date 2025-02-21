import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <div className="p-4 flex justify-end">
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition duration-200"
          >
            Déconnexion
          </button>
        </div>
        <div className="px-8 pb-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;

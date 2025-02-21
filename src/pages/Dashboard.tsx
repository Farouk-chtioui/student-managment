import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition duration-200"
          >
            Déconnexion
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardCard
            title="Gestion des Étudiants"
            description="Gérer les inscriptions et les paiements des étudiants"
            onClick={() => navigate("/students")}
            icon="👥"
          />
          <DashboardCard
            title="Gestion des Groupes"
            description="Créer et gérer les groupes et leurs horaires"
            onClick={() => navigate("/groups")}
            icon="📚"
          />
          <DashboardCard
            title="Gestion des Présences"
            description="Suivre la présence des étudiants"
            onClick={() => navigate("/attendance")}
            icon="✓"
          />
        </div>
      </div>
    </div>
  );
};

interface DashboardCardProps {
  title: string;
  description: string;
  onClick: () => void;
  icon: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, onClick, icon }) => {
  return (
    <button
      onClick={onClick}
      className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition duration-200 text-left w-full"
    >
      <div className="text-3xl mb-4">{icon}</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </button>
  );
};

export default Dashboard;

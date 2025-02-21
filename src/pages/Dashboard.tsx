import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold">Welcome to Dashboard</h1>

      <div className="mt-6 flex space-x-4">
        <button
          onClick={() => navigate("/students")}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Manage Students
        </button>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;

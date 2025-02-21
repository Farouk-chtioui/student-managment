import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Group, Schedule } from "../types";

const Groups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [feePerSession, setFeePerSession] = useState(0);
  const [description, setDescription] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchGroups = async () => {
    const querySnapshot = await getDocs(collection(db, "groups"));
    const groupList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Group[];
    setGroups(groupList);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const addSchedule = () => {
    setSchedules([...schedules, { day: 'monday', time: '08:00' }]);
  };

  const updateSchedule = (index: number, field: 'day' | 'time', value: string) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { 
      ...newSchedules[index], 
      [field]: value 
    };
    setSchedules(newSchedules);
  };

  const addGroup = async () => {
    if (!name || feePerSession <= 0 || schedules.length === 0) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    await addDoc(collection(db, "groups"), {
      name,
      feePerSession,
      description,
      schedule: schedules
    });
    
    fetchGroups();
    clearForm();
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setName(group.name);
    setFeePerSession(group.feePerSession);
    setDescription(group.description || "");
    setSchedules(group.schedule);
    setIsEditing(true);
  };

  const handleUpdate = async () => {
    if (!editingGroup) return;

    await updateDoc(doc(db, "groups", editingGroup.id), {
      name,
      feePerSession,
      description,
      schedule: schedules
    });

    setIsEditing(false);
    setEditingGroup(null);
    clearForm();
    fetchGroups();
  };

  const clearForm = () => {
    setName("");
    setFeePerSession(0);
    setDescription("");
    setSchedules([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Gestion des Groupes</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Ajouter un Nouveau Groupe</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nom du groupe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Tarif par séance"
              value={feePerSession}
              onChange={(e) => setFeePerSession(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Horaires</h3>
                <button
                  type="button"
                  onClick={addSchedule}
                  className="text-blue-500 text-sm"
                >
                  + Ajouter un horaire
                </button>
              </div>
              
              {schedules.map((schedule, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={schedule.day}
                    onChange={(e) => updateSchedule(index, 'day', e.target.value)}
                    className="flex-1 p-2 border rounded"
                  >
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <option key={day} value={day}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => updateSchedule(index, 'time', e.target.value)}
                    className="flex-1 p-2 border rounded"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={isEditing ? handleUpdate : addGroup}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              {isEditing ? "Mettre à jour" : "Ajouter le Groupe"}
            </button>
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingGroup(null);
                  clearForm();
                }}
                className="w-full mt-2 bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
              >
                Annuler
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left">Nom</th>
                <th className="px-6 py-3 text-left">Tarif</th>
                <th className="px-6 py-3 text-left">Description</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(group => (
                <tr key={group.id} className="border-t">
                  <td className="px-6 py-4">{group.name}</td>
                  <td className="px-6 py-4">{group.feePerSession}€</td>
                  <td className="px-6 py-4">{group.description}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEdit(group)}
                      className="text-blue-500 hover:text-blue-700 mr-2"
                    >
                      Modifier
                    </button>
                    <button className="text-red-500 hover:text-red-700">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Groups;

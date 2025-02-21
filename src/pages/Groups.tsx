import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Group, Schedule } from "../types";
import GroupCache from '../utils/cache';

const Groups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [feePerSession, setFeePerSession] = useState(0);
  const [description, setDescription] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDay, setCurrentDay] = useState<Schedule['day']>('monday');

  const weekDays = [
    'monday', 'tuesday', 'wednesday', 'thursday', 
    'friday', 'saturday', 'sunday'
  ];

  const getNextDay = (currentDay: Schedule['day']): Schedule['day'] => {
    const currentIndex = weekDays.indexOf(currentDay);
    return weekDays[(currentIndex + 1) % weekDays.length] as Schedule['day'];
  };

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
    setSchedules([...schedules, { day: currentDay, time: '08:00' }]);
    setCurrentDay(getNextDay(currentDay));
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

  const deleteGroup = async (id: string) => {
    try {
      // First, get the group data before deletion
      const groupToDelete = groups.find(g => g.id === id);
      if (!groupToDelete) return;

      // Cache the group data with paymentHistory added
      GroupCache.saveDeletedGroup({ ...groupToDelete, paymentHistory: [] });

      // Perform the deletion
      await deleteDoc(doc(db, "groups", id));
      
      // Update local state
      fetchGroups();
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Une erreur est survenue lors de la suppression du groupe");
    }
  };

  const handleDelete = async (group: Group) => {
    const cachedGroup = GroupCache.getDeletedGroup(group.id);
    const feeHistory = cachedGroup?.paymentHistory || [];
    
    const historyMessage = feeHistory.length > 0 
      ? "\n\nHistorique des tarifs:\n" + feeHistory.map(h => 
          `- ${h.feePerSession}€ (${new Date(h.startDate).toLocaleDateString()} - ${new Date(h.endDate).toLocaleDateString()})`
        ).join('\n')
      : '';

    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le groupe "${group.name}" ?` +
      `\n\nTarif actuel: ${group.feePerSession}€` +
      `${historyMessage}` +
      `\n\nLes données et l'historique des tarifs seront conservés dans le cache.`
    );
    
    if (confirmDelete) {
      await deleteGroup(group.id);
    }
  };

  return (
    <div>
      <h1 className="text-2xl lg:text-3xl font-bold mb-6">Gestion des Groupes</h1>
      
      <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
        <h2 className="text-lg lg:text-xl font-semibold mb-4">
          {isEditing ? "Modifier le Groupe" : "Ajouter un Nouveau Groupe"}
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nom du groupe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="p-2 border rounded w-full"
            />
            <input
              type="number"
              placeholder="Tarif par séance"
              value={feePerSession}
              onChange={(e) => setFeePerSession(Number(e.target.value))}
              className="p-2 border rounded w-full"
            />
          </div>
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
                + Ajouter un horaire ({currentDay})
              </button>
            </div>
            
            {schedules.map((schedule, index) => (
              <div key={index} className="flex gap-2">
                <select
                  value={schedule.day}
                  onChange={(e) => updateSchedule(index, 'day', e.target.value)}
                  className={`flex-1 p-2 border rounded ${
                    schedules.findIndex(
                      (s, i) => i !== index && s.day === schedule.day
                    ) !== -1 ? 'bg-gray-100' : ''
                  }`}
                >
                  {weekDays.map(day => (
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

      {/* Mobile View */}
      <div className="block lg:hidden space-y-4">
        {groups.map(group => (
          <div key={group.id} className="bg-white rounded-lg shadow p-4">
            <div className="mb-3">
              <h3 className="font-medium text-lg">{group.name}</h3>
              <p className="text-gray-600">{group.description}</p>
              <p className="text-sm font-medium mt-2">{group.feePerSession}€ par séance</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(group)}
                className="flex-1 px-3 py-2 text-blue-700 bg-blue-50 rounded-md"
              >
                Modifier
              </button>
              <button
                onClick={() => handleDelete(group)}
                className="flex-1 px-3 py-2 text-red-700 bg-red-50 rounded-md"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
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
                  <button
                    onClick={() => handleDelete(group)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Groups;

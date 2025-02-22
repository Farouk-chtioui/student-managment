import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { Group, Schedule } from "../types";
import GroupCache from '../utils/cache';
import { formatDateToFrench } from '../utils/dateUtils';

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

  // Add error state
  const [error, setError] = useState<string | null>(null);

  const getNextDay = (currentDay: Schedule['day']): Schedule['day'] => {
    const currentIndex = weekDays.indexOf(currentDay);
    return weekDays[(currentIndex + 1) % weekDays.length] as Schedule['day'];
  };

  const fetchGroups = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "groups"));
      const groupList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        schedule: doc.data().schedule || [] // Ensure schedule always exists
      })) as Group[];
      setGroups(groupList);
      setError(null);
    } catch (error) {
      console.error("Error fetching groups:", error);
      setGroups([]); // Set empty array on error
      setError("Erreur lors du chargement des groupes");
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const addSchedule = () => {
    setSchedules([...schedules, { day: currentDay as Schedule['day'], time: '08:00' }]);
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

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const addGroup = async () => {
    try {
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
    } catch (error) {
      console.error("Error adding group:", error);
      alert("Erreur lors de l'ajout du groupe");
    }
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
          `- ${h.feePerSession}DT (${formatDateToFrench(new Date(h.startDate))} - ${formatDateToFrench(new Date(h.endDate))})`
        ).join('\n')
      : '';

    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le groupe "${group.name}" ?` +
      `\n\nTarif actuel: ${group.feePerSession}DT` +
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
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
        {/* Form Header */}
        <h2 className="text-lg lg:text-xl font-semibold mb-6">
          {isEditing ? "Modifier le Groupe" : "Ajouter un Nouveau Groupe"}
        </h2>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Nom du groupe</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="p-2.5 border rounded-md w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Tarif par séance</label>
              <input
                type="number"
                value={feePerSession}
                onChange={(e) => setFeePerSession(Number(e.target.value))}
                className="p-2.5 border rounded-md w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              rows={2}
            />
          </div>

          {/* Schedule Section with Modern List */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-gray-900">Horaires de cours</h3>
              <button
                type="button"
                onClick={addSchedule}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="mr-1.5 text-lg">+</span>
                Ajouter un horaire
              </button>
            </div>

            <div className="space-y-3">
              {schedules.map((schedule, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all"
                >
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-1/2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Jour</label>
                      <select
                        value={schedule.day}
                        onChange={(e) => updateSchedule(index, 'day', e.target.value)}
                        className={`w-full p-2.5 text-base font-medium rounded-lg border ${
                          schedules.findIndex((s, i) => i !== index && s.day === schedule.day) !== -1 
                            ? 'border-yellow-300 bg-yellow-50' 
                            : 'border-gray-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        {weekDays.map(day => (
                          <option key={day} value={day}>
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="w-1/2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Heure</label>
                      <input
                        type="time"
                        value={schedule.time}
                        onChange={(e) => updateSchedule(index, 'time', e.target.value)}
                        className="w-full p-2.5 text-base font-medium border-gray-200 rounded-lg bg-white hover:border-blue-300"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => removeSchedule(index)}
                    className="self-end p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer cet horaire"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {schedules.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-sm">Aucun horaire défini</p>
                  <p className="text-xs text-gray-400 mt-1">Cliquez sur "Ajouter un horaire" pour commencer</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Centered */}
          <div className="flex justify-center pt-4">
            <div className="space-x-3">
              <button
                onClick={isEditing ? handleUpdate : addGroup}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-colors"
              >
                {isEditing ? "Mettre à jour" : "Ajouter le groupe"}
              </button>
              {isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingGroup(null);
                    clearForm();
                  }}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block lg:hidden">
        <div className="grid gap-4">
          {Array.isArray(groups) && groups.map(group => (
            <div key={group.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-lg">{group.name}</h3>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
                    {group.feePerSession}DT/séance
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{group.description || "Aucune description"}</p>
              </div>

              {/* Schedule List */}
              <div className="px-4 py-2 bg-gray-50 border-b">
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Horaires</h4>
                <div className="space-y-1">
                  {group.schedule.map((schedule, idx) => (
                    <div key={idx} className="flex items-center text-sm">
                      <span className="w-24 font-medium capitalize">{schedule.day}</span>
                      <span className="text-gray-600">{schedule.time}</span>
                    </div>
                  ))}
                  {group.schedule.length === 0 && (
                    <p className="text-sm text-gray-500 italic">Aucun horaire défini</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="p-3 flex gap-2">
                <button
                  onClick={() => handleEdit(group)}
                  className="flex-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(group)}
                  className="flex-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarif</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.isArray(groups) && groups.map(group => (
              <tr key={group.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{group.name}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                    {group.feePerSession}DT
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-sm">{group.description}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(group)}
                    className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(group)}
                    className="px-3 py-1 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {(!groups || groups.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center text-gray-500">
                  Aucun groupe trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Groups;

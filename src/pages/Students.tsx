import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Student, Group } from "../types";
import GroupCache from '../utils/cache';
import { formatDateToFrench } from '../utils/dateUtils';

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfRegistration, setDateOfRegistration] = useState("");
  const [paid, setPaid] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [lessonsAttended, setLessonsAttended] = useState(0);
  const [filterGroup, setFilterGroup] = useState<string>("");
  const [showTooltip, setShowTooltip] = useState<string>("");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch Students from Firestore
  const fetchStudents = async () => {
    const querySnapshot = await getDocs(collection(db, "students"));
    const studentList: Student[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Student[];
    setStudents(studentList);
  };

  // Fetch Groups
  const fetchGroups = async () => {
    const querySnapshot = await getDocs(collection(db, "groups"));
    const groupList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Group[];
    setGroups(groupList);
  };

  useEffect(() => {
    fetchStudents();
    fetchGroups();
  }, []);

  const getGroupInfo = (groupId: string) => {
    const activeGroup = groups.find(g => g.id === groupId);
    if (activeGroup) return activeGroup;

    // Try to get from cache if not found in active groups
    const cachedGroup = GroupCache.getDeletedGroup(groupId);
    if (cachedGroup) {
      return {
        ...cachedGroup,
        name: `${cachedGroup.name} (Archived)`,
      };
    }

    return { name: 'Groupe inconnu', feePerSession: 0 };
  };

  const calculatePayment = (groupId: string, lessons: number, paymentDate: string) => {
    const activeGroup = groups.find(g => g.id === groupId);
    if (activeGroup) {
      return activeGroup.feePerSession * lessons;
    }

    // Get historical fee for deleted group
    const historicalFee = GroupCache.getFeeForDate(groupId, paymentDate);
    return historicalFee * lessons;
  };

  // Add Student to Firestore
  const addStudent = async () => {
    if (!firstName || !lastName || !dateOfRegistration || !selectedGroup) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    await addDoc(collection(db, "students"), {
      firstName,
      lastName,
      dateOfRegistration,
      paid,
      groupId: selectedGroup,
      lessonsAttended
    });
    fetchStudents();
    clearForm();
  };

  // Update Student Payment Status
  const togglePaymentStatus = async (id: string, currentStatus: boolean) => {
    const studentRef = doc(db, "students", id);
    await updateDoc(studentRef, { paid: !currentStatus });
    fetchStudents();
  };

  // Delete Student
  const deleteStudent = async (id: string) => {
    await deleteDoc(doc(db, "students", id));
    fetchStudents();
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setDateOfRegistration(student.dateOfRegistration);
    setPaid(student.paid);
    setSelectedGroup(student.groupId);
    setLessonsAttended(student.lessonsAttended);
    setIsEditing(true);
  };

  const handleUpdate = async () => {
    if (!editingStudent) return;

    await updateDoc(doc(db, "students", editingStudent.id), {
      firstName,
      lastName,
      dateOfRegistration,
      paid,
      groupId: selectedGroup,
      lessonsAttended
    });

    setIsEditing(false);
    setEditingStudent(null);
    clearForm();
    fetchStudents();
  };

  const clearForm = () => {
    setFirstName("");
    setLastName("");
    setDateOfRegistration("");
    setPaid(false);
    setSelectedGroup("");
    setLessonsAttended(0);
  };

  const filteredStudents = students.filter(student => 
    filterGroup ? student.groupId === filterGroup : true
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Gestion des Étudiants</h1>
      
      {/* Add Student Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? "Modifier l'étudiant" : "Ajouter un Nouvel Étudiant"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm text-gray-600">
              Prénom
              <span className="ml-1 text-xs text-blue-600">(Identité de l'étudiant)</span>
            </label>
            <input
              type="text"
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="p-2 border rounded w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-gray-600">
              Nom de famille
              <span className="ml-1 text-xs text-blue-600">(Identité de l'étudiant)</span>
            </label>
            <input
              type="text"
              placeholder="Nom de famille"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="p-2 border rounded w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-gray-600">
              Date d'inscription
              <span className="ml-1 text-xs text-blue-600">(Date de début des cours)</span>
            </label>
            <input
              type="date"
              value={dateOfRegistration}
              onChange={(e) => setDateOfRegistration(e.target.value)}
              className="p-2 border rounded w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-gray-600">
              Groupe
              <span className="ml-1 text-xs text-blue-600">(Classe ou niveau de l'étudiant)</span>
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="p-2 border rounded w-full"
            >
              <option value="">Sélectionner un Groupe</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-gray-600">
              Nombre de cours
              <span className="ml-1 text-xs text-blue-600">(Séances suivies dans le mois)</span>
            </label>
            <input
              type="number"
              placeholder="Nombre de cours"
              value={lessonsAttended}
              onChange={(e) => setLessonsAttended(Number(e.target.value))}
              className="p-2 border rounded w-full"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="paid"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="paid" className="text-sm text-gray-600">
              Payé
              <span className="ml-1 text-xs text-blue-600">(Statut du paiement)</span>
            </label>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={isEditing ? handleUpdate : addStudent}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
          >
            {isEditing ? "Mettre à jour" : "Ajouter"}
          </button>
          {isEditing && (
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingStudent(null);
                clearForm();
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md"
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium">Filtres:</h3>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">Tous les groupes</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students List Stats */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="text-xl font-bold text-blue-700">{students.length}</div>
            <div className="text-sm text-blue-600">Total Étudiants</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded">
            <div className="text-xl font-bold text-green-700">
              {students.filter(s => s.paid).length}
            </div>
            <div className="text-sm text-green-600">Paiements Effectués</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded">
            <div className="text-xl font-bold text-red-700">
              {students.filter(s => !s.paid).length}
            </div>
            <div className="text-sm text-red-600">Paiements En Attente</div>
          </div>
        </div>
      </div>

      {/* Student List - Mobile View */}
      <div className="block sm:hidden">
        <div className="space-y-4">
          {filteredStudents.map((student) => (
            <div key={student.id} className="bg-white p-4 rounded-lg shadow-sm">
              <div className="mb-2">
                <h3 className="font-medium text-gray-900">{student.firstName} {student.lastName}</h3>
                <p className="text-sm text-gray-500">
                  Enregistré: {formatDateToFrench(new Date(student.dateOfRegistration))}
                </p>
                <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                  student.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  {student.paid ? "Payé" : "Non payé"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => togglePaymentStatus(student.id, student.paid)}
                  className={`flex-1 px-3 py-1 rounded-md text-sm ${
                    student.paid
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {student.paid ? "Marquer comme non payé" : "Marquer comme payé"}
                </button>
                <button
                  onClick={() => handleEdit(student)}
                  className="flex-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  Modifier
                </button>
                <button
                  onClick={() => deleteStudent(student.id)}
                  className="flex-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Table - Desktop View */}
      <div className="hidden sm:block bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Étudiant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Groupe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cours Suivis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{student.firstName} {student.lastName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getGroupInfo(student.groupId).name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.lessonsAttended}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {calculatePayment(
                      student.groupId, 
                      student.lessonsAttended,
                      student.dateOfRegistration
                    )}DT
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      student.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {student.paid ? "Payé" : "Non payé"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => togglePaymentStatus(student.id, student.paid)}
                      className={`mr-2 px-3 py-1 rounded-md ${
                        student.paid
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {student.paid ? "Marquer comme non payé" : "Marquer comme payé"}
                    </button>
                    <button
                      onClick={() => handleEdit(student)}
                      className="mr-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => deleteStudent(student.id)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
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
    </div>
  );
};

export default Students;

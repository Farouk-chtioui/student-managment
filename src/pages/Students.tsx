// Students.tsx

import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDoc
} from "firebase/firestore";
import { Student, Group } from "../types";
import { formatDateToFrench } from '../utils/dateUtils';

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfRegistration, setDateOfRegistration] = useState("");
  const [paid, setPaid] = useState(false);
  const [lessonsAttended, setLessonsAttended] = useState(0);
  const [montant, setMontant] = useState(0);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load
  useEffect(() => {
    fetchStudents();
    fetchGroups();
  }, []);

  const fetchStudents = async () => {
    const snap = await getDocs(collection(db, "students"));
    const list = snap.docs.map(d => {
      const data = d.data() as Partial<Student>;
      return {
        id: d.id,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        dateOfRegistration: data.dateOfRegistration || "",
        paid: !!data.paid,
        groupId: data.groupId || "",
        lessonsAttended: data.lessonsAttended || 0,
        montant: data.montant || 0
      } as Student;
    });
    setStudents(list);
  };

  const fetchGroups = async () => {
    const snap = await getDocs(collection(db, "groups"));
    const list = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as Group[];
    setGroups(list);
  };

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
      lessonsAttended,
      montant
    });
    fetchStudents();
    clearForm();
  };

  const handleEdit = (stu: Student) => {
    setEditingStudent(stu);
    setFirstName(stu.firstName);
    setLastName(stu.lastName);
    setDateOfRegistration(stu.dateOfRegistration);
    setPaid(stu.paid);
    setSelectedGroup(stu.groupId);
    setLessonsAttended(stu.lessonsAttended);
    setMontant(stu.montant);
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
      lessonsAttended,
      montant
    });
    setIsEditing(false);
    setEditingStudent(null);
    clearForm();
    fetchStudents();
  };

  const togglePaidStatus = async (id: string, curPaid: boolean) => {
    // Just flips "paid"
    await updateDoc(doc(db, "students", id), { paid: !curPaid });
    fetchStudents();
  };

  const deleteStudent = async (id: string) => {
    await deleteDoc(doc(db, "students", id));
    fetchStudents();
  };

  const clearForm = () => {
    setFirstName("");
    setLastName("");
    setDateOfRegistration("");
    setPaid(false);
    setLessonsAttended(0);
    setMontant(0);
    setSelectedGroup("");
  };

  const filteredStudents = students.filter(s =>
    filterGroup ? s.groupId === filterGroup : true
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Gestion des Étudiants</h1>

      {/* Add/Update */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? "Modifier l'Étudiant" : "Ajouter un Nouvel Étudiant"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* firstName */}
          <div className="space-y-1">
            <label className="block text-sm text-gray-600">Prénom</label>
            <input
              type="text"
              placeholder="Prénom"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="p-2 border rounded w-full"
            />
          </div>
          {/* lastName */}
          <div className="space-y-1">
            <label className="block text-sm text-gray-600">Nom de famille</label>
            <input
              type="text"
              placeholder="Nom de famille"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="p-2 border rounded w-full"
            />
          </div>
          {/* dateOfRegistration */}
          <div className="space-y-1">
            <label className="block text-sm text-gray-600">Date d'inscription</label>
            <input
              type="date"
              value={dateOfRegistration}
              onChange={e => setDateOfRegistration(e.target.value)}
              className="p-2 border rounded w-full"
            />
          </div>
          {/* groupId */}
          <div className="space-y-1">
            <label className="block text-sm text-gray-600">Groupe</label>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="p-2 border rounded w-full"
            >
              <option value="">Sélectionner un Groupe</option>
              {groups.map(g => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
          {/* lessonsAttended */}
          <div className="space-y-1">
            <label className="block text-sm text-gray-600">Cours suivis</label>
            <input
              type="number"
              value={lessonsAttended}
              onChange={e => setLessonsAttended(Number(e.target.value))}
              className="p-2 border rounded w-full"
            />
          </div>
          {/* montant */}
          <div className="space-y-1">
            <label className="block text-sm text-gray-600">Montant (ce que l'étudiant doit)</label>
            <input
              type="number"
              value={montant}
              onChange={e => setMontant(Number(e.target.value))}
              className="p-2 border rounded w-full"
            />
          </div>
          {/* paid checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="paid"
              checked={paid}
              onChange={e => setPaid(e.target.checked)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="paid" className="text-sm text-gray-600">
              Payé
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

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium">Filtres:</h3>
          <select
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">Tous les groupes</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
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

      {/* Mobile */}
      <div className="block sm:hidden">
        <div className="space-y-4">
          {filteredStudents.map(stu => (
            <div key={stu.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {stu.firstName} {stu.lastName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Inscrit le: {formatDateToFrench(new Date(stu.dateOfRegistration))}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    stu.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {stu.paid ? "Payé" : "Non payé"}
                  </span>
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 border-b space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Groupe:</span>
                  <span className="font-medium">{stu.groupId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cours suivis:</span>
                  <span className="font-medium">{stu.lessonsAttended}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Montant dû:</span>
                  <span className="font-medium text-blue-600">{stu.montant}€</span>
                </div>
              </div>

              <div className="p-3 grid grid-cols-3 gap-2">
                <button
                  onClick={() => togglePaidStatus(stu.id, stu.paid)}
                  className={`px-3 py-2 text-sm rounded-md ${
                    stu.paid
                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-green-50 text-green-700 hover:bg-green-100"
                  }`}
                >
                  {stu.paid ? "Marquer non payé" : "Marquer payé"}
                </button>
                <button
                  onClick={() => handleEdit(stu)}
                  className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                >
                  Modifier
                </button>
                <button
                  onClick={() => deleteStudent(stu.id)}
                  className="px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden sm:block bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Étudiant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Groupe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cours Suivis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map(stu => (
                <tr key={stu.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {stu.firstName} {stu.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stu.groupId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stu.lessonsAttended}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    {stu.montant}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      stu.paid
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {stu.paid ? "Payé" : "Non payé"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => togglePaidStatus(stu.id, stu.paid)}
                      className={`mr-2 px-3 py-1 rounded-md ${
                        stu.paid
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {stu.paid ? "Marquer non payé" : "Marquer payé"}
                    </button>
                    <button
                      onClick={() => handleEdit(stu)}
                      className="mr-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => deleteStudent(stu.id)}
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

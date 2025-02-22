// Attendance.tsx

import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  getDoc
} from "firebase/firestore";
import { Student, Group, Attendance } from "../types";
import { Link } from 'react-router-dom';
import { frenchMonths, formatShortDateToFrench, getWeekDayInFrench } from '../utils/dateUtils';
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
const AttendancePage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [lessons, setLessons] = useState<{ day: string; time: string }[]>([]);

  // For the selected month/year
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Map "studentId-date-time" => { present: boolean, paid: boolean }
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { present: boolean; paid: boolean }>
  >({});
  
  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchStudents();
      fetchGroupLessons();
      fetchAttendanceDocs();
    }
  }, [selectedGroup, currentMonth, currentYear]);

  // --------------
  // Firestore Loads
  // --------------

  const fetchGroups = async () => {
    const snap = await getDocs(collection(db, "groups"));
    const groupList = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Group[];
    setGroups(groupList);
  };

  const fetchGroupLessons = () => {
    const g = groups.find(x => x.id === selectedGroup);
    if (g) {
      setLessons(g.schedule);
    }
  };

  const fetchStudents = async () => {
    const q = query(collection(db, "students"), where("groupId", "==", selectedGroup));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as Student[];
    setStudents(list);
  };

  const fetchAttendanceDocs = async () => {
    const startStr = toYMD(new Date(currentYear, currentMonth, 1));
    const endStr = toYMD(new Date(currentYear, currentMonth + 1, 0));

    const qAtt = query(
      collection(db, "attendance"),
      where("groupId", "==", selectedGroup),
      where("date", ">=", startStr),
      where("date", "<=", endStr)
    );
    const snap = await getDocs(qAtt);

    const newMap: Record<string, { present: boolean; paid: boolean }> = {};
    snap.forEach(docSnap => {
      const data = docSnap.data() as Attendance;
      const key = buildKey(data.studentId, data.date, data.time);
      newMap[key] = {
        present: data.present,
        paid: data.paid
      };
    });
    setAttendanceMap(newMap);
  };

  // ---------------
  // Attendance Toggling
  // ---------------

  /**
   * Mark a student present or absent for the day/time. 
   * If going from absent->present, we do:
   *   lessonsAttended++
   *   montant += group.fee (unless we also mark it as paid right away, see below)
   * If going from present->absent and it's already paid => block
   * If going from present->absent and it's unpaid => 
   *   lessonsAttended--
   *   montant -= group.fee
   */
  const togglePresent = async (studentId: string, date: string, time: string) => {
    const key = buildKey(studentId, date, time);
    const old = attendanceMap[key] || { present: false, paid: false };
    const newPresent = !old.present;

    // If toggling from present->absent and it was paid, block
    if (old.present && !newPresent && old.paid) {
      alert("Impossible de marquer absent : cette séance est déjà payée.");
      return;
    }

    // Either update existing doc or create new
    const existing = await findAttendanceDoc(studentId, date, time);
    if (existing) {
      await updateDoc(doc(db, "attendance", existing.id), {
        present: newPresent,
        updatedAt: Timestamp.now()
      });
    } else {
      // new doc
      await addDoc(collection(db, "attendance"), {
        studentId,
        groupId: selectedGroup,
        date,
        time,
        present: true,
        paid: false,
        createdAt: Timestamp.now()
      });
    }

    // Update local
    setAttendanceMap(prev => ({
      ...prev,
      [key]: {
        present: newPresent,
        paid: newPresent ? old.paid : false
      }
    }));

    // Now adjust student's lessonsAttended / montant
    const fee = getGroupFee(selectedGroup);
    if (!old.present && newPresent) {
      // was absent, now present => lessonsAttended++, montant += fee
      await incrementLessons(studentId, +1);
      await incrementMontant(studentId, +fee);
    } else if (old.present && !newPresent && !old.paid) {
      // was present & unpaid, now absent => lessonsAttended--, montant -= fee
      await incrementLessons(studentId, -1);
      await incrementMontant(studentId, -fee);
    }
  };

  /**
   * Mark a session as paid or unpaid.
   * If toggling from unpaid->paid => montant -= fee, add paymentHistory
   * If toggling from paid->unpaid => montant += fee
   */
  const togglePaid = async (studentId: string, date: string, time: string) => {
    const key = buildKey(studentId, date, time);
    const old = attendanceMap[key] || { present: false, paid: false };
    if (!old.present) {
      alert("Impossible de marquer 'payé' pour une séance où l'étudiant est absent.");
      return;
    }
    const newPaid = !old.paid;

    // find existing doc
    const existing = await findAttendanceDoc(studentId, date, time);
    if (!existing) {
      alert("Erreur: doc d'assiduité introuvable.");
      return;
    }
    // update
    await updateDoc(doc(db, "attendance", existing.id), {
      paid: newPaid,
      updatedAt: Timestamp.now()
    });
    setAttendanceMap(prev => ({
      ...prev,
      [key]: { present: true, paid: newPaid }
    }));

    const fee = getGroupFee(selectedGroup);
    if (!old.paid && newPaid) {
      // unpaid->paid => montant -= fee, add paymentHistory
      await incrementMontant(studentId, -fee);
      await addDoc(collection(db, "paymentHistory"), {
        studentId,
        groupId: selectedGroup,
        sessionDate: date,
        sessionTime: time,
        amount: fee,
        paidAt: Timestamp.now()
      });
    } else if (old.paid && !newPaid) {
      // paid->unpaid => montant += fee
      await incrementMontant(studentId, +fee);
    }
  };

  // ---------------
  // Helpers
  // ---------------

  // find attendance doc
  const findAttendanceDoc = async (studentId: string, date: string, time: string) => {
    const qAtt = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId),
      where("date", "==", date),
      where("time", "==", time)
    );
    const snap = await getDocs(qAtt);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  };

  // increment or decrement a student's lessonsAttended
  const incrementLessons = async (studentId: string, delta: number) => {
    const ref = doc(db, "students", studentId);
    const sSnap = await getDoc(ref);
    if (!sSnap.exists()) return;
    const data = sSnap.data() as Student;
    const newVal = (data.lessonsAttended || 0) + delta;
    if (newVal < 0) return;
    await updateDoc(ref, { lessonsAttended: newVal });
  };

  // increment or decrement a student's montant
  const incrementMontant = async (studentId: string, delta: number) => {
    const ref = doc(db, "students", studentId);
    const sSnap = await getDoc(ref);
    if (!sSnap.exists()) return;
    const data = sSnap.data() as Student;
    let newVal = (data.montant || 0) + delta;
    if (newVal < 0) newVal = 0; // don't go negative
    await updateDoc(ref, { montant: newVal });
  };

  const getGroupFee = (groupId: string): number => {
    const g = groups.find(x => x.id === groupId);
    if (!g) return 0;
    return g.feePerSession;
  };

  const buildKey = (studentId: string, date: string, time: string) => {
    return `${studentId}-${date}-${time}`;
  };

  const toYMD = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,'0');
    const d = String(dt.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  };

  const months = [
    "Janvier","Février","Mars","Avril","Mai","Juin",
    "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestion des Présences</h1>

      {/* Select Group, Month, Year */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <select
          value={selectedGroup}
          onChange={e => setSelectedGroup(e.target.value)}
          className="p-2 border rounded w-full"
        >
          <option value="">Sélectionner un Groupe</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-4">
          <select
            value={currentMonth}
            onChange={e => setCurrentMonth(Number(e.target.value))}
            className="p-2 border rounded w-full"
          >
            {frenchMonths.map((mo, i) => (
              <option key={mo} value={i}>{mo}</option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={e => setCurrentYear(Number(e.target.value))}
            className="p-2 border rounded w-full"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedGroup && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Attendance */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4 lg:p-6">
            {students.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Aucun étudiant dans ce groupe
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="block lg:hidden">
                  {students.map(student => (
                    <div key={student.id} className="mb-6 border-b pb-6">
                      <h3 className="font-medium text-lg mb-3">
                        {student.firstName} {student.lastName}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {lessons.map((lesson, idx) => {
                          const dateObj = new Date(currentYear, currentMonth, idx+1);
                          const dateStr = toYMD(dateObj);
                          const att = attendanceMap[buildKey(student.id, dateStr, lesson.time)];
                          const present = att?.present ?? false;
                          const paid = att?.paid ?? false;

                          return (
                            <div key={idx} className="text-center">
                              <div className="text-sm font-medium mb-1">
                                {lesson.day} - {lesson.time}
                              </div>
                              <div className="flex gap-2 justify-center">
                                {/* Present toggle */}
                                <button
                                  onClick={() => togglePresent(student.id, dateStr, lesson.time)}
                                  className={`px-3 py-1 text-xs rounded-full transition shadow-sm ${
                                    !present
                                      ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                      : "bg-green-500 text-white hover:bg-green-600"
                                  }`}
                                >
                                  {present ? "Présent" : "Absent"}
                                </button>
                                {/* Paid toggle */}
                                <button
                                  onClick={() => togglePaid(student.id, dateStr, lesson.time)}
                                  className={`px-3 py-1 text-xs rounded-full transition shadow-sm ${
                                    paid
                                      ? "bg-blue-500 text-white hover:bg-blue-600"
                                      : "bg-red-500 text-white hover:bg-red-600"
                                  }`}
                                >
                                  {paid ? "Payé" : "Non payé"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                          Étudiant
                        </th>
                        {lessons.map((lesson, idx) => {
                          const dateObj = new Date(currentYear, currentMonth, idx+1);
                          return (
                            <th key={idx} className="px-6 py-3 bg-gray-50 text-left">
                              <div className="text-xs font-medium text-gray-500 uppercase">
                                {getWeekDayInFrench(dateObj)}
                              </div>
                              <div className="text-sm font-bold text-gray-700 mt-1">
                                {formatShortDateToFrench(dateObj)} - {lesson.time}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map(student => (
                        <tr key={student.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                            </div>
                          </td>
                          {lessons.map((lesson, idx) => {
                            const dateObj = new Date(currentYear, currentMonth, idx+1);
                            const dateStr = toYMD(dateObj);
                            const att = attendanceMap[buildKey(student.id, dateStr, lesson.time)];
                            const present = att?.present ?? false;
                            const paid = att?.paid ?? false;

                            return (
                              <td key={idx} className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {/* Present toggle */}
                                  <button
                                    onClick={() => togglePresent(student.id, dateStr, lesson.time)}
                                    className={`px-3 py-1 text-xs rounded-full transition shadow-sm ${
                                      !present
                                        ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                        : "bg-green-500 text-white hover:bg-green-600"
                                    }`}
                                  >
                                    {present ? "Présent" : "Absent"}
                                  </button>
                                  {/* Paid toggle */}
                                  {present && (
                                    <button
                                      onClick={() => togglePaid(student.id, dateStr, lesson.time)}
                                      className={`px-3 py-1 text-xs rounded-full transition shadow-sm ${
                                        paid
                                          ? "bg-blue-500 text-white hover:bg-blue-600"
                                          : "bg-red-500 text-white hover:bg-red-600"
                                      }`}
                                    >
                                      {paid ? "Payé" : "Non payé"}
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend? Up to you */}
              </>
            )}
          </div>

          {/* Payment Overview for each student */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">État des Paiements</h2>
            {students.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Aucun étudiant</div>
            ) : (
              <div className="space-y-4">
                {students.map(student => {
                  // We'll multiply "montant" by 1 => it's already stored 
                  const totalDue = student.montant;

                  return (
                    <div key={student.id} className="border rounded-lg overflow-hidden">
                      <div className="p-3 bg-gray-50 border-b">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">
                              {student.firstName} {student.lastName}
                            </div>
                            {/* "paid" is optional overall */}
                          </div>
                          <Link
                            to={`/payment-history/${student.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Historique
                          </Link>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="text-sm font-medium mb-2">
                          Montant dû: {totalDue}DT
                        </div>
                        <div className="text-sm text-gray-500">
                          Nombre de cours suivis : {student.lessonsAttended}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;

/** Helper to format date => "YYYY-MM-DD" */


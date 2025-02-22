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

const AttendancePage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [lessons, setLessons] = useState<{ day: string; time: string }[]>([]);

  // (1) For date-based display
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // (2) We store an object: "studentId-YYYY-MM-DD-time" => { present: bool, paid: bool }
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

  // -------------------
  // Firestore Loaders
  // -------------------

  // Grab all groups
  const fetchGroups = async () => {
    const snap = await getDocs(collection(db, "groups"));
    const groupList = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Group[];
    setGroups(groupList);
  };

  // For the chosen group, set `lessons` to the schedule array
  const fetchGroupLessons = () => {
    const g = groups.find(x => x.id === selectedGroup);
    if (g) {
      setLessons(g.schedule);
    }
  };

  // Grab all students for this group
  const fetchStudents = async () => {
    const q = query(collection(db, "students"), where("groupId", "==", selectedGroup));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as Student[];
    setStudents(list);
  };

  // Load all attendance docs for the selected month/year, storing them in `attendanceMap`
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
  // Toggling presence
  // ---------------
  /**
   * If toggling from absent->present:
   *   - create (or update) doc => present=true, paid=false
   *   - student's lessonsAttended++, student's montant += groupFee
   * If toggling from present->absent:
   *   - if doc is paid, block unmarking
   *   - if unpaid => lessonsAttended--, montant -= groupFee
   */
  const togglePresence = async (studentId: string, date: string, time: string) => {
    const key = buildKey(studentId, date, time);
    const oldVal = attendanceMap[key] || { present: false, paid: false };
    const wasPresent = oldVal.present;
    const newPresent = !wasPresent;

    // If they're currently paid, block unmarking absent
    if (wasPresent && !newPresent && oldVal.paid) {
      alert("Impossible de marquer absent une séance déjà payée.");
      return;
    }

    // find or create doc
    const existing = await findAttendanceDoc(studentId, date, time);
    if (existing) {
      await updateDoc(doc(db, "attendance", existing.id), {
        present: newPresent,
        updatedAt: Timestamp.now()
      });
    } else {
      // create doc with present=true, paid=false
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

    // update local
    setAttendanceMap(prev => ({
      ...prev,
      [key]: {
        present: newPresent,
        // if we just unmarked them absent, paid must be false
        paid: newPresent ? oldVal.paid : false
      }
    }));

    // if absent->present => lessonsAttended++, montant += fee
    // if present->absent => lessonsAttended--, montant -= fee (assuming unpaid)
    const fee = getGroupFee(selectedGroup);
    if (!wasPresent && newPresent) {
      // absent->present
      await incrementLessons(studentId, +1);
      await incrementMontant(studentId, +fee);
    } else if (wasPresent && !newPresent && !oldVal.paid) {
      // present->absent & not paid
      await incrementLessons(studentId, -1);
      await incrementMontant(studentId, -fee);
    }
  };

  // ---------------
  // Toggling payment
  // ---------------
  /**
   * If toggling from unpaid->paid => student's montant -= fee, log in paymentHistory
   * If toggling from paid->unpaid => montant += fee
   * If the session is absent, block marking paid
   */
  const togglePayment = async (studentId: string, date: string, time: string) => {
    const key = buildKey(studentId, date, time);
    const oldVal = attendanceMap[key] || { present: false, paid: false };
    if (!oldVal.present) {
      alert("Impossible de payer une séance où l'étudiant est absent.");
      return;
    }
    const newPaid = !oldVal.paid;

    // find doc
    const existing = await findAttendanceDoc(studentId, date, time);
    if (!existing) {
      alert("Erreur: doc d'assiduité introuvable");
      return;
    }
    await updateDoc(doc(db, "attendance", existing.id), {
      paid: newPaid,
      updatedAt: Timestamp.now()
    });

    // local
    setAttendanceMap(prev => ({
      ...prev,
      [key]: { present: true, paid: newPaid }
    }));

    // adjust montant
    const fee = getGroupFee(selectedGroup);
    if (!oldVal.paid && newPaid) {
      // unpaid->paid => montant -= fee, record in paymentHistory
      await incrementMontant(studentId, -fee);
      // log payment
      await addDoc(collection(db, "paymentHistory"), {
        studentId,
        groupId: selectedGroup,
        sessionDate: date,
        sessionTime: time,
        amount: fee,
        paidAt: Timestamp.now()
      });
    } else if (oldVal.paid && !newPaid) {
      // paid->unpaid => montant += fee
      await incrementMontant(studentId, +fee);
    }
  };

  // ---------------------------
  // Firestore Doc Helpers
  // ---------------------------
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

  // increments/decrements student's lessonsAttended
  const incrementLessons = async (studentId: string, delta: number) => {
    const ref = doc(db, "students", studentId);
    const sSnap = await getDoc(ref);
    if (!sSnap.exists()) return;
    const stu = sSnap.data() as Student;
    let newCount = (stu.lessonsAttended || 0) + delta;
    if (newCount < 0) newCount = 0;
    await updateDoc(ref, { lessonsAttended: newCount });
  };

  // increments/decrements student's montant
  const incrementMontant = async (studentId: string, delta: number) => {
    const ref = doc(db, "students", studentId);
    const sSnap = await getDoc(ref);
    if (!sSnap.exists()) return;
    const stu = sSnap.data() as Student;
    let newMontant = (stu.montant || 0) + delta;
    if (newMontant < 0) newMontant = 0;
    await updateDoc(ref, { montant: newMontant });
  };

  // get group fee
  const getGroupFee = (gid: string) => {
    const g = groups.find(x => x.id === gid);
    return g ? g.feePerSession : 0;
  };

  // build a map key
  const buildKey = (studentId: string, date: string, time: string) => {
    return `${studentId}-${date}-${time}`;
  };

  // convert Date => "YYYY-MM-DD"
  const toYMD = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // For the month/year dropdown
  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestion des Présences</h1>

      {/* Filters: group, month, year */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <select
          value={selectedGroup}
          onChange={e => setSelectedGroup(e.target.value)}
          className="p-2 border rounded w-full"
        >
          <option value="">Sélectionner un Groupe</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-4">
          <select
            value={currentMonth}
            onChange={e => setCurrentMonth(Number(e.target.value))}
            className="p-2 border rounded w-full"
          >
            {frenchMonths.map((mo, idx) => (
              <option key={mo} value={idx}>{mo}</option>
            ))}
          </select>
          <select
            value={currentYear}
            onChange={e => setCurrentYear(Number(e.target.value))}
            className="p-2 border rounded w-full"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedGroup && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Attendance Grid */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4 lg:p-6">
            {students.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Aucun étudiant dans ce groupe
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="block lg:hidden">
                  {students.map(student => {
                    return (
                      <div key={student.id} className="mb-6 border-b pb-6">
                        <h3 className="font-medium text-lg mb-3">
                          {student.firstName} {student.lastName}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {lessons.map((lesson, index) => {
                            // (FIX) Use index + 1 to pick the day of the month
                            const dateObj = new Date(currentYear, currentMonth, index+1);
                            const dateStr = toYMD(dateObj);
                            const record = attendanceMap[buildKey(student.id, dateStr, lesson.time)];
                            const present = record?.present ?? false;
                            const paid = record?.paid ?? false;

                            return (
                              <div key={index} className="text-center">
                                <div className="text-sm font-medium mb-1">
                                  {lesson.day} - {lesson.time}
                                </div>
                                <div className="flex gap-2 justify-center">
                                  {/* Mark Present */}
                                  <button
                                    onClick={() => togglePresence(student.id, dateStr, lesson.time)}
                                    className={`px-2 py-1 text-xs rounded ${
                                      present
                                        ? "bg-green-100 text-green-700 border border-green-500"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                                  >
                                    {present ? "Présent" : "?"}
                                  </button>
                                  {/* Mark Paid */}
                                  {present && (
                                    <button
                                      onClick={() => togglePayment(student.id, dateStr, lesson.time)}
                                      className={`px-2 py-1 text-xs rounded ${
                                        paid
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {paid ? "Payé" : "Non payé"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                          Étudiant
                        </th>
                        {lessons.map((lesson, index) => {
                          const dateObj = new Date(currentYear, currentMonth, index+1);
                          return (
                            <th key={index} className="px-6 py-3 bg-gray-50 text-left">
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
                      {students.map(student => {
                        return (
                          <tr key={student.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">
                                {student.firstName} {student.lastName}
                              </div>
                            </td>
                            {lessons.map((lesson, index) => {
                              const dateObj = new Date(currentYear, currentMonth, index+1);
                              const dateStr = toYMD(dateObj);
                              const record = attendanceMap[buildKey(student.id, dateStr, lesson.time)];
                              const present = record?.present ?? false;
                              const paid = record?.paid ?? false;

                              return (
                                <td key={index} className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <button
                                      onClick={() => togglePresence(student.id, dateStr, lesson.time)}
                                      className={`px-2 py-1 text-xs rounded ${
                                        present
                                          ? "bg-green-100 text-green-700 border border-green-500"
                                          : "bg-gray-100 text-gray-500"
                                      }`}
                                    >
                                      {present ? "Présent" : "?"}
                                    </button>
                                    {present && (
                                      <button
                                        onClick={() => togglePayment(student.id, dateStr, lesson.time)}
                                        className={`px-2 py-1 text-xs rounded ${
                                          paid
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-red-100 text-red-700"
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Payment Summary (optional) */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">État des Paiements</h2>
            {students.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Aucun étudiant
              </div>
            ) : (
              <div className="space-y-4">
                {students.map(stu => {
                  // If the group fee is e.g. 10, and they've partially paid for X sessions,
                  // the `montant` field on the student doc tracks how much they owe in total.
                  // We'll just display it:
                  return (
                    <div key={stu.id} className="border rounded-lg overflow-hidden">
                      <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
                        <div>
                          <div className="font-medium">{stu.firstName} {stu.lastName}</div>
                          <div className="text-sm text-gray-500">
                            Cours suivis: {stu.lessonsAttended}
                          </div>
                        </div>
                        <Link
                          to={`/payment-history/${stu.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Historique
                        </Link>
                      </div>
                      <div className="p-3 text-sm">
                        Montant dû: <span className="font-medium text-blue-600">{stu.montant} DT</span>
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

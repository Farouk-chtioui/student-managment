import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { Student, Group, Attendance } from "../types";

const AttendancePage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [lessons, setLessons] = useState<{ time: string; day: string }[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchStudents();
      fetchGroupLessons();
      fetchAttendance();
    }
  }, [selectedGroup, currentMonth, currentYear]);

  const fetchGroups = async () => {
    const querySnapshot = await getDocs(collection(db, "groups"));
    const groupList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Group[];
    setGroups(groupList);
  };

  const fetchGroupLessons = () => {
    const selectedGroupData = groups.find(g => g.id === selectedGroup);
    if (selectedGroupData) {
      setLessons(selectedGroupData.schedule);
    }
  };

  const fetchStudents = async () => {
    const q = query(
      collection(db, "students"),
      where("groupId", "==", selectedGroup)
    );
    const querySnapshot = await getDocs(q);
    const studentList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Student[];
    setStudents(studentList);
  };

  const fetchAttendance = async () => {
    // Fetch attendance for current month
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const q = query(
      collection(db, "attendance"),
      where("groupId", "==", selectedGroup),
      where("date", ">=", startOfMonth.toISOString()),
      where("date", "<=", endOfMonth.toISOString())
    );
    const querySnapshot = await getDocs(q);
    const attendanceData: Record<string, boolean> = {};
    querySnapshot.forEach(doc => {
      const data = doc.data() as Attendance;
      const key = `${data.studentId}-${data.date}-${data.time}`;
      attendanceData[key] = data.present;
    });
    setAttendance(attendanceData);
  };

  const toggleAttendance = async (studentId: string, date: string, time: string) => {
    const attendanceKey = `${studentId}-${date}-${time}`;
    const newStatus = !attendance[attendanceKey];
    
    await addDoc(collection(db, "attendance"), {
      studentId,
      groupId: selectedGroup,
      date,
      time,
      present: newStatus,
      timestamp: Timestamp.now()
    });

    setAttendance(prev => ({
      ...prev,
      [attendanceKey]: newStatus
    }));
  };

  const AttendanceButton: React.FC<{
    isPresent: boolean | undefined;
    onClick: () => void;
  }> = ({ isPresent, onClick }) => (
    <button
      onClick={onClick}
      className={`w-24 h-24 rounded-lg flex flex-col items-center justify-center transition-all ${
        isPresent === undefined
          ? "bg-gray-100 text-gray-500"
          : isPresent
          ? "bg-green-100 text-green-700 border-2 border-green-500"
          : "bg-red-100 text-red-700 border-2 border-red-500"
      }`}
    >
      <span className="text-2xl mb-1">
        {isPresent === undefined ? "?" : isPresent ? "✓" : "✕"}
      </span>
      <span className="text-xs">
        {isPresent === undefined ? "Cliquer" : isPresent ? "Présent" : "Absent"}
      </span>
    </button>
  );

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Gestion des Présences</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">Sélectionner un Groupe</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>

          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(Number(e.target.value))}
            className="p-2 border rounded"
          >
            {months.map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(Number(e.target.value))}
            className="p-2 border rounded"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {selectedGroup && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left bg-gray-50">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Étudiant
                    </span>
                  </th>
                  {lessons.map((lesson, index) => (
                    <th key={index} className="px-6 py-3 text-left bg-gray-50">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {lesson.day.charAt(0).toUpperCase() + lesson.day.slice(1)}
                      </div>
                      <div className="text-sm font-bold text-gray-700 mt-1">
                        {lesson.time}
                      </div>
                    </th>
                  ))}
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
                    {lessons.map((lesson, index) => {
                      const date = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
                      const attendanceKey = `${student.id}-${date}-${lesson.time}`;
                      const isPresent = attendance[attendanceKey];

                      return (
                        <td key={index} className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center">
                            <AttendanceButton
                              isPresent={isPresent}
                              onClick={() => toggleAttendance(student.id, date, lesson.time)}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded mr-2"></div>
                <span>Présent</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded mr-2"></div>
                <span>Absent</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-100 rounded mr-2"></div>
                <span>Non marqué</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;

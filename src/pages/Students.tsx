import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dateOfRegistration: string;
  paid: boolean;
  paymentMonth: string;
}

const Students: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfRegistration, setDateOfRegistration] = useState("");
  const [paid, setPaid] = useState(false);
  const [paymentMonth, setPaymentMonth] = useState("");

  // Fetch Students from Firestore
  const fetchStudents = async () => {
    const querySnapshot = await getDocs(collection(db, "students"));
    const studentList: Student[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Student[];
    setStudents(studentList);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Add Student to Firestore
  const addStudent = async () => {
    if (!firstName || !lastName || !dateOfRegistration || !paymentMonth) return;
    await addDoc(collection(db, "students"), {
      firstName,
      lastName,
      dateOfRegistration,
      paid,
      paymentMonth,
    });
    fetchStudents();
    setFirstName("");
    setLastName("");
    setDateOfRegistration("");
    setPaid(false);
    setPaymentMonth("");
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

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-0">Student Management</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition duration-200 w-full sm:w-auto"
          >
            Logout
          </button>
        </div>

        {/* Add Student Form */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Add New Student</h2>
          <div className="grid grid-cols-1 gap-4">
            <input
              type="text"
              placeholder="First Name"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Last Name"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={dateOfRegistration}
              onChange={(e) => setDateOfRegistration(e.target.value)}
            />
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={paymentMonth}
              onChange={(e) => setPaymentMonth(e.target.value)}
            >
              <option value="">Select Payment Month</option>
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(
                (month) => (
                  <option key={month} value={month}>{month}</option>
                )
              )}
            </select>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="paid"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="paid">Paid</label>
            </div>
          </div>
          <button
            onClick={addStudent}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition duration-200 w-full sm:w-auto"
          >
            Add Student
          </button>
        </div>

        {/* Student List - Mobile View */}
        <div className="block sm:hidden">
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.id} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="mb-2">
                  <h3 className="font-medium text-gray-900">{student.firstName} {student.lastName}</h3>
                  <p className="text-sm text-gray-500">Registered: {student.dateOfRegistration}</p>
                  <p className="text-sm text-gray-500">Month: {student.paymentMonth}</p>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                    student.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {student.paid ? "Paid" : "Unpaid"}
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
                    {student.paid ? "Mark Unpaid" : "Mark Paid"}
                  </button>
                  <button
                    onClick={() => deleteStudent(student.id)}
                    className="flex-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  >
                    Delete
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{student.firstName} {student.lastName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.dateOfRegistration}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.paymentMonth}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        student.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {student.paid ? "Paid" : "Unpaid"}
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
                        {student.paid ? "Mark Unpaid" : "Mark Paid"}
                      </button>
                      <button
                        onClick={() => deleteStudent(student.id)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Students;

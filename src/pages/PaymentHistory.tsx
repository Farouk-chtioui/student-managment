// PaymentHistory.tsx

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { PaymentHistory, Student } from '../types';
import { formatDateToFrench } from '../utils/dateUtils';

const PaymentHistory: React.FC = () => {
  const { studentId } = useParams();
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!studentId) return;
      try {
        // load the student
        const sSnap = await getDoc(doc(db, "students", studentId));
        if (!sSnap.exists()) throw new Error("Étudiant introuvable");
        setStudent({ id: sSnap.id, ...sSnap.data() } as Student);

        // load payment docs
        const qPH = query(
          collection(db, "paymentHistory"),
          where("studentId", "==", studentId)
        );
        const snapPH = await getDocs(qPH);
        const list = snapPH.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as PaymentHistory[];

        // sort descending by paidAt
        list.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
        setHistory(list);
      } catch (err) {
        console.error("Erreur chargement historique:", err);
        alert("Une erreur est survenue lors du chargement de l'historique des paiements");
      }
    };
    fetchHistory();
  }, [studentId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Historique des Paiements</h1>

      {student && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold">
            {student.firstName} {student.lastName}
          </h2>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date de séance
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Heure
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Montant
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date de paiement
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {history.map(h => (
              <tr key={h.id}>
                <td className="px-4 py-3">
                  {formatDateToFrench(new Date(h.sessionDate))}
                </td>
                <td className="px-4 py-3">{h.sessionTime}</td>
                <td className="px-4 py-3">{h.amount}DT</td>
                <td className="px-4 py-3">
                  {formatDateToFrench(new Date(h.paidAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentHistory;

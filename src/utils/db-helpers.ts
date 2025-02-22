import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export const ensureCollection = async (collectionName: string) => {
  const colRef = collection(db, collectionName);
  try {
    await getDocs(query(colRef, where('_init', '==', true)));
  } catch (error) {
    // If collection doesn't exist, it will be created on first write
    await addDoc(colRef, {
      _init: true,
      createdAt: new Date().toISOString()
    });
  }
};

export const safeAddDoc = async (collectionName: string, data: any) => {
  try {
    // Ensure collection exists
    await ensureCollection(collectionName);
    
    // Add the document
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date().toISOString()
    });
    
    return docRef;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

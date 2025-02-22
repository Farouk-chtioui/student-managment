import { db } from '../firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const requiredCollections = [
  'students',
  'groups',
  'attendance',
  'paymentHistory',
  'sessionPayments'
];

const requiredIndexes = [
  {
    collectionId: 'attendance',
    fields: ['groupId', 'date']
  },
  {
    collectionId: 'paymentHistory',
    fields: ['studentId', 'paidAt']
  },
  {
    collectionId: 'sessionPayments',
    fields: ['groupId', 'sessionDate']
  }
];

// Create a sample document to initialize each collection
const initializeCollection = async (collectionName: string) => {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    
    // If collection is empty, add a dummy document to initialize it
    if (snapshot.empty) {
      await addDoc(collection(db, collectionName), {
        _init: true,
        createdAt: new Date().toISOString(),
        _description: `Initial document for ${collectionName} collection`
      });
      console.log(`Initialized collection: ${collectionName}`);
    }
  } catch (error) {
    console.error(`Error initializing ${collectionName}:`, error);
  }
};

export const initializeFirestore = async () => {
  try {
    // Check each collection
    for (const collectionName of requiredCollections) {
      const collectionRef = collection(db, collectionName);
      // Try to get one document to verify collection exists
      await getDocs(collectionRef);
    }

    console.log('Firebase collections initialized');
  } catch (error) {
    console.error('Error initializing Firebase collections:', error);
    
    // Show helpful message about required indexes
    if (error instanceof Error && error.message.includes('index')) {
      console.info('\nRequired Firebase Indexes:');
      requiredIndexes.forEach(index => {
        console.info(`
Collection: ${index.collectionId}
Fields: ${index.fields.join(', ')}
Create at: https://console.firebase.google.com/project/student-managment-dee0c/firestore/indexes
        `);
      });
    }
  }

  // List of collections to initialize
  const collections = [
    'students',
    'groups',
    'attendance',
    'paymentHistory',
    'sessionPayments'
  ];

  // Initialize all collections
  await Promise.all(collections.map(initializeCollection));
};

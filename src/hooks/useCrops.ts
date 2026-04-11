import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Crop, OperationType } from '../types';
import { handleFirestoreError } from '../utils';

export function useCrops(user: User | null) {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCrops([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'crops'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cropsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Crop));
      setCrops(cropsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'crops');
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { crops, loading };
}

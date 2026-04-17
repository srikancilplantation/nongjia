import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ActivityType, OperationType } from '../types';
import { handleFirestoreError } from '../utils';

export function useActivityTypes(user: User | null) {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setActivityTypes([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'activityTypes'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const types = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityType));
      
      if (types.length === 0 && loading) {
        const defaultTypes = [
          { name: '施肥 (Fertilization)', color: '#10b981' },
          { name: '打肥水 (Fertilizer Water)', color: '#14b8a6' },
          { name: '打草药 (Herbicide)', color: '#f59e0b' },
          { name: '打菌药 (Fungicide)', color: '#3b82f6' },
          { name: '打菌水 (Bactericide Water)', color: '#06b6d4' },
          { name: '打微量元素 (Trace Elements)', color: '#6366f1' },
          { name: '其它工作', color: '#64748b' }
        ];
        
        Promise.all(defaultTypes.map(type => 
          addDoc(collection(db, 'activityTypes'), { ...type, userId: user.uid })
        )).catch(err => handleFirestoreError(err, OperationType.WRITE, 'activityTypes'));
      }

      setActivityTypes(types);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'activityTypes');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, loading]);

  const addActivityType = async (name: string, color: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'activityTypes'), { name, color, userId: user.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'activityTypes');
    }
  };

  const deleteActivityType = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'activityTypes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'activityTypes');
    }
  };

  const updateActivityType = async (id: string, oldName: string, newName: string, color: string) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'activityTypes', id), { name: newName, color });
      if (oldName !== newName) {
        const recordsQuery = query(collection(db, 'activityRecords'), where('userId', '==', user?.uid), where('type', '==', oldName));
        const recordsSnapshot = await getDocs(recordsQuery);
        recordsSnapshot.docs.forEach(recordDoc => {
          batch.update(recordDoc.ref, { type: newName });
        });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'activityTypes');
    }
  };

  return { activityTypes, loading, addActivityType, deleteActivityType, updateActivityType };
}

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Crop, OperationType } from '../types';
import { handleFirestoreError } from '../utils';
import { 
  Sprout, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CropManagement({ user, hideHeader = false }: { user: User, hideHeader?: boolean }) {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Crop>>({
    name: ''
  });

  useEffect(() => {
    if (!user) return;

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
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'crops'));

    return unsubscribe;
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    try {
      const data = {
        name: formData.name.trim(),
        userId: user.uid
      };

      if (editingId) {
        await updateDoc(doc(db, 'crops', editingId), data);
      } else {
        await addDoc(collection(db, 'crops'), data);
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'crops');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setItemToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'crops', itemToDelete.id));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'crops');
    }
  };

  const handleEdit = (crop: Crop) => {
    setEditingId(crop.id!);
    setFormData({ name: crop.name });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '' });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!hideHeader && (
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-emerald-950">农作物管理</h1>
            <p className="text-emerald-600/60">管理您农场种植的作物种类</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20 font-bold"
          >
            <Plus className="w-5 h-5" />
            <span>新增作物</span>
          </button>
        </div>
      )}

      {hideHeader && (
        <div className="flex justify-end">
          <button
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20 font-bold"
          >
            <Plus className="w-5 h-5" />
            <span>新增作物</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {crops.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-emerald-100 flex flex-col items-center justify-center text-emerald-300">
            <Sprout className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-bold">尚未添加任何农作物</p>
            <p className="text-sm mb-6">点击右上角按钮开始添加</p>
            <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl text-emerald-800 text-sm max-w-md">
              <div className="flex gap-3">
                <Info className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                <p className="font-medium">提示：添加作物后，您可以在产量记录、农事日历等模块中选择这些作物进行分类管理。</p>
              </div>
            </div>
          </div>
        ) : (
          crops.map((crop) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={crop.id}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-100 hover:border-emerald-300 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <Sprout className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-black text-emerald-950 text-lg">{crop.name}</h3>
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>已启用</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(crop)}
                    className="p-2 text-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                    title="编辑"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(crop.id!, crop.name)}
                    className="p-2 text-emerald-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-emerald-50"
            >
              <div className="p-6 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
                <h2 className="text-xl font-bold text-emerald-950">{editingId ? '编辑作物' : '新增农作物'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-emerald-300 hover:text-emerald-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-emerald-900/70 ml-1">作物名称</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="例如: 猫山王, 油棕, 菠萝蜜"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <Save className="w-5 h-5" />
                    {editingId ? '保存修改' : '确认添加'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden p-8 text-center border border-emerald-50"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-emerald-950 mb-2">确认删除？</h3>
              <p className="text-emerald-600/60 mb-8 font-medium">
                确定要删除农作物 "{itemToDelete?.name}" 吗？这不会删除已有的相关记录，但可能会导致显示问题。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-2xl transition-all"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-600/20"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

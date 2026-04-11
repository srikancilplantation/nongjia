import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Worker, OperationType } from '../types';
import { handleFirestoreError } from '../utils';
import { Plus, Trash2, Edit2, X, Save, Users, Phone, CheckCircle2, XCircle, IdCard, Globe, Calendar, Briefcase, DollarSign, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function WorkerManagement({ user, hideHeader = false }: { user: User, hideHeader?: boolean }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Worker>>({
    name: '',
    phone: '',
    idNumber: '',
    nationality: '',
    joinDate: new Date().toISOString().split('T')[0],
    salary: 0,
    position: '',
    notes: '',
    active: true
  });

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'workers'),
      where('userId', '==', user.uid),
      orderBy('name', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Worker)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'workers'));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id, ...rest } = formData;
      const data = { ...rest, userId: user.uid };
      if (editingId) {
        await updateDoc(doc(db, 'workers', editingId), data);
      } else {
        await addDoc(collection(db, 'workers'), data);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ 
        name: '', 
        phone: '', 
        idNumber: '',
        nationality: '',
        joinDate: new Date().toISOString().split('T')[0],
        salary: 0,
        position: '',
        notes: '',
        active: true 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workers');
    }
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'workers', itemToDelete));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'workers');
    }
  };

  const handleEdit = (worker: Worker) => {
    setEditingId(worker.id!);
    setFormData(worker);
    setIsModalOpen(true);
  };

  const toggleActive = async (worker: Worker) => {
    try {
      await updateDoc(doc(db, 'workers', worker.id!), { active: !worker.active });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'workers');
    }
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-emerald-950">工人管理</h1>
            <p className="text-emerald-600/60">管理您的农场员工名单</p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ 
                name: '', 
                phone: '', 
                idNumber: '',
                nationality: '',
                joinDate: new Date().toISOString().split('T')[0],
                salary: 0,
                position: '',
                notes: '',
                active: true 
              });
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20 font-bold"
          >
            <Plus className="w-5 h-5" />
            <span>新增工人</span>
          </button>
        </div>
      )}

      {hideHeader && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ 
                name: '', 
                phone: '', 
                idNumber: '',
                nationality: '',
                joinDate: new Date().toISOString().split('T')[0],
                salary: 0,
                position: '',
                notes: '',
                active: true 
              });
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20 font-bold"
          >
            <Plus className="w-5 h-5" />
            <span>新增工人</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((worker) => (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={worker.id}
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-100 flex flex-col hover:shadow-md hover:border-emerald-300 transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-emerald-500" />
              </div>
              <button
                onClick={() => toggleActive(worker)}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${
                  worker.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {worker.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {worker.active ? '在职' : '离职'}
              </button>
            </div>
            
            <h3 className="text-xl font-black text-emerald-950 mb-1">{worker.name}</h3>
            <p className="text-emerald-600/60 text-sm font-bold mb-4">{worker.position || '普通员工'}</p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                <Phone className="w-4 h-4 text-emerald-500" />
                <span>{worker.phone || '未填写电话'}</span>
              </div>
              {worker.idNumber && (
                <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                  <IdCard className="w-4 h-4 text-emerald-500" />
                  <span>{worker.idNumber}</span>
                </div>
              )}
              {worker.nationality && (
                <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <span>{worker.nationality}</span>
                </div>
              )}
              {worker.joinDate && (
                <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span>入职: {worker.joinDate}</span>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-emerald-50 flex justify-between items-center">
              <div className="text-emerald-600 font-black text-sm">
                RM {worker.salary || 0}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleEdit(worker)}
                  className="p-2 text-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(worker.id!)}
                  className="p-2 text-emerald-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {workers.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-emerald-100">
            <Users className="w-12 h-12 text-emerald-100 mx-auto mb-4" />
            <p className="text-emerald-300 font-medium">还没有工人记录，点击右上角开始添加吧！</p>
          </div>
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
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-emerald-50 max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-emerald-950">{editingId ? '编辑工人资料' : '新增工人资料'}</h2>
                    <p className="text-sm text-emerald-600 font-bold">完善您的农场团队信息</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-emerald-300 hover:text-emerald-600 bg-white rounded-xl shadow-sm">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Users className="w-3 h-3" /> 姓名
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="输入工人姓名"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-5 py-4 bg-emerald-50/50 border-2 border-emerald-50 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-emerald-950"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Phone className="w-3 h-3" /> 电话
                    </label>
                    <input
                      type="text"
                      placeholder="输入联系电话"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-5 py-4 bg-emerald-50/50 border-2 border-emerald-50 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-emerald-950"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <IdCard className="w-3 h-3" /> 证件号码 (IC/Passport)
                    </label>
                    <input
                      type="text"
                      placeholder="输入证件号码"
                      value={formData.idNumber}
                      onChange={e => setFormData({ ...formData, idNumber: e.target.value })}
                      className="w-full px-5 py-4 bg-emerald-50/50 border-2 border-emerald-50 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-emerald-950"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Globe className="w-3 h-3" /> 国籍
                    </label>
                    <input
                      type="text"
                      placeholder="输入国籍"
                      value={formData.nationality}
                      onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full px-5 py-4 bg-emerald-50/50 border-2 border-emerald-50 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-emerald-950"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> 入职日期
                    </label>
                    <input
                      type="date"
                      value={formData.joinDate}
                      onChange={e => setFormData({ ...formData, joinDate: e.target.value })}
                      className="w-full px-5 py-4 bg-emerald-50/50 border-2 border-emerald-50 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-emerald-950"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Briefcase className="w-3 h-3" /> 职位
                    </label>
                    <input
                      type="text"
                      placeholder="输入职位"
                      value={formData.position}
                      onChange={e => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-5 py-4 bg-emerald-50/50 border-2 border-emerald-50 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-emerald-950"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <DollarSign className="w-3 h-3" /> 薪水 (RM)
                    </label>
                    <input
                      type="number"
                      placeholder="输入月薪"
                      value={formData.salary}
                      onChange={e => setFormData({ ...formData, salary: Number(e.target.value) })}
                      className="w-full px-5 py-4 bg-emerald-50/50 border-2 border-emerald-50 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-emerald-950"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-8">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={e => setFormData({ ...formData, active: e.target.checked })}
                      className="w-6 h-6 text-emerald-600 border-2 border-emerald-200 rounded-lg focus:ring-emerald-500 transition-all"
                    />
                    <label htmlFor="active" className="text-sm font-black text-emerald-900/70 cursor-pointer">目前在职</label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> 备注
                  </label>
                  <textarea
                    rows={3}
                    placeholder="输入其他备注信息..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-5 py-4 bg-emerald-50/50 border-2 border-emerald-50 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-emerald-950 resize-none"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 hover:shadow-emerald-300 active:scale-95"
                  >
                    <Save className="w-6 h-6" />
                    {editingId ? '保存资料修改' : '确认添加工人'}
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
              <p className="text-emerald-600/60 mb-8 font-medium">您确定要删除这位工人的资料吗？此操作无法撤销。</p>
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

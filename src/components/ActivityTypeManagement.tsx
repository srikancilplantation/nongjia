import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Plus, Trash2, Beaker, Loader2, Edit2, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useActivityTypes } from '../hooks/useActivityTypes';
import { ActivityType } from '../types';
import { translateToEnglish } from '../utils/translate';

export default function ActivityTypeManagement({ user, hideHeader = false }: { user: User, hideHeader?: boolean }) {
  const { activityTypes, loading, addActivityType, deleteActivityType, updateActivityType } = useActivityTypes(user);
  const [newTypeName, setNewTypeName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [editingType, setEditingType] = useState<ActivityType | null>(null);

  const colors = [
    { name: '红色', value: '#ef4444' },
    { name: '橙色', value: '#f97316' },
    { name: '黄色', value: '#eab308' },
    { name: '嫩绿', value: '#84cc16' },
    { name: '深绿', value: '#15803d' },
    { name: '青色', value: '#06b6d4' },
    { name: '天蓝', value: '#3b82f6' },
    { name: '深蓝', value: '#1e3a8a' },
    { name: '紫色', value: '#a855f7' },
    { name: '粉色', value: '#ec4899' },
    { name: '棕色', value: '#78350f' },
    { name: '灰色', value: '#64748b' },
    { name: '黑色', value: '#0f172a' },
    { name: '深红', value: '#991b1b' },
    { name: '墨绿', value: '#064e3b' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    
    setIsSubmitting(true);
    let finalName = newTypeName.trim();
    
    if (autoTranslate && !finalName.includes('(')) {
      setIsTranslating(true);
      const englishName = await translateToEnglish(finalName);
      if (englishName && !finalName.toLowerCase().includes(englishName.toLowerCase())) {
        finalName = `${finalName} (${englishName})`;
      }
      setIsTranslating(false);
    }

    if (editingType) {
      await updateActivityType(editingType.id!, editingType.name, finalName, selectedColor);
      setEditingType(null);
    } else {
      await addActivityType(finalName, selectedColor);
    }
    setNewTypeName('');
    setSelectedColor('#ef4444');
    setIsSubmitting(false);
  };

  const handleEdit = (type: ActivityType) => {
    setEditingType(type);
    setNewTypeName(type.name);
    setSelectedColor(type.color);
  };

  const cancelEdit = () => {
    setEditingType(null);
    setNewTypeName('');
    setSelectedColor('#ef4444');
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div>
          <h2 className="text-2xl font-black text-emerald-950 tracking-tight">活动类型管理</h2>
          <p className="text-emerald-600/60 font-medium mt-1">自定义您的农事活动分类</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-sm sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${editingType ? 'bg-amber-50' : 'bg-emerald-50'} rounded-xl flex items-center justify-center`}>
                  {editingType ? <Edit2 className="w-5 h-5 text-amber-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                </div>
                <h3 className="font-bold text-slate-800">{editingType ? '编辑类型' : '新增类型'}</h3>
              </div>
              {editingType && <button onClick={cancelEdit} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">类型名称</label>
                <input
                  type="text" required placeholder="例如: 修剪, 采摘" value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">选择颜色标记</label>
                <div className="grid grid-cols-5 gap-3">
                  {colors.map((color) => (
                    <button
                      key={color.value} type="button" onClick={() => setSelectedColor(color.value)}
                      className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${selectedColor === color.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                      style={{ backgroundColor: color.value }}
                    >
                      {selectedColor === color.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit" disabled={isSubmitting || isTranslating || !newTypeName.trim()}
                  className={`w-full py-3 ${editingType ? 'bg-amber-500' : 'bg-emerald-600'} text-white font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2`}
                >
                  {isSubmitting || isTranslating ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingType ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
                  <span>{isTranslating ? '正在翻译...' : (editingType ? '保存修改' : '确认添加')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-emerald-50 bg-emerald-50/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Beaker className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-slate-800">现有活动类型</span>
              </div>
            </div>
            <div className="p-6">
              {loading ? <Loader2 className="w-8 h-8 text-emerald-200 animate-spin mx-auto" /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activityTypes.map((type) => (
                    <div key={type.id} className="group flex items-center justify-between p-4 rounded-2xl border bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                        <span className="font-bold text-slate-700">{type.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(type)} className="p-2 text-slate-400 hover:text-amber-600"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteActivityType(type.id!)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

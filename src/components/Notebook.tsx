import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Note, OperationType } from '../types';
import { handleFirestoreError } from '../utils';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  StickyNote,
  Clock,
  Calendar as CalendarIcon,
  Smile,
  Heart,
  Star,
  Sun,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  Sprout,
  Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isSameDay } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function Notebook({ user }: { user: User }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Note>>({
    title: '',
    content: '',
    color: 'emerald',
    isPinned: false
  });

  const colors = [
    { id: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-400', text: 'text-emerald-700' },
    { id: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-400', text: 'text-amber-700' },
    { id: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', accent: 'bg-blue-400', text: 'text-blue-700' },
    { id: 'rose', bg: 'bg-rose-50', border: 'border-rose-200', accent: 'bg-rose-400', text: 'text-rose-700' },
    { id: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', accent: 'bg-purple-400', text: 'text-purple-700' },
    { id: 'slate', bg: 'bg-slate-50', border: 'border-slate-200', accent: 'bg-slate-400', text: 'text-slate-700' },
  ];

  useEffect(() => {
    if (!user) return;

    const notesQuery = query(
      collection(db, 'notes'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'notes'));

    return unsubscribe;
  }, [user]);

  const filteredNotes = notes
    .filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           note.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = selectedDate ? isSameDay(parseISO(note.updatedAt), selectedDate) : true;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const now = new Date().toISOString();
      const data = {
        title: formData.title,
        content: formData.content,
        color: formData.color || 'emerald',
        isPinned: formData.isPinned || false,
        userId: user.uid,
        updatedAt: now,
        createdAt: editingId ? notes.find(n => n.id === editingId)?.createdAt || now : now
      };

      if (editingId) {
        await updateDoc(doc(db, 'notes', editingId), data);
      } else {
        await addDoc(collection(db, 'notes'), data);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ title: '', content: '', color: 'emerald' });
    } catch (error: any) {
      console.error('Note save error:', error);
      setSubmitError(error.message || '保存失败');
      handleFirestoreError(error, OperationType.WRITE, 'notes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'notes', deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notes');
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      await updateDoc(doc(db, 'notes', note.id!), {
        isPinned: !note.isPinned,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notes');
    }
  };

  const handleEdit = (note: Note) => {
    setEditingId(note.id!);
    setFormData({
      title: note.title,
      content: note.content,
      color: note.color || 'emerald',
      isPinned: note.isPinned || false
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ title: '', content: '', color: 'emerald', isPinned: false });
    setIsModalOpen(true);
  };

  const getNoteColor = (colorId: string = 'emerald') => {
    return colors.find(c => c.id === colorId) || colors[0];
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header with Cartoon Elements */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-400 to-teal-500 p-8 rounded-[2.5rem] shadow-xl">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <Sparkles className="w-24 h-24 text-white animate-pulse" />
        </div>
        <div className="absolute top-1/2 right-1/4 opacity-10 animate-bounce delay-700">
          <Leaf className="w-16 h-16 text-white" />
        </div>
        <div className="absolute -bottom-4 -left-4 opacity-10">
          <Smile className="w-32 h-32 text-white" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
              <StickyNote className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">我的农场记事本</h1>
              <p className="text-emerald-50 font-medium">记录每一天的快乐与成长 ✨</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="text"
                placeholder="搜索你的小秘密..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-4 bg-white/90 backdrop-blur-sm border-none rounded-2xl outline-none focus:ring-4 focus:ring-white/50 transition-all w-full md:w-64 font-bold text-emerald-900 placeholder:text-emerald-300"
              />
            </div>
            <button
              onClick={openAddModal}
              className="bg-white text-emerald-600 hover:bg-emerald-50 px-6 py-4 rounded-2xl flex items-center gap-2 transition-all shadow-lg hover:scale-105 active:scale-95 font-black whitespace-nowrap"
            >
              <Plus className="w-6 h-6" />
              <span>写新笔记</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar with Calendar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-100 overflow-hidden relative">
            <div className="absolute top-2 right-2 opacity-5">
              <CalendarIcon className="w-20 h-20 text-emerald-500" />
            </div>
            <h3 className="text-lg font-black text-emerald-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-emerald-500" />
              按日期查看
            </h3>
            <div className="notebook-calendar-container">
              <Calendar
                onChange={(val) => setSelectedDate(val as Date)}
                value={selectedDate}
                className="border-none w-full font-bold text-emerald-900"
                tileClassName={({ date }) => {
                  const hasNote = notes.some(n => isSameDay(parseISO(n.updatedAt), date));
                  return hasNote ? 'has-note-dot' : '';
                }}
              />
            </div>
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate(null)}
                className="mt-4 w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-100 transition-colors"
              >
                清除日期筛选
              </button>
            )}
          </div>

          <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-6 rounded-[2rem] border border-amber-200 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform">
              <Sun className="w-24 h-24 text-amber-500" />
            </div>
            <h4 className="font-black text-amber-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              小贴士
            </h4>
            <p className="text-sm text-amber-800 font-medium leading-relaxed mb-3">
              点击日历上的日期，可以快速找到那天的记录哦！带点的小圆点表示那天有写笔记。
            </p>
            <p className="text-sm text-amber-800 font-medium leading-relaxed">
              点击笔记上的 <Pin className="w-3 h-3 inline" /> 图标可以将重要的事情固定在最前面！📌
            </p>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="lg:col-span-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-64 bg-white rounded-[2rem] border border-emerald-50 animate-pulse" />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-emerald-100 relative overflow-hidden">
              <div className="absolute top-10 left-10 opacity-5">
                <Leaf className="w-20 h-20 text-emerald-500 -rotate-12" />
              </div>
              <div className="absolute bottom-10 right-10 opacity-5">
                <Leaf className="w-20 h-20 text-emerald-500 rotate-12" />
              </div>
              
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <Sprout className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-emerald-950 mb-2">土地还空着呢~</h3>
              <p className="text-emerald-700/60 mb-8 max-w-xs font-medium">
                {selectedDate 
                  ? `${format(selectedDate, 'yyyy年MM月dd日')} 还没有播下记录的种子，快去写一个吧！` 
                  : "快来记录下今天农场里发生的趣事，让记忆发芽吧！🌱"}
              </p>
              <button
                onClick={openAddModal}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-emerald-200 transition-all active:scale-95"
              >
                播种第一条笔记
              </button>
            </div>
          ) : (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredNotes.map(note => {
                  const color = getNoteColor(note.color);
                  return (
                    <motion.div
                      layout
                      variants={{
                        hidden: { opacity: 0, y: 20, scale: 0.9 },
                        visible: { opacity: 1, y: 0, scale: 1 }
                      }}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={note.id}
                      className={`group relative p-8 rounded-[2rem] border-2 ${color.bg} ${color.border} hover:shadow-xl transition-all flex flex-col h-full overflow-hidden`}
                    >
                      {/* Tape Effect */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-8 bg-white/40 backdrop-blur-sm border border-white/20 rotate-2 z-10" />
                      
                      {note.isPinned && (
                        <div className="absolute top-4 left-4 z-20">
                          <Pin className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <h3 className={`text-xl font-black ${color.text} line-clamp-1 pr-10 ${note.isPinned ? 'pl-6' : ''}`}>{note.title}</h3>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all absolute top-0 right-0">
                          <button 
                            onClick={() => handleTogglePin(note)}
                            className={`p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all ${note.isPinned ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}
                            title={note.isPinned ? "取消置顶" : "置顶笔记"}
                          >
                            {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleEdit(note)}
                            className="p-2 text-slate-400 hover:text-emerald-600 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(note.id!)}
                            className="p-2 text-slate-400 hover:text-rose-600 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-slate-700 font-medium line-clamp-6 flex-1 mb-6 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto pt-6 border-t border-black/5">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-wider">
                          <div className={`w-8 h-8 rounded-lg ${color.accent} flex items-center justify-center text-white`}>
                            <Clock className="w-4 h-4" />
                          </div>
                          {format(parseISO(note.updatedAt), 'MM月dd日 HH:mm')}
                        </div>
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-white/50 border border-white flex items-center justify-center" title="爱心">
                            <Heart className="w-3 h-3 text-rose-400" />
                          </div>
                          <div className="w-6 h-6 rounded-full bg-white/50 border border-white flex items-center justify-center" title="星星">
                            <Star className="w-3 h-3 text-amber-400" />
                          </div>
                          <div className="w-6 h-6 rounded-full bg-white/50 border border-white flex items-center justify-center" title="嫩芽">
                            <Sprout className="w-3 h-3 text-emerald-400" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border-8 border-emerald-50"
            >
              <div className="p-10 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    <StickyNote className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-emerald-950">{editingId ? '修改我的笔记' : '写下新的发现'}</h2>
                    <p className="text-sm text-emerald-600 font-bold">今天有什么想分享的吗？✨</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-10 space-y-8">
                {submitError && (
                  <div className="p-4 bg-rose-50 border-2 border-rose-100 text-rose-600 text-sm rounded-2xl font-bold flex items-center gap-2">
                    <X className="w-4 h-4" /> {submitError}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between items-end ml-2">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">给笔记起个好听的名字</label>
                    <span className={`text-[10px] font-black ${(formData.title?.length || 0) > 180 ? 'text-rose-400' : 'text-emerald-300'}`}>
                      {formData.title?.length || 0} / 200
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    placeholder="例如：今天的大发现..."
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-8 py-5 bg-emerald-50/50 border-2 border-emerald-50 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-xl text-emerald-950 placeholder:text-emerald-200"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end ml-2">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">详细记录一下吧</label>
                    <span className={`text-[10px] font-black ${(formData.content?.length || 0) > 9000 ? 'text-rose-400' : 'text-emerald-300'}`}>
                      {formData.content?.length || 0} / 10000
                    </span>
                  </div>
                  <textarea
                    required
                    rows={6}
                    maxLength={10000}
                    placeholder="在这里尽情书写吧..."
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-8 py-6 bg-emerald-50/50 border-2 border-emerald-50 rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none font-bold text-emerald-800 placeholder:text-emerald-200 leading-relaxed"
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] ml-2">选一个喜欢的颜色</label>
                    <div className="flex flex-wrap gap-4">
                      {colors.map(color => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: color.id })}
                          className={`w-12 h-12 rounded-2xl border-4 transition-all relative group ${
                            formData.color === color.id 
                              ? `border-emerald-500 scale-110 shadow-xl` 
                              : 'border-transparent hover:scale-105'
                          } ${color.accent}`}
                        >
                          {formData.color === color.id && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Star className="w-6 h-6 text-white fill-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] ml-2">置顶笔记</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                      className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all font-black ${
                        formData.isPinned 
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200' 
                          : 'bg-white border-emerald-100 text-emerald-300 hover:border-emerald-300'
                      }`}
                    >
                      {formData.isPinned ? <Pin className="w-5 h-5" /> : <PinOff className="w-5 h-5" />}
                      <span>{formData.isPinned ? '已置顶' : '不置顶'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-6 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-[2rem] transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 hover:shadow-emerald-300 active:scale-95 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <Save className="w-8 h-8" />
                    )}
                    <span className="text-xl">{isSubmitting ? '正在努力保存中...' : '保存我的心情'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-rose-950/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center border-8 border-rose-50"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">确定要删除吗？</h3>
              <p className="text-slate-500 font-medium mb-8">删除后笔记将无法找回哦，请三思~ 🥺</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-200"
                >
                  确定删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .notebook-calendar-container .react-calendar {
          background: transparent;
          border: none;
          font-family: inherit;
        }
        .notebook-calendar-container .react-calendar__navigation button {
          color: #065f46;
          font-weight: 900;
          font-size: 1.2rem;
        }
        .notebook-calendar-container .react-calendar__navigation button:enabled:hover,
        .notebook-calendar-container .react-calendar__navigation button:enabled:focus {
          background-color: #ecfdf5;
          border-radius: 12px;
        }
        .notebook-calendar-container .react-calendar__month-view__weekdays {
          font-weight: 900;
          color: #10b981;
          text-transform: uppercase;
          font-size: 0.7rem;
        }
        .notebook-calendar-container .react-calendar__tile {
          padding: 0.75em 0.5em;
          font-weight: 700;
          border-radius: 12px;
          transition: all 0.2s;
          position: relative;
        }
        .notebook-calendar-container .react-calendar__tile:enabled:hover,
        .notebook-calendar-container .react-calendar__tile:enabled:focus {
          background-color: #ecfdf5;
          color: #059669;
        }
        .notebook-calendar-container .react-calendar__tile--now {
          background: #f0fdf4;
          color: #10b981;
        }
        .notebook-calendar-container .react-calendar__tile--active {
          background: #10b981 !important;
          color: white !important;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .has-note-dot::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background-color: #f59e0b;
          border-radius: 50%;
        }
        .react-calendar__month-view__days__day--neighboringMonth {
          opacity: 0.3;
        }
      `}</style>
    </div>
  );
}


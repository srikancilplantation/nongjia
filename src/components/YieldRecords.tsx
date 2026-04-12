import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { YieldRecord, OperationType } from '../types';
import { handleFirestoreError, triggerPrint } from '../utils';
import { Plus, Trash2, Edit2, X, Save, TrendingUp, Calendar, Tag, Weight, MapPin, FileText, ChevronRight, ChevronDown, Printer, Loader2 } from 'lucide-react';
import { format, parseISO, getYear, getMonth } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useLocations } from '../hooks/useLocations';
import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { Crop } from '../types';

export default function YieldRecords({ 
  user, 
  selectedCrop, 
  crops 
}: { 
  user: User, 
  selectedCrop: string, 
  crops: Crop[] 
}) {
  const [records, setRecords] = useState<YieldRecord[]>([]);
  const [view, setView] = useState<'list' | 'report'>('list');
  const [reportAllCrops, setReportAllCrops] = useState(false);
  const [reportYear, setReportYear] = useState<string>('All');
  const [reportMonth, setReportMonth] = useState<string>('All');
  const [reportLocation, setReportLocation] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const { locations, loading: locationsLoading } = useLocations(user);
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [formData, setFormData] = useState<Partial<YieldRecord>>({
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    cropType: '',
    location: '',
    quantity: 0,
    unit: 'kg',
    grade: '',
    notes: ''
  });

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'yieldRecords'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YieldRecord)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'yieldRecords'));
  }, [user]);

  const filteredRecords = records.filter(r => 
    r.cropType === selectedCrop && 
    (selectedLocation === 'All' || r.location === selectedLocation)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { id, ...rest } = formData;
      const data = { 
        ...rest, 
        quantity: isNaN(Number(rest.quantity)) ? 0 : Number(rest.quantity),
        userId: user.uid 
      };

      if (editingId) {
        await updateDoc(doc(db, 'yieldRecords', editingId), data);
      } else {
        await addDoc(collection(db, 'yieldRecords'), data);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        cropType: selectedCrop || (crops.length > 0 ? crops[0].name : ''),
        location: locations.length > 0 ? locations[0].name : '',
        quantity: 0,
        unit: 'kg',
        grade: '',
        notes: ''
      });
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || '保存失败，请重试');
      handleFirestoreError(error, OperationType.WRITE, 'yieldRecords');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'yieldRecords', itemToDelete));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'yieldRecords');
    }
  };

  const handleEdit = (record: YieldRecord) => {
    setEditingId(record.id!);
    setFormData(record);
    setIsModalOpen(true);
  };

  // Get unique years from records for filtering
  const availableYears = (Array.from(new Set(records.map(r => getYear(parseISO(r.date)).toString()))) as string[]).sort((a, b) => b.localeCompare(a));

  // Group records for report
  const reportData = records
    .filter(r => {
      const cropMatch = reportAllCrops ? true : r.cropType === selectedCrop;
      const locationMatch = reportLocation === 'All' ? true : r.location === reportLocation;
      const yearMatch = reportYear === 'All' ? true : getYear(parseISO(r.date)).toString() === reportYear;
      const monthMatch = reportMonth === 'All' ? true : (getMonth(parseISO(r.date)) + 1).toString() === reportMonth;
      return cropMatch && locationMatch && yearMatch && monthMatch;
    })
    .reduce((acc: any, record) => {
      const date = parseISO(record.date);
      const year = getYear(date);
      const month = getMonth(date) + 1; // 1-indexed
      const location = record.location || '未记录地点';
      const cropType = record.cropType;
      
      const key = reportAllCrops 
        ? `${cropType}-${location}-${year}-${month}`
        : `${location}-${year}-${month}`;

      if (!acc[key]) {
        acc[key] = {
          cropType,
          location,
          year,
          month,
          totalQuantity: 0,
          unit: record.unit,
          count: 0
        };
      }
      acc[key].totalQuantity += Number(record.quantity);
      acc[key].count += 1;
      return acc;
    }, {});

  const sortedReport = Object.values(reportData).sort((a: any, b: any) => {
    if (reportAllCrops && a.cropType !== b.cropType) return a.cropType.localeCompare(b.cropType);
    if (a.location !== b.location) return a.location.localeCompare(b.location);
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  const reportTotal = sortedReport.reduce((sum, row: any) => sum + row.totalQuantity, 0);

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    triggerPrint();
    // Reset printing state after a delay
    setTimeout(() => setIsPrinting(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">收成记录</h1>
          <p className="text-emerald-600/60">记录您的农场每一次丰收</p>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-end">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className={`p-2.5 bg-white text-emerald-600 rounded-2xl hover:bg-emerald-50 transition-all border border-emerald-100 shadow-sm flex items-center gap-2 ${isPrinting ? 'opacity-50' : ''}`}
              title="打印当前视图"
            >
              {isPrinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
              {isPrinting && <span className="text-xs font-bold">准备打印...</span>}
            </button>
            {isPrinting && window.self !== window.top && (
              <p className="text-[10px] text-amber-600 font-bold mt-2 animate-pulse print:hidden max-w-[150px] text-right">
                提示：如果打印窗口未弹出，请点击右上角“在新窗口打开”后再试。
              </p>
            )}
          </div>
          <div className="flex p-1 bg-emerald-100/50 rounded-xl border border-emerald-100">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                view === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-emerald-400'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>明细列表</span>
            </button>
            <button
              onClick={() => setView('report')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                view === 'report' ? 'bg-white text-emerald-600 shadow-sm' : 'text-emerald-400'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>收成报告</span>
            </button>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                cropType: selectedCrop || (crops.length > 0 ? crops[0].name : ''),
                location: locations.length > 0 ? locations[0].name : '',
                quantity: 0,
                unit: 'kg',
                grade: '',
                notes: ''
              });
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20 font-bold"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">新增记录</span>
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <>
          {/* Location Filter */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide print:hidden">
            <span className="text-xs font-black text-emerald-900/40 uppercase tracking-widest whitespace-nowrap">地点筛选:</span>
            <button
              onClick={() => setSelectedLocation('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedLocation === 'All'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-white text-emerald-400 border border-emerald-50 hover:border-emerald-200'
              }`}
            >
              全部地点
            </button>
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedLocation === loc.name
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-white text-emerald-400 border border-emerald-50 hover:border-emerald-200'
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredRecords.map((record) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={record.id}
                className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-950 text-lg">{record.cropType}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <span className="text-sm text-emerald-600/60 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(record.date), 'yyyy-MM-dd HH:mm')}
                      </span>
                      <span className="text-sm text-emerald-600/60 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {record.location || '未记录地点'}
                      </span>
                      {record.grade && (
                        <span className="text-sm text-emerald-600/60 flex items-center gap-1">
                          <Tag className="w-4 h-4" />
                          等级: {record.grade}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Weight className="w-4 h-4" />
                      <span className="text-2xl font-black">{record.quantity}</span>
                      <span className="font-bold">{record.unit}</span>
                    </div>
                    {record.notes && <p className="text-xs text-emerald-400 mt-1 max-w-[200px] truncate">{record.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(record)}
                      className="p-2 text-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(record.id!)}
                      className="p-2 text-emerald-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredRecords.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-emerald-100">
                <TrendingUp className="w-12 h-12 text-emerald-100 mx-auto mb-4" />
                <p className="text-emerald-300 font-medium">还没有任何收成记录，点击右上角开始添加吧！</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-6 print:hidden">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    onClick={() => setReportAllCrops(!reportAllCrops)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${reportAllCrops ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${reportAllCrops ? 'left-5' : 'left-1'}`} />
                  </div>
                  <span className="text-sm font-bold text-emerald-950">显示所有作物报告</span>
                </label>
              </div>

              <div className="h-8 w-[1px] bg-emerald-100 hidden md:block" />

              <div className="flex items-center gap-4 flex-1 min-w-[400px]">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest ml-1">筛选地点</label>
                  <select
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  >
                    <option value="All">全部地点</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest ml-1">筛选年份</label>
                  <select
                    value={reportYear}
                    onChange={(e) => setReportYear(e.target.value)}
                    className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  >
                    <option value="All">全部年份</option>
                    {Array.from(new Set([
                      ...availableYears,
                      ...Array.from({ length: 21 }, (_, i) => (new Date().getFullYear() - 10 + i).toString())
                    ])).sort((a, b) => b.localeCompare(a)).map(year => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest ml-1">筛选月份</label>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  >
                    <option value="All">全部月份</option>
                    {Array.from({ length: 12 }, (_, i) => (i + 1).toString()).map(month => (
                      <option key={month} value={month}>{month}月</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className={`p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all border border-emerald-100 cursor-pointer flex items-center gap-2 ${isPrinting ? 'opacity-50' : ''}`}
                title="打印报告"
              >
                {isPrinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                {isPrinting && <span className="text-xs font-bold">准备打印...</span>}
              </button>
            </div>

            <div className="pt-4 border-t border-emerald-50 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest">筛选结果</p>
                <p className="text-sm text-emerald-600 font-medium">
                  {reportLocation === 'All' ? '全部地点' : reportLocation} · {reportYear === 'All' ? '全部年份' : `${reportYear}年`} · {reportMonth === 'All' ? '全部月份' : `${reportMonth}月`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest">总计产量</p>
                <p className="text-2xl font-black text-emerald-600">{reportTotal.toLocaleString()} <span className="text-xs">kg</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-50/50">
                    {reportAllCrops && <th className="px-6 py-4 text-xs font-black text-emerald-900/40 uppercase tracking-widest">作物</th>}
                    <th className="px-6 py-4 text-xs font-black text-emerald-900/40 uppercase tracking-widest">地点</th>
                    <th className="px-6 py-4 text-xs font-black text-emerald-900/40 uppercase tracking-widest">年份</th>
                    <th className="px-6 py-4 text-xs font-black text-emerald-900/40 uppercase tracking-widest">月份</th>
                    <th className="px-6 py-4 text-xs font-black text-emerald-900/40 uppercase tracking-widest">收成次数</th>
                    <th className="px-6 py-4 text-xs font-black text-emerald-900/40 uppercase tracking-widest text-right">总产量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {sortedReport.map((row: any, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                      {reportAllCrops && (
                        <td className="px-6 py-4">
                          <span className="font-bold text-emerald-950">{row.cropType}</span>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-emerald-950">{row.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-emerald-800">{row.year}年</td>
                      <td className="px-6 py-4 font-medium text-emerald-800">{row.month}月</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">
                          {row.count} 次
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-emerald-600">
                          <span className="text-lg font-black">{row.totalQuantity.toFixed(3)}</span>
                          <span className="text-xs font-bold">{row.unit}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedReport.length > 0 && (
                    <tr className="bg-emerald-50/30 font-black">
                      <td colSpan={reportAllCrops ? 5 : 4} className="px-6 py-4 text-right text-emerald-900">
                        总计
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-600">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xl">{(reportTotal as number).toFixed(3)}</span>
                          <span className="text-xs">kg</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {sortedReport.length === 0 && (
                    <tr>
                      <td colSpan={reportAllCrops ? 6 : 5} className="px-6 py-20 text-center text-emerald-300 font-medium">
                        暂无收成数据可生成报告
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
              className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-emerald-50 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30 flex-shrink-0">
                <h2 className="text-xl font-bold text-emerald-950">{editingId ? '编辑记录' : '新增收成记录'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-emerald-300 hover:text-emerald-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl">
                    {submitError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-emerald-900/70 ml-1">日期时间</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-emerald-900/70 ml-1">作物类型</label>
                    <select
                      value={formData.cropType}
                      onChange={e => setFormData({ ...formData, cropType: e.target.value })}
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    >
                      {crops.map(crop => (
                        <option key={crop.id} value={crop.name}>{crop.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-emerald-900/70 ml-1">地点</label>
                  <select
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                  >
                    {locations.length === 0 ? (
                      <option value="">请先在基础管理中添加地点</option>
                    ) : (
                      locations.map(loc => (
                        <option key={loc.id} value={loc.name}>{loc.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-emerald-900/70 ml-1">数量</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={isNaN(formData.quantity as number) ? '' : formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: e.target.value === '' ? NaN : parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-emerald-900/70 ml-1">单位</label>
                    <select
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    >
                      <option value="kg">公斤 (kg)</option>
                      <option value="ton">吨 (ton)</option>
                      <option value="basket">箩 (basket)</option>
                      <option value="piece">个 (piece)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-emerald-900/70 ml-1">等级 (可选)</label>
                  <input
                    type="text"
                    placeholder="例如: 猫山王 A, 1号果"
                    value={formData.grade}
                    onChange={e => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-emerald-900/70 ml-1">备注</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none font-medium"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {isSubmitting ? '正在提交...' : (editingId ? '保存修改' : '确认添加')}
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
              <p className="text-emerald-600/60 mb-8 font-medium">您确定要删除这条收成记录吗？此操作无法撤销。</p>
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

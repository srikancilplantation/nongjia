import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Users, Sprout, MapPin, Trash2, AlertTriangle, RefreshCcw, Beaker } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import WorkerManagement from './WorkerManagement';
import CropManagement from './CropManagement';
import LocationManagement from './LocationManagement';
import ActivityTypeManagement from './ActivityTypeManagement';

type Tab = 'workers' | 'crops' | 'locations' | 'activityTypes' | 'reset';

export default function Management({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<Tab>('workers');
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const tabs = [
    { id: 'workers' as const, label: '工人管理', icon: <Users className="w-5 h-5" /> },
    { id: 'crops' as const, label: '农作物管理', icon: <Sprout className="w-5 h-5" /> },
    { id: 'locations' as const, label: '地点管理', icon: <MapPin className="w-5 h-5" /> },
    { id: 'activityTypes' as const, label: '活动类型', icon: <Beaker className="w-5 h-5" /> },
    { id: 'reset' as const, label: '系统重置', icon: <RefreshCcw className="w-5 h-5" /> },
  ];

  const handleResetAll = async () => {
    if (!user) return;
    setIsResetting(true);
    
    const collections = [
      'activityRecords',
      'yieldRecords',
      'weatherRecords',
      'attendanceRecords',
      'notes',
      'workers',
      'crops',
      'locations',
      'activityTypes',
      'knowledgeBase',
      'knowledgeFolders'
    ];

    try {
      for (const collName of collections) {
        const q = query(collection(db, collName), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        
        // Firestore batch limit is 500 operations
        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 500);
          chunk.forEach((document) => {
            batch.delete(doc(db, collName, document.id));
          });
          await batch.commit();
        }
      }
      
      alert('所有记录已成功重置！');
      window.location.reload();
    } catch (error) {
      console.error('Reset failed:', error);
      alert('重置失败，请稍后再试。');
    } finally {
      setIsResetting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-emerald-950 tracking-tight">基础管理</h1>
          <p className="text-emerald-600/60 font-medium mt-1">管理您的农场核心资产与人员</p>
        </div>

        <div className="flex p-1.5 bg-emerald-100/50 rounded-2xl border border-emerald-100 w-full overflow-x-auto lg:w-fit scrollbar-hide">
          <div className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                  ${activeTab === tab.id 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-emerald-700/50 hover:text-emerald-700'}
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'workers' ? (
          <WorkerManagement user={user} hideHeader={true} />
        ) : activeTab === 'crops' ? (
          <CropManagement user={user} hideHeader={true} />
        ) : activeTab === 'locations' ? (
          <LocationManagement user={user} hideHeader={true} />
        ) : activeTab === 'activityTypes' ? (
          <ActivityTypeManagement user={user} hideHeader={true} />
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-[2.5rem] p-10 border border-red-100 shadow-xl shadow-red-500/5">
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-8">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-900 mb-4">危险区域：系统完全重置</h2>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                此操作将永久删除您账号下的所有记录，包括：
                <span className="block mt-2 text-red-600 font-bold">
                  • 农事记录 & 日历活动<br />
                  • 产量数据 & 收成报告<br />
                  • 天气历史记录<br />
                  • 工人资料 & 出勤记录<br />
                  • 记事本内容<br />
                  • 作物与地点配置
                </span>
                <span className="block mt-4 text-slate-400 text-sm italic">注意：此操作不可撤销，请谨慎操作。</span>
              </p>

              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-3"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>一键重置所有记录</span>
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm font-bold text-center">
                    您确定要删除所有数据吗？
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleResetAll}
                      disabled={isResetting}
                      className="py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isResetting ? (
                        <RefreshCcw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                      <span>确认重置</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

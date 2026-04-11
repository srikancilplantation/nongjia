import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { KnowledgeItem, KnowledgeFolder, OperationType } from '../types';
import { handleFirestoreError } from '../utils';
import { 
  Plus, Trash2, Edit2, X, Save, BookOpen, Search, Tag, Clock, 
  Folder, FolderPlus, ChevronRight, FileUp, FileText, Download,
  ArrowLeft, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useCrops } from '../hooks/useCrops';
import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';

export default function KnowledgeBase({ user }: { user: User }) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'item' | 'folder'} | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { crops, loading: cropsLoading } = useCrops(user);
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Partial<KnowledgeItem>>({
    title: '',
    content: '',
    category: '种植心得',
    cropType: '',
    folderId: undefined,
    fileUrl: undefined,
    fileName: undefined,
    fileType: undefined
  });

  const [folderFormData, setFolderFormData] = useState({
    name: ''
  });

  useEffect(() => {
    if (crops.length > 0 && !selectedCrop) {
      setSelectedCrop(crops[0].name);
    }
  }, [crops, selectedCrop]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch Items
    const itemsQuery = query(
      collection(db, 'knowledgeBase'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubItems = onSnapshot(itemsQuery, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeItem)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'knowledgeBase'));

    // Fetch Folders
    const foldersQuery = query(
      collection(db, 'knowledgeFolders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
      setFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeFolder)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'knowledgeFolders'));

    return () => {
      unsubItems();
      unsubFolders();
    };
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('文件太大，请上传小于 10MB 的文件。');
      return;
    }

    setSelectedFile(file);
    setFormData(prev => ({
      ...prev,
      fileName: file.name,
      fileType: file.type,
      title: prev.title || file.name.split('.')[0]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setSubmitError(null);
    try {
      let fileUrl = formData.fileUrl;

      if (selectedFile) {
        const storageRef = ref(storage, `knowledge/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const snapshot = await uploadBytes(storageRef, selectedFile);
        fileUrl = await getDownloadURL(snapshot.ref);
      }

      // Clean up data: remove id and undefined values
      const { id, ...rest } = formData;
      const data: any = { 
        ...rest, 
        fileUrl: fileUrl || null,
        userId: user.uid,
        folderId: currentFolderId || null,
        createdAt: editingId ? items.find(i => i.id === editingId)?.createdAt : new Date().toISOString()
      };

      // Remove undefined fields to avoid Firestore errors
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      if (editingId) {
        await updateDoc(doc(db, 'knowledgeBase', editingId), data);
      } else {
        await addDoc(collection(db, 'knowledgeBase'), data);
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setSelectedFile(null);
      setFormData({ title: '', content: '', category: '种植心得', cropType: selectedCrop });
    } catch (error: any) {
      console.error('Knowledge save error:', error);
      let errorMessage = error.message || '保存失败，请重试';
      
      if (error.code === 'storage/retry-limit-exceeded') {
        errorMessage = '文件上传失败：连接超时。请检查您的网络，并确保在 Firebase 控制台中已启用 Storage 服务。';
      } else if (error.code === 'storage/unauthorized') {
        errorMessage = '文件上传失败：权限不足。请检查 Firebase Storage 安全规则。';
      } else if (error.code === 'storage/canceled') {
        errorMessage = '文件上传已取消。';
      }

      setSubmitError(errorMessage);
      handleFirestoreError(error, OperationType.WRITE, 'knowledgeBase');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: folderFormData.name,
        parentId: currentFolderId || null,
        userId: user.uid,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'knowledgeFolders'), data);
      setIsFolderModalOpen(false);
      setFolderFormData({ name: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'knowledgeFolders');
    }
  };

  const handleDelete = async (id: string) => {
    setItemToDelete({ id, type: 'item' });
    setIsDeleteModalOpen(true);
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItemToDelete({ id, type: 'folder' });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'item') {
        await deleteDoc(doc(db, 'knowledgeBase', itemToDelete.id));
      } else {
        await deleteDoc(doc(db, 'knowledgeFolders', itemToDelete.id));
      }
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, itemToDelete.type === 'item' ? 'knowledgeBase' : 'knowledgeFolders');
    }
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingId(item.id!);
    setFormData(item);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const currentFolders = folders.filter(f => f.parentId === (currentFolderId || null));
  const currentItems = items.filter(i => i.folderId === (currentFolderId || undefined));

  const filteredItems = currentItems.filter(item => 
    (item.cropType === selectedCrop) &&
    (item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (item.content?.toLowerCase().includes(searchTerm.toLowerCase())) ||
     item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const breadcrumbs = [];
  let tempFolderId = currentFolderId;
  while (tempFolderId) {
    const folder = folders.find(f => f.id === tempFolderId);
    if (folder) {
      breadcrumbs.unshift(folder);
      tempFolderId = folder.parentId || null;
    } else {
      break;
    }
  }

  const downloadFile = (item: KnowledgeItem) => {
    if (!item.fileUrl) return;
    window.open(item.fileUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">农业知识库</h1>
          <p className="text-emerald-600/60">记录您的种植心得与农业知识</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="bg-white text-emerald-600 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-50 transition-colors font-bold"
          >
            <FolderPlus className="w-5 h-5" />
            <span>新建文件夹</span>
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setSelectedFile(null);
              setFormData({ 
                title: '', 
                content: '', 
                category: '种植心得', 
                cropType: selectedCrop || (crops.length > 0 ? crops[0].name : '') 
              });
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20 font-bold"
          >
            <Plus className="w-5 h-5" />
            <span>新增知识</span>
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm font-bold text-emerald-600/60">
        <button 
          onClick={() => setCurrentFolderId(null)}
          className={`hover:text-emerald-600 ${!currentFolderId ? 'text-emerald-600' : ''}`}
        >
          根目录
        </button>
        {breadcrumbs.map((folder) => (
          <React.Fragment key={folder.id}>
            <ChevronRight className="w-4 h-4" />
            <button 
              onClick={() => setCurrentFolderId(folder.id!)}
              className={`hover:text-emerald-600 ${currentFolderId === folder.id ? 'text-emerald-600' : ''}`}
            >
              {folder.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Crop Selector */}
      <div className="flex flex-wrap gap-2">
        {crops.map((crop) => (
          <button
            key={crop.id}
            onClick={() => setSelectedCrop(crop.name)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              selectedCrop === crop.name 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                : 'bg-white text-emerald-700/70 border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/50'
            }`}
          >
            {crop.name}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 w-5 h-5" />
        <input
          type="text"
          placeholder="搜索知识库..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-sm font-medium"
        />
      </div>

      {/* Folders & Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Back Button if in subfolder */}
        {currentFolderId && (
          <button
            onClick={() => {
              const current = folders.find(f => f.id === currentFolderId);
              setCurrentFolderId(current?.parentId || null);
            }}
            className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 flex items-center gap-4 hover:bg-emerald-100 transition-all group"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <ArrowLeft className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="font-bold text-emerald-950">返回上一级</span>
          </button>
        )}

        {/* Folders */}
        {currentFolders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => setCurrentFolderId(folder.id!)}
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-100 flex items-center justify-between hover:shadow-md hover:border-emerald-300 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Folder className="w-6 h-6 text-emerald-600" fill="currentColor" fillOpacity={0.2} />
              </div>
              <div>
                <h3 className="font-bold text-emerald-950 group-hover:text-emerald-600 transition-colors">{folder.name}</h3>
                <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">文件夹</p>
              </div>
            </div>
            <button 
              onClick={(e) => handleDeleteFolder(e, folder.id!)}
              className="p-2 text-emerald-100 hover:text-rose-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Items */}
        {filteredItems.map((item) => (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={item.id}
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-100 flex flex-col hover:shadow-md hover:border-emerald-300 transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100">
                  {item.category}
                </span>
                <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-widest border border-slate-100">
                  {item.cropType}
                </span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(item)}
                  className="p-2 text-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(item.id!)}
                  className="p-2 text-emerald-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-start gap-3 mb-3">
              {item.fileUrl ? (
                <FileText className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
              ) : (
                <BookOpen className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
              )}
              <h3 className="text-xl font-black text-emerald-950 group-hover:text-emerald-600 transition-colors">{item.title}</h3>
            </div>

            {item.content && (
              <p className="text-emerald-700/70 text-sm line-clamp-4 flex-1 mb-4 whitespace-pre-wrap font-medium leading-relaxed">
                {item.content}
              </p>
            )}

            {item.fileUrl && (
              <button
                onClick={() => downloadFile(item)}
                className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors mb-4"
              >
                <Download className="w-4 h-4" />
                查看/下载文件: {item.fileName}
              </button>
            )}

            <div className="flex items-center gap-4 text-xs font-bold text-emerald-300 pt-5 border-t border-emerald-50 mt-auto">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(item.createdAt), 'yyyy-MM-dd')}
              </span>
            </div>
          </motion.div>
        ))}

        {filteredItems.length === 0 && currentFolders.length === 0 && (
          <div className="col-span-full text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-emerald-100">
            <BookOpen className="w-16 h-16 text-emerald-100 mx-auto mb-4" />
            <p className="text-emerald-300 font-bold text-lg">当前文件夹为空</p>
          </div>
        )}
      </div>

      {/* Knowledge Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUploading && setIsModalOpen(false)}
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden border border-emerald-50"
            >
              <div className="p-6 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
                <h2 className="text-xl font-bold text-emerald-950">{editingId ? '编辑知识' : '新增知识条目'}</h2>
                <button onClick={() => !isUploading && setIsModalOpen(false)} className="text-emerald-300 hover:text-emerald-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {submitError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl font-bold">
                    {submitError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-emerald-900/70 ml-1">标题</label>
                    <input
                      type="text"
                      required
                      placeholder="输入知识标题"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-emerald-900/70 ml-1">分类</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    >
                      <option value="种植心得">种植心得</option>
                      <option value="病虫害防治">病虫害防治</option>
                      <option value="肥料知识">肥料知识</option>
                      <option value="市场行情">市场行情</option>
                      <option value="其它">其它</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-emerald-900/70 ml-1">适用作物</label>
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

                <div className="space-y-1">
                  <label className="text-sm font-bold text-emerald-900/70 ml-1">上传文件 (可选, 小于 10MB)</label>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`w-full px-4 py-6 bg-emerald-50/30 border-2 border-dashed border-emerald-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 transition-all group ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <FileUp className="w-8 h-8 text-emerald-300 group-hover:text-emerald-500 mb-2 transition-colors" />
                      <span className="text-sm font-bold text-emerald-400 group-hover:text-emerald-600 transition-colors text-center">
                        {formData.fileName ? `已选择: ${formData.fileName}` : '点击或拖拽上传文件'}
                      </span>
                    </label>
                    {(formData.fileName || formData.fileUrl) && !isUploading && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFormData(prev => ({ ...prev, fileUrl: undefined, fileName: undefined, fileType: undefined }));
                        }}
                        className="absolute top-2 right-2 p-1 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-emerald-900/70 ml-1">内容详情</label>
                  <textarea
                    rows={6}
                    placeholder="在这里输入详细的农业知识 or 种植心得..."
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none font-medium"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        正在上传并保存...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {editingId ? '保存修改' : '确认发布'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Folder Modal */}
      <AnimatePresence>
        {isFolderModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFolderModalOpen(false)}
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-emerald-50"
            >
              <div className="p-6 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
                <h2 className="text-xl font-bold text-emerald-950">新建文件夹</h2>
                <button onClick={() => setIsFolderModalOpen(false)} className="text-emerald-300 hover:text-emerald-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleFolderSubmit} className="p-6 space-y-5">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-emerald-900/70 ml-1">文件夹名称</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="输入文件夹名称"
                    value={folderFormData.name}
                    onChange={e => setFolderFormData({ ...folderFormData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                  />
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <FolderPlus className="w-5 h-5" />
                    确认创建
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
                {itemToDelete?.type === 'item' 
                  ? '您确定要删除这条知识条目吗？此操作无法撤销。' 
                  : '您确定要删除这个文件夹吗？文件夹内的内容将不会被自动删除。'}
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

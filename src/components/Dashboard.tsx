import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Calendar as CalendarIcon,
  Search,
  Filter,
  Download,
  ChevronRight,
  User,
  Languages,
  Utensils,
  Car,
  ShoppingBag,
  Tv,
  Edit2,
  ChevronDown,
  Settings,
  LogOut,
  Loader2,
  Lock,
  Unlock,
  Volume2,
  Check,
  Camera,
  Upload,
  Home,
  LayoutDashboard,
  X
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid,
  Cell as BarCell
} from 'recharts';
import { Transaction, Category } from '../types';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../lib/LanguageContext';
import { useFirebase } from '../lib/FirebaseContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  orderBy,
  setDoc
} from 'firebase/firestore';

const SUCCESS_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3'; // Coin drop sound

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  Food: <Utensils className="w-4 h-4" />,
  Drink: <Tv className="w-4 h-4" />,
  Transport: <Car className="w-4 h-4" />,
  Shopping: <ShoppingBag className="w-4 h-4" />,
  Subscription: <Tv className="w-4 h-4" />,
  Groceries: <ShoppingBag className="w-4 h-4" />,
  Income: <Plus className="w-4 h-4" />,
  Others: <Plus className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#E11D48', // Rose
  Drink: '#0EA5E9', // Sky
  Transport: '#F59E0B', // Amber
  Shopping: '#8B5CF6', // Violet
  Subscription: '#10B981', // Emerald
  Groceries: '#F43F5E', // Rose-light
  Income: '#22C55E', // Green
  Others: '#64748B', // Slate
};

function BudgetRow({ cat, spent, limit, percent, onUpdate, t }: { 
  cat: string, 
  spent: number, 
  limit: number, 
  percent: number, 
  onUpdate: (cat: string, amount: string) => Promise<void>,
  t: (key: string) => string,
  key?: string
}) {
  const [localLimit, setLocalLimit] = useState(limit.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(limit > 0);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdInterval = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalLimit(limit > 0 ? limit.toString() : '');
    setIsLocked(limit > 0);
  }, [limit]);

  const handleHoldStart = () => {
    if (isSaving) return;
    setHoldProgress(0);
    holdInterval.current = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          clearInterval(holdInterval.current!);
          handleAction();
          return 0;
        }
        return prev + 5;
      });
    }, 50);
  };

  const handleHoldEnd = () => {
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      setHoldProgress(0);
    }
  };

  const handleAction = async () => {
    if (isLocked) {
      setIsLocked(false);
    } else {
      setIsSaving(true);
      await onUpdate(cat, localLimit);
      setIsSaving(false);
      setIsLocked(true);
    }
  };

  return (
    <div className="space-y-4 p-6 bg-surface-container-low rounded-2xl ghost-border">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {CATEGORY_ICONS[cat as Category]}
          </div>
          <span className="text-sm font-black">{t(cat)}</span>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
          <div className="text-left sm:text-right">
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">{t('spent')}</p>
            <p className="text-sm font-black">{t('currency')} {spent.toFixed(2)}</p>
          </div>
          <div className="flex items-end gap-2">
            <div className="text-right">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">{t('limit')}</p>
              <input 
                type="number"
                value={localLimit}
                onChange={(e) => setLocalLimit(e.target.value)}
                placeholder="Set limit"
                disabled={isLocked}
                className={cn(
                  "text-sm font-black w-24 bg-transparent border-b border-primary/20 focus:border-primary outline-none text-right transition-opacity",
                  isLocked ? "opacity-50" : "opacity-100"
                )}
              />
            </div>
            <div className="relative">
              <motion.button
                onMouseDown={handleHoldStart}
                onMouseUp={handleHoldEnd}
                onMouseLeave={handleHoldEnd}
                onTouchStart={handleHoldStart}
                onTouchEnd={handleHoldEnd}
                disabled={isSaving}
                className={cn(
                  "relative p-2 rounded-lg transition-all overflow-hidden w-10 h-10 flex items-center justify-center",
                  isLocked ? "bg-surface-container-high text-on-surface-variant" : "bg-primary text-white"
                )}
              >
                {/* Progress Background */}
                <motion.div 
                  className="absolute left-0 top-0 bottom-0 bg-blue-900/40 pointer-events-none"
                  initial={{ width: 0 }}
                  animate={{ width: `${holdProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
                
                <AnimatePresence mode="wait">
                  {isSaving ? (
                    <motion.div key="saving" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </motion.div>
                  ) : isLocked ? (
                    <motion.div key="locked" initial={{ rotate: -45, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: 45, scale: 0.5 }}>
                      <Lock className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <motion.div key="unlocked" initial={{ rotate: 45, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: -45, scale: 0.5 }}>
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
      <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          className={cn(
            "h-full transition-all duration-500",
            percent > 90 ? "bg-error" : "premium-gradient"
          )}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t, language, setLanguage } = useLanguage();
  const { user, loading: authLoading, logout } = useFirebase();
  const navigate = useNavigate();
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'expenses' | 'budgets' | 'reports'>('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [scannedItems, setScannedItems] = useState<{ date: string; items: { description: string; amount: number; category: Category }[] } | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [themeColor, setThemeColor] = useState('#0D9488');
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "receipt.jpg", { type: "image/jpeg" });
            handleScanReceipt(file);
            stopCamera();
          }
        }, 'image/jpeg');
      }
    }
  };

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Food' as Category,
    description: '',
    amount: ''
  });

  const playSound = () => {
    const audio = new Audio(SUCCESS_SOUND);
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t_item => [
        t_item.date,
        t_item.category,
        `"${t_item.description.replace(/"/g, '""')}"`,
        t_item.amount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmScan = async () => {
    if (!user || !scannedItems) return;
    
    try {
      const batch = scannedItems.items.map(item => 
        addDoc(collection(db, 'transactions'), {
          date: scannedItems.date,
          category: item.category,
          description: item.description,
          amount: item.amount,
          uid: user.uid,
          createdAt: serverTimestamp()
        })
      );
      
      await Promise.all(batch);
      playSound();
      setShowScanModal(false);
      setScannedItems(null);
    } catch (error) {
      console.error('Error saving scanned items:', error);
    }
  };

  // Auth Redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Firestore Sync - Transactions
  useEffect(() => {
    if (!user) return;

    // Simplified query to avoid index requirements in prototype
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      
      // Sort in-memory by date descending
      docs.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
      
      setTransactions(docs);
      setLoading(false);
    }, (error) => {
      console.error('Transactions Sync Error:', error);
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Sync - Budgets
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'budgets'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const category = doc.id.split('_')[1];
        data[category] = doc.data().amount;
      });
      setBudgets(data);
    }, (error) => {
      console.error('Budgets Sync Error:', error);
      handleFirestoreError(error, OperationType.LIST, 'budgets');
    });
    return () => unsubscribe();
  }, [user]);

  // Firestore Sync - Settings
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'settings', user.uid);
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const color = doc.data().themeColor || '#0D9488';
        setThemeColor(color);
        // Update CSS variables for theme
        document.documentElement.style.setProperty('--primary', color);
        // Generate a slightly darker version for container
        document.documentElement.style.setProperty('--primary-container', color + 'CC');
      }
    }, (error) => {
      console.error('Settings Sync Error:', error);
      handleFirestoreError(error, OperationType.GET, `settings/${user.uid}`);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t_item => {
      const matchesCategory = filterCategory === 'All' || t_item.category === filterCategory;
      const matchesSearch = t_item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t_item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [transactions, filterCategory, searchQuery]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, { transactions: Transaction[], total: number }> = {};
    filteredTransactions.forEach(t_item => {
      if (!groups[t_item.date]) {
        groups[t_item.date] = { transactions: [], total: 0 };
      }
      groups[t_item.date].transactions.push(t_item);
      groups[t_item.date].total += t_item.amount;
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredTransactions]);

  const { totalExpenses, totalIncome } = useMemo(() => {
    return transactions.reduce((acc, t_item) => {
      if (t_item.category === 'Income') {
        acc.totalIncome += t_item.amount;
      } else {
        acc.totalExpenses += t_item.amount;
      }
      return acc;
    }, { totalExpenses: 0, totalIncome: 0 });
  }, [transactions]);

  const totalSpending = totalExpenses; // Keep for backward compatibility if needed

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.forEach(t_item => {
      data[t_item.category] = (data[t_item.category] || 0) + t_item.amount;
    });
    return Object.entries(data).map(([name, value]) => ({
      name: t(name),
      value,
      color: CATEGORY_COLORS[name as Category] || themeColor
    }));
  }, [filteredTransactions, t, themeColor]);

  const trendData = useMemo(() => {
    const daily: Record<string, number> = {};
    transactions.forEach(t_item => {
      const day = t_item.date.split('-')[2];
      daily[day] = (daily[day] || 0) + t_item.amount;
    });
    return Object.entries(daily)
      .map(([day, amount]) => ({ day, amount }))
      .sort((a, b) => Number(a.day) - Number(b.day));
  }, [transactions]);

  const budgetAlerts = useMemo(() => {
    return Object.entries(budgets)
      .filter(([cat, limit]) => {
        const spent = transactions
          .filter(t => t.category === cat)
          .reduce((sum, t) => sum + t.amount, 0);
        const limitNum = Number(limit);
        return limitNum > 0 && spent >= limitNum;
      })
      .map(([cat]) => cat);
  }, [budgets, transactions]);

  // Sound effect for budget alerts
  const prevAlertsCount = React.useRef(0);
  useEffect(() => {
    if (budgetAlerts.length > prevAlertsCount.current) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
    }
    prevAlertsCount.current = budgetAlerts.length;
  }, [budgetAlerts.length]);

  const handleScanReceipt = async (file: File) => {
    if (!user) return;
    setIsScanning(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Extract all individual items and their prices from this receipt. Return a JSON object with a 'date' field (YYYY-MM-DD) and an 'items' array. Each item should have: 'description', 'amount' (number), and 'category' (one of: Food, Drink, Transport, Shopping, Subscription, Groceries, Income, Others)." },
              { inlineData: { data: base64Data, mimeType: file.type } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    category: { type: Type.STRING }
                  },
                  required: ["description", "amount", "category"]
                }
              }
            },
            required: ["date", "items"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      if (result.items && result.items.length > 0) {
        setScannedItems({
          date: result.date || new Date().toISOString().split('T')[0],
          items: result.items.map((item: any) => ({
            ...item,
            category: (item.category as Category) || 'Others'
          }))
        });
        setShowScanModal(true);
        playSound();
      }
    } catch (error) {
      console.error('Receipt Scan Error:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.amount || !formData.description || !formData.date) return;

    try {
      await addDoc(collection(db, 'transactions'), {
        date: formData.date,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        uid: user.uid,
        createdAt: serverTimestamp()
      });

      playSound();
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'Food',
        description: '',
        amount: ''
      });
      setCurrentView('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTransaction || !formData.amount || !formData.description || !formData.date) return;

    try {
      const docRef = doc(db, 'transactions', editingTransaction.id);
      await updateDoc(docRef, {
        date: formData.date,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount)
      });

      playSound();
      setEditingTransaction(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'Food',
        description: '',
        amount: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${editingTransaction.id}`);
    }
  };

  const handleUpdateBudget = async (category: string, amount: string) => {
    if (!user) return;
    try {
      const budgetId = `${user.uid}_${category}`;
      await setDoc(doc(db, 'budgets', budgetId), {
        amount: parseFloat(amount) || 0,
        uid: user.uid,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `budgets/${category}`);
    }
  };

  const handleUpdateTheme = async (color: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'settings', user.uid), {
        themeColor: color,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (!user || selectedIds.length === 0) return;
    try {
      // Delete one by one for simplicity in this prototype
      await Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'transactions', id))));
      setSelectedIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transactions/bulk');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map(t_item => t_item.id));
    }
  };

  const startEditing = (t_item: Transaction) => {
    setEditingTransaction(t_item);
    setFormData({
      date: t_item.date,
      category: t_item.category as Category,
      description: t_item.description,
      amount: t_item.amount.toString()
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="font-headline font-black text-on-surface-variant animate-pulse">
            {t('brand')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface font-body text-on-surface">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-surface-container-low h-20 flex items-center px-4 md:px-8">
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-8 lg:gap-12">
            <Link to="/" className="text-xl md:text-2xl font-black text-primary tracking-tighter font-headline hover:opacity-80 transition-opacity">
              {t('brand')}
            </Link>
            <nav className="hidden lg:flex items-center gap-8">
              {[
                { id: 'dashboard', label: t('dashboard') },
                { id: 'expenses', label: t('expenses') },
                { id: 'budgets', label: t('budgets') },
                { id: 'reports', label: t('reports') }
              ].map((item) => (
                <motion.button 
                  key={item.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentView(item.id as any)}
                  className={cn(
                    "text-sm font-medium transition-all duration-200 relative py-1",
                    currentView === item.id 
                      ? "text-primary font-bold" 
                      : "text-on-surface-variant hover:text-primary"
                  )}
                >
                  {item.label}
                  {currentView === item.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"
                    />
                  )}
                </motion.button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden lg:flex items-center bg-surface-container-low px-4 py-2 rounded-full gap-2 ghost-border">
              <Search className="text-on-surface-variant w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-32 xl:w-48 font-body outline-none"
              />
            </div>
            
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold hover:bg-surface-container-highest transition-colors"
            >
              <Languages className="w-3.5 h-3.5" />
              {language === 'en' ? '中文' : 'EN'}
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setCurrentView('dashboard');
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }}
              className="premium-gradient text-white px-4 md:px-6 py-2 rounded-full text-sm font-semibold font-headline flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('addExpenseBtn')}</span>
            </motion.button>

            <div className="relative">
              <motion.div 
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowProfile(!showProfile)}
                className="h-8 w-8 md:h-10 md:w-10 rounded-full overflow-hidden border-2 border-primary/10 cursor-pointer ml-1 hover:border-primary transition-colors"
              >
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXWselJRj7_S9cQpiLvyc2MpI4XbhPseY1Nk2NMSBD_oR2trUaELHM3ZO10TasGAVjBPTAMUsHx4aje7NPA3k8gYaYPW12S_-fhBHgILlCWtnZOD6oSA_GcFN2yqtiX8zP7cZzm1bwuOqr5vYX44TqAYbfxaOrTqKfyamKKkqhOgfF6j-kaq2O7VZrCRzCCH0AQu8LMqhK0bkLZaEPkkWBl_wJ2aiXMnYjDDIR_5U_ahgEaKXjmairt_bIZj3qBcrTzIiQAAC7AWo" 
                  alt="User Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              <AnimatePresence>
                {showProfile && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl z-50 p-4 ghost-border"
                    >
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-surface-container-low">
                          {user?.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {user?.displayName?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-black font-headline">{user?.displayName || 'User'}</span>
                            <span className="text-[10px] text-on-surface-variant">{user?.email}</span>
                          </div>
                        </div>
                      <div className="flex flex-col gap-1">
                        <motion.button 
                          whileHover={{ x: 5 }} 
                          onClick={() => { setShowProfileModal(true); setShowProfile(false); }}
                          className="flex items-center gap-3 w-full p-2 text-sm font-bold text-on-surface-variant hover:text-primary transition-all text-left"
                        >
                          <User className="w-4 h-4" /> {t('profile')}
                        </motion.button>
                        <motion.button 
                          whileHover={{ x: 5 }} 
                          onClick={() => { setShowSettings(true); setShowProfile(false); }}
                          className="flex items-center gap-3 w-full p-2 text-sm font-bold text-on-surface-variant hover:text-primary transition-all text-left"
                        >
                          <Settings className="w-4 h-4" /> {t('settings')}
                        </motion.button>
                        <div className="h-px bg-surface-container-low my-2" />
                        <motion.button 
                          whileHover={{ x: 5 }} 
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full p-2 text-sm font-bold text-error hover:opacity-80 transition-all text-left"
                        >
                          <Download className="w-4 h-4" /> {t('logout')}
                        </motion.button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Navigation for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-lg border-t border-surface-container-low z-50 px-6 py-3 flex justify-between items-center">
        {[
          { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
          { id: 'expenses', label: t('expenses'), icon: TrendingUp },
          { id: 'budgets', label: t('budgets'), icon: PieChartIcon },
          { id: 'reports', label: t('reports'), icon: CalendarIcon }
        ].map((item) => (
          <motion.button 
            key={item.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentView(item.id as any)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              currentView === item.id ? "text-primary" : "text-on-surface-variant opacity-60"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold">{item.label}</span>
          </motion.button>
        ))}
      </nav>

      <main className="mt-28 px-4 md:px-8 pb-24 lg:pb-12 w-full max-w-7xl mx-auto flex flex-col gap-8">
        {/* Budget Alerts */}
        <AnimatePresence>
          {budgetAlerts.map(cat => (
            <motion.div 
              key={`alert-${cat}`}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="bg-error/10 border border-error/20 rounded-2xl p-4 flex items-center gap-4 mb-4"
            >
              <div className="h-10 w-10 rounded-full bg-error/20 flex items-center justify-center text-error shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-grow">
                <p className="text-sm font-black text-error">{t('budgetExceeded')}</p>
                <p className="text-xs text-error/80">
                  {t(cat)}
                </p>
              </div>
              <Volume2 className="w-4 h-4 text-error/40" />
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Bento Grid Summary */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                {/* Monthly Summary */}
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="lg:col-span-4 bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] ghost-border flex flex-col justify-between group hover:shadow-xl transition-all duration-300"
                >
                  <div className="space-y-6">
                    <div>
                      <span className="text-on-surface-variant font-label text-xs uppercase tracking-[0.15em] font-semibold">
                        {t('monthlySpending')}
                      </span>
                      <h2 className="text-4xl md:text-5xl font-black font-headline text-primary mt-2 leading-none">
                        {t('currency')} {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h2>
                    </div>
                    <div className="pt-6 border-t border-surface-container-low">
                      <span className="text-on-surface-variant font-label text-xs uppercase tracking-[0.15em] font-semibold">
                        {t('Income')}
                      </span>
                      <h2 className="text-2xl md:text-3xl font-black font-headline text-green-600 mt-1 leading-none">
                        {t('currency')} {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h2>
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-surface-container-low">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentView('expenses')}
                      className="text-primary font-headline text-sm font-bold flex items-center gap-1 group"
                    >
                      {t('viewBreakdown')} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  </div>
                </motion.div>

                {/* Category Pie */}
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="lg:col-span-4 bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] ghost-border hover:shadow-xl transition-all duration-300"
                >
                  <span className="text-on-surface-variant font-label text-xs uppercase tracking-[0.15em] font-semibold">
                    {t('spendingByCategory')}
                  </span>
                  <div className="mt-6 h-48 md:h-56 relative flex items-center">
                    <div className="w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              borderRadius: '12px', 
                              border: 'none', 
                              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 pl-4 flex flex-col gap-2 overflow-y-auto max-h-full no-scrollbar">
                      {categoryData.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-[10px] font-bold text-on-surface-variant truncate">{entry.name}</span>
                          <span className="text-[10px] font-black ml-auto">{t('currency')} {entry.value.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Last 30 Days Trend */}
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="lg:col-span-4 bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] ghost-border hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  <span className="text-on-surface-variant font-label text-xs uppercase tracking-[0.15em] font-semibold">
                    {t('last30DaysTrend')}
                  </span>
                  <div className="mt-auto h-48 pt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="day" hide />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{fill: 'transparent'}}
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        />
                        <Bar dataKey="amount" fill="#0D9488" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Add New/Edit Expense Form */}
                <motion.div className="lg:col-span-4 bg-surface-container-low p-6 md:p-8 rounded-[2rem] lg:sticky lg:top-24 ghost-border h-fit">
                  <h3 className="text-xl font-black font-headline text-on-surface mb-6">
                    {editingTransaction ? t('editExpenseBtn') : t('addNewExpense')}
                  </h3>
                  <div className="mb-6">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Left: Camera */}
                      <div className={cn(
                        "relative flex flex-col items-center justify-center h-32 border-2 border-dashed border-surface-container-high rounded-2xl overflow-hidden transition-all",
                        isScanning && "opacity-50 pointer-events-none"
                      )}>
                        {isCameraActive ? (
                          <div className="absolute inset-0 w-full h-full bg-black">
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-4 px-2">
                              <button 
                                onClick={capturePhoto}
                                className="p-3 bg-primary text-on-primary rounded-full shadow-xl hover:scale-110 transition-transform"
                              >
                                <Camera className="w-6 h-6" />
                              </button>
                              <button 
                                onClick={stopCamera}
                                className="p-3 bg-surface-container-high text-on-surface rounded-full shadow-xl hover:scale-110 transition-transform"
                              >
                                <X className="w-6 h-6" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={startCamera}
                            className="flex flex-col items-center gap-1 w-full h-full hover:bg-surface-container-lowest transition-colors"
                            disabled={isScanning}
                          >
                            <div className="p-2 bg-primary/10 rounded-full">
                              <Camera className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-[10px] font-bold text-on-surface-variant">{t('takePhoto')}</span>
                          </button>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                      </div>

                      {/* Right: Upload */}
                      <label className={cn(
                        "flex flex-col items-center justify-center h-32 border-2 border-dashed border-surface-container-high rounded-2xl cursor-pointer hover:bg-surface-container-lowest transition-all group relative overflow-hidden",
                        isScanning && "opacity-50 pointer-events-none"
                      )}>
                        <div className="flex flex-col items-center gap-1">
                          <div className="p-2 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-[10px] font-bold text-on-surface-variant">{t('uploadFile')}</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => e.target.files?.[0] && handleScanReceipt(e.target.files[0])}
                          disabled={isScanning}
                        />
                      </label>
                    </div>
                    {isScanning && (
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-[10px] font-bold text-on-surface-variant">Scanning...</span>
                      </div>
                    )}
                  </div>
                  <form onSubmit={editingTransaction ? handleUpdateExpense : handleAddExpense} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black tracking-widest text-on-surface-variant uppercase">{t('date')}</label>
                      <input 
                        type="date" 
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full bg-surface-container-lowest border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-body outline-none ghost-border"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black tracking-widest text-on-surface-variant uppercase">{t('category')}</label>
                      <div className="relative">
                        <select 
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value as Category})}
                          className="w-full bg-surface-container-lowest border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-body appearance-none outline-none pr-10 ghost-border"
                        >
                          {['Food', 'Drink', 'Transport', 'Shopping', 'Subscription', 'Groceries', 'Income', 'Others'].map(cat => (
                            <option key={cat} value={cat}>{t(cat)}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black tracking-widest text-on-surface-variant uppercase">{t('description')}</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Weekly groceries" 
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-surface-container-lowest border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-body outline-none ghost-border"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black tracking-widest text-on-surface-variant uppercase">{t('amount')}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">{t('currency')}</span>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          value={formData.amount}
                          onChange={e => setFormData({...formData, amount: e.target.value})}
                          className="w-full bg-surface-container-lowest border-none rounded-xl p-3 pl-10 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-body outline-none ghost-border"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {editingTransaction && (
                        <motion.button 
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => {
                            setEditingTransaction(null);
                            setFormData({
                              date: new Date().toISOString().split('T')[0],
                              category: 'Food',
                              description: '',
                              amount: ''
                            });
                          }}
                          className="flex-1 bg-surface-container-high text-on-surface py-4 rounded-xl font-bold font-headline transition-all"
                        >
                          Cancel
                        </motion.button>
                      )}
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="flex-[2] premium-gradient text-white py-4 rounded-xl font-bold font-headline shadow-lg transition-all hover:shadow-xl"
                      >
                        {editingTransaction ? t('updateExpenseBtn') : t('addExpenseBtn')}
                      </motion.button>
                    </div>
                  </form>
                </motion.div>

                {/* Recent Transactions Table */}
                <div className="lg:col-span-8 bg-surface-container-lowest rounded-[2rem] ghost-border overflow-hidden">
                  <div className="p-6 md:p-8 border-b border-surface-container-low flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-black font-headline text-on-surface">{t('recentTransactions')}</h3>
                        {selectedIds.length > 0 && (
                          <motion.button 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={handleDeleteSelected}
                            className="px-4 py-1.5 bg-error/10 text-error text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-error/20 transition-all"
                          >
                            {t('deleteSelected')} ({selectedIds.length})
                          </motion.button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <motion.button 
                          whileTap={{ scale: 0.95 }} 
                          onClick={handleExportCSV}
                          className="px-4 py-2 text-xs font-bold font-label text-primary hover:bg-primary/5 rounded-full transition-all flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> {t('exportCsv')}
                        </motion.button>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                        <input 
                          type="text"
                          placeholder="Search transactions..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-surface-container-low border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none ghost-border"
                        />
                      </div>
                      <div className="relative min-w-[160px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                        <select 
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="w-full bg-surface-container-low border-none rounded-xl py-2.5 pl-10 pr-8 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none ghost-border"
                        >
                          <option value="All">All Categories</option>
                          {['Food', 'Drink', 'Transport', 'Shopping', 'Subscription', 'Groceries', 'Income', 'Others'].map(cat => (
                            <option key={cat} value={cat}>{t(cat)}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="text-on-surface-variant font-label text-[10px] font-black uppercase tracking-widest border-b border-surface-container-low">
                          <th className="px-6 py-4 w-12">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 rounded border-surface-container-high text-primary focus:ring-primary/20"
                            />
                          </th>
                          <th className="px-6 py-4">{t('date')} & {t('category')}</th>
                          <th className="px-6 py-4">{t('description')}</th>
                          <th className="px-6 py-4 text-right">{t('amount')}</th>
                          <th className="px-6 py-4 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-low/50">
                        <AnimatePresence initial={false}>
                          {filteredTransactions.map((t_item) => (
                            <motion.tr 
                              key={t_item.id}
                              layout
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className={cn(
                                "hover:bg-surface-container-low transition-colors group",
                                selectedIds.includes(t_item.id) && "bg-primary/5"
                              )}
                            >
                              <td className="px-6 py-6">
                                <input 
                                  type="checkbox" 
                                  checked={selectedIds.includes(t_item.id)}
                                  onChange={() => toggleSelect(t_item.id)}
                                  className="w-4 h-4 rounded border-surface-container-high text-primary focus:ring-primary/20"
                                />
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-on-surface">{t_item.date}</span>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[t_item.category as Category] || themeColor }} />
                                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(t_item.category)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-on-surface leading-tight">{t_item.description}</span>
                                  <span className="text-[10px] text-on-surface-variant mt-1">Ref: {t_item.id.slice(-6).toUpperCase()}</span>
                                </div>
                              </td>
                              <td className="px-6 py-6 text-right">
                                <span className="text-sm font-black text-primary font-headline">
                                  {t('currency')} {t_item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <motion.button 
                                    whileHover={{ scale: 1.1 }} 
                                    whileTap={{ scale: 0.9 }} 
                                    onClick={() => startEditing(t_item)}
                                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-primary/10 text-primary transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </motion.button>
                                  <motion.button whileHover={{ scale: 1.1, color: '#ef4444' }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(t_item.id)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-error/10 text-error transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </motion.button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {currentView === 'expenses' && (
            <motion.div 
              key="expenses"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-surface-container-lowest p-8 rounded-[2rem] ghost-border"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <h2 className="text-3xl font-black font-headline">{t('expensesTitle')}</h2>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                  <div className="relative flex-grow md:min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                    <input 
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-surface-container-low border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none ghost-border"
                    />
                  </div>
                  <div className="relative min-w-[160px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                    <select 
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full bg-surface-container-low border-none rounded-xl py-2.5 pl-10 pr-8 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none ghost-border"
                    >
                      <option value="All">All Categories</option>
                      {['Food', 'Drink', 'Transport', 'Shopping', 'Subscription', 'Groceries', 'Others'].map(cat => (
                        <option key={cat} value={cat}>{t(cat)}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-12">
                {groupedExpenses.map(([date, { transactions: dayTransactions, total }]) => (
                  <div key={date} className="space-y-4">
                    <div className="flex justify-between items-end border-b-2 border-surface-container-low pb-2">
                      <h3 className="text-lg font-black font-headline text-on-surface">{date}</h3>
                      <p className="text-sm font-black text-primary">
                        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant mr-2">Daily Total:</span>
                        {t('currency')} {total.toFixed(2)}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {dayTransactions.map(t_item => (
                        <motion.div 
                          key={t_item.id}
                          whileHover={{ x: 5 }}
                          className="p-5 bg-surface-container-low rounded-2xl ghost-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                              {CATEGORY_ICONS[t_item.category as Category]}
                            </div>
                            <div className="flex flex-col">
                              <p className="text-base font-black text-on-surface">{t_item.description}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{t(t_item.category)}</span>
                                <div className="h-1 w-1 rounded-full bg-surface-container-high" />
                                <span className="text-[10px] text-on-surface-variant font-medium">Ref: {t_item.id.slice(-8).toUpperCase()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col md:items-end w-full md:w-auto">
                            <p className="text-xl font-black text-primary">{t('currency')} {t_item.amount.toFixed(2)}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {currentView === 'budgets' && (
            <motion.div 
              key="budgets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-surface-container-lowest p-8 rounded-[2rem] ghost-border"
            >
              <h2 className="text-3xl font-black font-headline mb-8">{t('budgetTitle')}</h2>
              <div className="space-y-8">
                {['Food', 'Drink', 'Transport', 'Shopping', 'Subscription', 'Groceries', 'Others'].map(cat => {
                  const spent = transactions
                    .filter(t_item => t_item.category === cat)
                    .reduce((sum, t_item) => sum + t_item.amount, 0);
                  const limit = budgets[cat] || 0;
                  const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                  
                  return (
                    <BudgetRow 
                      key={cat}
                      cat={cat}
                      spent={spent}
                      limit={limit}
                      percent={percent}
                      onUpdate={handleUpdateBudget}
                      t={t}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}

          {currentView === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black font-headline text-on-surface">{t('reportsTitle')}</h2>
                  <p className="text-on-surface-variant mt-2">Comprehensive analysis of your financial health.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Detailed Spending Trend */}
                <div className="p-8 bg-surface-container-low rounded-3xl ghost-border">
                  <h4 className="text-lg font-black mb-6">Spending Trend</h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                        <Tooltip 
                          cursor={{fill: 'transparent'}}
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        />
                        <Bar dataKey="amount" fill={themeColor} radius={[6, 6, 0, 0]}>
                          {trendData.map((entry, index) => (
                            <BarCell key={`cell-${index}`} fill={themeColor} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Detailed Category Distribution with Legend */}
                <div className="p-8 bg-surface-container-low rounded-3xl ghost-border">
                  <h4 className="text-lg font-black mb-6">{t('categoryDistribution')}</h4>
                  <div className="h-80 flex flex-col md:flex-row items-center">
                    <div className="w-full md:w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              borderRadius: '12px', 
                              border: 'none', 
                              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 pl-0 md:pl-8 mt-8 md:mt-0 flex flex-col gap-3 overflow-y-auto max-h-full no-scrollbar">
                      {categoryData.map((entry, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-surface-container-lowest/50">
                          <div className="w-3 h-3 rounded-full shadow-sm shrink-0" style={{ backgroundColor: entry.color }} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black text-on-surface truncate">{entry.name}</span>
                            <span className="text-[8px] text-on-surface-variant font-bold">
                              {((entry.value / totalSpending) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <span className="text-xs font-black text-primary ml-auto">{t('currency')} {entry.value.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Daily Breakdown Table */}
              <div className="bg-surface-container-lowest rounded-[2rem] ghost-border overflow-hidden">
                <div className="p-8 border-b border-surface-container-low">
                  <h3 className="text-lg font-black font-headline text-on-surface">Daily Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-on-surface-variant font-label text-[10px] font-black uppercase tracking-widest border-b border-surface-container-low">
                        <th className="px-8 py-4">Date</th>
                        <th className="px-8 py-4">Transactions</th>
                        <th className="px-8 py-4 text-right">Daily Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low/50">
                      {groupedExpenses.map(([date, { transactions: dayTransactions, total }]) => (
                        <tr key={date} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-8 py-6">
                            <span className="text-sm font-black text-on-surface">{date}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-wrap gap-2">
                              {dayTransactions.map(t_item => (
                                <div key={t_item.id} className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-low rounded-full">
                                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[t_item.category as Category] || themeColor }} />
                                  <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">{t(t_item.category)}</span>
                                  <span className="text-[9px] font-black text-primary">{t('currency')} {t_item.amount.toFixed(0)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <span className="text-sm font-black text-primary">{t('currency')} {total.toFixed(2)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {(showSettings || showProfileModal) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowSettings(false); setShowProfileModal(false); }}
              className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 ghost-border"
            >
              <h2 className="text-3xl font-black font-headline mb-6">
                {showSettings ? t('settings') : t('profile')}
              </h2>
              <div className="space-y-6">
                <div className="flex items-center gap-6 p-6 bg-surface-container-low rounded-2xl">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-16 h-16 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-black text-primary">
                      {user?.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="font-black font-headline">{user?.displayName || 'User'}</p>
                    <p className="text-sm text-on-surface-variant">{user?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-surface-container-lowest rounded-xl ghost-border">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Account Status</p>
                    <p className="text-sm font-bold text-teal-600">Premium Member</p>
                  </div>
                  <div className="p-4 bg-surface-container-lowest rounded-xl ghost-border">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">Theme Color</p>
                    <div className="flex gap-3">
                      {['#0D9488', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'].map(color => (
                        <button 
                          key={color}
                          onClick={() => handleUpdateTheme(color)}
                          className={cn(
                            "w-8 h-8 rounded-full transition-transform hover:scale-110",
                            themeColor === color && "ring-2 ring-offset-2 ring-on-surface"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-surface-container-lowest rounded-xl ghost-border">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Default Currency</p>
                    <p className="text-sm font-bold">{t('currency')}</p>
                  </div>
                </div>
              </div>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => { setShowSettings(false); setShowProfileModal(false); }}
                className="mt-10 w-full premium-gradient text-white py-4 rounded-xl font-bold font-headline shadow-lg"
              >
                Close
              </motion.button>
            </motion.div>
          </div>
        )}
        {showScanModal && scannedItems && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScanModal(false)}
              className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 ghost-border max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black font-headline">Confirm Scanned Items</h2>
                <span className="text-sm font-bold text-on-surface-variant">{scannedItems.date}</span>
              </div>
              
              <div className="space-y-4 mb-8">
                {scannedItems.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl ghost-border">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {CATEGORY_ICONS[item.category as Category]}
                    </div>
                    <div className="flex-grow">
                      <input 
                        type="text" 
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...scannedItems.items];
                          newItems[idx].description = e.target.value;
                          setScannedItems({ ...scannedItems, items: newItems });
                        }}
                        className="w-full bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-primary/20"
                      />
                      <div className="flex gap-2 mt-1">
                        <select 
                          value={item.category}
                          onChange={(e) => {
                            const newItems = [...scannedItems.items];
                            newItems[idx].category = e.target.value as Category;
                            setScannedItems({ ...scannedItems, items: newItems });
                          }}
                          className="text-[10px] font-black uppercase tracking-widest bg-surface-container-high px-2 py-0.5 rounded-full outline-none"
                        >
                          {Object.keys(CATEGORY_ICONS).map(cat => (
                            <option key={cat} value={cat}>{t(cat)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-on-surface-variant">{t('currency')}</span>
                      <input 
                        type="number" 
                        value={item.amount}
                        onChange={(e) => {
                          const newItems = [...scannedItems.items];
                          newItems[idx].amount = parseFloat(e.target.value) || 0;
                          setScannedItems({ ...scannedItems, items: newItems });
                        }}
                        className="w-20 bg-transparent font-black text-right outline-none border-b border-transparent focus:border-primary/20"
                      />
                      <button 
                        onClick={() => {
                          const newItems = scannedItems.items.filter((_, i) => i !== idx);
                          setScannedItems({ ...scannedItems, items: newItems });
                        }}
                        className="p-1 text-error hover:bg-error/10 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowScanModal(false)}
                  className="flex-1 py-4 rounded-xl font-bold font-headline border-2 border-surface-container-high hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmScan}
                  className="flex-1 premium-gradient text-white py-4 rounded-xl font-bold font-headline shadow-lg"
                >
                  Confirm & Save ({scannedItems.items.length} items)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="w-full py-12 mt-auto bg-surface-container-lowest border-t border-surface-container-low">
        <div className="flex flex-col md:flex-row justify-between items-center px-4 md:px-12 w-full max-w-7xl mx-auto gap-6 md:gap-0">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <span className="font-headline font-black text-primary text-lg tracking-tighter">{t('brand')}</span>
            <p className="font-body text-xs tracking-wide text-on-surface-variant">
              © 2024 {t('brand')}. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {['Privacy Policy', 'Terms of Service', 'Support', 'API Docs'].map(link => (
              <a 
                key={link}
                href="#" 
                className="font-body text-xs tracking-wide text-on-surface-variant hover:text-primary transition-all"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'zh';

interface Translations {
  [key: string]: {
    en: string;
    zh: string;
  };
}

export const translations: Translations = {
  // Common
  brand: { en: 'The Precision Ledger', zh: '精准账本' },
  dashboard: { en: 'Dashboard', zh: '仪表盘' },
  expenses: { en: 'Expenses', zh: '支出' },
  budgets: { en: 'Budgets', zh: '预算' },
  reports: { en: 'Reports', zh: '报告' },
  openApp: { en: 'Open App', zh: '打开应用' },
  
  // Landing Page
  heroTag: { en: 'The Financial Atelier', zh: '金融工作室' },
  heroTitle1: { en: 'Wealth,', zh: '财富，' },
  heroTitle2: { en: 'Curated.', zh: '精选。' },
  heroDesc: { en: 'Experience a sanctuary of clarity. The Precision Ledger transforms wealth management into a high-end editorial experience. No clutter, just intentional growth.', zh: '体验清晰的圣殿。精准账本将财富管理转变为高端编辑体验。没有杂乱，只有有意的增长。' },
  startJourney: { en: 'Start Your Journey', zh: '开启旅程' },
  viewDemo: { en: 'View Demo', zh: '查看演示' },
  featuresTitle: { en: 'Crafted for the Discerning', zh: '为有眼光的人打造' },
  featuresDesc: { en: 'Every feature is designed to provide maximum clarity with minimum noise.', zh: '每一项功能都旨在以最小的噪音提供最大的清晰度。' },
  feature1Title: { en: 'Private by Design', zh: '设计隐私' },
  feature1Desc: { en: 'Your financial data is encrypted and stays exclusively yours. We prioritize your sanctuary.', zh: '您的财务数据经过加密，完全属于您。我们优先考虑您的避风港。' },
  feature2Title: { en: 'Editorial Analytics', zh: '编辑级分析' },
  feature2Desc: { en: 'Visualizations that don\'t just show data, but tell the story of your financial evolution.', zh: '可视化不仅展示数据，还讲述您财务进化的故事。' },
  feature3Title: { en: 'Global Reach', zh: '全球覆盖' },
  feature3Desc: { en: 'Multi-currency support for the modern, mobile individual. Wealth knows no borders.', zh: '为现代移动人士提供多币种支持。财富无国界。' },
  
  // Dashboard
  monthlySpending: { en: 'Monthly Spending', zh: '月度支出' },
  spendingByCategory: { en: 'Spending by Category', zh: '按类别支出' },
  last30DaysTrend: { en: 'Last 30 Days Trend', zh: '过去30天趋势' },
  viewBreakdown: { en: 'View Detailed Breakdown', zh: '查看详细明细' },
  lastMonthTrend: { en: 'from last month', zh: '较上月' },
  addNewExpense: { en: 'Add New Expense', zh: '添加新支出' },
  date: { en: 'DATE', zh: '日期' },
  category: { en: 'CATEGORY', zh: '类别' },
  description: { en: 'DESCRIPTION', zh: '描述' },
  amount: { en: 'AMOUNT', zh: '金额' },
  addExpenseBtn: { en: 'Add Expense', zh: '添加支出' },
  editExpenseBtn: { en: 'Edit Expense', zh: '编辑支出' },
  updateExpenseBtn: { en: 'Update Expense', zh: '更新支出' },
  recentTransactions: { en: 'Recent Transactions', zh: '最近交易' },
  exportCsv: { en: 'Export CSV', zh: '导出 CSV' },
  filters: { en: 'Filters', zh: '筛选' },
  loadMore: { en: 'Load More Transactions', zh: '加载更多交易' },
  noTransactions: { en: 'No transactions found. Start by adding one!', zh: '未发现交易。从添加一笔开始吧！' },
  selectAll: { en: 'Select All', zh: '全选' },
  deleteSelected: { en: 'Delete Selected', zh: '删除所选' },
  currency: { en: 'RM', zh: 'RM' },
  spent: { en: 'Spent', zh: '已花' },
  limit: { en: 'Limit', zh: '限额' },
  budgetExceeded: { en: 'Budget Exceeded!', zh: '预算已超额！' },
  budgetWarning: { en: 'Budget Warning!', zh: '预算警告！' },
  categoryDistribution: { en: 'Category Distribution', zh: '类别分布' },
  
  // Profile & Actions
  profile: { en: 'Profile', zh: '个人资料' },
  settings: { en: 'Settings', zh: '设置' },
  logout: { en: 'Logout', zh: '退出登录' },
  userEmail: { en: 'xingshengchoong@gmail.com', zh: 'xingshengchoong@gmail.com' },
  
  // Section Titles
  budgetTitle: { en: 'Monthly Budgets', zh: '月度预算' },
  reportsTitle: { en: 'Financial Reports', zh: '财务报告' },
  expensesTitle: { en: 'All Expenses', zh: '所有支出' },
  
  // Categories
  Food: { en: 'Food', zh: '食物' },
  Drink: { en: 'Drink', zh: '饮料' },
  Transport: { en: 'Transport', zh: '交通' },
  Shopping: { en: 'Shopping', zh: '购物' },
  Subscription: { en: 'Subscription', zh: '订阅' },
  Groceries: { en: 'Groceries', zh: '杂货' },
  Income: { en: 'Income', zh: '收入' },
  Others: { en: 'Others', zh: '其他' },
  takePhoto: { en: 'Take Photo', zh: '拍照' },
  uploadFile: { en: 'Upload File', zh: '上传文件' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

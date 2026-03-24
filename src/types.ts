export type Category = 'Food' | 'Drink' | 'Transport' | 'Shopping' | 'Subscription' | 'Groceries' | 'Income' | 'Others';

export interface Transaction {
  id: string;
  date: string;
  category: Category;
  description: string;
  amount: number;
  uid: string;
  createdAt?: any;
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export interface TrendData {
  day: string;
  amount: number;
}

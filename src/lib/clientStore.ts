import type { Product, Sale } from '@/types';

export interface DashboardData {
  totalActiveProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  todaySalesAmount: number;
  todaySalesCount: number;
  recentSales: Sale[];
}

export const clientStore = {
  products: null as Product[] | null,
  sales: null as Sale[] | null,
  dashboard: null as DashboardData | null,

  getProducts(): Product[] | null {
    if (this.products) return this.products;
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('ruchi_products_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            this.products = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
    return null;
  },

  getSales(): Sale[] | null {
    if (this.sales) return this.sales;
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('ruchi_sales_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            this.sales = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
    return null;
  },

  getDashboard(): DashboardData | null {
    if (this.dashboard) return this.dashboard;
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('ruchi_dashboard_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed) {
            this.dashboard = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
    return null;
  },

  setProducts(products: Product[]) {
    this.products = products;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('ruchi_products_cache', JSON.stringify(products));
      } catch (_) {}
    }
  },

  setSales(sales: Sale[]) {
    this.sales = sales;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('ruchi_sales_cache', JSON.stringify(sales));
      } catch (_) {}
    }
  },

  setDashboard(dashboard: DashboardData) {
    this.dashboard = dashboard;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('ruchi_dashboard_cache', JSON.stringify(dashboard));
      } catch (_) {}
    }
  },

  invalidate(key?: 'products' | 'sales' | 'dashboard') {
    if (!key || key === 'products') {
      this.products = null;
      if (typeof window !== 'undefined') {
        try { sessionStorage.removeItem('ruchi_products_cache'); } catch (_) {}
      }
    }
    if (!key || key === 'sales') {
      this.sales = null;
      if (typeof window !== 'undefined') {
        try { sessionStorage.removeItem('ruchi_sales_cache'); } catch (_) {}
      }
    }
    if (!key || key === 'dashboard' || key === 'products' || key === 'sales') {
      this.dashboard = null;
      if (typeof window !== 'undefined') {
        try { sessionStorage.removeItem('ruchi_dashboard_cache'); } catch (_) {}
      }
    }
  }
};

export interface NameCount {
  name: string;
  value: number;
}

export interface DashboardKPIs {
  total_assets: number;
  total_book_value_usd: number;
  total_stock_units: number;
  warehouses_count: number;
  personas_count: number;
  active_assignments: number;
  movements_total: number;
  movements_last_30_days: number;
  assets_by_status: Record<string, number>;
  top_categories: NameCount[];
  stock_by_warehouse: NameCount[];
  movements_by_type: Record<string, number>;
  movements_by_month: NameCount[];
}

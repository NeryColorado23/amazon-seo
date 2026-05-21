import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OverviewService } from '../../services/overview';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class Overview implements OnInit {
  products: any[] = [];
  filteredProducts: any[] = [];
  stats: any = null;
  byCategory: any[] = [];
  categories: string[] = [];
  loading = false;

  activeTab = 'sku';
  search = '';
  selectedCategory = '';
  sortBy = 'score';
  sortOrder = 'asc';

  expandedSku: string | null = null;

  constructor(private overviewService: OverviewService) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    const params: any = {};
    if (this.search) params['search'] = this.search;
    if (this.selectedCategory) params['category'] = this.selectedCategory;

    this.overviewService.getOverview(params).subscribe({
      next: (data) => {
        this.products = data.products;
        this.stats = data.stats;
        this.byCategory = data.byCategory;
        this.categories = data.categories;
        this.applySort();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  applySort(): void {
    let sorted = [...this.products];
    const dir = this.sortOrder === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      const va = a[this.sortBy] ?? 0;
      const vb = b[this.sortBy] ?? 0;
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });
    this.filteredProducts = sorted;
  }

  onSearch(): void { this.loadData(); }
  onFilter(): void { this.loadData(); }
  onSort(): void { this.applySort(); }

  toggleExpand(sku: string): void {
    this.expandedSku = this.expandedSku === sku ? null : sku;
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'score-green';
    if (score >= 60) return 'score-blue';
    if (score >= 40) return 'score-orange';
    return 'score-red';
  }

  getAlertClass(type: string): string {
    if (type === 'danger') return 'alert-danger';
    if (type === 'warning') return 'alert-warning';
    return 'alert-info';
  }

  getStockClass(status: string): string {
    if (status === 'ok') return 'stock-ok';
    if (status === 'low') return 'stock-low';
    if (status === 'out') return 'stock-out';
    return '';
  }

  getAcosClass(acos: number): string {
    if (acos <= 25) return 'good';
    if (acos <= 35) return 'mid';
    return 'bad';
  }

  getScoreBar(score: number): string {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#1a73e8';
    if (score >= 40) return '#d97706';
    return '#dc2626';
  }

  get criticalProducts(): any[] {
    return this.filteredProducts.filter(p => p.score < 40);
  }

  get topProducts(): any[] {
    return [...this.filteredProducts].sort((a, b) => b.score - a.score).slice(0, 5);
  }
}
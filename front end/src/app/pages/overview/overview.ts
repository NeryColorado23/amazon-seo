import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OverviewService } from '../../services/overview';
import { ChartComponent } from '../../components/chart/chart';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ChartComponent],
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

  // ── Gráficas ──
  healthScoreChart: any = { labels: [], datasets: [] };
  revenueAdSpendChart: any = { labels: [], datasets: [] };
  stockStatusChart: any = { labels: [], datasets: [] };
  acosRoasChart: any = { labels: [], datasets: [] };
  marginChart: any = { labels: [], datasets: [] };

  healthScoreOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, max: 100, grid: { color: '#f0f0f0' } },
      y: { grid: { display: false } },
    },
  };

  stockOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const } },
  };

  revenueAdSpendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
    },
  };

  acosRoasOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } },
    scales: {
      y: { type: 'linear' as const, position: 'left' as const, beginAtZero: true },
      y1: { type: 'linear' as const, position: 'right' as const, beginAtZero: true, grid: { drawOnChartArea: false } },
      x: { grid: { display: false } },
    },
  };

  marginChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: '#f0f0f0' } },
      x: { grid: { display: false } },
    },
  };

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

  buildCharts(): void {
    const sorted = [...this.filteredProducts].sort((a, b) => a.score - b.score);
    const top15 = sorted.slice(0, 15);

    // 1. Health Score por SKU
    this.healthScoreChart = {
      labels: top15.map(p => p.sku),
      datasets: [{
        label: 'Health Score',
        data: top15.map(p => p.score),
        backgroundColor: top15.map(p =>
          p.score >= 80 ? '#16a34acc' :
          p.score >= 60 ? '#1a73e8cc' :
          p.score >= 40 ? '#f59e0bcc' : '#dc2626cc'
        ),
        borderColor: top15.map(p =>
          p.score >= 80 ? '#16a34a' :
          p.score >= 60 ? '#1a73e8' :
          p.score >= 40 ? '#f59e0b' : '#dc2626'
        ),
        borderWidth: 1,
        borderRadius: 4,
      }]
    };

    // 2. Revenue vs Ad Spend por categoría
    this.revenueAdSpendChart = {
      labels: this.byCategory.map(c => c.category),
      datasets: [
        {
          label: 'Revenue ($)',
          data: this.byCategory.map(c => c.revenue),
          backgroundColor: '#1a73e8cc',
          borderColor: '#1a73e8',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Ad Spend ($)',
          data: this.byCategory.map(c => c.adSpend),
          backgroundColor: '#dc2626cc',
          borderColor: '#dc2626',
          borderWidth: 2,
          borderRadius: 6,
        }
      ]
    };

    // 3. Stock Status
    const ok = this.filteredProducts.filter(p => p.stockStatus === 'ok').length;
    const low = this.filteredProducts.filter(p => p.stockStatus === 'low').length;
    const out = this.filteredProducts.filter(p => p.stockStatus === 'out').length;
    const unknown = this.filteredProducts.filter(p => p.stockStatus === 'unknown').length;

    this.stockStatusChart = {
      labels: ['OK', 'Stock bajo', 'Sin stock', 'Sin datos'],
      datasets: [{
        data: [ok, low, out, unknown],
        backgroundColor: ['#16a34add', '#f59e0bdd', '#dc2626dd', '#9ca3afdd'],
        borderColor: ['#16a34a', '#f59e0b', '#dc2626', '#9ca3af'],
        borderWidth: 2,
      }]
    };

    // 4. ACOS vs ROAS por categoría
    this.acosRoasChart = {
      labels: this.byCategory.map(c => c.category),
      datasets: [
        {
          label: 'ACOS promedio (%)',
          data: this.byCategory.map(cat => {
            const prods = this.filteredProducts.filter(p => p.category === cat.category);
            const avg = prods.length > 0 ? prods.reduce((s, p) => s + p.acos, 0) / prods.length : 0;
            return parseFloat(avg.toFixed(1));
          }),
          borderColor: '#dc2626',
          backgroundColor: '#dc262620',
          borderWidth: 2,
          pointRadius: 5,
          pointBackgroundColor: '#dc2626',
          tension: 0.3,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: 'ROAS promedio (x)',
          data: this.byCategory.map(cat => {
            const prods = this.filteredProducts.filter(p => p.category === cat.category);
            const avg = prods.length > 0 ? prods.reduce((s, p) => s + p.roas, 0) / prods.length : 0;
            return parseFloat(avg.toFixed(2));
          }),
          borderColor: '#16a34a',
          backgroundColor: '#16a34a20',
          borderWidth: 2,
          pointRadius: 5,
          pointBackgroundColor: '#16a34a',
          tension: 0.3,
          fill: true,
          yAxisID: 'y1',
        }
      ]
    };

    // 5. Margen % por producto
    const topMargin = [...this.filteredProducts].sort((a, b) => b.marginPct - a.marginPct).slice(0, 12);
    this.marginChart = {
      labels: topMargin.map(p => p.sku),
      datasets: [{
        label: 'Margen %',
        data: topMargin.map(p => parseFloat(p.marginPct.toFixed(1))),
        backgroundColor: topMargin.map(p =>
          p.marginPct >= 40 ? '#16a34acc' :
          p.marginPct >= 25 ? '#1a73e8cc' : '#f59e0bcc'
        ),
        borderColor: topMargin.map(p =>
          p.marginPct >= 40 ? '#16a34a' :
          p.marginPct >= 25 ? '#1a73e8' : '#f59e0b'
        ),
        borderWidth: 1,
        borderRadius: 4,
      }]
    };
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
    this.buildCharts();
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
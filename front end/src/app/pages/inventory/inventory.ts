import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CostService } from '../../services/cost';
import { UploadService } from '../../services/upload';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inventory.html',
  styleUrl: './inventory.scss',
})
export class Inventory implements OnInit {
  costs: any[] = [];
  categories: string[] = [];
  stats: any = null;
  categoryStats: any[] = [];
  uploads: any[] = [];
  selectedUploadId = '';

  filters = {
    category: '',
    stockStatus: '',
    sortBy: 'fbaStock',
    order: 'asc',
  };

  constructor(
    private costService: CostService,
    private uploadService: UploadService,
  ) {}

  ngOnInit(): void {
    this.loadUploads();
    this.loadData();
  }

  loadUploads(): void {
    this.uploadService.getUploads().subscribe({
      next: (data) => (this.uploads = data.filter(u => u.type === 'costs')),
    });
  }

  loadData(): void {
    const params: any = {
      sortBy: this.filters.sortBy,
      order: this.filters.order,
    };
    if (this.filters.category) params['category'] = this.filters.category;
    if (this.filters.stockStatus) params['stockStatus'] = this.filters.stockStatus;
    if (this.selectedUploadId) params['uploadId'] = this.selectedUploadId;

    this.costService.getCosts(params).subscribe({
      next: (data) => (this.costs = data),
    });

    this.costService.getCategories().subscribe({
      next: (cats) => (this.categories = cats),
    });

    this.costService.getStats().subscribe({
      next: (data) => {
        this.stats = data.totals;
        this.categoryStats = data.byCategory;
      },
    });
  }

  onUploadSelected(): void { this.loadData(); }

  deleteUpload(upload: any): void {
    if (confirm(`¿Eliminar "${upload.fileName}" y sus ${upload.recordCount} registros?`)) {
      this.costService.deleteUpload(upload._id).subscribe({
        next: () => {
          if (this.selectedUploadId === upload._id) this.selectedUploadId = '';
          this.loadUploads();
          this.loadData();
        },
      });
    }
  }

  deleteAll(): void {
    if (confirm('¿Eliminar TODO el inventario?')) {
      this.costService.deleteAll().subscribe({
        next: () => {
          this.costs = [];
          this.uploads = [];
          this.categories = [];
          this.stats = null;
          this.categoryStats = [];
          this.selectedUploadId = '';
        },
      });
    }
  }

  applyFilters(): void { this.loadData(); }

  getStockClass(status: string): string {
    if (status === 'ok') return 'stock-ok';
    if (status === 'low') return 'stock-low';
    return 'stock-out';
  }

  getStockIcon(status: string): string {
    if (status === 'ok') return '✅';
    if (status === 'low') return '⚠️';
    return '🔴';
  }

  getMarginClass(pct: number): string {
    if (pct >= 40) return 'margin-high';
    if (pct >= 25) return 'margin-mid';
    return 'margin-low';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
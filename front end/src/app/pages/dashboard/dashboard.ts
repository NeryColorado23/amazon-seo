import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListingService } from '../../services/listing';
import { UploadService } from '../../services/upload';
import { FileUpload } from '../../components/file-upload/file-upload';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUpload],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  listings: any[] = [];
  filteredListings: any[] = [];
  categories: string[] = [];
  stats: any = null;
  categoryStats: any[] = [];
  uploads: any[] = [];
  selectedUploadId = '';
  uploading = false;
  uploadMessage = '';
  uploadError = '';

  filters = {
    category: '',
    minSales: '',
    minConversion: '',
    sortBy: 'salesPerDay',
    order: 'desc',
  };

  constructor(
    private listingService: ListingService,
    private uploadService: UploadService
  ) {}

  ngOnInit(): void {
    this.loadUploads();
    this.loadData();
  }

  loadUploads(): void {
    this.uploadService.getUploads().subscribe({
      next: (data) => {
        this.uploads = data.filter((u) => u.type === 'listings');
      },
    });
  }

  loadData(): void {
    const params: any = {};
    if (this.selectedUploadId) params['uploadId'] = this.selectedUploadId;

    this.listingService.getListings(params).subscribe({
      next: (data) => {
        this.listings = data;
        this.applyFilters();
      },
    });

    this.listingService.getCategories().subscribe({
      next: (cats) => (this.categories = cats),
    });

    this.listingService.getStats(
      this.filters.category || undefined
    ).subscribe({
      next: (data) => {
        this.stats = data.totals;
        this.categoryStats = data.byCategory;
      },
    });
  }

  onUploadSelected(): void {
    this.loadData();
  }

  onFileUploaded(file: File): void {
    this.uploading = true;
    this.uploadMessage = '';
    this.uploadError = '';

    this.listingService.uploadExcel(file).subscribe({
      next: (res: any) => {
        this.uploadMessage = res.message;
        this.uploading = false;
        setTimeout(() => {
          this.loadUploads();
          this.loadData();
        }, 500);
      },
      error: (err) => {
        this.uploadError = err.error?.message || 'Error al subir el archivo';
        this.uploading = false;
      },
    });
  }

  deleteUpload(upload: any): void {
    if (confirm(`¿Eliminar "${upload.fileName}" y sus ${upload.recordCount} registros?`)) {
      this.uploadService.deleteUpload(upload._id).subscribe({
        next: () => {
          if (this.selectedUploadId === upload._id) {
            this.selectedUploadId = '';
          }
          this.loadUploads();
          this.loadData();
        },
      });
    }
  }

  applyFilters(): void {
    let result = [...this.listings];

    if (this.filters.category) {
      result = result.filter((l) => l.category === this.filters.category);
    }
    if (this.filters.minSales) {
      result = result.filter((l) => l.salesPerDay >= +this.filters.minSales);
    }
    if (this.filters.minConversion) {
      result = result.filter((l) => l.conversionRate >= +this.filters.minConversion);
    }

    const key = this.filters.sortBy;
    const dir = this.filters.order === 'asc' ? 1 : -1;
    result.sort((a, b) => (a[key] > b[key] ? dir : -dir));

    this.filteredListings = result;
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  get avgConversion(): string {
    return this.stats?.avgConversionRate?.toFixed(2) || '0';
  }
  get avgSales(): string {
    return this.stats?.avgSalesPerDay?.toFixed(1) || '0';
  }
  get totalImpressions(): string {
    return this.stats?.totalImpressions?.toLocaleString() || '0';
  }
  get avgPrice(): string {
    return this.stats?.avgPrice ? '$' + this.stats.avgPrice.toFixed(2) : '$0';
  }
  get totalSales(): string {
    return this.stats?.totalOrderedProductSales
      ? '$' + this.stats.totalOrderedProductSales.toLocaleString()
      : '$0';
  }
  get totalUnits(): string {
    return this.stats?.totalUnitsOrdered?.toLocaleString() || '0';
  }
}
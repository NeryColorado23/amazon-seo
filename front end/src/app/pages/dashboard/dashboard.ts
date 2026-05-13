import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListingService } from '../../services/listing';
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
  uploading = false;
  uploadMessage = '';
  uploadError = '';

  // Filtros
  filters = {
    category: '',
    minSales: '',
    minConversion: '',
    sortBy: 'salesPerDay',
    order: 'desc',
  };

  constructor(private listingService: ListingService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.listingService.getListings().subscribe({
      next: (data) => {
        this.listings = data;
        this.applyFilters();
      },
    });

    this.listingService.getCategories().subscribe({
      next: (cats) => (this.categories = cats),
    });

    this.listingService.getStats().subscribe({
      next: (data) => {
        this.stats = data.totals;
        this.categoryStats = data.byCategory;
      },
    });
  }

  onFileUploaded(file: File): void {
    this.uploading = true;
    this.uploadMessage = '';
    this.uploadError = '';

    this.listingService.uploadExcel(file).subscribe({
      next: (res) => {
        this.uploadMessage = res.message;
        this.uploading = false;
        this.loadData();
      },
      error: (err) => {
        this.uploadError = err.error?.message || 'Error al subir el archivo';
        this.uploading = false;
      },
    });
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

    // Ordenar
    const key = this.filters.sortBy as keyof any;
    const dir = this.filters.order === 'asc' ? 1 : -1;
    result.sort((a, b) => (a[key] > b[key] ? dir : -dir));

    this.filteredListings = result;
  }

  deleteAll(): void {
    if (confirm('¿Estás seguro de eliminar todos los listados? Esta acción no se puede deshacer.')) {
      this.listingService.deleteAll().subscribe({
        next: () => {
          this.listings = [];
          this.filteredListings = [];
          this.stats = null;
          this.categoryStats = [];
          this.categories = [];
        },
      });
    }
  }

  // Helpers para métricas
  get avgConversion(): string {
    if (!this.stats?.avgConversionRate) return '0';
    return this.stats.avgConversionRate.toFixed(2);
  }

  get avgSales(): string {
    if (!this.stats?.avgSalesPerDay) return '0';
    return this.stats.avgSalesPerDay.toFixed(1);
  }

  get totalImpressions(): string {
    if (!this.stats?.totalImpressions) return '0';
    return this.stats.totalImpressions.toLocaleString();
  }

  get avgPrice(): string {
    if (!this.stats?.avgPrice) return '0';
    return '$' + this.stats.avgPrice.toFixed(2);
  }
}

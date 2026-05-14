import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeywordService } from '../../services/keyword';
import { UploadService } from '../../services/upload';
import { FileUpload } from '../../components/file-upload/file-upload';

@Component({
  selector: 'app-keywords',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUpload],
  templateUrl: './keywords.html',
  styleUrl: './keywords.scss',
})
export class Keywords implements OnInit {
  keywords: any[] = [];
  topKeywords: any[] = [];
  opportunities: any[] = [];
  uploads: any[] = [];
  selectedUploadId = '';
  uploading = false;
  uploadMessage = '';
  uploadError = '';
  activeTab = 'all';
  loading = false;

  filters = {
    minVolume: '',
    maxCompetitors: '',
    sortBy: 'searchVolume',
    order: 'desc',
  };

  constructor(
    private keywordService: KeywordService,
    private uploadService: UploadService
  ) {}

  ngOnInit(): void {
    this.loadUploads();
    this.loadData();
  }

  loadUploads(): void {
    this.uploadService.getUploads().subscribe({
      next: (data) => {
        this.uploads = data.filter((u) => u.type === 'keywords');
      },
    });
  }

  loadData(): void {
    this.loading = true;

    const params: any = {
      sortBy: this.filters.sortBy,
      order: this.filters.order,
    };
    if (this.filters.minVolume) params['minVolume'] = this.filters.minVolume;
    if (this.filters.maxCompetitors) params['maxCompetitors'] = this.filters.maxCompetitors;
    if (this.selectedUploadId) params['uploadId'] = this.selectedUploadId;

    this.keywordService.getKeywords(params).subscribe({
      next: (data) => { this.keywords = data; this.loading = false; },
      error: () => { this.loading = false; },
    });

    const topParams: any = { count: '20' };
    if (this.selectedUploadId) topParams['uploadId'] = this.selectedUploadId;
    this.keywordService.getTopKeywords(20).subscribe({
      next: (data) => (this.topKeywords = data),
    });

    this.keywordService.getOpportunities().subscribe({
      next: (data) => (this.opportunities = data),
    });
  }

  onUploadSelected(): void {
    this.loadData();
  }

  onFileUploaded(file: File): void {
    this.uploading = true;
    this.uploadMessage = '';
    this.uploadError = '';

    this.keywordService.uploadExcel(file).subscribe({
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
    if (confirm(`¿Eliminar "${upload.fileName}" y sus ${upload.recordCount} keywords?`)) {
      this.uploadService.deleteUpload(upload._id).subscribe({
        next: () => {
          if (this.selectedUploadId === upload._id) this.selectedUploadId = '';
          this.loadUploads();
          this.loadData();
        },
      });
    }
  }

  applyFilters(): void {
    this.loadData();
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  deleteAll(): void {
    if (confirm('¿Eliminar todas las keywords?')) {
      this.keywordService.deleteAll().subscribe({
        next: () => {
          this.keywords = [];
          this.topKeywords = [];
          this.opportunities = [];
          this.uploads = [];
          this.uploadMessage = '';
        },
      });
    }
  }
}
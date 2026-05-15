import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { KeywordService } from '../../services/keyword';
import { UploadService } from '../../services/upload';

@Component({
  selector: 'app-keywords',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './keywords.html',
  styleUrl: './keywords.scss',
})
export class Keywords implements OnInit {
  keywords: any[] = [];
  topKeywords: any[] = [];
  opportunities: any[] = [];
  uploads: any[] = [];
  selectedUploadId = '';
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
    private uploadService: UploadService,
  ) {}

  ngOnInit(): void {
    this.loadUploads();
    this.loadData();
  }

  loadUploads(): void {
    this.uploadService.getUploads().subscribe({
      next: (data) => (this.uploads = data.filter(u => u.type === 'keywords')),
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

    this.keywordService.getTopKeywords(20).subscribe({
      next: (data) => (this.topKeywords = data),
    });

    this.keywordService.getOpportunities().subscribe({
      next: (data) => (this.opportunities = data),
    });
  }

  onUploadSelected(): void { this.loadData(); }

  applyFilters(): void { this.loadData(); }

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

  deleteAll(): void {
    if (confirm('¿Eliminar todas las keywords?')) {
      this.uploadService.deleteAllKeywords().subscribe({
        next: () => {
          this.keywords = [];
          this.topKeywords = [];
          this.opportunities = [];
          this.uploads = [];
        },
      });
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeywordService } from '../../services/keyword';
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

  constructor(private keywordService: KeywordService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    const params: any = {
      sortBy: this.filters.sortBy,
      order: this.filters.order,
    };
    if (this.filters.minVolume) params['minVolume'] = this.filters.minVolume;
    if (this.filters.maxCompetitors) params['maxCompetitors'] = this.filters.maxCompetitors;

    this.keywordService.getKeywords(params).subscribe({
      next: (data) => {
        this.keywords = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando keywords:', err);
        this.loading = false;
      },
    });

    this.keywordService.getTopKeywords(20).subscribe({
      next: (data) => (this.topKeywords = data),
      error: (err) => console.error('Error top keywords:', err),
    });

    this.keywordService.getOpportunities().subscribe({
      next: (data) => (this.opportunities = data),
      error: (err) => console.error('Error opportunities:', err),
    });
  }

  onFileUploaded(file: File): void {
    this.uploading = true;
    this.uploadMessage = '';
    this.uploadError = '';

    this.keywordService.uploadExcel(file).subscribe({
      next: (res: any) => {
        this.uploadMessage = res.message;
        this.uploading = false;
        // Esperar un momento y recargar
        setTimeout(() => this.loadData(), 500);
      },
      error: (err) => {
        this.uploadError = err.error?.message || 'Error al subir el archivo';
        this.uploading = false;
      },
    });
  }

  applyFilters(): void {
    this.loadData();
  }

  deleteAll(): void {
    if (confirm('¿Eliminar todas las keywords?')) {
      this.keywordService.deleteAll().subscribe({
        next: () => {
          this.keywords = [];
          this.topKeywords = [];
          this.opportunities = [];
          this.uploadMessage = '';
        },
      });
    }
  }
}
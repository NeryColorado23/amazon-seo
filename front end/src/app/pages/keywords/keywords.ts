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
    this.keywordService.getKeywords({
      sortBy: this.filters.sortBy,
      order: this.filters.order,
      minVolume: this.filters.minVolume || undefined,
      maxCompetitors: this.filters.maxCompetitors || undefined,
    }).subscribe({
      next: (data) => (this.keywords = data),
    });

    this.keywordService.getTopKeywords(20).subscribe({
      next: (data) => (this.topKeywords = data),
    });

    this.keywordService.getOpportunities().subscribe({
      next: (data) => (this.opportunities = data),
    });
  }

  onFileUploaded(file: File): void {
    this.uploading = true;
    this.uploadMessage = '';
    this.uploadError = '';

    this.keywordService.uploadExcel(file).subscribe({
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
    this.loadData();
  }

  deleteAll(): void {
    if (confirm('¿Eliminar todas las keywords?')) {
      this.keywordService.deleteAll().subscribe({
        next: () => {
          this.keywords = [];
          this.topKeywords = [];
          this.opportunities = [];
        },
      });
    }
  }
}

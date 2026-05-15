import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EtlService } from '../../services/etl';
import { FileUpload } from '../../components/file-upload/file-upload';

@Component({
  selector: 'app-warehouse',
  standalone: true,
  imports: [CommonModule, RouterModule, FileUpload],
  templateUrl: './warehouse.html',
  styleUrl: './warehouse.scss',
})
export class Warehouse implements OnInit {
  logs: any[] = [];
  uploadingSales = false;
  uploadingKeywords = false;
  salesResult: any = null;
  keywordsResult: any = null;
  salesError = '';
  keywordsError = '';
  loadingLogs = false;

  constructor(private etlService: EtlService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loadingLogs = true;
    this.etlService.getLogs().subscribe({
      next: (data) => {
        this.logs = data;
        this.loadingLogs = false;
      },
      error: () => { this.loadingLogs = false; },
    });
  }

  onSalesFile(file: File): void {
    this.uploadingSales = true;
    this.salesResult = null;
    this.salesError = '';

    this.etlService.uploadSales(file).subscribe({
      next: (res) => {
        this.salesResult = res;
        this.uploadingSales = false;
        this.loadLogs();
      },
      error: (err) => {
        this.salesError = err.error?.message || 'Error al procesar el archivo';
        this.uploadingSales = false;
      },
    });
  }

  onKeywordsFile(file: File): void {
    this.uploadingKeywords = true;
    this.keywordsResult = null;
    this.keywordsError = '';

    this.etlService.uploadKeywords(file).subscribe({
      next: (res) => {
        this.keywordsResult = res;
        this.uploadingKeywords = false;
        this.loadLogs();
      },
      error: (err) => {
        this.keywordsError = err.error?.message || 'Error al procesar el archivo';
        this.uploadingKeywords = false;
      },
    });
  }

  getStatusClass(status: string): string {
    if (status === 'completed') return 'status-ok';
    if (status === 'error') return 'status-error';
    return 'status-pending';
  }

  getStatusIcon(status: string): string {
    if (status === 'completed') return '✅';
    if (status === 'error') return '❌';
    return '⏳';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  duration(start: string, end: string): string {
    if (!start || !end) return '-';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return `${(ms / 1000).toFixed(1)}s`;
  }
}
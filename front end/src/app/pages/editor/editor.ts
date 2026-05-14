import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeywordService } from '../../services/keyword';
import { UploadService } from '../../services/upload';
import { DraftService } from '../../services/draft';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor implements OnInit {
  allKeywords: any[] = [];
  filteredKeywords: any[] = [];
  selectedKeywords: Set<string> = new Set();
  keywordCategories: string[] = [];
  keywordUploads: any[] = [];

  kwFilters = {
    category: '',
    uploadId: '',
    minVolume: '',
    maxCompetitors: '',
    sortBy: 'searchVolume',
    order: 'desc',
  };

  title = '';
  bullet1 = '';
  bullet2 = '';
  bullet3 = '';
  bullet4 = '';
  bullet5 = '';
  description = '';
  searchTerms = '';

  limits = {
    title: 200,
    bullet: 100,
    description: 2000,
    searchTerms: 250,
  };

  activeTab: 'editor' | 'preview' | 'history' = 'editor';
  drafts: any[] = [];
  saving = false;
  savedMessage = '';
  currentDraftId = '';
  loadingKeywords = false;
  draftName = '';

  // Keywords encontradas en los textos
  usedKeywordsInText: Set<string> = new Set();

  constructor(
    private keywordService: KeywordService,
    private uploadService: UploadService,
    private draftService: DraftService,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadUploads();
    this.loadDrafts();
    this.loadKeywords();
  }

  loadCategories(): void {
    this.keywordService.getKeywordCategories().subscribe({
      next: (cats) => (this.keywordCategories = cats),
      error: () => {},
    });
  }

  loadUploads(): void {
    this.uploadService.getUploads().subscribe({
      next: (data) => (this.keywordUploads = data.filter((u) => u.type === 'keywords')),
    });
  }

  loadKeywords(): void {
    this.loadingKeywords = true;
    const params: any = {
      sortBy: this.kwFilters.sortBy,
      order: this.kwFilters.order,
      limit: '200',
    };
    if (this.kwFilters.category) params['category'] = this.kwFilters.category;
    if (this.kwFilters.uploadId) params['uploadId'] = this.kwFilters.uploadId;
    if (this.kwFilters.minVolume) params['minVolume'] = this.kwFilters.minVolume;
    if (this.kwFilters.maxCompetitors) params['maxCompetitors'] = this.kwFilters.maxCompetitors;

    this.keywordService.getKeywords(params).subscribe({
      next: (data) => {
        this.allKeywords = data;
        this.filteredKeywords = data;
        this.loadingKeywords = false;
        this.detectUsedKeywords();
      },
      error: () => { this.loadingKeywords = false; },
    });
  }

  loadDrafts(): void {
    this.draftService.getDrafts().subscribe({
      next: (data) => (this.drafts = data),
    });
  }

  // ── Detección de keywords en los textos ──────────────────────────────────

  get allText(): string {
    return [this.title, this.bullet1, this.bullet2, this.bullet3,
            this.bullet4, this.bullet5, this.description, this.searchTerms]
      .join(' ').toLowerCase();
  }

  detectUsedKeywords(): void {
    const text = this.allText;
    this.usedKeywordsInText = new Set(
      this.filteredKeywords
        .filter(kw => text.includes(kw.keyword.toLowerCase()))
        .map(kw => kw.keyword.toLowerCase())
    );
  }

  isKeywordInText(kw: string): boolean {
    return this.usedKeywordsInText.has(kw.toLowerCase());
  }

  onTextChange(): void {
    this.detectUsedKeywords();
  }

  // Colores por volumen de búsqueda
  getVolumeColor(volume: number): string {
    if (volume >= 50000) return '#dc2626';   // rojo — muy alto
    if (volume >= 20000) return '#ea580c';   // naranja — alto
    if (volume >= 10000) return '#2563eb';   // azul — intermedio
    if (volume >= 5000)  return '#7c3aed';   // morado — medio-bajo
    return '#16a34a';                         // verde — bajo
  }

  getVolumeLabel(volume: number): string {
    if (volume >= 50000) return 'Muy alto';
    if (volume >= 20000) return 'Alto';
    if (volume >= 10000) return 'Medio';
    if (volume >= 5000)  return 'Medio-bajo';
    return 'Bajo';
  }

  // Renderizar texto con keywords resaltadas por color
  highlightText(text: string): string {
    if (!text || this.filteredKeywords.length === 0) return this.escapeHtml(text);

    // Ordenar por longitud descendente para que frases largas tengan prioridad
    const sorted = [...this.filteredKeywords].sort(
      (a, b) => b.keyword.length - a.keyword.length
    );

    let result = this.escapeHtml(text);

    sorted.forEach(kw => {
      const escaped = this.escapeHtml(kw.keyword);
      const color = this.getVolumeColor(kw.searchVolume);
      const regex = new RegExp(`(${escaped})`, 'gi');
      result = result.replace(
        regex,
        `<mark style="background:${color}20;color:${color};border-radius:3px;padding:1px 3px;font-weight:600;">$1</mark>`
      );
    });

    return result;
  }

  escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Toggle y campos ──────────────────────────────────────────────────────

  toggleKeyword(kw: string): void {
    if (this.selectedKeywords.has(kw)) {
      this.selectedKeywords.delete(kw);
    } else {
      this.selectedKeywords.add(kw);
    }
  }

  isSelected(kw: string): boolean {
    return this.selectedKeywords.has(kw);
  }

  addToField(kw: string, field: string): void {
    const currentVal = (this as any)[field] as string;
    const limit = field === 'title' ? this.limits.title
      : field === 'description' ? this.limits.description
      : field === 'searchTerms' ? this.limits.searchTerms
      : this.limits.bullet;

    const newVal = currentVal ? `${currentVal} ${kw}` : kw;
    if (newVal.length <= limit) {
      (this as any)[field] = newVal;
      this.selectedKeywords.add(kw);
      this.detectUsedKeywords();
    }
  }

  get selectedKeywordsArray(): string[] {
    return Array.from(this.selectedKeywords);
  }

  charCount(val: string): number { return val?.length || 0; }
  charLeft(val: string, limit: number): number { return limit - (val?.length || 0); }
  isOverLimit(val: string, limit: number): boolean { return (val?.length || 0) > limit; }

  // ── Guardar/cargar borradores ────────────────────────────────────────────

  saveDraft(): void {
    this.saving = true;
    this.savedMessage = '';

    const data = {
      name: this.draftName || `Listing ${new Date().toLocaleDateString('es-GT')}`,
      category: this.kwFilters.category,
      title: this.title,
      bullet1: this.bullet1,
      bullet2: this.bullet2,
      bullet3: this.bullet3,
      bullet4: this.bullet4,
      bullet5: this.bullet5,
      description: this.description,
      searchTerms: this.searchTerms,
      keywordsUsed: this.selectedKeywordsArray,
    };

    const obs = this.currentDraftId
      ? this.draftService.updateDraft(this.currentDraftId, data)
      : this.draftService.saveDraft(data);

    obs.subscribe({
      next: (saved) => {
        this.currentDraftId = saved._id;
        this.savedMessage = '✅ Guardado correctamente';
        this.saving = false;
        this.loadDrafts();
        setTimeout(() => (this.savedMessage = ''), 3000);
      },
      error: () => {
        this.savedMessage = '❌ Error al guardar';
        this.saving = false;
      },
    });
  }

  loadDraft(draft: any): void {
    this.currentDraftId = draft._id;
    this.draftName = draft.name;
    this.title = draft.title;
    this.bullet1 = draft.bullet1;
    this.bullet2 = draft.bullet2;
    this.bullet3 = draft.bullet3;
    this.bullet4 = draft.bullet4;
    this.bullet5 = draft.bullet5;
    this.description = draft.description;
    this.searchTerms = draft.searchTerms;
    this.selectedKeywords = new Set(draft.keywordsUsed || []);
    this.activeTab = 'editor';
    this.detectUsedKeywords();
  }

  newDraft(): void {
    this.currentDraftId = '';
    this.draftName = '';
    this.title = '';
    this.bullet1 = '';
    this.bullet2 = '';
    this.bullet3 = '';
    this.bullet4 = '';
    this.bullet5 = '';
    this.description = '';
    this.searchTerms = '';
    this.selectedKeywords = new Set();
    this.usedKeywordsInText = new Set();
    this.activeTab = 'editor';
  }

  deleteDraft(id: string): void {
    if (confirm('¿Eliminar este borrador?')) {
      this.draftService.deleteDraft(id).subscribe({
        next: () => {
          if (this.currentDraftId === id) this.newDraft();
          this.loadDrafts();
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

  applyFilters(): void {
    this.loadKeywords();
  }
}
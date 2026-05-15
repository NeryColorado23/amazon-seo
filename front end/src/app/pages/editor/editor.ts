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

  limits = { title: 200, bullet: 100, description: 2000, searchTerms: 250 };

  activeTab: 'editor' | 'preview' | 'history' = 'editor';
  drafts: any[] = [];
  saving = false;
  savedMessage = '';
  currentDraftId = '';
  loadingKeywords = false;
  draftName = '';

  // Imágenes
  images: string[] = []; // base64
  dragOverIndex: number | null = null;
  dragSourceIndex: number | null = null;

  // Reviews
  reviews: any[] = [];
  avgRating = 0;
  totalReviews = 0;
  generatingReviews = false;
  showRatingBreakdown = false;
  Math = Math;


  // Keywords en texto
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
    });
  }

  loadUploads(): void {
    this.uploadService.getUploads().subscribe({
      next: (data) => (this.keywordUploads = data.filter(u => u.type === 'keywords')),
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

  // ── Imágenes ─────────────────────────────────────────────────────────────

  onImageUpload(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (index === -1) {
        // Agregar nueva
        if (this.images.length < 7) {
          this.images.push(base64);
        }
      } else {
        // Reemplazar existente
        this.images[index] = base64;
      }
    };
    reader.readAsDataURL(file);
  }

  removeImage(index: number): void {
    this.images.splice(index, 1);
  }

  onDragStart(index: number): void {
    this.dragSourceIndex = index;
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    this.dragOverIndex = index;
  }

  onDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.dragSourceIndex === null || this.dragSourceIndex === index) return;

    const moved = this.images.splice(this.dragSourceIndex, 1)[0];
    this.images.splice(index, 0, moved);
    this.dragSourceIndex = null;
    this.dragOverIndex = null;
  }

  onDragEnd(): void {
    this.dragSourceIndex = null;
    this.dragOverIndex = null;
  }

  // ── Reviews ──────────────────────────────────────────────────────────────

  generateReviews(): void {
    this.generatingReviews = true;
    this.draftService.generateReviews({
      title: this.title,
      bullet1: this.bullet1,
      bullet2: this.bullet2,
      bullet3: this.bullet3,
      bullet4: this.bullet4,
      bullet5: this.bullet5,
      category: this.kwFilters.category,
    }).subscribe({
      next: (data: any) => {
        this.reviews = data.reviews || [];
        this.avgRating = data.avgRating || 0;
        this.totalReviews = data.totalReviews || 0;
        this.generatingReviews = false;
      },
      error: () => { this.generatingReviews = false; },
    });
  }

  getRatingCount(stars: number): number {
    return this.reviews.filter(r => r.rating === stars).length;
  }

  getRatingPct(stars: number): number {
    if (this.reviews.length === 0) return 0;
    return Math.round((this.getRatingCount(stars) / this.reviews.length) * 100);
  }

  getStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  getRatingColor(rating: number): string {
    if (rating >= 4) return '#ff9900';
    if (rating === 3) return '#ffc107';
    return '#dc3545';
  }

  // ── Keywords en texto ────────────────────────────────────────────────────

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

  getVolumeColor(volume: number): string {
    if (volume >= 50000) return '#dc2626';
    if (volume >= 20000) return '#ea580c';
    if (volume >= 10000) return '#2563eb';
    if (volume >= 5000)  return '#7c3aed';
    return '#16a34a';
  }

  getVolumeLabel(volume: number): string {
    if (volume >= 50000) return 'Muy alto';
    if (volume >= 20000) return 'Alto';
    if (volume >= 10000) return 'Medio';
    if (volume >= 5000)  return 'Medio-bajo';
    return 'Bajo';
  }

  highlightText(text: string): string {
    if (!text || this.filteredKeywords.length === 0) return this.escapeHtml(text);
    const sorted = [...this.filteredKeywords].sort((a, b) => b.keyword.length - a.keyword.length);
    let result = this.escapeHtml(text);
    sorted.forEach(kw => {
      const escaped = this.escapeHtml(kw.keyword);
      const color = this.getVolumeColor(kw.searchVolume);
      const regex = new RegExp(`(${escaped})`, 'gi');
      result = result.replace(regex,
        `<mark style="background:${color}20;color:${color};border-radius:3px;padding:1px 3px;font-weight:600;">$1</mark>`
      );
    });
    return result;
  }

  escapeHtml(text: string): string {
    if (!text) return '';
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

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
  isOverLimit(val: string, limit: number): boolean { return (val?.length || 0) > limit; }

  // ── Borradores ───────────────────────────────────────────────────────────

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
      images: this.images,
      reviews: this.reviews,
      avgRating: this.avgRating,
      totalReviews: this.totalReviews,
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
    // Cargar borrador completo con imágenes
    this.draftService.getDraft(draft._id).subscribe({
      next: (full: any) => {
        this.currentDraftId = full._id;
        this.draftName = full.name;
        this.title = full.title;
        this.bullet1 = full.bullet1;
        this.bullet2 = full.bullet2;
        this.bullet3 = full.bullet3;
        this.bullet4 = full.bullet4;
        this.bullet5 = full.bullet5;
        this.description = full.description;
        this.searchTerms = full.searchTerms;
        this.selectedKeywords = new Set(full.keywordsUsed || []);
        this.images = full.images || [];
        this.reviews = full.reviews || [];
        this.avgRating = full.avgRating || 0;
        this.totalReviews = full.totalReviews || 0;
        this.activeTab = 'editor';
        this.detectUsedKeywords();
      },
    });
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
    this.images = [];
    this.reviews = [];
    this.avgRating = 0;
    this.totalReviews = 0;
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
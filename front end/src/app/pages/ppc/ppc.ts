import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PpcService } from '../../services/ppc';

@Component({
  selector: 'app-ppc',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ppc.html',
  styleUrl: './ppc.scss',
})
export class PpcPage implements OnInit {
  ppcData: any[] = [];
  categories: string[] = [];
  stats: any = null;
  categoryStats: any[] = [];
  loading = false;

  filters = {
    category: '',
    sortBy: 'adSpend',
    order: 'desc',
  };

  constructor(private ppcService: PpcService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    const params: any = {
      sortBy: this.filters.sortBy,
      order: this.filters.order,
    };
    if (this.filters.category) params['category'] = this.filters.category;

    this.ppcService.getPPC(params).subscribe({
      next: (data) => {
        this.ppcData = data;
        this.categories = [...new Set(data.map((d: any) => d.category))];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });

    this.ppcService.getStats().subscribe({
      next: (data) => {
        this.stats = data.totals;
        this.categoryStats = data.byCategory;
      },
    });
  }

  applyFilters(): void { this.loadData(); }

  deleteAll(): void {
    if (confirm('¿Eliminar todos los datos PPC?')) {
      this.ppcService.deleteAll().subscribe({
        next: () => {
          this.ppcData = [];
          this.stats = null;
          this.categoryStats = [];
          this.categories = [];
        },
      });
    }
  }

  getAcosClass(acos: number): string {
    if (acos <= 25) return 'acos-good';
    if (acos <= 35) return 'acos-mid';
    return 'acos-bad';
  }

  getRoasClass(roas: number): string {
    if (roas >= 4) return 'roas-good';
    if (roas >= 2) return 'roas-mid';
    return 'roas-bad';
  }
}
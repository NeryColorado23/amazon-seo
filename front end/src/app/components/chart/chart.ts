import {
  Component, Input, OnInit, OnChanges,
  ElementRef, ViewChild, SimpleChanges, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Chart, ChartType, ChartData, ChartOptions,
  BarController, DoughnutController, LineController, PieController,
  CategoryScale, LinearScale, BarElement, ArcElement, LineElement,
  PointElement, Legend, Tooltip, Title
} from 'chart.js';

Chart.register(
  BarController, DoughnutController, LineController, PieController,
  CategoryScale, LinearScale, BarElement, ArcElement, LineElement,
  PointElement, Legend, Tooltip, Title
);

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="chart-wrap"><canvas #canvas></canvas></div>`,
  styles: [`.chart-wrap { position: relative; width: 100%; height: 100%; } canvas { display: block; }`]
})
export class ChartComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  @Input() type: ChartType = 'bar';
  @Input() data: ChartData = { labels: [], datasets: [] };
  @Input() options: ChartOptions = {};

  private chart: Chart | null = null;

  ngOnInit(): void { this.create(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.chart) return;
    if (changes['data']) {
      this.chart.data = this.data;
      this.chart.update('none');
    }
  }

  ngOnDestroy(): void { this.chart?.destroy(); }

  private create(): void {
    this.chart?.destroy();
    this.chart = new Chart(this.canvas.nativeElement, {
      type: this.type,
      data: this.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...this.options,
      },
    });
  }
}
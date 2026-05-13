import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
})
export class FileUpload {
  @Input() label = 'Subir archivo Excel';
  @Input() accept = '.xlsx,.xls,.csv';
  @Input() loading = false;
  @Output() fileSelected = new EventEmitter<File>();

  fileName = '';
  dragover = false;

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.emitFile(input.files[0]);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragover = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.emitFile(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragover = true;
  }

  onDragLeave(): void {
    this.dragover = false;
  }

  private emitFile(file: File): void {
    this.fileName = file.name;
    this.fileSelected.emit(file);
  }
}

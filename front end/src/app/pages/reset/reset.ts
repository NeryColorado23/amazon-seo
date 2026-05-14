import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-reset',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset.html',
  styleUrl: './reset.scss',
})
export class Reset {
  step = 1; // 1: email, 2: respuesta + nueva pass
  email = '';
  question = '';
  securityAnswer = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  error = '';
  successMessage = '';

  constructor(private authService: AuthService) {}

  getQuestion(): void {
    this.loading = true;
    this.error = '';

    this.authService.getQuestion(this.email).subscribe({
      next: (res) => {
        this.question = res.question;
        this.step = 2;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al buscar la cuenta';
        this.loading = false;
      },
    });
  }

  resetPassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    if (this.newPassword.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.resetPassword({
      email: this.email,
      securityAnswer: this.securityAnswer,
      newPassword: this.newPassword,
    }).subscribe({
      next: (res: any) => {
        this.successMessage = res.message;
        this.loading = false;
        this.step = 3;
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al resetear la contraseña';
        this.loading = false;
      },
    });
  }
}
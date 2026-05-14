import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  name = '';
  email = '';
  password = '';
  company = '';
  securityQuestion = '';
  securityAnswer = '';
  customQuestion = '';
  loading = false;
  error = '';

  questions = [
    '¿Cuál es el nombre de tu primera mascota?',
    '¿En qué ciudad naciste?',
    '¿Cuál es el nombre de tu escuela primaria?',
    '¿Cuál es tu película favorita?',
    '¿Cuál es el apellido de soltera de tu madre?',
    'Pregunta personalizada...',
  ];

  constructor(private authService: AuthService, private router: Router) {}

  get finalQuestion(): string {
    return this.securityQuestion === 'Pregunta personalizada...'
      ? this.customQuestion
      : this.securityQuestion;
  }

  register(): void {
    this.loading = true;
    this.error = '';

    this.authService.register({
      name: this.name,
      email: this.email,
      password: this.password,
      company: this.company,
      securityQuestion: this.finalQuestion,
      securityAnswer: this.securityAnswer,
    }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error = err.error?.message || 'Error al registrarse';
        this.loading = false;
      },
    });
  }
}
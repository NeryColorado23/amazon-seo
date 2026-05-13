import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  user: any = null;

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe((u) => (this.user = u));
  }

  logout(): void {
    this.authService.logout();
  }
}

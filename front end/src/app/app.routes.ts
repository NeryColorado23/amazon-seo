import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Keywords } from './pages/keywords/keywords';
import { Editor } from './pages/editor/editor';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'keywords', component: Keywords, canActivate: [authGuard] },
  { path: 'editor', component: Editor, canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' },
];
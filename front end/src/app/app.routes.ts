import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Keywords } from './pages/keywords/keywords';
import { Editor } from './pages/editor/editor';
import { Reset } from './pages/reset/reset';
import { Warehouse } from './pages/warehouse/warehouse';
import { Inventory } from './pages/inventory/inventory';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'reset', component: Reset },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'keywords', component: Keywords, canActivate: [authGuard] },
  { path: 'editor', component: Editor, canActivate: [authGuard] },
  { path: 'warehouse', component: Warehouse, canActivate: [authGuard] },
  { path: 'inventory', component: Inventory, canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' },
];
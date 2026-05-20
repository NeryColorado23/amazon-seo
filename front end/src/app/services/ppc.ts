import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class PpcService {
  private apiUrl = `${environment.apiUrl}/ppc`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  syncFromSheets(): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync-sheets`, {}, { headers: this.getHeaders() });
  }

  getPPC(filters?: any): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders(), params: filters });
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`, { headers: this.getHeaders() });
  }

  deleteAll(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/all`, { headers: this.getHeaders() });
  }
}
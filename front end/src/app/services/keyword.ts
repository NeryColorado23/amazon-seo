import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class KeywordService {
  private apiUrl = `${environment.apiUrl}/keywords`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  uploadExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload`, formData, { headers: this.getHeaders() });
  }

  getKeywords(filters?: any): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders(), params: filters });
  }

  getTopKeywords(count: number = 20): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/top`, { headers: this.getHeaders(), params: { count: count.toString() } });
  }

  getOpportunities(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/opportunities`, { headers: this.getHeaders() });
  }

  deleteAll(): Observable<any> {
    return this.http.delete(this.apiUrl, { headers: this.getHeaders() });
  }
}

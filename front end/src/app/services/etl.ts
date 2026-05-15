import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class EtlService {
  private apiUrl = `${environment.apiUrl}/etl`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  uploadSales(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload-sales`, formData, { headers: this.getHeaders() });
  }

  uploadKeywords(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload-keywords`, formData, { headers: this.getHeaders() });
  }

  uploadCosts(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload-costs`, formData, { headers: this.getHeaders() });
  }

  getLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/logs`, { headers: this.getHeaders() });
  }
}
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  generateListing(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate-listing`, data, {
      headers: this.getHeaders(),
    });
  }

  scoreListing(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/score-listing`, data, {
      headers: this.getHeaders(),
    });
  }
}
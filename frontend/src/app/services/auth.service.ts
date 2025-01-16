import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:5000/api/users';
  private roleKey = 'userRole';
  private emailKey = 'userEmail';
  private isBrowser: boolean;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/login`,
      { email, password },
      { withCredentials: true } // Required to send cookies
    ).pipe(
      tap((response: any) => {
        // Store user role and email in local storage
        if (this.isBrowser) {
          localStorage.setItem(this.roleKey, response.role);
          localStorage.setItem(this.emailKey, response.email);
        } else {
          console.warn('localStorage is not available.');
        }
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => {
        if (this.isBrowser) {
          localStorage.removeItem(this.roleKey);
          localStorage.removeItem(this.emailKey);
        } else{
          console.warn('LocalStorage is not available');
        }
      })
    );
  }

  // Method to get user role from local storage
  getUserRole(): string {
    if (this.isBrowser) {
      return localStorage.getItem(this.roleKey) || '';
    }
    console.warn('localStorage is not available.');
    return '';
  }

  // Method to get user email from local storage
  getUserEmail(): string {
    if (this.isBrowser) {
      return localStorage.getItem(this.emailKey) || '';
    }
    console.warn('localStorage is not available.');
    return '';
  }
}
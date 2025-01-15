import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private baseUrl = 'http://localhost:5000/api/tasks';
  private userUrl = 'http://localhost:5000/api/users';

  constructor(private http: HttpClient) { }

  getTasks(filters: any) {
    return this.http.get(this.baseUrl, { params: filters, withCredentials: true });
  }

  createTask(task: any) {
    return this.http.post(`${this.baseUrl}`, task, { withCredentials: true });
  }

  updateTask(title: string, task: any) {
    return this.http.put(`${this.baseUrl}/${title}`, task, { withCredentials: true });
  }

  updateTaskStatus(title: string, status: string, role: String, email:String) {
    console.log("Email in updateTaskStatus function in task service: ", email);
    return this.http.patch(`${this.baseUrl}/${title}`, { status, role, email }, { withCredentials: true });
  }

  deleteTask(title: string) {
    return this.http.delete(`${this.baseUrl}/${title}`, { withCredentials: true });
  }

  searchUsers(query: string, searchType: string) {
    return this.http.get(`${this.userUrl}/search`, { params: { query, searchType }, withCredentials: true });
  }
}
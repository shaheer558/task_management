import { Component } from '@angular/core';
import { TaskService } from '../services/task.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-task-user',
  imports: [],
  templateUrl: './task-user.component.html',
  styleUrl: './task-user.component.css'
})
export class TaskUserComponent {
    constructor(private taskService: TaskService, private authService: AuthService, private router: Router) {}

    updateStatus(task: any, status: string) {
      this.taskService.updateTaskStatus(task.title, status, "user").subscribe({
        next: (updatedTask: any) => {
          task.status = updatedTask.status;
          task.actualHours = updatedTask.actualHours;
          task.startTime = updatedTask.startTime;
          this.loadTasks(); // Reload tasks to refresh the list
        },
        error: (err) => {
          this.errorMessage = err.error.message || 'Error occurred while updating task status';
          console.error('Error occurred while updating task status:', err);
          this.triggerMessageTimeout();
        }
      });
    }
}

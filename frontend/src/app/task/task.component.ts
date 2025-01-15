import { Component, OnInit, OnDestroy } from '@angular/core';
import { TaskService } from '../services/task.service';
import { AuthService } from '../services/auth.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['../output.css', './task.component.css'],
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule]
})
export class TaskComponent implements OnInit, OnDestroy {
  tasks: any[] = [];
  filters = {
    assignedTo: '',
    status: '',
    title: '', // Add title filter
    role: '',
    sortBy: '' // Add sortBy filter
  };
  userRole: string = ''; // Will be 'admin' or 'user'
  errorMessage: string | null = null;
  successMessage: string | null = null;
  messageVisible: boolean = true; // Track message visibility
  showConfirmationModal: boolean = false;
  taskToDelete: any = null;
  private refreshInterval: any;

  constructor(private taskService: TaskService, private authService: AuthService, private router: Router) { }

  ngOnInit() {
    this.userRole = this.authService.getUserRole(); // Assumes a method exists to get user role
    this.loadTasks();
    // Set interval to refresh tasks every 1 hour
    this.refreshInterval = setInterval(() => {
      this.loadTasks();
    }, 60 * 60 * 1000); // 1 hour in milliseconds
  }

  ngOnDestroy() {
    // Clear the interval when the component is destroyed
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadTasks() {
    const filters = { ...this.filters };
    //store role in filters to send role data
    filters.role = this.userRole;
    // For users, filter tasks assigned to them
    if (this.userRole === 'user') {
      filters.assignedTo = this.authService.getUserEmail(); // Assumes a method exists to get user email
    }

    this.taskService.getTasks(filters).subscribe({
      next: (data: any) => {
        this.tasks = data;
        this.applySorting(); // Apply sorting after loading tasks
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Error occurred while loading tasks';
        console.error('Error occurred while loading tasks:', err);
        this.triggerMessageTimeout();
      }
    });
  }

  onSortChange(event: any) {
    // this.filters.sortBy = event.target.value;
    // console.log("Sorting option changed to: ", this.filters.sortBy);
    // this.loadTasks();
    this.filters.sortBy = event.target.value;
    this.applySorting();

  }

  applySorting() {
    if (this.filters.sortBy === 'latest') {
      this.tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (this.filters.sortBy === 'longest') {
      this.tasks.sort((a, b) => b.estimatedHours - a.estimatedHours);
    } else if (this.filters.sortBy === 'shortest') {
      this.tasks.sort((a, b) => a.estimatedHours - b.estimatedHours);
    } else if (this.filters.sortBy === 'priority') {
      // Sorting by priority: High > Medium > Low
      const priorityOrder: { [key: string]: number } = { High: 1, Medium: 2, Low: 3 }; // Define priority ranking

      this.tasks.sort((a, b) => {
        const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 4; // Default if missing
        const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 4; // Default if missing
        return priorityA - priorityB;
      });
    }

  }

  updateStatus(task: any, status: string) {
    const email = this.authService.getUserEmail();
    console.log("Email in updateStatus in task component.ts: ", email);
    this.taskService.updateTaskStatus(task.title, status, this.userRole, task.assignedTo).subscribe({
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

  confirmDeleteTask(task: any) {
    this.taskToDelete = task;
    this.showConfirmationModal = true;
  }

  confirmDevComplete(task: any) {
    if (confirm('Are you sure you want to mark this task as Dev Completed?')) {
      this.updateStatus(task, 'Dev Completed');
    }
  }

  deleteTask(task: any) {
    this.taskService.deleteTask(task.title).subscribe({
      next: () => {
        this.tasks = this.tasks.filter(t => t.title !== task.title);
        this.errorMessage = ''; // Clear any previous error messages
        this.showConfirmationModal = false;
        this.taskToDelete = null;
        this.successMessage = 'Task deleted successfully';
        console.log('Task deleted successfully');
        this.triggerMessageTimeout();
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Error occurred while deleting task';
        console.error('Error occurred while deleting task:', err);
        this.triggerMessageTimeout();
        this.showConfirmationModal = false;
        this.taskToDelete = null;
      }
    });
  }

  cancelDelete() {
    this.showConfirmationModal = false;
    this.taskToDelete = null;
  }

  // Navigate to Add Task form
  navigateToAddTask() {
    this.router.navigate(['/add-task']);
  }

  // Navigate to Add User form
  navigateToAddUser() {
    this.router.navigate(['/add-user']);
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Error occurred while logging out';
        console.error('Error occurred while logging out:', err);
        this.triggerMessageTimeout();
      }
    });
  }

  // Function to handle message timeout and fade-out effect
  triggerMessageTimeout() {
    this.messageVisible = true;

    setTimeout(() => {
      this.messageVisible = false;  // Start fade-out after 3 seconds

      setTimeout(() => {
        // Clear the message after fade-out completes
        this.errorMessage = null;
        this.successMessage = null;
      }, 1000); // Allow time for the fade-out transition to complete
    }, 3000);  // Delay before fade-out starts (3 seconds)
  }
}
import { ElementRef, Component, OnInit, OnDestroy } from '@angular/core';
import { TaskService } from '../services/task.service';
import { AuthService } from '../services/auth.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ViewChild } from '@angular/core';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['../output.css', './task.component.css'],
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, MatFormFieldModule, MatInputModule, MatTableModule, MatSortModule, MatPaginatorModule]
})
export class TaskComponent implements OnInit, OnDestroy {

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
  _liveAnnouncer = new LiveAnnouncer;

  displayedColumns: string[] = ['title', 'description', 'estimatedHours', 'actualHours', 'status'];
  tasks: any[] = [];
  dataSource = new MatTableDataSource(this.tasks);
  @ViewChild(MatPaginator)
  paginator: MatPaginator = new MatPaginator;
  @ViewChild(MatSort)
  sort: MatSort = new MatSort;
  @ViewChild('input') inputElement!: ElementRef;

  constructor(private taskService: TaskService, private authService: AuthService, private router: Router) { }

  ngOnInit() {
    this.userRole = this.authService.getUserRole(); // Assumes a method exists to get user role
    //add columns based on user role to avoid error while adapting mat table
    if (this.userRole === 'admin') {
      this.displayedColumns.push('assignedToDetails');
      this.displayedColumns.push('actions');
    }
    else if (this.userRole === 'user') {
      this.displayedColumns.pop(); //to display status at end
      this.displayedColumns.push('assignedByDetails');
      this.displayedColumns.push('status');
    }
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

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.setPlaceholder(this.inputElement.nativeElement, false);
  }

  // to disappear label of search input field when not focused
  setPlaceholder(input: HTMLInputElement, focus: boolean) {
    input.placeholder = focus ? 'Ex. Mia' : '';
  }

  announceSortChange(sortState: Sort) {
    // This example uses English messages. If your application supports
    // multiple language, you would internationalize these strings.
    // Furthermore, you can customize the message to add additional
    // details about the values being sorted.
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
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
        this.dataSource.data = this.tasks;
        this.applySorting(); // Apply sorting after loading tasks
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Error occurred while loading tasks';
        console.error('Error occurred while loading tasks:', err);
        this.triggerMessageTimeout();
      }
    });
  }

  // Material function
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  onSortChange(event: any) {
    // this.filters.sortBy = event.target.value;
    // console.log("Sorting option changed to: ", this.filters.sortBy);
    // this.loadTasks();
    this.filters.sortBy = event.target.value;
    this.applySorting();
    console.log("Apply sorting function called");

  }

  applySorting() {
    if (this.filters.sortBy === 'latest') {
      console.log("Sort method latest applied");
      this.tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (this.filters.sortBy === 'priority') {
      // Sorting by priority: High > Medium > Low
      const priorityOrder: { [key: string]: number } = { High: 1, Medium: 2, Low: 3 }; // Define priority ranking

      this.tasks.sort((a, b) => {
        const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 4; // Default if missing
        const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 4; // Default if missing
        return priorityA - priorityB;
      });
      console.log("Sort method Priority applied");
    }
    // Update the dataSource with the sorted tasks
    this.dataSource.data = [...this.tasks]; // Reassign to trigger Angular's change detection
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

  confirmApproved(task: any) {
    if (confirm('Are you sure you want to mark this task as Approved?')) {
      this.updateStatus(task, 'Approved');
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
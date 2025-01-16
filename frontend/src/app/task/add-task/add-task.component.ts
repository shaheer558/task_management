import { Component } from '@angular/core';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-add-task',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './add-task.component.html',
  styleUrls: ['../../output.css', './add-task.component.css']
})
export class AddTaskComponent {
  newTask: any = {
    title: '',
    description: '',
    estimatedHours: 0,
    assignedTo: '',
    assignedBy: '',
    priority: '',
  };
  searchQuery: string = '';
  searchType: string = 'name';
  successMessage: string | null = null;
  errorMessage: string | null = null;
  messageVisible: boolean = true; // Track message visibility
  userSuggestions: any[] = []; // To store user suggestions

  constructor(private taskService: TaskService, private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    // Initialization logic if needed
  }

  addTask(taskForm: any) {
    // Ensure assignedTo is set to the user's email before submitting
    if (this.searchQuery) {
      this.taskService.searchUsers(this.searchQuery, this.searchType).subscribe({
        next: (users: any) => {
          if (users.length > 0) {
            const selectedUser = users[0];
            this.newTask.assignedTo = selectedUser.email;
            this.newTask.assignedBy = this.authService.getUserEmail(); // Set assignedBy to the current admin's email
            console.log("Creating task for user with email: ", this.newTask.assignedTo);

            this.taskService.createTask(this.newTask).subscribe({
              next: (task) => {
                this.resetForm(); // Reset the form fields
                taskForm.resetForm(); // Reset the form's submitted state
                this.searchType = "name"; // Reset search type
                this.successMessage = 'Task added successfully!'; // Display success message
                console.log("Task added successfully:", task);
                this.triggerMessageTimeout(); // Trigger message timeout
              },
              error: (err) => {
                if (err.status === 400 && err.error === 'Duplicate Title not allowed') {
                  this.errorMessage = 'A task with this title already exists for the selected user.';
                } else {
                  this.errorMessage = err.error.error || 'Error occurred while adding task';
                }
                this.triggerMessageTimeout(); // Trigger message timeout
              }
            });
          } else {
            this.errorMessage = 'No user found with the provided search query.';
            this.triggerMessageTimeout(); // Trigger message timeout
          }
        },
        error: (err) => {
          this.errorMessage = err.error.error || 'Error occurred while searching for users';
          this.triggerMessageTimeout(); // Trigger message timeout
        }
      });
    } else {
      this.errorMessage = 'Please enter a search query to find a user.';
      this.triggerMessageTimeout(); // Trigger message timeout
    }
  }

  
  resetForm() {
    this.newTask = {
      title: '',
      description: '',
      estimatedHours: '',
      assignedTo: '',
      assignedBy: ''
    };
    this.searchQuery = '';
    this.userSuggestions = [];
  }

  searchUsers(query: string) {
    if (query) {
      this.taskService.searchUsers(query, this.searchType).subscribe({
        next: (users: any) => {
          this.userSuggestions = users.filter((user: any) => {
            if (this.searchType === 'name') {
              return user.name.toLowerCase().startsWith(query.toLowerCase());
            } else if (this.searchType === 'email') {
              return user.email.toLowerCase().startsWith(query.toLowerCase());
            }
            return false;
          });
        },
        error: (err) => {
          this.errorMessage = err.error.message || 'Error occurred while searching users';
          console.error('Error occurred while searching users:', err);
          this.triggerMessageTimeout();
        }
      });
    } else {
      this.userSuggestions = [];
    }
  }

  selectUser(user: any) {
    this.searchQuery = user.name; // Display the user's name in the input field
    this.newTask.assignedTo = user.email; // Set the assignedTo field to the user's email
    this.userSuggestions = [];
  }

  navigateBack() {
    this.router.navigate(['/tasks']);
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
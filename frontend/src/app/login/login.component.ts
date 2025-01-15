import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['../output.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  messageVisible: boolean = true; // Track message visibility

  constructor(private authService: AuthService, private router: Router, private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {}

  onSubmit() {
    console.log("In onSubmit() method of login.component.ts");
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email, password).subscribe({
        next: (response) => {
          console.log("Login successful, navigating to /tasks");
          this.router.navigate(['/tasks']);
        },
        error: (err) => {
          this.errorMessage = 'Invalid email or password';
          console.log("Error occurred while logging in. Error: ", err);
          this.triggerMessageTimeout();
        }
      });
    } else {
      console.log("Login form is invalid");
    }
  }

  // Function to handle message timeout and fade-out effect
  triggerMessageTimeout() {
    this.messageVisible = true;

    setTimeout(() => {
      this.messageVisible = false;  // Start fade-out after 3 seconds

      setTimeout(() => {
        // Clear the message after fade-out completes
        this.errorMessage = null;
      }, 1000); // Allow time for the fade-out transition to complete
    }, 3000);  // Delay before fade-out starts (3 seconds)
  }
}

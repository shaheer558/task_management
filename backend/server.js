const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const helmet = require('helmet'); // For security headers
const cookieParser = require('cookie-parser'); // For parsing cookies
const cron = require('node-cron'); // for job scheduler
const nodemailer = require('nodemailer'); // for sending emails
const Task = require('./models/taskModel');
const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:4200', credentials: true })); // Allow cookies
app.use(cookieParser());
app.use(bodyParser.json({ limit: '10mb' })); //max 10mb of data can be transfered
app.use(helmet()); // Adds basic security headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://apis.google.com'], // Add your sources
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'http://localhost:5000'], // Backend API
    },
  })
);

// connect to database
db.connectDB();


// Routes
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');

app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_APP_PASS
  }
});


// Function to update actual hours for all tasks
async function updateActualHours() {
  try {
    const tasks = await Task.find();
    for (const task of tasks) {
      if ((!(task.status === 'Completed' || task.status === 'Approved')) && (task.startTime)) {
        // Calculate actual hours
        const now = new Date();
        const totalDuration = Math.abs(now - task.startTime) / 36e5; // Calculate total hours
        const hoursWorked = totalDuration - task.pauseInterval; // Subtract pauseInterval from total hours
        task.actualHours = Math.round(hoursWorked * 100) / 100;

        // Check if actual hours exceed estimated hours and email has not been sent
        if (task.actualHours > task.estimatedHours && !task.emailSent) {
          // Send email notification
          const mailOptions = {
            from: `"Task Manager" ${process.env.EMAIL}`, // Use the assignedBy email as the sender
            to: email,
            subject: 'Task warning',
            html: `The actual hours for the task "${task.title}" have exceeded the estimated hours.<br><b>Note:</b> This is bot generated email.`
          };

          await transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Email sent:', info.response);
              // Update the task to indicate that the email has been sent
              task.emailSent = true;
            }
          });
          await task.save();
        }
      }
    }
    console.log('Actual hours updated for all tasks');
  } catch (error) {
    console.error('Error updating actual hours:', error);
  }
}

// Schedule the job to run every hour
cron.schedule('0 * * * *', updateActualHours);
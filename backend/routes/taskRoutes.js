const express = require('express');
const Task = require('../models/taskModel');
const User = require('../models/userModel');
const nodemailer = require('nodemailer');
const router = express.Router();

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_APP_PASS
  }
});


// Get all tasks
router.get('/', async (req, res) => {
  try {

    const { assignedTo, status, title, role, sortBy } = req.query;
    const filter = {};
    if (assignedTo) {
      filter.assignedTo = assignedTo; // Filter tasks by email
    }
    if (status) filter.status = status;
    if (title) filter.title = { $regex: new RegExp(`^${title}`, 'i') }; // Case-insensitive search by title

    let sortOption = {};
    console.log("Sort By option in route: ", sortBy);
    if (sortBy === 'latest') {
      sortOption = { createdAt: -1 }; // Sort by latest task added
      console.log("Sort option set");
    }

    const tasks = await Task.find(filter).sort(sortOption);
    // get all emails of user out of the fetched tasks
    let userEmails;
    if (role == 'admin') {
      //if user
      userEmails = tasks.map(task => task.assignedTo);
    }
    else {
      //if admin
      userEmails = tasks.map(task => task.assignedBy);
    }
    //find users containing the above email lists
    const users = await User.find({ email: { $in: userEmails } }).select('name email');

    let tasksWithUserDetails;
    if (role == 'admin') {
      tasksWithUserDetails = await Promise.all(tasks.map(async (task) => {
        const user = users.find(user => user.email === task.assignedTo);
        task = await calcActualHours(task);
        return {
          ...task.toObject(),
          assignedToDetails: user ? { name: user.name, email: user.email } : null
        };
      }));
    }
    else {
      tasksWithUserDetails = await Promise.all(tasks.map(async task => {
        const user = users.find(user => user.email === task.assignedBy);
        task = await calcActualHours(task);
        return {
          ...task.toObject(),
          assignedByDetails: user ? { name: user.name, email: user.email } : null
        };
      }));
    }

    res.json(tasksWithUserDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error While getting tasks' });
  }
});

// Search users by name or email
router.get('/search', async (req, res) => {
  const { query, searchType } = req.query;
  try {
    const filter = {};
    if (searchType === 'name') {
      filter.name = { $regex: query, $options: 'i' }; // Case-insensitive search by name
    } else if (searchType === 'email') {
      filter.email = { $regex: query, $options: 'i' }; // Case-insensitive search by email
    }

    const users = await User.find(filter).select('name email');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error While searching users' });
  }
});

// Create Task (Admin Only)
router.post('/', async (req, res) => {
  try {
    const { title, description, estimatedHours, assignedTo, assignedBy, priority } = req.body;
    // check if task with title already exists
    const task = await Task.findOne({ title: title, assignedTo: assignedTo });
    console.log(task);
    if (task) {
      console.log("returning the duplicate title error");
      return res.status(400).json({ error: 'Duplicate Title not allowed' });
    }

    const newTask = new Task({ title, description, estimatedHours, assignedTo, assignedBy, priority });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Error while creating task: ", error);
    return res.status(400).json({ error: "Server error while creating task" });
  }
});

// Update Task (Admin Only). Here the title is of previous task data and the new data is in req.body
router.put('/:title', async (req, res) => {
  const { title, description, estimatedHours, assignedTo } = req.body;
  const task = await Task.findOne({ title, assignedTo });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  task.title = title;
  task.description = description;
  task.estimatedHours = estimatedHours;
  task.assignedTo = assignedTo;
  await task.save();
  res.status(204).json(task);
});

// Delete Task (Admin Only)
router.delete('/:title', async (req, res) => {
  const { title } = req.params;
  try {
    const task = await Task.findOne({ title });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    await task.deleteOne();
    res.status(204).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error While deleting task' });
  }
});

async function sendMail(task, email, isApproval = false) {
  //use promise to wait for the function completeness
  return new Promise((resolve, reject) => {
    // Send email notification
    let mailOptions;
    if (!isApproval) {
      mailOptions = {
        from: `"Task Manager" ${process.env.EMAIL}`, // Use the assignedBy email as the sender
        to: email,
        subject: 'Task warning',
        html: `The actual hours for the task "${task.title}" have exceeded the estimated hours.<br><b>Note:</b> This is bot generated email.`
      };
    }
    else {
      mailOptions = {
        from: `"Task Manager" ${process.env.EMAIL}`, // Use the assignedBy email as the sender
        to: email,
        subject: 'Task Approved',
        html: `Congratulations, your task "${task.title}" have been approved by ${task.assignedBy}.<br><b>Note:</b> This is bot generated email.`
      };
    }
    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        task.emailSent = false;
        await task.save();
        reject(error); // Reject the promise on error
      } else {
        console.log('Email sent:', info.response);
        // Update the task to indicate that the email has been sent
        task.emailSent = true;
        await task.save();
        console.log("Email successfully send and email send set to true. task.emailSent: ", task.emailSent);
        resolve(task); // Resolve the promise with the updated task
      }
    });
  });
}

async function calcActualHours(task) {
  // Calculate actual hours
  if ((!(task.status === 'Completed' || task.status === 'Approved')) && (task.startTime)) {
    const now = new Date();
    const totalDuration = Math.abs(now - task.startTime) / 36e5; // Calculate total hours
    const hoursWorked = totalDuration - task.pauseInterval; // Subtract pauseInterval from total hours
    task.actualHours = Math.round(hoursWorked * 100) / 100;

    // Check if actual hours exceed estimated hours and email has not been sent
    if (task.actualHours > task.estimatedHours && !task.emailSent) {
      console.log("Assigned To: ", task.assignedTo, " Assigned By: ", task.assignedBy);
      try{
      // Send email notification to user and admin (do not wait for mail to sent)
      sendMail(task, task.assignedTo);
      sendMail(task, task.assignedBy);
      task.emailSent = true;
      console.log("Email sent set to true");
      } catch(error){
        console.error('Error in sending emails:', error);
      }
    }
  }
  return task;
}

// Update Task Status (Assigned User)
router.patch('/:title', async (req, res) => {
  // get status from request
  try {
    const { status, role, email } = req.body;
    const title = req.params.title;
    const assignedTo = email;
    console.log(`Info at update task status: title: ${title}, assignedTo: ${assignedTo}, status: ${status}`);

    let task = await Task.findOne({ title, assignedTo });
    console.log("In update task status function, status task: ", task);
    // if no task is returned
    if (!task) {
      console.error("No task returned in update task status function");
      return res.status(400).json({ message: 'Task not found' });
    }

    if (role === 'user') {
      if (task.status === 'Approved') {
        return res.status(400).json({ message: 'User cannot change status from Approved' });
      }
      if (status === 'Approved') {
        return res.status(400).json({ message: 'User cannot set status to Approved' });
      }
    } else if (role === 'admin') {
      if (status !== 'Approved') {
        return res.status(400).json({ message: 'Admin can only set status to Approved' });
      }
    }

    if (status === 'In Progress') {
      if (task.status === 'Pending' && task.pauseTime) {
        const now = new Date();
        const pausedDuration = Math.abs(now - task.pauseTime) / 36e5; // Calculate paused hours
        task.pauseInterval += pausedDuration; // Increment pauseInterval
        task.pauseTime = null; // Clear pauseTime
      } else if (!task.startTime) {
        task.startTime = new Date(); // Set startTime when task moves to 'In Progress'
      }
    } else if (status === 'Completed' && task.startTime) {
      //calculate actual hours
      task = await calcActualHours(task) // Round to 2 decimals
    } else if (status === 'Pending' && task.startTime && !task.pauseTime) {
      task.pauseTime = new Date(); // Set pauseTime when task moves to 'Pending'
    }
    else if (status === 'Approved' && role === 'user') {
      //user cannot change status to Approved
      return res.status(400).json({ message: 'Invalid Input' });
    }
    else if (status === 'Approved' && task.status !== 'Completed') {
      //if status can only be changed from completed to Approved
      return res.status(400).json({ message: 'Status can only be changed to Approved if the current status is Completed' });
    }
    else if (status === 'Approved') {
      // if all conditions are correct to change status to Approved
      await sendMail(task, task.assignedTo, true); //send mail to user
    }

    task.status = status;
    await task.save();
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error While updating task status' });
  }
});

module.exports = router;
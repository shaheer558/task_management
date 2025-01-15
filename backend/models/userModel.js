mongoos = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoos.Schema({
    name : {type : String, required : true},
    email : {type : String, required: true, unique: true},
    role: {type : String, enum: ['admin', 'user'] ,required: true},
    password: {type : String, required: true},
});

// to insert initial data
const User = mongoose.model('User', userSchema);
async function insertInitialData() {
    try {
        const initialUsers = [
            { name: 'admin', email: 'admin@example.com', role: 'admin', password: 'admin123456', },
            { name: 'shaheer', email: 'msjanjua005@gmail.com', role: 'user', password: 'user123456', },]; // Hash the passwords before inserting
        for (let user of initialUsers) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }
        await User.insertMany(initialUsers);
        console.log('Initial data inserted successfully with hashed passwords!');
    } catch (error) {
        console.error('Error inserting initial data:', error);
    }
}

// insertInitialData();

module.exports = mongoose.model('User', userSchema);
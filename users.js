const { Schema, model } = require('mongoose');

const usersSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
  type: String,
  required: true,
  unique: true
},
 
 
  password: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profile: {
    firstName: String,
    lastName: String,
    address: String // אופציונלי
  }
});

const usersModel = model('users', usersSchema);

module.exports = usersModel;

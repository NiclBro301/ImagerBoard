// После того как ты забанил пользователя, выполни:
const User = require('./src/models/User');
const Ban = require('./src/models/Ban');

// Найди забаненного пользователя
const bannedUser = await User.findOne({ email: 'banme@gmail.com' });
console.log('Забаненный пользователь:', bannedUser);
console.log('bannedUntil:', bannedUser.bannedUntil);
console.log('isActive:', bannedUser.isActive);
console.log('isBanned():', bannedUser.isBanned());

// Проверь бан в коллекции банов
const ban = await Ban.findOne({ userId: bannedUser._id });
console.log('Бан:', ban);
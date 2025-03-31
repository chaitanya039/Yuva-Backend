import bcrypt from 'bcryptjs';

const hashPassword = async (plainText) => {
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(plainText, salt);
  console.log("Hashed password:", hashed);
};

hashPassword("adesh");
cls
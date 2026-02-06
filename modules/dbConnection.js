
//database url
import dotenv from "dotenv";
dotenv.config();

const dbUrl = `${process.env.MONGO_URI}${process.env.DB_NAME}`;

export default dbUrl;
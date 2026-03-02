import mongoose from "mongoose";
//database url
import dotenv from "dotenv";
dotenv.config();

const dbUrl = `mongodb+srv://${process.env.DBUSER}:${process.env.DBPWD}@${process.env.DBHOST}/${process.env.DBNAME}`;

export async function connect() {
    try {
        await mongoose.connect(dbUrl, { 
            maxPoolSize: 20,                    // Max connections for production
            minPoolSize: 5,                     // Keep warm connections
            serverSelectionTimeoutMS: 5000,     // Timeout for server selection
            socketTimeoutMS: 45000,             // Socket inactivity timeout
        });
        console.log('✅ Database connected successfully');
        
        // Monitor connection events
        mongoose.connection.on('disconnected', () => {
            console.error('❌ MongoDB disconnected');
        });
        
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err.message);
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1); // Exit if can't connect on startup
    }
}
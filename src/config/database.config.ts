import mongoose from 'mongoose';
import config from './env.config';
import logger from '../utils/logger';

class Database {
  private static instance: Database;

  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private setupEventListeners(): void {
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    const shutdown = async () => {
      await this.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  public async connect(): Promise<void> {
    if (mongoose.connection.readyState >= 1) return;
    try {
      const uri =
        config.NODE_ENV === 'test'
          ? config.MONGODB_URI_TEST || config.MONGODB_URI
          : config.MONGODB_URI;

      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });

      logger.info(`MongoDB connected successfully to ${config.NODE_ENV} database`);
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
    }
  }

  public getConnection(): typeof mongoose {
    return mongoose;
  }
}

export default Database.getInstance();

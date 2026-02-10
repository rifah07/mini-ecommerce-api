import mongoose from 'mongoose';
import config from './env.config';
import logger from '../utils/logger';

class Database {
  private static instance: Database;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    try {
      const uri =
        config.NODE_ENV === 'test'
          ? config.MONGODB_URI_TEST || config.MONGODB_URI
          : config.MONGODB_URI;

      await mongoose.connect(uri);

      logger.info(`MongoDB connected successfully to ${config.NODE_ENV} database`);

      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });
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

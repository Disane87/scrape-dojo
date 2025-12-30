export default async () => {
  // Global setup before all tests
  console.log('🚀 Starting E2E test environment');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_DATABASE = ':memory:';
  
  // Add any other global setup here
};

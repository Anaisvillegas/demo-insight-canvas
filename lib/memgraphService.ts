import neo4j from 'neo4j-driver';

const MEMGRAPH_URI = process.env.MEMGRAPH_URI;
const MEMGRAPH_USER = process.env.MEMGRAPH_USER;
const MEMGRAPH_PASSWORD = process.env.MEMGRAPH_PASSWORD;
const ENABLE_MEMGRAPH = process.env.NEXT_PUBLIC_ENABLE_MEMGRAPH === 'true';

console.log('🔍 Memgraph Configuration:');
console.log('- ENABLE_MEMGRAPH:', ENABLE_MEMGRAPH);
console.log('- MEMGRAPH_URI:', MEMGRAPH_URI ? 'Configured' : 'Not configured');

let driver: any = null;
let isMemgraphAvailable = false;

if (ENABLE_MEMGRAPH && MEMGRAPH_URI && MEMGRAPH_USER && MEMGRAPH_PASSWORD) {
  try {
    driver = neo4j.driver(
      MEMGRAPH_URI,
      neo4j.auth.basic(MEMGRAPH_USER, MEMGRAPH_PASSWORD)
    );
    isMemgraphAvailable = true;
    console.log('✅ Memgraph driver initialized successfully');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Memgraph driver:', error);
    isMemgraphAvailable = false;
  }
} else {
  console.log('ℹ️ Memgraph is disabled or not configured');
  isMemgraphAvailable = false;
}

export const executeCypherQuery = async (query: string, params: Record<string, any> = {}) => {
  if (!isMemgraphAvailable || !driver) {
    console.warn('⚠️ Memgraph is not available. Returning empty result.');
    return [];
  }

  const session = driver.session();
  try {
    console.log(`Executing Cypher Query: ${query}`);
    console.log(`With Parameters: ${JSON.stringify(params)}`);
    const result = await session.run(query, params);
    const records = result.records.map((record: any) => {
      const recordObj = record.toObject();
      // Process each field in the object to handle specific types like BigInt or Neo4j integers
      for (const key in recordObj) {
        if (Object.prototype.hasOwnProperty.call(recordObj, key)) {
          let value = recordObj[key];
          if (typeof value === 'bigint') {
            recordObj[key] = value.toString();
          } else if (neo4j.isInt(value)) { // Check if it's a Neo4j Integer
            recordObj[key] = value.toNumber(); // Convert Neo4j Integer to standard number
          }
          // Potentially add more type handling here if needed
        }
      }
      return recordObj;
    });
    console.log(`Query Result: ${JSON.stringify(records)}`);
    return records;
  } catch (error) {
    console.error('Error executing Cypher query:', error);
    console.error(`Failed Query: ${query}`);
    console.error(`Failed Parameters: ${JSON.stringify(params)}`);
    // It's often good to throw a custom error or re-throw to be handled upstream
    throw new Error(`Failed to execute Cypher query. ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await session.close();
  }
};

// Optional: A function to verify connection, though driver creation itself does some checks
export const verifyMemgraphConnection = async () => {
  try {
    await driver.verifyConnectivity();
    console.log('Successfully connected to Memgraph.');
    return true;
  } catch (error) {
    console.error('Failed to connect to Memgraph:', error);
    throw new Error(`Memgraph connection verification failed. ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Close the driver instance when the application shuts down
// This is important for graceful shutdown, especially in long-running applications
// For Next.js, this might be tricky due to its serverless nature in some deployments.
// A simple approach for now, might need refinement.
process.on('SIGINT', async () => {
  console.log('Closing Memgraph driver...');
  await driver.close();
  console.log('Memgraph driver closed.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing Memgraph driver...');
  await driver.close();
  console.log('Memgraph driver closed.');
  process.exit(0);
});

export default driver;

/**
 * MongoDB Index Creation Script
 * Run this script to create indexes for better query performance
 * 
 * Usage: node prisma/create-indexes.js
 * 
 * Make sure to set DATABASE_URL in your .env file
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function createIndexes() {
  const client = new MongoClient(process.env.DATABASE_URL);

  try {
    await client.connect();
    const db = client.db();
    
    console.log('Creating indexes...');

    // Create geospatial index for Donor collection
    const donorCollection = db.collection('Donor');
    await donorCollection.createIndex(
      { latitude: 1, longitude: 1 },
      { name: 'location_2dsphere', background: true }
    );
    await donorCollection.createIndex({ bloodGroup: 1, available: 1 });
    await donorCollection.createIndex({ email: 1 }, { unique: true });
    await donorCollection.createIndex({ available: 1 });
    console.log('✓ Donor indexes created');

    // Create indexes for RecipientRequest collection
    const requestCollection = db.collection('RecipientRequest');
    await requestCollection.createIndex(
      { latitude: 1, longitude: 1 },
      { name: 'location_2dsphere', background: true }
    );
    await requestCollection.createIndex({ status: 1, createdAt: -1 });
    await requestCollection.createIndex({ bloodGroup: 1, status: 1 });
    console.log('✓ RecipientRequest indexes created');

    // Create indexes for BloodBank collection
    const bankCollection = db.collection('BloodBank');
    await bankCollection.createIndex(
      { latitude: 1, longitude: 1 },
      { name: 'location_2dsphere', background: true }
    );
    await bankCollection.createIndex({ updatedAt: -1 });
    console.log('✓ BloodBank indexes created');

    console.log('\n✅ All indexes created successfully!');
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createIndexes();


#!/usr/bin/env node

/**
 * Simple script to delete all nested documents from Appwrite database
 * 
 * Run from the collaborative-editor directory:
 *   node scripts/delete-nested-documents.js
 * 
 * WARNING: This will permanently delete all nested documents
 */

const { Client, ID, Query } = require('appwrite');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local file
function loadEnvVars() {
  const envPath = path.join(__dirname, '../.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('\n❌ .env.local file not found!');
    console.error(`   Looking for: ${envPath}`);
    console.error('\nPlease run this script from the collaborative-editor directory.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

const envVars = loadEnvVars();

const DATABASE_ID = envVars.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const DOCUMENTS_TABLE_ID = envVars.NEXT_PUBLIC_APPWRITE_DOCUMENTS_TABLE_ID;
const PROJECT_ID = envVars.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const ENDPOINT = envVars.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const API_KEY = envVars.APPWRITE_API_KEY;

// Validate required environment variables
if (!DATABASE_ID || !DOCUMENTS_TABLE_ID || !PROJECT_ID || !API_KEY) {
  console.error('\n❌ Missing required environment variables in .env.local:');
  console.error('   NEXT_PUBLIC_APPWRITE_DATABASE_ID');
  console.error('   NEXT_PUBLIC_APPWRITE_DOCUMENTS_TABLE_ID');
  console.error('   NEXT_PUBLIC_APPWRITE_PROJECT_ID');
  console.error('   APPWRITE_API_KEY');
  console.error('\nPlease check your .env.local file and try again.');
  process.exit(1);
}

async function deleteNestedDocuments() {
  console.log('\n🗑️  Starting cleanup of nested documents...\n');

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  const databases = new Databases(client);

  try {
    // Step 1: Find all documents with a parentId (nested documents)
    console.log('📋 Step 1: Finding nested documents...');
    console.log(`   Database ID: ${DATABASE_ID}`);
    console.log(`   Table ID: ${DOCUMENTS_TABLE_ID}`);
    console.log(`   Query: documents where parentId is not null\n`);
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      DOCUMENTS_TABLE_ID,
      [
        // Query for documents where parentId exists (not null)
        Query.notNull('parentId'),
        // Limit batch size - you can increase if you have many documents
        Query.limit(100)
      ]
    );

    const nestedDocs = response.documents;
    console.log(`✓ Found ${nestedDocs.length} nested documents\n`);

    if (nestedDocs.length === 0) {
      console.log('✨ No nested documents found. Cleanup complete!\n');
      return;
    }

    // Display documents being deleted
    console.log('📋 Documents to be deleted:');
    nestedDocs.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.title || 'Untitled'} (${doc.$id})`);
    });
    console.log('');

    // Step 2: Confirm deletion
    console.log('⚠️  WARNING: This will permanently delete ALL nested documents listed above!');
    console.log('⚠️  Root-level documents (with no parentId) will NOT be deleted.\n');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('Do you want to proceed? (yes/no): ', (input) => {
        rl.close();
        resolve(input.toLowerCase());
      });
    });

    if (answer !== 'yes' && answer !== 'y') {
      console.log('\n❌ Cancelled. No documents were deleted.\n');
      process.exit(0);
    }

    // Step 3: Delete each nested document
    console.log('\n📋 Step 2: Deleting nested documents...');
    let deletedCount = 0;
    let failedCount = 0;

    for (const doc of nestedDocs) {
      try {
        await databases.deleteDocument(
          DATABASE_ID,
          DOCUMENTS_TABLE_ID,
          doc.$id
        );
        deletedCount++;
        process.stdout.write(`\r  Progress: ${deletedCount}/${nestedDocs.length} deleted`);
      } catch (error) {
        failedCount++;
        console.error(`\n  ✗ Failed to delete ${doc.$id}:`, error.message);
      }
    }

    console.log('\n'); // New line after progress

    // Step 4: Summary
    console.log('='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`✓ Successfully deleted: ${deletedCount} documents`);
    console.log(`✗ Failed to delete:     ${failedCount} documents`);
    console.log(`📋 Total found:         ${nestedDocs.length} documents`);
    console.log('='.repeat(60));

    if (failedCount > 0) {
      console.log('\n⚠️  Some documents failed to delete. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('\n✨ All nested documents deleted successfully!\n');
      console.log('💡 Next steps:');
      console.log('   1. Restart your application: npm run dev');
      console.log('   2. Verify basic CRUD operations work correctly');
      console.log('   3. Check that sidebar shows only root-level documents\n');
    }

  } catch (error) {
    console.error('\n❌ Error during cleanup:');
    console.error(error);
    
    if (error.message && error.message.includes('not found')) {
      console.error('\n💡 Hint: Make sure your APPWRITE_API_KEY has write permissions.');
    }
    
    process.exit(1);
  }
}

// Run the cleanup
deleteNestedDocuments();

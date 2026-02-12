// scripts/setup-firebase-users.js
// Run this ONCE to create user accounts for all team members
// Usage: node scripts/setup-firebase-users.js
//
// Prerequisites:
// 1. Install firebase-admin: npm install firebase-admin
// 2. Download your service account key from Firebase Console > Project Settings > Service Accounts
// 3. Save it as scripts/serviceAccountKey.json
// 4. Run: node scripts/setup-firebase-users.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

const TEAM = [
  {
    id: 'yulissa',
    name: 'Yulissa',
    email: 'yulissa@teamflow.dev',
    password: 'TeamFlow@Yulissa2024!',
    role: 'admin',
    title: 'Founder & CEO · Creative Managing Director',
    isAdmin: true,
  },
  {
    id: 'vikram',
    name: 'Vikram',
    email: 'vikram@teamflow.dev',
    password: 'TeamFlow@Vikram2024!',
    role: 'admin',
    title: 'Co-Founder & COO · Managing Director',
    isAdmin: true,
  },
  {
    id: 'esha',
    name: 'Esha',
    email: 'esha@teamflow.dev',
    password: 'TeamFlow@Esha2024!',
    role: 'member',
    title: 'Creative Director',
    isAdmin: false,
  },
  {
    id: 'pranish',
    name: 'Pranish',
    email: 'pranish@teamflow.dev',
    password: 'TeamFlow@Pranish2024!',
    role: 'member',
    title: 'Web Developer',
    isAdmin: false,
  },
  {
    id: 'ayush',
    name: 'Ayush',
    email: 'ayush@teamflow.dev',
    password: 'TeamFlow@Ayush2024!',
    role: 'member',
    title: 'UI/UX Designer',
    isAdmin: false,
  },
  {
    id: 'kushal',
    name: 'Kushal',
    email: 'kushal@teamflow.dev',
    password: 'TeamFlow@Kushal2024!',
    role: 'member',
    title: 'Data Analyst & Researcher',
    isAdmin: false,
  },
];

async function setupUsers() {
  console.log('🚀 Setting up TeamFlow users...\n');

  for (const member of TEAM) {
    try {
      // Create Firebase Auth user
      const userRecord = await auth.createUser({
        uid: member.id,
        email: member.email,
        password: member.password,
        displayName: member.name,
      });

      // Store profile in Firestore
      await db.collection('users').doc(member.id).set({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        title: member.title,
        isAdmin: member.isAdmin,
        createdAt: new Date().toISOString(),
      });

      console.log(`✅ Created: ${member.name} (${member.email})`);
      console.log(`   Password: ${member.password}\n`);

    } catch (error) {
      if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
        console.log(`⚠️  Already exists: ${member.name} (${member.email})\n`);
      } else {
        console.error(`❌ Error creating ${member.name}:`, error.message, '\n');
      }
    }
  }

  console.log('✅ Done! Share these credentials with your team:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  TEAM.forEach(m => {
    console.log(`${m.name.padEnd(10)} | ${m.email.padEnd(30)} | ${m.password}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  Ask team members to change passwords after first login!');

  process.exit(0);
}

setupUsers().catch(console.error);

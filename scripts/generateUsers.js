import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const TOTAL_USERS = 20;
const BATCH_SIZE = 1;
const DELAY_BETWEEN_BATCHES = 10000;
const DELAY_BETWEEN_OPERATIONS = 2000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 5000;

// Liverpool coordinates with random slight variations
const LIVERPOOL_COORDS = {
  lat: 53.4084,
  lng: -2.9916
};

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to generate random coordinates within Liverpool area
const generateLiverpoolCoordinates = () => {
  // Generate coordinates within roughly 5 miles of Liverpool center
  const radius = 0.07; // Approximately 5 miles in degrees
  const randomLat = LIVERPOOL_COORDS.lat + (Math.random() - 0.5) * radius;
  const randomLng = LIVERPOOL_COORDS.lng + (Math.random() - 0.5) * radius;
  return { latitude: randomLat, longitude: randomLng };
};

async function retryWithBackoff(operation, retries = 0) {
  try {
    return await operation();
  } catch (error) {
    if (error.message?.includes('rate limit') && retries < MAX_RETRIES) {
      const backoffDelay = INITIAL_RETRY_DELAY * Math.pow(2, retries);
      console.log(`Rate limit hit. Waiting ${backoffDelay/1000} seconds before retry ${retries + 1}/${MAX_RETRIES}...`);
      await delay(backoffDelay);
      return retryWithBackoff(operation, retries + 1);
    }
    throw error;
  }
}

async function getHobbies() {
  const { data: hobbies, error } = await supabase
    .from('hobbies')
    .select('id, name, category');

  if (error) {
    throw error;
  }

  return hobbies;
}

async function createUser(userData) {
  try {
    const authData = await retryWithBackoff(async () => {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });
      if (error) throw error;
      return data;
    });

    await delay(DELAY_BETWEEN_OPERATIONS);

    const userId = authData.user.id;
    const coordinates = generateLiverpoolCoordinates();
    const profile = {
      ...userData.profile,
      id: userId,
      location: 'Liverpool, UK',
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    };

    await retryWithBackoff(async () => {
      const { error } = await supabase
        .from('profiles')
        .insert([profile]);
      if (error) throw error;
    });

    await delay(DELAY_BETWEEN_OPERATIONS);

    return userId;
  } catch (error) {
    console.error('Error in createUser:', error);
    return null;
  }
}

async function assignHobbies(userId, hobbies) {
  try {
    const numHobbies = faker.number.int({ min: 2, max: 4 });
    const selectedHobbies = faker.helpers.arrayElements(hobbies, numHobbies);

    const userHobbiesData = selectedHobbies.map(hobby => ({
      user_id: userId,
      hobby_id: hobby.id,
      skill_level: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced']),
    }));

    await retryWithBackoff(async () => {
      const { error } = await supabase
        .from('user_hobbies')
        .insert(userHobbiesData);
      if (error) throw error;
    });

    await delay(DELAY_BETWEEN_OPERATIONS);
  } catch (error) {
    console.error('Error in assignHobbies:', error);
  }
}

async function generateUsers(hobbies) {
  const users = Array.from({ length: TOTAL_USERS }, () => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = faker.internet.userName({ firstName, lastName }).toLowerCase();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    
    return {
      firstName,
      lastName,
      username,
      email,
      password: faker.internet.password(),
      profile: {
        username,
        full_name: `${firstName} ${lastName}`,
        email,
        phone: faker.phone.number(),
        bio: faker.lorem.paragraph(),
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    };
  });

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const currentNumber = i + 1;
    
    console.log(`\nProcessing user ${currentNumber}/${TOTAL_USERS}: ${user.profile.full_name}`);
    
    const userId = await createUser(user);
    if (userId) {
      await assignHobbies(userId, hobbies);
      console.log(`✓ Successfully created user and assigned hobbies: ${user.profile.full_name}`);
      successCount++;
    } else {
      console.log(`✗ Failed to create user: ${user.profile.full_name}`);
      failureCount++;
    }

    if (i < users.length - 1) {
      console.log(`\nWaiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next user...`);
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log('\nUser generation completed!');
  console.log(`Successfully created: ${successCount} users`);
  console.log(`Failed to create: ${failureCount} users`);
}

console.log('Starting user generation...');
getHobbies()
  .then(hobbies => generateUsers(hobbies))
  .catch(error => console.error('Error:', error));
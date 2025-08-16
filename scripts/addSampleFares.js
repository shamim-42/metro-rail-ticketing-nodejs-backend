const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Fare = require('../models/Fare');
const Station = require('../models/Station');

// Load environment variables
dotenv.config({ path: './.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const addSampleFares = async () => {
  try {
    // Get all stations
    const stations = await Station.find({ isActive: true });
    console.log(`📍 Found ${stations.length} stations`);

    if (stations.length < 2) {
      console.log('❌ Need at least 2 stations to create fares');
      return;
    }

    // Create sample fares between stations
    const sampleFares = [];

    // Create fares between consecutive stations
    for (let i = 0; i < stations.length - 1; i++) {
      const fromStation = stations[i];
      const toStation = stations[i + 1];
      
      // Calculate a reasonable fare based on distance (if available) or use default
      const baseFare = 20; // Base fare in currency units
      const fare = baseFare + (i * 5); // Increment fare for longer routes

      sampleFares.push({
        fromStation: fromStation._id,
        toStation: toStation._id,
        fare: fare,
        distance: 2.5 + (i * 0.5), // Approximate distance in km
        duration: 5 + (i * 2), // Approximate duration in minutes
        fareType: 'regular',
        isActive: true
      });

      console.log(`💰 Created fare: ${fromStation.name} -> ${toStation.name} = $${fare}`);
    }

    // Also create some cross-route fares
    if (stations.length >= 4) {
      // Create some diagonal routes
      const crossRoutes = [
        { from: 0, to: 2 }, // First to third station
        { from: 1, to: 3 }, // Second to fourth station
        { from: 0, to: stations.length - 1 }, // First to last station
      ];

      crossRoutes.forEach((route, index) => {
        if (route.to < stations.length) {
          const fromStation = stations[route.from];
          const toStation = stations[route.to];
          const fare = 30 + (index * 10);

          sampleFares.push({
            fromStation: fromStation._id,
            toStation: toStation._id,
            fare: fare,
            distance: 5 + (index * 1.5),
            duration: 10 + (index * 3),
            fareType: 'regular',
            isActive: true
          });

          console.log(`💰 Created cross-route fare: ${fromStation.name} -> ${toStation.name} = $${fare}`);
        }
      });
    }

    // Insert all fares
    const result = await Fare.insertMany(sampleFares);
    console.log(`✅ Successfully created ${result.length} sample fares`);

    // Display all created fares
    console.log('\n📋 All Sample Fares:');
    for (const fare of result) {
      const fromStation = stations.find(s => s._id.toString() === fare.fromStation.toString());
      const toStation = stations.find(s => s._id.toString() === fare.toStation.toString());
      console.log(`  ${fromStation.name} -> ${toStation.name}: $${fare.fare}`);
    }

  } catch (error) {
    console.error('❌ Error creating sample fares:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
addSampleFares(); 
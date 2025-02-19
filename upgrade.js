const mongoose = require('mongoose');
const moment = require('moment');

// MongoDB connection string
const dbUrl = process.env.MONGODB_URI || 'mongodb://tehmir_tookgrain:8b76bea68aa71605c3d9300bfad2890a0833b0e0@c6oe8.h.filess.io:27018/tehmir_tookgrain';

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('Connected to MongoDB');
    updateDates();
})
.catch(err => console.error('MongoDB connection error:', err));

// Define schema and model
const BookedSlotSchema = new mongoose.Schema({
    date: String,
    time: String,
    organization: String,
    name: String,
    phone: String,
    vehicleType: String,
    details: String,
    carBrand: String,
    carNumber: String
});

const BookedSlot = mongoose.model('BookedSlot', BookedSlotSchema);

async function updateDates() {
    try {
        // Get all bookings
        const bookings = await BookedSlot.find({});

        for (const booking of bookings) {
            // Check if the date is already in the correct format
            if (!moment(booking.date, 'YYYY-MM-DD', true).isValid()) {
                // Attempt to parse the date with different formats
                let parsedDate = moment(booking.date);

                if (parsedDate.isValid()) {
                    // Format the date to YYYY-MM-DD
                    const newDate = parsedDate.format('YYYY-MM-DD');

                    // Update the booking
                    booking.date = newDate;
                    await booking.save();
                    console.log(`Updated date for booking ${booking._id} to ${newDate}`);
                } else {
                    console.warn(`Could not parse date for booking ${booking._id}: ${booking.date}`);
                }
            }
        }

        console.log('Finished updating dates.');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error updating dates:', error);
    }
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// MongoDB connection string
const dbUrl = process.env.MONGODB_URI || 'mongodb://tehmir_tookgrain:8b76bea68aa71605c3d9300bfad2890a0833b0e0@c6oe8.h.filess.io:27018/tehmir_tookgrain';

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define schema and model
const BookedSlotSchema = new mongoose.Schema({
    date: String,
    time: [String]
});

const BookedSlot = mongoose.model('BookedSlot', BookedSlotSchema);

// Endpoint to get available slots
app.post('/get-available-slots', async (req, res) => {
    const { date } = req.body;
    const allSlots = ['09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
                      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

    try {
        const bookedSlot = await BookedSlot.findOne({ date: date });
        const bookedSlots = bookedSlot ? bookedSlot.time : [];

        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
        res.json({ availableSlots });
    } catch (err) {
        console.error('Error getting available slots:', err);
        res.status(500).json({ message: 'Failed to get available slots' });
    }
});

// Endpoint to book a slot
app.post('/book-slot', async (req, res) => {
    const { date, time } = req.body;

    try {
        let bookedSlot = await BookedSlot.findOne({ date: date });

        if (!bookedSlot) {
            bookedSlot = new BookedSlot({ date: date, time: [time] });
        } else {
            if (!bookedSlot.time.includes(time)) {
                bookedSlot.time.push(time);
            }
        }

        await bookedSlot.save();
        res.json({ success: true, message: 'Слот успешно забронирован!' });
    } catch (err) {
        console.error('Error booking slot:', err);
        res.status(500).json({ message: 'Failed to book slot' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

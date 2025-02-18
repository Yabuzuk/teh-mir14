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
    time: [String],
    organization: String, // Добавлено поле organization
    name: String,
    phone: String,
    vehicleType: String,
    details: String
});

const BookedSlot = mongoose.model('BookedSlot', BookedSlotSchema);

// Функция для генерации временных слотов на день
function generateTimeSlots(dayOfWeek) {
    let startTime = 9;  // 9:00
    let endTime;

    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Понедельник - Пятница
        endTime = 20; // 20:00
    } else if (dayOfWeek === 6) { // Суббота
        endTime = 18; // 18:00
    } else {
        return []; // Воскресенье - нет слотов
    }

    const timeSlots = [];
    for (let hour = startTime; hour < endTime; hour++) {
        timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
        timeSlots.push(`${String(hour).padStart(2, '0')}:30`);
    }

    return timeSlots;
}

// Endpoint to get available slots
app.post('/get-available-slots', async (req, res) => {
    const { date } = req.body;

    // Check if date is valid
    if (!date) {
        return res.status(400).json({ message: 'Date is required' });
    }

    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay(); // 0 (Вс) - 6 (Сб)

    // Generate all time slots for the selected day
    const allSlots = generateTimeSlots(dayOfWeek);

    // If it's Sunday, return an empty array
    if (dayOfWeek === 0) {
        return res.json({ availableSlots: [] });
    }

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
    const { date, time, organization, name, phone, vehicleType, details } = req.body; // Added organization, name, phone, vehicleType, details

    try {
        let bookedSlot = await BookedSlot.findOne({ date: date });

        if (!bookedSlot) {
            bookedSlot = new BookedSlot({
                date: date,
                time: [time],
                organization: organization,
                name: name,
                phone: phone,
                vehicleType: vehicleType,
                details: details
            });
        } else {
            if (!bookedSlot.time.includes(time)) {
                bookedSlot.time.push(time);
            }
            bookedSlot.organization = organization;
            bookedSlot.name = name;
            bookedSlot.phone = phone;
            bookedSlot.vehicleType = vehicleType;
            bookedSlot.details = details;
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

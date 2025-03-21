const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const moment = require('moment');
const path = require('path');

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
    date: { type: String, required: true },
    time: { type: String, required: true },
    organization: { type: String, required: true },  // Added required
    name: { type: String, required: true },        // Added required
    phone: { type: String, required: true },       // Added required
    mail: { type: String, required: true },       // Added required
    vehicleType: String,
    details: String,
    carBrand: String,
    carNumber: String
}, {
    timestamps: false // Disable timestamps
});

BookedSlotSchema.index({ date: 1, time: 1 }, { unique: true });  // Add unique index
const BookedSlot = mongoose.model('BookedSlot', BookedSlotSchema);

// Функция для генерации временных слотов на день
function generateTimeSlots(dayOfWeek) {
    let startTime = 9;
    let endTime;

    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Понедельник - Пятница
        endTime = 20;
        if (dayOfWeek === 3 || dayOfWeek === 5) { // Среда и Пятница
            endTime = 18;
        }
    } else if (dayOfWeek === 6) { // Суббота
        endTime = 18;
    } else {
        return [];
    }

    const timeSlots = [];
    for (let hour = startTime; hour < endTime; hour++) {
        timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
    }

    return timeSlots;
}

// Endpoint to get available slots
app.post('/get-available-slots', async (req, res) => {
    const { date } = req.body;

    if (!date) {
        return res.status(400).json({ message: 'Date is required' });
    }

    try {
        const selectedDate = moment(date);
        const dayOfWeek = selectedDate.day(); // 0 (Вс) - 6 (Сб)

        const allSlots = generateTimeSlots(dayOfWeek);

        if (dayOfWeek === 0) {
            return res.json({ availableSlots: [] });
        }

        // Fetch only the 'time' field from the booked slots
        const bookedSlots = await BookedSlot.find({ date: date }).select('time').exec();

        // Extract the 'time' values into a simple array
        const bookedTimes = bookedSlots.map(slot => slot.time);

        // Filter the available slots based on the booked times
        const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

        // Respond with the available slots
        res.json({ availableSlots });
    } catch (err) {
        console.error('Error getting available slots:', err);
        res.status(500).json({ message: 'Failed to get available slots' });
    }
});

// Endpoint to book a slot
app.post('/book-slot', async (req, res) => {
    const { date, time, organization, name, phone, mail, vehicleType, details, carBrand, carNumber } = req.body;

    // Validate required fields
    if (!date || !time || !organization || !name || !phone) {
        return res.status(400).json({ message: 'Date, time, organization, name and phone are required.' });
    }

    try {
        // Attempt to create the new slot
        const newSlot = new BookedSlot({
            date,
            time,
            organization,
            name,
            phone,
            mail,
            vehicleType,
            details,
            carBrand,
            carNumber
        });

        await newSlot.save();  // Save the new slot
        return res.status(201).json({ message: 'Слот успешно забронирован!' });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Этот слот времени уже забронирован.' });
        }

        console.error("Ошибка при бронировании:", error);
        return res.status(500).json({ message: "Ошибка при бронировании слота.", error: error.message });
    }
});

// Получение всех записей (GET /admin/bookings)
app.get('/admin/bookings', async (req, res) => {
    try {
        const bookings = await BookedSlot.find({});
        res.json(bookings);
    } catch (err) {
        console.error('Error getting bookings:', err);
        res.status(500).json({ message: 'Failed to get bookings' });
    }
});

// Получение конкретной записи (GET /admin/bookings/:id)
app.get('/admin/bookings/:id', async (req, res) => {
    try {
        const booking = await BookedSlot.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.json(booking);
    } catch (err) {
        console.error('Error getting booking:', err);
        res.status(500).json({ message: 'Failed to get booking' });
    }
});

// Создание новой записи (POST /admin/bookings)
app.post('/admin/bookings', async (req, res) => {
    try {
        const newBooking = new BookedSlot(req.body);
        const savedBooking = await newBooking.save();
        res.status(201).json(savedBooking); // 201 Created
    } catch (err) {
        console.error('Error creating booking:', err);
        res.status(400).json({ message: 'Failed to create booking', error: err.message }); // 400 Bad Request
    }
});

// Редактирование существующей записи (PUT /admin/bookings/:id)
app.put('/admin/bookings/:id', async (req, res) => {
    try {
        const updatedBooking = await BookedSlot.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.json(updatedBooking);
    } catch (err) {
        console.error('Error updating booking:', err);
        res.status(400).json({ message: 'Failed to update booking', error: err.message }); // 400 Bad Request
    }
});

// Удаление записи (DELETE /admin/bookings/:id)
app.delete('/admin/bookings/:id', async (req, res) => {
    try {
        const deletedBooking = await BookedSlot.findByIdAndDelete(req.params.id);
        if (!deletedBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.json({ message: 'Booking deleted' });
    } catch (err) {
        console.error('Error deleting booking:', err);
        res.status(500).json({ message: 'Failed to delete booking' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

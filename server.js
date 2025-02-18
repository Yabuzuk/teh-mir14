<!DOCTYPE html>
<html>
<head>
    <title>Simple Admin Panel</title>
    <style>
        body {
            font-family: sans-serif;
        }
        .booking-item {
            border: 1px solid #ccc;
            margin-bottom: 10px;
            padding: 10px;
        }
        .booking-item p {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <h1>Simple Admin Panel</h1>

    <div id="message"></div>

    <h2>Bookings</h2>
    <div id="bookingList">
        <!-- Здесь будет список забронированных слотов -->
    </div>

    <h2>Create/Edit Booking</h2>
    <form id="bookingForm">
        <label for="date">Date:</label>
        <input type="date" id="date" name="date"><br><br>

        <label for="time">Time:</label>
        <input type="text" id="time" name="time"><br><br>

        <label for="organization">Organization:</label>
        <input type="text" id="organization" name="organization"><br><br>

        <label for="name">Name:</label>
        <input type="text" id="name" name="name"><br><br>

        <label for="phone">Phone:</label>
        <input type="text" id="phone" name="phone"><br><br>

        <label for="vehicleType">Vehicle Type:</label>
        <select id="vehicleType" name="vehicleType">
            <option value="легковой автомобиль">Легковой автомобиль</option>
            <option value="автобус">Автобус</option>
            <option value="грузовой автомобиль">Грузовой автомобиль</option>
            <option value="мотоцикл">Мотоцикл</option>
            <option value="прицеп">Прицеп</option>
        </select><br><br>

        <label for="details">Details:</label>
        <textarea id="details" name="details"></textarea><br><br>

        <input type="hidden" id="bookingId" name="bookingId">  <!-- Hidden field for editing -->

        <button type="submit">Save</button>
        <button type="button" id="cancelBtn">Cancel</button>
        <button type="button" id="deleteBtn" style="color: red;">Delete</button>  <!-- Delete Button -->
    </form>

    <script>
        const API_URL = 'https://teh-mir14.onrender.com/admin/bookings'; // Замените на URL вашего API
        const ADMIN_TOKEN = "47e8b2d9-5a6c-4b1f-9e0a-3c8d2f1e7a5b"; // Получаем токен из переменной окружения
        const bookingList = document.getElementById('bookingList');
        const bookingForm = document.getElementById('bookingForm');
        const messageDiv = document.getElementById('message');
        const deleteBtn = document.getElementById('deleteBtn');

        // Function to display messages
        function displayMessage(message, isError = false) {
            messageDiv.textContent = message;
            messageDiv.style.color = isError ? 'red' : 'green';
        }

        // Function to fetch and display bookings
        async function fetchBookings() {
            try {
                const response = await fetch(API_URL, {
                    headers: {
                        'x-admin-token': ADMIN_TOKEN
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const bookings = await response.json();
                displayBookings(bookings);
            } catch (error) {
                console.error('Error fetching bookings:', error);
                displayMessage('Error fetching bookings', true);
            }
        }

        // Function to display bookings
        function displayBookings(bookings) {
            bookingList.innerHTML = '';
            bookings.forEach(booking => {
                const bookingDiv = document.createElement('div');
                bookingDiv.classList.add('booking-item');
                bookingDiv.innerHTML = `
                    <p><strong>Date:</strong> ${booking.date}</p>
                    <p><strong>Time:</strong> ${booking.time}</p>
                    <p><strong>Organization:</strong> ${booking.organization}</p>
                    <p><strong>Name:</strong> ${booking.name}</p>
                    <p><strong>Phone:</strong> ${booking.phone}</p>
                    <p><strong>Vehicle Type:</strong> ${booking.vehicleType}</p>
                    <p><strong>Details:</strong> ${booking.details}</p>
                    <button onclick="editBooking('${booking._id}')">Edit</button>
                `;
                bookingList.appendChild(bookingDiv);
            });
        }

        // Function to clear the form
        function clearForm() {
            bookingForm.reset();
            document.getElementById('bookingId').value = ''; // Clear hidden ID field
            deleteBtn.style.display = 'none';  // Hide delete button by default
        }

        // Function to populate the form for editing
        async function editBooking(id) {
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    headers: {
                        'x-admin-token': ADMIN_TOKEN
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const booking = await response.json();

                document.getElementById('date').value = booking.date;
                document.getElementById('time').value = booking.time;
                document.getElementById('organization').value = booking.organization;
                document.getElementById('name').value = booking.name;
                document.getElementById('phone').value = booking.phone;
                document.getElementById('vehicleType').value = booking.vehicleType;
                document.getElementById('details').value = booking.details;
                document.getElementById('bookingId').value = booking._id; // Set the hidden ID field
                deleteBtn.style.display = 'inline'; // Show delete button

                displayMessage(`Editing booking: ${id}`);

            } catch (error) {
                console.error('Error fetching booking for edit:', error);
                displayMessage('Error fetching booking for edit', true);
            }
        }

        // Function to handle form submission (Create/Update)
        bookingForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const bookingId = document.getElementById('bookingId').value;
            const method = bookingId ? 'PUT' : 'POST';  // Determine method based on bookingId
            const url = bookingId ? `${API_URL}/${bookingId}` : API_URL;

            const formData = {
                date: document.getElementById('date').value,
                time: document.getElementById('time').value,
                organization: document.getElementById('organization').value,
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                vehicleType: document.getElementById('vehicleType').value,
                details: document.getElementById('details').value
            };

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-token': ADMIN_TOKEN
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                displayMessage(`Booking ${bookingId ? 'updated' : 'created'} successfully`);
                clearForm();  // Clear the form after submission
                fetchBookings(); // Refresh the booking list

            } catch (error) {
                console.error('Error saving booking:', error);
                displayMessage('Error saving booking', true);
            }
        });

        // Function to handle cancel button
        document.getElementById('cancelBtn').addEventListener('click', clearForm);

         // Function to handle delete button
        deleteBtn.addEventListener('click', async () => {
            const bookingId = document.getElementById('bookingId').value;

            if (!bookingId) {
                displayMessage('No booking selected to delete', true);
                return;
            }

            if (confirm('Are you sure you want to delete this booking?')) {
                try {
                    const response = await fetch(`${API_URL}/${bookingId}`, {
                        method: 'DELETE',
                        headers: {
                            'x-admin-token': ADMIN_TOKEN
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    displayMessage('Booking deleted successfully');
                    clearForm();
                    fetchBookings();

                } catch (error) {
                    console.error('Error deleting booking:', error);
                    displayMessage('Error deleting booking', true);
                }
            }
        });

        // Initial fetch of bookings on page load
        fetchBookings();
    </script>
</body>
</html>

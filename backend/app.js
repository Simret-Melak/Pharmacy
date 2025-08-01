const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');


dotenv.config();

const app = express();

// Middleware
app.use(helmet());

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
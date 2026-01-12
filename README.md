# Global Starvation Map – Frontend

This repository contains the frontend application for the **Global Starvation Map** project.  
The frontend is responsible for visualizing global food security and socioeconomic indicators using interactive maps and charts, consuming data from a FastAPI backend.

---

## Tech Stack

- React
- JavaScript (ES6+)
- React Simple Maps
- Recharts
- Axios
- CSS

---

## Project Structure

```
frontend/
│
├── public/
│   └── index.html
│
├── src/
│   ├── components/     # Reusable UI components (maps, charts)
│   ├── utils/          # Helper functions
│   ├── App.jsx
│   └── main.jsx
│
├── package.json
└── README.md
```

---

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/username/global-starvation-map-frontend.git
cd global-starvation-map-frontend
npm install
```

Run the development server:

```bash
npm run dev
```

The application will be available at:

```
http://localhost:5173
```

---

## Backend Integration

The frontend consumes data from the FastAPI backend.

Example request:

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: "https://your-backend-url"
});

export const getLatestIndicator = (indicator) =>
  api.get(`/latest?indicator=${indicator}`);
```

---

## Live Demo

Food Security Dashboard  
https://starvation.vercel.app

---

## Authors

Victor Alves da Silva Sales  
Valentina Serrano-Muñoz

---

## License

This project is distributed under the MIT License.

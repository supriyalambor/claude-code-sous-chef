import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import MealPlanPreview from './preview/MealPlanPreview.jsx'

// Non-invasive preview: visit "?preview=meals" to see the new UI prototype.
// The live app is completely unchanged for every other URL.
const isPreview = new URLSearchParams(window.location.search).get('preview') === 'meals'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{isPreview ? <MealPlanPreview /> : <App />}</React.StrictMode>
)

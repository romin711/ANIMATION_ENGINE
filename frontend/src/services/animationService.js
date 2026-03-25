'use strict'

import axios from 'axios'

const API_BASE = '/api/animation'

/**
 * Sends the animation description to the backend and returns animation JSON.
 * Uses the Vite proxy (/api → http://localhost:5000/api).
 *
 * @param {string} description - User's plain text animation description
 * @returns {Promise<{ animation: object }>} - Resolved animation JSON
 */
function generateAnimation(description) {
  return axios.post(API_BASE + '/generate', { description })
    .then(function (response) {
      return response.data
    })
}

export { generateAnimation }

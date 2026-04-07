'use strict'

import axios from 'axios'

const API_BASE = '/api/animation'

/**
 * Sends the animation description to the backend and returns animation JSON.
 * Uses the Vite proxy (/api → http://localhost:5000/api).
 *
 * @param {string | object} payload - Description string or request payload
 * @returns {Promise<{ animation: object }>} - Resolved animation JSON
 */
function generateAnimation(payload) {
  const requestBody = typeof payload === 'string'
    ? { description: payload }
    : payload

  return axios.post(API_BASE + '/generate', requestBody)
    .then(function (response) {
      return response.data
    })
}

export { generateAnimation }

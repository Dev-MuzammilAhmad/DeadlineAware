import emailjs from '@emailjs/browser'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || ''
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || ''
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''

// Debug: log whether EmailJS is configured on load
console.info(`[EmailJS] Configured: ${!!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)} | Service: ${SERVICE_ID ? '✅' : '❌'} | Template: ${TEMPLATE_ID ? '✅' : '❌'} | Key: ${PUBLIC_KEY ? '✅' : '❌'}`)

/**
 * Send a deadline reminder email via EmailJS.
 * Gracefully skips if credentials are not configured.
 *
 * @param {string} toEmail     - Recipient's email address
 * @param {string} deadlineTitle - The deadline's title
 * @param {string} priority    - Priority level (e.g. "High", "Critical")
 * @param {string} intervalLabel - Human-readable time remaining (e.g. "1 hour(s)")
 * @param {string} dueDate     - Formatted due date string
 */
export const sendReminderEmail = async (toEmail, deadlineTitle, priority, intervalLabel, dueDate) => {
  // Skip if EmailJS is not configured
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.info('EmailJS credentials not configured. Skipping email notification.')
    return null
  }

  // Skip if no recipient email
  if (!toEmail) {
    console.info('No recipient email provided. Skipping email notification.')
    return null
  }

  try {
    const templateParams = {
      to_email: toEmail,
      deadline_title: deadlineTitle,
      priority: priority,
      interval_label: intervalLabel,
      due_date: dueDate
    }

    const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
    console.info(`Reminder email sent to ${toEmail} for "${deadlineTitle}" — Status: ${result.status}`)
    return result
  } catch (error) {
    console.error('Failed to send reminder email:', error?.text || error)
    return null
  }
}

// Expose test function on window for manual debugging via browser console
// Usage: testEmail('your@email.com')
if (typeof window !== 'undefined') {
  window.testEmail = async (email) => {
    console.info(`[EmailJS Test] Sending test email to ${email}...`)
    const result = await sendReminderEmail(
      email,
      'Test Deadline',
      'High',
      '30 min(s)',
      new Date().toLocaleString()
    )
    if (result) {
      console.info('[EmailJS Test] ✅ Email sent successfully! Check your inbox.')
    } else {
      console.error('[EmailJS Test] ❌ Email failed. Check errors above.')
    }
    return result
  }
}

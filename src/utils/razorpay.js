// Loads the Razorpay Checkout script once and resolves when ready.
let loadPromise = null

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true)
  if (loadPromise) return loadPromise
  loadPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
  return loadPromise
}

// Opens the Razorpay Checkout modal. Resolves with the success response,
// or rejects if the user dismisses it.
export function openCheckout(options) {
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      ...options,
      handler: (response) => resolve(response),
      modal: {
        ...(options.modal || {}),
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    })
    rzp.on('payment.failed', (resp) => reject(new Error(resp?.error?.description || 'Payment failed')))
    rzp.open()
  })
}

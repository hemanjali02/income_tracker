import { connectDB } from '../server/db.js'
import app from '../server/app.js'

// Cache the DB connection across warm serverless invocations
let connected = false
async function getApp() {
  if (!connected) {
    await connectDB()
    connected = true
  }
  return app
}

export default async function handler(req, res) {
  const application = await getApp()
  return application(req, res)
}

import 'dotenv/config'
import { connectDB } from './db.js'
import app from './app.js'

const PORT = process.env.PORT || 3001

async function start() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start()

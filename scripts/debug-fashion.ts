
import { config } from "dotenv"
import { resolve } from "path"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

config({ path: resolve(__dirname, "../.env.local") })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
    console.error("DATABASE_URL not found")
    process.exit(1)
}

const sql = neon(DATABASE_URL)
const db = drizzle(sql)

import * as fs from "fs"

async function debug() {
    const logFile = "debug-output.txt"
    fs.writeFileSync(logFile, "--- Debugging Fashion Items ---\n")

    try {
        const users = await sql`SELECT id, email FROM users`
        fs.appendFileSync(logFile, "\nUsers in DB:\n")
        users.forEach(r => fs.appendFileSync(logFile, JSON.stringify(r) + "\n"))

        const workspaces = await sql`SELECT id, name, owner_id FROM workspaces`
        fs.appendFileSync(logFile, "\nWorkspaces in DB:\n")
        workspaces.forEach(r => fs.appendFileSync(logFile, JSON.stringify(r) + "\n"))

        const items = await sql`SELECT id, workspace_id, user_id, name FROM fashion_items`
        fs.appendFileSync(logFile, "\nFashion Items in DB:\n")
        items.forEach(r => fs.appendFileSync(logFile, JSON.stringify(r) + "\n"))

        console.log("Debug output written to debug-output.txt")
    } catch (err) {
        fs.appendFileSync(logFile, "Error querying DB: " + err + "\n")
        console.error("Error querying DB:", err)
    } finally {
        process.exit(0)
    }
}

debug()

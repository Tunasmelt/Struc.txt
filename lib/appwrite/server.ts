import { Client, Account, Databases, Storage } from 'node-appwrite'

let client: Client
let account: Account
let databases: Databases
let storage: Storage

export async function createClient() {
  if (!client) {
    client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!)

    account = new Account(client)
    databases = new Databases(client)
    storage = new Storage(client)
  }

  return { client, account, databases, storage }
}

export { account, databases, storage }

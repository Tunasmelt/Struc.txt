import { Client, Account, Databases, Storage } from 'appwrite'

let client: Client
let account: Account
let databases: Databases
let storage: Storage

export function createClient() {
  if (typeof window === 'undefined') {
    throw new Error('createClient should only be called on the client side')
  }

  if (!client) {
    client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

    account = new Account(client)
    databases = new Databases(client)
    storage = new Storage(client)
  }

  return { client, account, databases, storage }
}

export { account, databases, storage }

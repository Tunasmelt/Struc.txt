import { Databases, ID, Permission, Role } from 'node-appwrite'
import { createClient } from './server'

const DATABASE_ID = 'default'

export async function createCollections() {
  const { databases } = await createClient()

  // Templates collection
  try {
    await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'templates',
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    )
    
    await databases.createStringAttribute(DATABASE_ID, 'templates', 'name', 100, true)
    await databases.createStringAttribute(DATABASE_ID, 'templates', 'icon_color', 20, true)
    await databases.createStringAttribute(DATABASE_ID, 'templates', 'fields', 10000, true) // JSON string
    await databases.createBooleanAttribute(DATABASE_ID, 'templates', 'is_preset', false)
    await databases.createDatetimeAttribute(DATABASE_ID, 'templates', 'created_at', true)
  } catch (e) {
    console.log('Templates collection may already exist')
  }

  // Boards collection
  try {
    await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'boards',
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    )
    
    await databases.createStringAttribute(DATABASE_ID, 'boards', 'name', 100, true)
    await databases.createStringAttribute(DATABASE_ID, 'boards', 'theme', 20, true)
    await databases.createDatetimeAttribute(DATABASE_ID, 'boards', 'created_at', true)
  } catch (e) {
    console.log('Boards collection may already exist')
  }

  // Notes collection
  try {
    await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'notes',
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    )
    
    await databases.createStringAttribute(DATABASE_ID, 'notes', 'title', 500, false)
    await databases.createStringAttribute(DATABASE_ID, 'notes', 'note_date', 20, false)
    await databases.createStringAttribute(DATABASE_ID, 'notes', 'raw_text', 10000, true)
    await databases.createStringAttribute(DATABASE_ID, 'notes', 'audio_path', 500, false)
    await databases.createStringAttribute(DATABASE_ID, 'notes', 'transcript_source', 20, true)
    await databases.createStringAttribute(DATABASE_ID, 'notes', 'position', 1000, true) // JSON string
    await databases.createStringAttribute(DATABASE_ID, 'notes', 'search', 10000, true) // Concatenated for fulltext search
    await databases.createDatetimeAttribute(DATABASE_ID, 'notes', 'created_at', true)
    await databases.createDatetimeAttribute(DATABASE_ID, 'notes', 'updated_at', true)
    
    // Create fulltext index on search field
    // Note: Index creation may need to be done via Appwrite Console or CLI
    // due to SDK signature differences. Documented in SETUP.md.
  } catch (e) {
    console.log('Notes collection may already exist')
  }

  // Note versions collection
  try {
    await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'note_versions',
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
      ]
    )
    
    await databases.createStringAttribute(DATABASE_ID, 'note_versions', 'body', 10000, true) // JSON string
    await databases.createStringAttribute(DATABASE_ID, 'note_versions', 'model_used', 100, true)
    await databases.createStringAttribute(DATABASE_ID, 'note_versions', 'prompt_version', 50, true)
    await databases.createDatetimeAttribute(DATABASE_ID, 'note_versions', 'created_at', true)
  } catch (e) {
    console.log('Note versions collection may already exist')
  }

  // Tags collection
  try {
    await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'tags',
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    )
    
    await databases.createStringAttribute(DATABASE_ID, 'tags', 'name', 100, true)
    await databases.createDatetimeAttribute(DATABASE_ID, 'tags', 'created_at', true)
  } catch (e) {
    console.log('Tags collection may already exist')
  }

  // Note tags collection
  try {
    await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'note_tags',
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    )
    
    await databases.createStringAttribute(DATABASE_ID, 'note_tags', 'status', 20, true)
    await databases.createDatetimeAttribute(DATABASE_ID, 'note_tags', 'created_at', true)
  } catch (e) {
    console.log('Note tags collection may already exist')
  }

  // Action items collection
  try {
    await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'action_items',
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    )
    
    await databases.createStringAttribute(DATABASE_ID, 'action_items', 'text', 1000, true)
    await databases.createStringAttribute(DATABASE_ID, 'action_items', 'due_date', 20, false)
    await databases.createStringAttribute(DATABASE_ID, 'action_items', 'status', 20, true)
    await databases.createStringAttribute(DATABASE_ID, 'action_items', 'source', 20, true)
    await databases.createDatetimeAttribute(DATABASE_ID, 'action_items', 'created_at', true)
  } catch (e) {
    console.log('Action items collection may already exist')
  }

  // Shares collection
  try {
    await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'shares',
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    )
    
    await databases.createStringAttribute(DATABASE_ID, 'shares', 'resource_type', 20, true)
    await databases.createStringAttribute(DATABASE_ID, 'shares', 'token', 100, true)
    await databases.createStringAttribute(DATABASE_ID, 'shares', 'expires_at', 50, false)
    await databases.createStringAttribute(DATABASE_ID, 'shares', 'revoked_at', 50, false)
    await databases.createDatetimeAttribute(DATABASE_ID, 'shares', 'created_at', true)
  } catch (e) {
    console.log('Shares collection may already exist')
  }
}

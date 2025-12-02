import * as linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Account, Avatars, Client, Databases, OAuthProvider, Query, TablesDB, } from 'react-native-appwrite';

export const config = {
    platform: 'com.manucho.restate',
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    galleriesTableId: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_TABLE_ID,
    reviewsTableId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_TABLE_ID,
    agentsTableId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_TABLE_ID,
    propertiesTableId: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_TABLE_ID,
}

export const client = new Client()

client.setEndpoint(config.endpoint!).setProject(config.projectId!).setPlatform(config.platform)

export const avatar = new Avatars(client)
export const account = new Account(client)
export const databases = new Databases(client)
export const tables = new TablesDB(client)

export async function login() {
    try {
        const redirectUri = linking.createURL('/')

        const response = await account.createOAuth2Token({
            provider: OAuthProvider.Google, success: redirectUri
        })

        if (!response) throw new Error('Failed to login')

        const browserResult = await WebBrowser.openAuthSessionAsync(
            response.toString(),
            redirectUri
        )

        if (browserResult.type !== 'success') throw new Error('Failed to login')

        const url = new URL(browserResult.url)

        const secret = url.searchParams.get('secret')?.toString()
        const userId = url.searchParams.get('userId')?.toString()

        if (!secret || !userId) throw new Error('Failed to login')

        const session = await account.createSession(userId, secret)

        if (!session) throw new Error('Failed to create a session')

        return true
    } catch (error) {
        console.error(error)
        return false
    }
}

export async function logout() {
    try {
        await account.deleteSession({
            sessionId: 'current'
        })
        return true
    } catch (error) {
        console.error(error)
        return false
    }
}

export async function getCurrentUser() {
    try {
        const response = await account.get()

        if (response.$id) {
            const userAvatar = avatar.getInitials({ name: response.name })
            return {
                ...response,
                avatar: userAvatar.toString()
            }
        }

    } catch (error) {
        console.error(error)
        return []
    }
}

export async function getLatestProperties() {
    try {
        const result = await tables.listRows({
            databaseId: config.databaseId!,
            tableId: config.propertiesTableId!,
            queries: [(Query.orderAsc('$createdAt')), Query.limit(5)]
        })

        return result.rows
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function getProperties({ filter, query, limit }: { filter: string; query: string; limit?: number }) {
    try {
        const buildQuery = [Query.orderDesc('$createdAt')]

        if (filter && filter !== 'All') {
            buildQuery.push(Query.equal('type', filter))
        }

        if (query) {
            Query.or([
                Query.search('name', query),
                Query.search('address', query),
                Query.search('type', query)
            ])
        }

        if (limit) buildQuery.push(Query.limit(limit))

        const result = await tables.listRows({
            databaseId: config.databaseId!,
            tableId: config.propertiesTableId!,
            queries: buildQuery
        })

        return result.rows
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function getPropertyById({ id }: { id: string }) {
    try {
        const result = await tables.getRow({
            databaseId: config.databaseId!,
            tableId: config.propertiesTableId!,
            rowId: id
        })

        const reviews = await tables.listRows({
            databaseId: config.databaseId!,
            tableId: config.reviewsTableId!,
            queries: [Query.equal('property', id)]
        })
        const agent = await tables.getRow({
            databaseId: config.databaseId!,
            tableId: config.agentsTableId!,
            rowId: result.agent
        })

        console.log(JSON.stringify(agent, null, 2))
        return { ...result, reviews: reviews.rows, agent }
    } catch (error) {
        console.error(error)
        return null
    }
}
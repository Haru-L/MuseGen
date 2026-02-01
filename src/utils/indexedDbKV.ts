import { getDbConnection } from '@/db/dbManager'
import { StoreNames } from '@/db/schema'

const STORE_NAME = StoreNames.KV

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
  })
}

export async function idbGet(key: string): Promise<string | null> {
  const db = await getDbConnection()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const value = await requestToPromise(store.get(key))
  await txDone(tx)
  return (value ?? null) as string | null
}

export async function idbSet(key: string, value: string): Promise<void> {
  const db = await getDbConnection()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await requestToPromise(store.put(value, key))
  await txDone(tx)
}

export async function idbDel(key: string): Promise<void> {
  const db = await getDbConnection()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await requestToPromise(store.delete(key))
  await txDone(tx)
}

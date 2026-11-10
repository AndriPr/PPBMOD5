// ---------------------------------------------------------------------------
// archiveStorage.js — manage archived (soft-deleted) catalog items
// Persisted in localStorage so items can be archived, restored, or permanently deleted.
// ---------------------------------------------------------------------------

const ARCHIVE_IDS_KEY = 'bore_barrel_archived_ids'
const ARCHIVE_ITEMS_KEY = 'bore_barrel_archived_items'

export const getArchivedIds = () => {
  try {
    const raw = localStorage.getItem(ARCHIVE_IDS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const getArchivedGuns = () => {
  try {
    const raw = localStorage.getItem(ARCHIVE_ITEMS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const isGunArchived = (gunId) => {
  if (!gunId) return false
  const ids = getArchivedIds()
  return ids.includes(String(gunId))
}

export const archiveGun = (gun) => {
  if (!gun || !gun.id) return false
  try {
    const gunIdStr = String(gun.id)
    const ids = getArchivedIds()
    if (!ids.includes(gunIdStr)) {
      ids.push(gunIdStr)
      localStorage.setItem(ARCHIVE_IDS_KEY, JSON.stringify(ids))
    }

    const items = getArchivedGuns()
    const existingIndex = items.findIndex((i) => String(i.id) === gunIdStr)
    const archivedItem = {
      ...gun,
      archivedAt: new Date().toISOString(),
    }
    if (existingIndex > -1) {
      items[existingIndex] = archivedItem
    } else {
      items.unshift(archivedItem)
    }
    localStorage.setItem(ARCHIVE_ITEMS_KEY, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}

export const restoreGun = (gunId) => {
  if (!gunId) return false
  try {
    const gunIdStr = String(gunId)
    const ids = getArchivedIds().filter((id) => id !== gunIdStr)
    localStorage.setItem(ARCHIVE_IDS_KEY, JSON.stringify(ids))

    const items = getArchivedGuns().filter((i) => String(i.id) !== gunIdStr)
    localStorage.setItem(ARCHIVE_ITEMS_KEY, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}

export const removePermanentlyFromArchive = (gunId) => {
  if (!gunId) return false
  try {
    const gunIdStr = String(gunId)
    const ids = getArchivedIds().filter((id) => id !== gunIdStr)
    localStorage.setItem(ARCHIVE_IDS_KEY, JSON.stringify(ids))

    const items = getArchivedGuns().filter((i) => String(i.id) !== gunIdStr)
    localStorage.setItem(ARCHIVE_ITEMS_KEY, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}

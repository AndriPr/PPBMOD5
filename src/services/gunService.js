import { apiClient, IS_SUPABASE } from '../config/api'
import { getQueryCache, setQueryCache, invalidateQueryCache } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// Normalizer — standardizes product shape whether received from Supabase
// (public.products) or from the university API (/api/v1/recipes).
// ---------------------------------------------------------------------------
export const normalizeProduct = (item) => {
  if (!item) return null

  // Resolve specifications from Supabase `specs` (text array) or API `ingredients`
  let specsList = []
  let extraImages = []

  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          const name = s.substring(0, colonIndex).trim()
          const quantity = s.substring(colonIndex + 1).trim()
          if (name === 'GalleryImage') {
            extraImages.push(quantity)
          }
          return {
            id: `spec-${idx}`,
            name,
            quantity,
          }
        }
        return {
          id: `spec-${idx}`,
          name: 'Specification',
          quantity: s.trim(),
        }
      }
      return s
    }).filter((s) => s.name !== 'GalleryImage') // remove internal gallery image specs from visible specs
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }

  // Resolve steps
  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps
      : ['Verify firearm is completely unloaded and point in safe direction.', 'Inspect receiver and mechanism for maintenance.']

  const primaryImage = item.image_url || item.image || '/guns/pistol.svg'

  // Retrieve stored multi-images from localStorage if available
  let localImages = []
  try {
    const rawLocalImgs = localStorage.getItem(`gun_images_${item.id}`)
    if (rawLocalImgs) {
      localImages = JSON.parse(rawLocalImgs)
    }
  } catch {
    /* ignore */
  }

  // Combine image sources without duplicates
  const imagesSet = new Set([primaryImage])
  if (Array.isArray(item.images)) {
    item.images.forEach((img) => img && imagesSet.add(img))
  }
  extraImages.forEach((img) => img && imagesSet.add(img))
  localImages.forEach((img) => img && imagesSet.add(img))

  const allImages = Array.from(imagesSet)

  return {
    ...item,
    id: item.id,
    name: item.name || 'Hardware Piece',
    type: item.type || item.category || 'Hardware',
    category: item.type || item.category || 'Hardware',
    caliber: item.caliber || 'Standard',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    image_url: primaryImage,
    image: primaryImage,
    images: allImages.length > 0 ? allImages : [primaryImage],
    ingredients: specsList,
    steps: stepsList,
  }
}

// ---------------------------------------------------------------------------
// GunService — wraps backend CRUD endpoints with query caching.
// ---------------------------------------------------------------------------
class GunService {
  /**
   * Fetch a paginated, filterable list of products.
   */
  async getGuns(params = {}, skipCache = false) {
    const cacheKey = `guns_${JSON.stringify(params)}`

    // Check query cache
    if (!skipCache) {
      const cached = getQueryCache(cacheKey)
      if (cached) {
        return cached
      }
    }

    if (IS_SUPABASE) {
      const queryParts = ['select=*']

      if (params.search) {
        queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
      }

      if (params.category && params.category !== 'All') {
        queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
      }

      if (params.sort_by) {
        const order = params.order === 'desc' ? 'desc' : 'asc'
        queryParts.push(`order=${encodeURIComponent(params.sort_by)}.${order}`)
      } else {
        queryParts.push('order=created_at.desc')
      }

      if (params.limit) {
        queryParts.push(`limit=${params.limit}`)
      }

      const queryString = queryParts.join('&')
      const data = await apiClient.get(`/rest/v1/products?${queryString}`)
      const list = Array.isArray(data) ? data.map(normalizeProduct) : []

      const result = {
        success: true,
        data: list,
        pagination: {
          total: list.length,
          page: params.page || 1,
          limit: params.limit || 50,
        },
      }

      // Cache query result for 5 minutes (300 seconds)
      setQueryCache(cacheKey, result, 300)
      return result
    }

    // Fallback: university REST API
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    )
    const res = await apiClient.get('/api/v1/recipes', { params: clean })
    setQueryCache(cacheKey, res, 300)
    return res
  }

  /**
   * Fetch a single product by ID.
   */
  async getGunById(id, skipCache = false) {
    const cacheKey = `gun_${id}`
    if (!skipCache) {
      const cached = getQueryCache(cacheKey)
      if (cached) return cached
    }

    if (IS_SUPABASE) {
      const data = await apiClient.get(`/rest/v1/products?id=eq.${id}&select=*`)
      if (Array.isArray(data) && data.length > 0) {
        const result = { success: true, data: normalizeProduct(data[0]) }
        setQueryCache(cacheKey, result, 300)
        return result
      }
      throw new Error('Hardware item not found.')
    }

    const res = await apiClient.get(`/api/v1/recipes/${id}`)
    setQueryCache(cacheKey, res, 300)
    return res
  }

  /**
   * Create a new product.
   */
  async createGun(data) {
    // Invalidate query cache so new data appears
    invalidateQueryCache('guns_')

    // Persist additional gallery images
    const extraImages = Array.isArray(data.images) ? data.images.slice(1) : []
    const gallerySpecs = extraImages.map((img) => `GalleryImage: ${img}`)

    if (IS_SUPABASE) {
      const baseSpecs = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : []

      const specsArray = [...baseSpecs, ...gallerySpecs]

      const payload = {
        name: data.name,
        type: data.type || (data.category === 'minuman' ? 'Rifle' : 'Pistol'),
        caliber: data.caliber || '9mm',
        price: Number(data.price ?? data.cook_time ?? 0),
        description: data.description || '',
        specs: specsArray,
        image_url: data.image_url || null,
      }

      const res = await apiClient.post('/rest/v1/products', payload, {
        headers: { Prefer: 'return=representation' },
      })
      const created = Array.isArray(res) ? res[0] : res

      // Save full images array to localStorage for persistence
      if (created && created.id && Array.isArray(data.images)) {
        try {
          localStorage.setItem(`gun_images_${created.id}`, JSON.stringify(data.images))
        } catch {
          /* ignore */
        }
      }

      return { success: true, data: normalizeProduct(created) }
    }

    return apiClient.post('/api/v1/recipes', data)
  }

  /**
   * Update existing product.
   */
  async updateGun(id, data) {
    invalidateQueryCache('guns_')
    invalidateQueryCache(`gun_${id}`)

    const extraImages = Array.isArray(data.images) ? data.images.slice(1) : []
    const gallerySpecs = extraImages.map((img) => `GalleryImage: ${img}`)

    // Save multi-images in localStorage
    if (Array.isArray(data.images)) {
      try {
        localStorage.setItem(`gun_images_${id}`, JSON.stringify(data.images))
      } catch {
        /* ignore */
      }
    }

    if (IS_SUPABASE) {
      const baseSpecs = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : []

      const specsArray = [...baseSpecs, ...gallerySpecs]

      const payload = {
        updated_at: new Date().toISOString(),
      }
      if (data.name !== undefined) payload.name = data.name
      if (data.type !== undefined) payload.type = data.type
      if (data.caliber !== undefined) payload.caliber = data.caliber
      if (data.price !== undefined || data.cook_time !== undefined) {
        payload.price = Number(data.price ?? data.cook_time ?? 0)
      }
      if (data.description !== undefined) payload.description = data.description
      if (specsArray !== undefined) payload.specs = specsArray
      if (data.image_url !== undefined) payload.image_url = data.image_url

      const res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, {
        headers: { Prefer: 'return=representation' },
      })
      const updated = Array.isArray(res) ? res[0] : res
      return { success: true, data: normalizeProduct(updated) }
    }

    return apiClient.put(`/api/v1/recipes/${id}`, data)
  }

  /**
   * Delete product.
   */
  async deleteGun(id) {
    invalidateQueryCache('guns_')
    invalidateQueryCache(`gun_${id}`)

    try {
      localStorage.removeItem(`gun_images_${id}`)
    } catch {
      /* ignore */
    }

    if (IS_SUPABASE) {
      await apiClient.delete(`/rest/v1/products?id=eq.${id}`)
      return { success: true }
    }
    return apiClient.delete(`/api/v1/recipes/${id}`)
  }
}

export default new GunService()

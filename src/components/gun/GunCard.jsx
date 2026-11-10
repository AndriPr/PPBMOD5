import { useState } from 'react'
import { Share2, Archive, Check } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import LazyImage from '../common/LazyImage'
import { formatPrice, truncate } from '../../utils/helpers'

/**
 * Product card used in the catalog grid.
 * Features:
 * - Lazy Load image (Task 6.6.2)
 * - Share Link button directing to specific item (Task 6.6.1)
 * - Soft delete / archive button (Task 6.6.5)
 * - Edit / Delete / Favorite controls
 */
export default function GunCard({ gun, onSelect, onEdit, onDelete, onArchive }) {
  const [copied, setCopied] = useState(false)
  const imgSrc = (gun.images && gun.images[0]) || gun.image_url || gun.image || '/guns/pistol.svg'
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  // 6.6.1 Sharelink handler
  const handleShare = async (e) => {
    e.stopPropagation()
    const targetId = gun.id || gun.name
    const shareUrl = `${window.location.origin}${window.location.pathname}?gun=${encodeURIComponent(targetId)}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bore & Barrel — ${gun.name}`,
          text: `Check out ${gun.name} (${category} · ${caliber}) on Bore & Barrel:`,
          url: shareUrl,
        })
        return
      } catch {
        /* fallback to clipboard if share was cancelled */
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('Copy this product link:', shareUrl)
    }
  }

  // 6.6.5 Archive handler
  const handleArchive = (e) => {
    e.stopPropagation()
    if (onArchive) {
      onArchive(gun)
    }
  }

  return (
    <li className="card">
      <button
        type="button"
        className="card-btn"
        onClick={() => onSelect(gun)}
        aria-label={`View ${gun.name}`}
      >
        <LazyImage
          className="card-img"
          src={imgSrc}
          alt={gun.name}
          width="100%"
          height="180px"
        />

        <span className="name display">{gun.name}</span>

        <span className="type">
          {category}
          {caliber ? ` · ${caliber}` : ''}
        </span>

        {gun.description && (
          <span className="card-desc">{truncate(gun.description, 72)}</span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginTop: 'auto' }}>
          <span className="price">{formatPrice(price)}</span>
          {Array.isArray(gun.images) && gun.images.length > 1 && (
            <span className="mono-badge" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>
              📷 {gun.images.length} photos
            </span>
          )}
        </div>
      </button>

      {/* Floating actions row */}
      <div className="card-actions">
        {/* Share Link button (Task 6.6.1) */}
        <button
          type="button"
          className="card-act-btn"
          onClick={handleShare}
          aria-label={`Share ${gun.name}`}
          title={copied ? 'Link Copied!' : 'Share Product Link'}
        >
          {copied ? <Check size={14} color="var(--brass)" /> : <Share2 size={14} />}
        </button>

        {/* Archive button (Task 6.6.5) */}
        {onArchive && (
          <button
            type="button"
            className="card-act-btn"
            onClick={handleArchive}
            aria-label={`Archive ${gun.name}`}
            title="Archive Product"
          >
            <Archive size={14} />
          </button>
        )}

        <FavoriteButton gunId={gun.id || gun.name} />

        {onEdit && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => { e.stopPropagation(); onEdit(gun) }}
            aria-label={`Edit ${gun.name}`}
            title="Edit"
          >
            ✏️
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            className="card-act-btn card-act-btn--danger"
            onClick={(e) => { e.stopPropagation(); onDelete(gun) }}
            aria-label={`Delete ${gun.name}`}
            title="Delete"
          >
            🗑️
          </button>
        )}
      </div>
    </li>
  )
}

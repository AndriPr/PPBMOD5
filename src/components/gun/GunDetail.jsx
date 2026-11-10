import { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Star,
  Send,
  Loader,
  Share2,
  Check,
  Archive,
  Edit2,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  X,
  Save,
} from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import LazyImage from '../common/LazyImage'
import { useReviews, useCreateReview } from '../../hooks/useReviews'
import reviewService from '../../services/reviewService'
import { getUserIdentifier } from '../../services/userService'
import { formatPrice, averageRating } from '../../utils/helpers'

/**
 * Full-screen product detail view.
 * Features:
 * - Multi-image gallery carousel (Task 6.6.7)
 * - Share Link direct button (Task 6.6.1)
 * - Soft delete / archive (Task 6.6.5)
 * - Review edit, delete (for own review) & like/dislike (for other reviews) (Task 6.6.6)
 */
export default function GunDetail({ gun, onBack, onEdit, onDelete, onArchive }) {
  const currentUserId = getUserIdentifier()

  // Multi-image gallery state (Task 6.6.7)
  const imageList = useMemo(() => {
    if (Array.isArray(gun.images) && gun.images.length > 0) {
      return gun.images
    }
    return [gun.image_url || gun.image || '/guns/pistol.svg']
  }, [gun])

  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const activeImage = imageList[activeImageIndex] || imageList[0]

  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  // Sharelink state (Task 6.6.1)
  const [copiedShare, setCopiedShare] = useState(false)
  const handleShare = async () => {
    const targetId = gun.id || gun.name
    const shareUrl = `${window.location.origin}${window.location.pathname}?gun=${encodeURIComponent(targetId)}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bore & Barrel — ${gun.name}`,
          text: `Check out ${gun.name} on Bore & Barrel:`,
          url: shareUrl,
        })
        return
      } catch {
        /* cancel fallback */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2000)
    } catch {
      prompt('Copy this product link:', shareUrl)
    }
  }

  // Reviews
  const { reviews, loading: reviewsLoading, refetch: refetchReviews } = useReviews(gun.id)
  const { createReview, loading: submitting } = useCreateReview()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  // Edit review state (Task 6.6.6)
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')
  const [updatingReview, setUpdatingReview] = useState(false)
  const [deletingReviewId, setDeletingReviewId] = useState(null)

  // Like/Dislike state for reviews (Task 6.6.6)
  const [reactions, setReactions] = useState(() => {
    try {
      const raw = localStorage.getItem('bore_barrel_review_reactions')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  const [reactionCounts, setReactionCounts] = useState(() => {
    try {
      const raw = localStorage.getItem('bore_barrel_review_counts')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  const handleToggleReaction = (reviewId, type) => {
    const currentReaction = reactions[reviewId]
    const counts = { ...(reactionCounts[reviewId] || { likes: 0, dislikes: 0 }) }
    const newReactions = { ...reactions }

    if (currentReaction === type) {
      // Undo reaction
      delete newReactions[reviewId]
      counts[type === 'like' ? 'likes' : 'dislikes'] = Math.max(0, (counts[type === 'like' ? 'likes' : 'dislikes'] || 0) - 1)
    } else {
      // If switching from opposite
      if (currentReaction) {
        counts[currentReaction === 'like' ? 'likes' : 'dislikes'] = Math.max(0, (counts[currentReaction === 'like' ? 'likes' : 'dislikes'] || 0) - 1)
      }
      newReactions[reviewId] = type
      counts[type === 'like' ? 'likes' : 'dislikes'] = (counts[type === 'like' ? 'likes' : 'dislikes'] || 0) + 1
    }

    const updatedCounts = { ...reactionCounts, [reviewId]: counts }
    setReactions(newReactions)
    setReactionCounts(updatedCounts)

    try {
      localStorage.setItem('bore_barrel_review_reactions', JSON.stringify(newReactions))
      localStorage.setItem('bore_barrel_review_counts', JSON.stringify(updatedCounts))
    } catch {
      /* ignore */
    }
  }

  // Submit new review
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    setReviewSuccess('')

    if (rating < 1 || rating > 5) {
      setReviewError('Rating must be between 1 and 5.')
      return
    }

    const result = await createReview(gun.id, {
      user_identifier: currentUserId,
      user_id: currentUserId,
      rating,
      comment: comment.trim(),
    })

    if (result) {
      setReviewSuccess('Review submitted!')
      setComment('')
      setRating(5)
      refetchReviews()
      setTimeout(() => setReviewSuccess(''), 4000)
    } else {
      setReviewError('Could not submit review. The server may be unavailable.')
    }
  }

  // Start editing review (Task 6.6.6)
  const handleStartEdit = (rev) => {
    setEditingReviewId(rev.id)
    setEditRating(rev.rating || 5)
    setEditComment(rev.comment || '')
  }

  // Save edited review (Task 6.6.6)
  const handleSaveEditReview = async (reviewId) => {
    try {
      setUpdatingReview(true)
      await reviewService.updateReview(reviewId, {
        rating: editRating,
        comment: editComment.trim(),
      })
      setEditingReviewId(null)
      refetchReviews()
      setReviewSuccess('Review updated successfully.')
      setTimeout(() => setReviewSuccess(''), 3000)
    } catch (err) {
      alert(err.message || 'Failed to update review.')
    } finally {
      setUpdatingReview(false)
    }
  }

  // Delete own review (Task 6.6.6)
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return
    try {
      setDeletingReviewId(reviewId)
      await reviewService.deleteReview(reviewId)
      refetchReviews()
      setReviewSuccess('Review deleted.')
      setTimeout(() => setReviewSuccess(''), 3000)
    } catch (err) {
      alert(err.message || 'Failed to delete review.')
    } finally {
      setDeletingReviewId(null)
    }
  }

  const avgRating = gun.average_rating || averageRating(reviews)
  const reviewCount = gun.review_count ?? reviews.length

  return (
    <div className="detail">
      {/* Top navigation row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Catalog
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Sharelink button (Task 6.6.1) */}
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={handleShare}
            title="Share direct link to this hardware"
          >
            {copiedShare ? (
              <>
                <Check size={14} color="var(--brass)" /> Link Copied!
              </>
            ) : (
              <>
                <Share2 size={14} /> Share Link
              </>
            )}
          </button>

          {/* Soft delete / Archive button (Task 6.6.5) */}
          {onArchive && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => { onArchive(gun); onBack() }}
              title="Archive this hardware item"
            >
              <Archive size={14} /> Archive
            </button>
          )}
        </div>
      </div>

      {/* Hero Section with Multi-Image Gallery (Task 6.6.7) */}
      <div className="detail-hero">
        <div className="detail-gallery-wrap" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'relative', width: '100%', height: '320px', background: '#f7f9fa', borderBottom: '1px solid var(--line)' }}>
            <LazyImage
              className="detail-img"
              src={activeImage}
              alt={gun.name}
              width="100%"
              height="100%"
            />
            {imageList.length > 1 && (
              <span
                className="mono-badge"
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  background: 'rgba(24, 34, 44, 0.75)',
                  color: '#fff',
                  border: 'none',
                }}
              >
                {activeImageIndex + 1} / {imageList.length}
              </span>
            )}
          </div>

          {/* Thumbnails row (Task 6.6.7) */}
          {imageList.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 16px',
                overflowX: 'auto',
                background: '#fafbfb',
                borderBottom: '1px solid var(--line)',
              }}
            >
              {imageList.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  style={{
                    padding: 0,
                    border: activeImageIndex === idx ? '2px solid var(--brass)' : '1px solid var(--line)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    width: '64px',
                    height: '48px',
                    flexShrink: 0,
                    background: '#fff',
                    opacity: activeImageIndex === idx ? 1 : 0.65,
                    transition: 'all 0.15s ease',
                  }}
                  title={`View image ${idx + 1}`}
                >
                  <img
                    src={imgUrl}
                    alt={`${gun.name} thumbnail ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <h1 className="display">{gun.name}</h1>
          <p className="type">
            {category}
            {caliber ? ` · ${caliber}` : ''}
          </p>
          <p className="price detail-price">{formatPrice(price)}</p>

          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
            </p>
          )}

          <div className="detail-actions">
            <FavoriteButton gunId={gun.id || gun.name} />
            {onEdit && (
              <button type="button" className="btn btn--outline" onClick={() => onEdit(gun)}>
                Edit
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn--danger" onClick={() => onDelete(gun)}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="detail-section">
        <h2>Description</h2>
        <p>{gun.description || 'No description available.'}</p>
      </section>

      {/* Specifications */}
      {gun.ingredients && gun.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Specifications</h2>
          <ul className="detail-specs">
            {gun.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}</strong> — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Assembly / Maintenance Steps */}
      {gun.steps && gun.steps.length > 0 && (
        <section className="detail-section">
          <h2>Assembly &amp; Maintenance Protocol</h2>
          <ol className="detail-steps">
            {gun.steps.map((step, i) => (
              <li key={step.id || i}>
                {step.instruction || step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Reviews Section with Edit/Delete (Own) and Like/Dislike (Others) (Task 6.6.6) */}
      <section className="detail-section">
        <h2>Operator Reviews &amp; Field Evaluations</h2>

        {/* Submit review form */}
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="star-btn"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={22}
                  fill={n <= rating ? 'var(--brass)' : 'none'}
                  stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'}
                />
              </button>
            ))}
          </div>

          <textarea
            className="review-input"
            rows="3"
            placeholder="Write a field evaluation report (optional)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />

          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || !gun.id}
          >
            {submitting ? (
              <><Loader size={16} className="spin" /> Submitting…</>
            ) : (
              <><Send size={16} /> Submit Review</>
            )}
          </button>

          {reviewError && <p className="form-error">{reviewError}</p>}
          {reviewSuccess && <p className="form-success">{reviewSuccess}</p>}
          {!gun.id && (
            <p className="form-hint">
              Reviews require a server-generated product ID.
            </p>
          )}
        </form>

        {/* Existing reviews */}
        {reviewsLoading ? (
          <p className="detail-loading">Loading reviews…</p>
        ) : reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => {
              const myId = String(currentUserId)
              const revUserId = String(rev.user_id || rev.raw_user_id || '')
              const isMyReview =
                Boolean(revUserId && revUserId === myId) ||
                rev.user_identifier === `Operator ${myId.substring(0, 8)}`

              const myReaction = reactions[rev.id]
              const counts = reactionCounts[rev.id] || { likes: 0, dislikes: 0 }
              const isEditingThis = editingReviewId === rev.id

              return (
                <li key={rev.id} className="review-item" style={{ padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
                  <div className="review-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="review-user">{rev.user_identifier || 'Anonymous'}</span>
                      {isMyReview && (
                        <span className="mono-badge" style={{ fontSize: '0.72rem', background: 'var(--brass)', color: '#fff', border: 'none' }}>
                          You
                        </span>
                      )}
                    </div>

                    <div className="review-stars-display">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < rev.rating ? 'var(--brass)' : 'none'}
                          stroke={i < rev.rating ? 'var(--brass)' : 'var(--line)'}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Review Content / Inline Edit Mode (Task 6.6.6) */}
                  {isEditingThis ? (
                    <div style={{ marginTop: '8px', padding: '12px', background: 'var(--paper)', borderRadius: '4px' }}>
                      <div className="review-stars" style={{ marginBottom: '8px' }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className="star-btn"
                            onClick={() => setEditRating(n)}
                          >
                            <Star
                              size={18}
                              fill={n <= editRating ? 'var(--brass)' : 'none'}
                              stroke={n <= editRating ? 'var(--brass)' : 'var(--steel)'}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="review-input"
                        rows="2"
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => handleSaveEditReview(rev.id)}
                          disabled={updatingReview}
                        >
                          <Save size={14} /> {updatingReview ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => setEditingReviewId(null)}
                        >
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="review-comment" style={{ margin: '6px 0 10px', color: 'var(--ink)' }}>
                      {rev.comment}
                    </p>
                  )}

                  {/* Actions Row: Edit/Delete for own review, Like/Dislike for others (Task 6.6.6) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                    {isMyReview ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!isEditingThis && (
                          <button
                            type="button"
                            className="btn btn--outline btn--sm"
                            onClick={() => handleStartEdit(rev)}
                            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn--danger-ghost btn--sm"
                          onClick={() => handleDeleteReview(rev.id)}
                          disabled={deletingReviewId === rev.id}
                          style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        >
                          <Trash2 size={12} /> {deletingReviewId === rev.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Thumbs Up (Like) */}
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(rev.id, 'like')}
                          className="btn btn--outline btn--sm"
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderColor: myReaction === 'like' ? 'var(--brass)' : 'var(--line)',
                            color: myReaction === 'like' ? 'var(--brass)' : 'var(--steel)',
                            fontWeight: myReaction === 'like' ? 700 : 500,
                          }}
                          title="Like this evaluation"
                        >
                          <ThumbsUp size={13} fill={myReaction === 'like' ? 'var(--brass)' : 'none'} />
                          <span>{counts.likes || 0}</span>
                        </button>

                        {/* Thumbs Down (Dislike) */}
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(rev.id, 'dislike')}
                          className="btn btn--outline btn--sm"
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderColor: myReaction === 'dislike' ? '#c0392b' : 'var(--line)',
                            color: myReaction === 'dislike' ? '#c0392b' : 'var(--steel)',
                            fontWeight: myReaction === 'dislike' ? 700 : 500,
                          }}
                          title="Dislike this evaluation"
                        >
                          <ThumbsDown size={13} fill={myReaction === 'dislike' ? '#c0392b' : 'none'} />
                          <span>{counts.dislikes || 0}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="detail-empty">No field evaluations yet. Be the first operator to report!</p>
        )}
      </section>
    </div>
  )
}

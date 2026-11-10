import { useState, useMemo } from 'react'
import {
  Shield,
  Copy,
  Check,
  Heart,
  FileText,
  Camera,
  Play,
  Edit3,
  Archive,
  RefreshCw,
  Trash2,
  X,
  Save,
  MapPin,
  Clock,
  Phone,
  Info,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import {
  getAllDraftIds,
  loadDraft,
  deleteDraft,
  getDraftTimestamp,
  formatDraftTime,
} from '../utils/draftStorage'
import {
  getArchivedGuns,
  restoreGun,
  removePermanentlyFromArchive,
} from '../utils/archiveStorage'
import gunService from '../services/gunService'
import ConfirmModal from '../components/modals/ConfirmModal'
import { formatPrice } from '../utils/helpers'

/**
 * ProfilePage — User identity, settings, drafts, archives, and armory info.
 * Fulfills Task 6.6.4 (About/Contact embedded, Drafts list, Edit Profile modal)
 * and Task 6.6.5 (Archived items management: restore & permanent delete).
 */
export default function ProfilePage({ onReplaySplash, onNavigate }) {
  const [profile, setProfile] = useState(() => userService.getUserProfile())
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')

  const { favorites } = useFavorites()

  // 1. Edit Profile Modal State (Task 6.6.4)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editUsername, setEditUsername] = useState(profile.username || 'Shooter')
  const [editBio, setEditBio] = useState(profile.bio || '')
  const [editAvatar, setEditAvatar] = useState(profile.avatar || null)

  // 2. Drafts state (Task 6.6.4)
  const [draftRefreshKey, setDraftRefreshKey] = useState(0)
  const draftList = useMemo(() => {
    const ids = getAllDraftIds()
    return ids.map((id) => {
      const data = loadDraft(id)
      const ts = getDraftTimestamp(id)
      return {
        id,
        name: data?.formData?.name || 'Untitled Hardware Draft',
        type: data?.formData?.type || 'Standard',
        caliber: data?.formData?.caliber || '—',
        timestamp: ts,
        formattedTime: formatDraftTime(ts),
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftRefreshKey])

  // 3. Archives state (Task 6.6.5)
  const [archiveRefreshKey, setArchiveRefreshKey] = useState(0)
  const archivedGuns = useMemo(() => {
    return getArchivedGuns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveRefreshKey])

  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null)
  const [isDeletingPermanent, setIsDeletingPermanent] = useState(false)

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Edit Profile Save
  const handleSaveProfile = (e) => {
    e.preventDefault()
    const updated = {
      ...profile,
      username: editUsername.trim() || 'Shooter',
      bio: editBio.trim(),
      avatar: editAvatar,
    }
    const result = userService.saveUserProfile(updated)
    if (result.success) {
      setProfile(result.data)
      setIsEditModalOpen(false)
      setFeedback('Profile successfully updated.')
      setTimeout(() => setFeedback(''), 3000)
    } else {
      setFeedback('Failed to save profile.')
    }
  }

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Avatar image must be under 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setEditAvatar(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  // Draft operations
  const handleResumeDraft = (draftId) => {
    if (onNavigate) {
      if (draftId === 'create') {
        onNavigate('Create')
      } else {
        onNavigate('Edit', { id: draftId })
      }
    }
  }

  const handleDeleteDraft = (draftId) => {
    deleteDraft(draftId)
    setDraftRefreshKey((k) => k + 1)
    setFeedback('Draft discarded.')
    setTimeout(() => setFeedback(''), 3000)
  }

  // Archive operations (Task 6.6.5)
  const handleRestoreGun = (gunId) => {
    const success = restoreGun(gunId)
    if (success) {
      setArchiveRefreshKey((k) => k + 1)
      setFeedback('Hardware item restored to Catalog.')
      setTimeout(() => setFeedback(''), 3000)
    }
  }

  const handleConfirmPermanentDelete = async () => {
    if (!permanentDeleteTarget) return
    try {
      setIsDeletingPermanent(true)
      removePermanentlyFromArchive(permanentDeleteTarget.id)
      await gunService.deleteGun(permanentDeleteTarget.id)
      setPermanentDeleteTarget(null)
      setArchiveRefreshKey((k) => k + 1)
      setFeedback('Item permanently removed.')
      setTimeout(() => setFeedback(''), 3000)
    } catch {
      setFeedback('Failed to permanently delete item.')
    } finally {
      setIsDeletingPermanent(false)
    }
  }

  return (
    <div className="profile-page">
      {/* Top Masthead */}
      <section
        className="masthead"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 className="display">Operator Profile &amp; Armory HQ</h1>
          <p className="lede">
            Operator identity, procurement metrics, offline catalog drafts, and archived hardware.
          </p>
        </div>
        {onReplaySplash && (
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={onReplaySplash}
            title="Replay introductory splash animation"
          >
            <Play size={14} /> Replay Intro
          </button>
        )}
      </section>

      {feedback && (
        <div className="toast toast--success">
          <Check size={18} /> {feedback}
        </div>
      )}

      {/* Operator Identity Card with "Edit Profile" Button (Task 6.6.4) */}
      <div className="profile-card">
        <div className="profile-card-top" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="avatar-wrap">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.username} className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">
                  <Shield size={36} stroke="var(--brass)" />
                </div>
              )}
            </div>

            <div className="profile-identity">
              <h2 className="display" style={{ margin: '0 0 4px' }}>
                {profile.username || 'Shooter'}
              </h2>
              <div className="profile-id-row">
                <span className="mono-badge">{profile.userId}</span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={handleCopyId}
                  title="Copy User ID to clipboard"
                >
                  {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
                </button>
              </div>
              {profile.bio && (
                <p style={{ margin: '8px 0 0', color: 'var(--steel)', fontSize: '0.9rem' }}>
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Trigger button for Edit Profile Modal (Task 6.6.4) */}
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => {
              setEditUsername(profile.username || 'Shooter')
              setEditBio(profile.bio || '')
              setEditAvatar(profile.avatar || null)
              setIsEditModalOpen(true)
            }}
          >
            <Edit3 size={15} /> Edit Profile
          </button>
        </div>

        {/* Stats Grid */}
        <div className="profile-stats">
          <div className="stat-item">
            <Heart size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Procurement Favorites</div>
          </div>
          <div className="stat-item">
            <FileText size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{draftList.length}</div>
            <div className="stat-label">Saved Offline Drafts</div>
          </div>
          <div className="stat-item">
            <Archive size={20} className="stat-icon" stroke="#c0392b" />
            <div className="stat-val">{archivedGuns.length}</div>
            <div className="stat-label">Archived Hardware</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Saved Catalog Drafts (Task 6.6.4) */}
      <section className="detail-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem' }}>Saved Catalog Drafts</h2>
            <p style={{ margin: 0, color: 'var(--steel)', fontSize: '0.88rem' }}>
              Unfinished weapon registrations stored in localStorage.
            </p>
          </div>
          <span className="mono-badge">{draftList.length} Draft{draftList.length !== 1 ? 's' : ''}</span>
        </div>

        {draftList.length === 0 ? (
          <p style={{ color: 'var(--steel)', fontStyle: 'italic', margin: '12px 0 0' }}>
            No saved drafts found. When creating or editing hardware, use "Save Draft" or let auto-save store your work.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {draftList.map((d) => (
              <li
                key={d.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <strong style={{ fontSize: '1rem' }}>{d.name}</strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--steel)', marginTop: '2px' }}>
                    Type: {d.type} · Caliber: {d.caliber} · {d.formattedTime ? `Saved ${d.formattedTime}` : 'Recently saved'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => handleResumeDraft(d.id)}
                  >
                    Resume Editing
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger-ghost btn--sm"
                    onClick={() => handleDeleteDraft(d.id)}
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* SECTION 2: Soft Delete / Archived Hardware (Task 6.6.5) */}
      <section className="detail-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem' }}>Archived Hardware (Arsip)</h2>
            <p style={{ margin: 0, color: 'var(--steel)', fontSize: '0.88rem' }}>
              Soft-deleted hardware pieces. Can be restored back to the active catalog or permanently removed.
            </p>
          </div>
          <span className="mono-badge">{archivedGuns.length} Archived</span>
        </div>

        {archivedGuns.length === 0 ? (
          <p style={{ color: 'var(--steel)', fontStyle: 'italic', margin: '12px 0 0' }}>
            No hardware items currently archived. Click the archive icon on any catalog card to store it here.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {archivedGuns.map((gun) => (
              <li
                key={gun.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={(gun.images && gun.images[0]) || gun.image_url || '/guns/pistol.svg'}
                    alt={gun.name}
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line)' }}
                  />
                  <div>
                    <strong style={{ fontSize: '1rem' }}>{gun.name}</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--steel)' }}>
                      {gun.type || gun.category} · {gun.caliber} · {formatPrice(gun.price ?? gun.cook_time ?? 0)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => handleRestoreGun(gun.id)}
                    title="Restore hardware to active catalog"
                  >
                    <RefreshCw size={13} /> Restore (Pulihkan)
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => setPermanentDeleteTarget(gun)}
                    title="Delete permanently from server and storage"
                  >
                    <Trash2 size={13} /> Delete Permanently
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* SECTION 3: About the Armory (Moved from Navbar - Task 6.6.4) */}
      <section className="detail-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Info size={18} stroke="var(--brass)" />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>About Bore &amp; Barrel</h2>
        </div>
        <p className="lede" style={{ margin: 0, fontSize: '0.98rem' }}>
          A one-room tactical armory. Bore &amp; Barrel sells a short, honest list of firearms and accessories.
          Every piece is priced directly from the gunsmith bench — no markup theatre, no filler.
        </p>
      </section>

      {/* SECTION 4: Contact & Range Road (Moved from Navbar - Task 6.6.4) */}
      <section className="detail-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <MapPin size={18} stroke="var(--brass)" />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Armory Station &amp; Contact</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '12px' }}>
          <div style={{ padding: '12px', background: 'var(--paper)', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
              <MapPin size={15} /> Location
            </div>
            <p style={{ margin: 0, color: 'var(--steel)', fontSize: '0.9rem' }}>
              123 Range Road, Sector 4 Gunsmith Yard
            </p>
          </div>

          <div style={{ padding: '12px', background: 'var(--paper)', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
              <Clock size={15} /> Operating Hours
            </div>
            <p style={{ margin: 0, color: 'var(--steel)', fontSize: '0.9rem' }}>
              Tuesday to Saturday, 10:00 AM – 6:00 PM
            </p>
          </div>

          <div style={{ padding: '12px', background: 'var(--paper)', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
              <Phone size={15} /> Comms
            </div>
            <p style={{ margin: 0, color: 'var(--steel)', fontSize: '0.9rem' }}>
              (555) 010-0100 · Secure Band 412
            </p>
          </div>
        </div>
      </section>

      {/* POPUP MODAL: Edit Profile (Task 6.6.4) */}
      {isEditModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 className="modal-title display" style={{ margin: 0 }}>
                Edit Operator Profile
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsEditModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              {/* Avatar Selector inside Modal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="avatar-wrap" style={{ width: '64px', height: '64px' }}>
                  {editAvatar ? (
                    <img src={editAvatar} alt="Preview" className="avatar-img" />
                  ) : (
                    <div className="avatar-placeholder">
                      <Shield size={28} stroke="var(--brass)" />
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="modal-avatar-file" className="btn btn--outline btn--sm" style={{ cursor: 'pointer' }}>
                    <Camera size={14} /> Choose Avatar Image
                    <input
                      id="modal-avatar-file"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden-file-input"
                    />
                  </label>
                  <p style={{ fontSize: '0.78rem', color: 'var(--steel)', margin: '4px 0 0' }}>
                    Max file size: 2MB (JPG/PNG)
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="modal-callsign">
                  Callsign / Operator Alias
                </label>
                <input
                  id="modal-callsign"
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="e.g. Operator Delta, Master Armorer"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="modal-bio">
                  Armory Notes / Station Bio
                </label>
                <textarea
                  id="modal-bio"
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Operational background, qualifications, favored calibers..."
                  className="form-textarea"
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className="modal-btn modal-btn--cancel"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn modal-btn--confirm">
                  <Save size={14} /> Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Permanent Deletion (Task 6.6.5) */}
      <ConfirmModal
        open={Boolean(permanentDeleteTarget)}
        title="Permanently Delete Hardware?"
        message={`Are you sure you want to permanently delete "${permanentDeleteTarget?.name}"? This action removes the item from both the archive and server permanently.`}
        confirmLabel="Permanently Delete"
        danger
        loading={isDeletingPermanent}
        onConfirm={handleConfirmPermanentDelete}
        onCancel={() => setPermanentDeleteTarget(null)}
      />
    </div>
  )
}

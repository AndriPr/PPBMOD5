import { useState, useMemo } from 'react'
import { RefreshCw, Plus, Loader, AlertCircle, PackageOpen, CheckCircle } from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import ConfirmModal from '../components/modals/ConfirmModal'
import gunService from '../services/gunService'
import { isGunArchived, archiveGun } from '../utils/archiveStorage'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

/**
 * Catalog page — the main product listing.
 * Features:
 * - Lazy Load images (Task 6.6.2)
 * - Query caching (Task 6.6.3)
 * - Share Link (Task 6.6.1)
 * - Soft delete / archive filtering (Task 6.6.5)
 */
export default function Catalog({ onNavigate }) {
  // ---- API data (cached) ----
  const { guns: apiGuns, loading, error, refetch } = useGuns({ limit: 50 })
  const [useLocal, setUseLocal] = useState(false)
  const [archiveFeedback, setArchiveFeedback] = useState('')
  const [archiveRevision, setArchiveRevision] = useState(0)

  // Decide data source
  const rawGuns = useMemo(() => {
    if (useLocal || (error && apiGuns.length === 0)) {
      return GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` }))
    }
    return apiGuns
  }, [apiGuns, error, useLocal])

  // Filter out archived items (Task 6.6.5 Soft Delete / Arsip)
  const unarchivedGuns = useMemo(() => {
    // depend on archiveRevision to trigger re-calculation when an item is archived
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return rawGuns.filter((g) => !isGunArchived(g.id))
  }, [rawGuns, archiveRevision])

  // ---- filters / sort ----
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  // ---- pagination (Ketentuan Tugas Pengganti Poin 4) ----
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6 // Tampilkan 6 produk per halaman untuk demonstrasi paginasi

  const categories = useMemo(() => extractCategories(unarchivedGuns), [unarchivedGuns])

  const filteredGuns = useMemo(() => {
    let result = unarchivedGuns.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory),
    )
    return sortItems(result, sortKey, sortOrder)
  }, [unarchivedGuns, search, activeCategory, sortKey, sortOrder])

  // Reset page saat filter atau pencarian berubah
  const totalPages = Math.ceil(filteredGuns.length / itemsPerPage) || 1
  const paginatedGuns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredGuns.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredGuns, currentPage, itemsPerPage])

  // ---- detail view ----
  const [selectedGun, setSelectedGun] = useState(null)

  // ---- archive handler (Task 6.6.5) ----
  const handleArchive = (gun) => {
    const success = archiveGun(gun)
    if (success) {
      setArchiveRevision((r) => r + 1)
      if (selectedGun && selectedGun.id === gun.id) {
        setSelectedGun(null)
      }
      setArchiveFeedback(`"${gun.name}" moved to Archive.`)
      setTimeout(() => setArchiveFeedback(''), 4000)
    }
  }

  // ---- delete handler ----
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      setDeleteError('')
      await gunService.deleteGun(deleteTarget.id)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  // ---- If viewing a single product detail ----
  if (selectedGun) {
    return (
      <GunDetail
        gun={selectedGun}
        onBack={() => setSelectedGun(null)}
        onEdit={(g) => onNavigate && onNavigate('Edit', g)}
        onDelete={(g) => { setSelectedGun(null); setDeleteTarget(g) }}
        onArchive={handleArchive}
      />
    )
  }

  // ---- Main catalog view ----
  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      {archiveFeedback && (
        <div className="toast toast--success" style={{ margin: '16px 0' }}>
          <CheckCircle size={18} /> {archiveFeedback}
        </div>
      )}

      <section>
        <div className="list-head">
          <h2>Current stock</h2>
          <div className="list-head-right">
            <span className="count">
              {filteredGuns.length} piece{filteredGuns.length !== 1 ? 's' : ''}
            </span>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AdvancedFilter
          search={search}
          onSearch={setSearch}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={setActiveCategory}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => { setSortKey(key); setSortOrder(order) }}
        />

        {/* States */}
        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}

        {!loading && error && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setUseLocal(true)}
              >
                View Local Catalog
              </button>
            </div>
          </div>
        )}

        {!loading && filteredGuns.length === 0 && !error && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>No products match your search or current filters.</p>
          </div>
        )}

        {/* Product grid with LazyImage and Share */}
        {paginatedGuns.length > 0 && (
          <>
            <ul className="stock">
              {paginatedGuns.map((gun) => (
                <GunCard
                  key={gun.id || gun.name}
                  gun={gun}
                  onSelect={setSelectedGun}
                  onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                  onDelete={setDeleteTarget}
                  onArchive={handleArchive}
                />
              ))}
            </ul>

            {/* Pagination Controls (Poin 4 Tugas Pengganti) */}
            {totalPages > 1 && (
              <div
                className="pagination-controls"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '28px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--line)',
                }}
              >
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1))
                    window.scrollTo({ top: 300, behavior: 'smooth' })
                  }}
                  disabled={currentPage === 1}
                >
                  &larr; Prev
                </button>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      className={`btn btn--sm ${currentPage === pg ? 'btn--primary' : 'btn--outline'}`}
                      style={{ minWidth: '36px', padding: '6px 10px' }}
                      onClick={() => {
                        setCurrentPage(pg)
                        window.scrollTo({ top: 300, behavior: 'smooth' })
                      }}
                    >
                      {pg}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                    window.scrollTo({ top: 300, behavior: 'smooth' })
                  }}
                  disabled={currentPage === totalPages}
                >
                  Next &rarr;
                </button>

                <span style={{ fontSize: '0.82rem', color: 'var(--steel)', marginLeft: '12px' }}>
                  Page {currentPage} of {totalPages} ({filteredGuns.length} total)
                </span>
              </div>
            )}
          </>
        )}

        {useLocal && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => { setUseLocal(false); refetch() }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
      />
      {deleteError && (
        <div className="toast toast--error">{deleteError}</div>
      )}
    </>
  )
}

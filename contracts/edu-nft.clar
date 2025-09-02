;; edu-nft.clar
;; EduNFT: Core Smart Contract for Minting and Managing Educational Content NFTs
;; This contract handles the minting of non-fungible tokens (NFTs) representing educational content,
;; such as courses, videos, or textbooks. It includes features for ownership transfer, versioning,
;; licensing, categorization, collaboration, status updates, and revenue sharing to make it robust
;; for real-world educational content monetization and impact tracking.

;; Constants
(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant ERR-ALREADY-EXISTS (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-INVALID-PARAM (err u103))
(define-constant ERR-PAUSED (err u104))
(define-constant ERR-METADATA-TOO-LONG (err u105))
(define-constant ERR-INVALID-SHARE (err u106))
(define-constant MAX-METADATA-LEN u1024)
(define-constant MAX-TAGS u10)
(define-constant MAX-PERMISSIONS u5)
(define-constant MAX-VERSIONS u100) ;; Arbitrary limit to prevent abuse

;; Data Variables
(define-data-var contract-paused bool false)
(define-data-var admin principal tx-sender)
(define-data-var token-id-nonce uint u0)

;; Non-Fungible Token Definition
(define-non-fungible-token edu-nft uint)

;; Data Maps
;; Core registry for NFT metadata
(define-map content-registry
  { token-id: uint }
  { 
    creator: principal,
    current-owner: principal,
    content-hash: (buff 32),
    title: (string-utf8 256),
    description: (string-utf8 1024),
    mint-timestamp: uint
  }
)

;; Version history for content updates
(define-map version-registry
  { token-id: uint, version: uint }
  { 
    updated-hash: (buff 32),
    update-notes: (string-utf8 512),
    timestamp: uint
  }
)

;; Licensing for content access
(define-map licenses
  { token-id: uint, licensee: principal }
  {
    expiry: uint,
    terms: (string-utf8 512),
    active: bool,
    granted-by: principal,
    grant-timestamp: uint
  }
)

;; Categories and tags for discoverability
(define-map work-categories
  { token-id: uint }
  { 
    category: (string-utf8 128), ;; e.g., "Mathematics", "History"
    tags: (list 10 (string-utf8 64)) ;; e.g., ["algebra", "beginner"]
  }
)

;; Collaborators for co-authored content
(define-map collaborators
  { token-id: uint, collaborator: principal }
  {
    role: (string-utf8 128), ;; e.g., "Co-Author", "Editor"
    permissions: (list 5 (string-utf8 64)), ;; e.g., ["update", "license"]
    added-at: uint,
    added-by: principal
  }
)

;; Work status for lifecycle management
(define-map work-status
  { token-id: uint }
  {
    status: (string-utf8 64), ;; e.g., "Draft", "Published", "Archived"
    visibility: bool, ;; Public or private
    last-updated: uint,
    updated-by: principal
  }
)

;; Revenue shares for royalty distribution
(define-map revenue-shares
  { token-id: uint, participant: principal }
  {
    percentage: uint, ;; 0-100
    total-received: uint, ;; Cumulative STX received
    set-by: principal
  }
)

;; Public Functions

;; Mint a new NFT for educational content
(define-public (mint-nft (content-hash (buff 32)) (title (string-utf8 256)) (description (string-utf8 1024)))
  (let
    (
      (new-id (+ (var-get token-id-nonce) u1))
      (sender tx-sender)
    )
    (asserts! (not (var-get contract-paused)) ERR-PAUSED)
    (asserts! (<= (len description) MAX-METADATA-LEN) ERR-METADATA-TOO-LONG)
    (try! (nft-mint? edu-nft new-id sender))
    (map-set content-registry
      { token-id: new-id }
      { 
        creator: sender,
        current-owner: sender,
        content-hash: content-hash,
        title: title,
        description: description,
        mint-timestamp: block-height
      }
    )
    (var-set token-id-nonce new-id)
    (ok new-id)
  )
)

;; Transfer NFT ownership
(define-public (transfer-ownership (token-id uint) (new-owner principal))
  (let
    (
      (registry (unwrap! (map-get? content-registry { token-id: token-id }) ERR-NOT-FOUND))
      (sender tx-sender)
    )
    (asserts! (is-eq (get current-owner registry) sender) ERR-UNAUTHORIZED)
    (try! (nft-transfer? edu-nft token-id sender new-owner))
    (map-set content-registry
      { token-id: token-id }
      (merge registry { current-owner: new-owner })
    )
    (ok true)
  )
)

;; Register a new version of the content
(define-public (register-new-version (token-id uint) (new-hash (buff 32)) (version uint) (notes (string-utf8 512)))
  (let
    (
      (registry (unwrap! (map-get? content-registry { token-id: token-id }) ERR-NOT-FOUND))
      (sender tx-sender)
    )
    (asserts! (is-eq (get current-owner registry) sender) ERR-UNAUTHORIZED)
    (asserts! (< version MAX-VERSIONS) ERR-INVALID-PARAM)
    (map-set version-registry
      { token-id: token-id, version: version }
      { 
        updated-hash: new-hash,
        update-notes: notes,
        timestamp: block-height
      }
    )
    (ok true)
  )
)

;; Grant a license to a licensee
(define-public (grant-license (token-id uint) (licensee principal) (duration uint) (terms (string-utf8 512)))
  (let
    (
      (registry (unwrap! (map-get? content-registry { token-id: token-id }) ERR-NOT-FOUND))
      (sender tx-sender)
    )
    (asserts! (is-eq (get current-owner registry) sender) ERR-UNAUTHORIZED)
    (asserts! (> duration u0) ERR-INVALID-PARAM)
    (map-set licenses
      { token-id: token-id, licensee: licensee }
      {
        expiry: (+ block-height duration),
        terms: terms,
        active: true,
        granted-by: sender,
        grant-timestamp: block-height
      }
    )
    (ok true)
  )
)

;; Revoke a license
(define-public (revoke-license (token-id uint) (licensee principal))
  (let
    (
      (registry (unwrap! (map-get? content-registry { token-id: token-id }) ERR-NOT-FOUND))
      (license (map-get? licenses { token-id: token-id, licensee: licensee }))
      (sender tx-sender)
    )
    (asserts! (is-eq (get current-owner registry) sender) ERR-UNAUTHORIZED)
    (asserts! (is-some license) ERR-NOT-FOUND)
    (map-set licenses
      { token-id: token-id, licensee: licensee }
      (merge (unwrap! license ERR-NOT-FOUND) { active: false })
    )
    (ok true)
  )
)

;; Add or update categories and tags
(define-public (set-categories (token-id uint) (category (string-utf8 128)) (tags (list 10 (string-utf8 64))))
  (let
    (
      (registry (unwrap! (map-get? content-registry { token-id: token-id }) ERR-NOT-FOUND))
      (sender tx-sender)
    )
    (asserts! (is-eq (get current-owner registry) sender) ERR-UNAUTHORIZED)
    (asserts! (<= (len tags) MAX-TAGS) ERR-INVALID-PARAM)
    (map-set work-categories
      { token-id: token-id }
      { category: category, tags: tags }
    )
    (ok true)
  )
)

;; Add a collaborator
(define-public (add-collaborator (token-id uint) (collaborator principal) (role (string-utf8 128)) (permissions (list 5 (string-utf8 64))))
  (let
    (
      (registry (unwrap! (map-get? content-registry { token-id: token-id }) ERR-NOT-FOUND))
      (sender tx-sender)
    )
    (asserts! (is-eq (get current-owner registry) sender) ERR-UNAUTHORIZED)
    (asserts! (<= (len permissions) MAX-PERMISSIONS) ERR-INVALID-PARAM)
    (asserts! (is-none (map-get? collaborators { token-id: token-id, collaborator: collaborator })) ERR-ALREADY-EXISTS)
    (map-set collaborators
      { token-id: token-id, collaborator: collaborator }
      {
        role: role,
        permissions: permissions,
        added-at: block-height,
        added-by: sender
      }
    )
    (ok true)
  )
)

;; Remove a collaborator
(define-public (remove-collaborator (token-id uint) (collaborator principal))
  (let
    (
      (registry (unwrap! (map-get? content-registry { token-id: token-id }) ERR-NOT-FOUND))
      (sender tx-sender)
    )
    (asserts! (is-eq (get current-owner registry) sender) ERR-UNAUTHORIZED)
    (map-delete collaborators { token-id: token-id, collaborator: collaborator })
    (ok true)
  )
)

;; Update work status
(define-public (update-status (token-id uint) (status (string-utf8 64)) (visibility bool))
  (let
    (
      (registry (unwrap! (map-get? content-registry { token-id: token-id }) ERR-NOT-FOUND))
      (sender tx-sender)
    )
    (asserts! (is-eq (get current-owner registry) sender) ERR-UNAUTHORIZED)
    (map-set work-status
      { token-id: token-id }
      {
        status: status,
        visibility: visibility,
        last-updated: block-height,
        updated-by: sender
      }
    )
    (ok true)
  )
)

;; Set revenue share for a participant
(define-public (set-revenue-share (token-id uint) (participant principal) (percentage uint))
  (let
    (
      (registry (unwrap! (map-get? content-registry { token-id: token-id }) ERR-NOT-FOUND))
      (sender tx-sender)
    )
    (asserts! (is-eq (get current-owner registry) sender) ERR-UNAUTHORIZED)
    (asserts! (and (> percentage u0) (<= percentage u100)) ERR-INVALID-SHARE)
    (map-set revenue-shares
      { token-id: token-id, participant: participant }
      {
        percentage: percentage,
        total-received: u0,
        set-by: sender
      }
    )
    (ok true)
  )
)

;; Admin function to pause the contract
(define-public (pause-contract)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-UNAUTHORIZED)
    (var-set contract-paused true)
    (ok true)
  )
)

;; Admin function to unpause the contract
(define-public (unpause-contract)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-UNAUTHORIZED)
    (var-set contract-paused false)
    (ok true)
  )
)

;; Admin function to transfer admin role
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-UNAUTHORIZED)
    (var-set admin new-admin)
    (ok true)
  )
)

;; Read-Only Functions

(define-read-only (get-nft-details (token-id uint))
  (map-get? content-registry { token-id: token-id })
)

(define-read-only (get-version-details (token-id uint) (version uint))
  (map-get? version-registry { token-id: token-id, version: version })
)

(define-read-only (get-license-details (token-id uint) (licensee principal))
  (map-get? licenses { token-id: token-id, licensee: licensee })
)

(define-read-only (get-categories (token-id uint))
  (map-get? work-categories { token-id: token-id })
)

(define-read-only (get-collaborator-details (token-id uint) (collaborator principal))
  (map-get? collaborators { token-id: token-id, collaborator: collaborator })
)

(define-read-only (get-status (token-id uint))
  (map-get? work-status { token-id: token-id })
)

(define-read-only (get-revenue-share (token-id uint) (participant principal))
  (map-get? revenue-shares { token-id: token-id, participant: participant })
)

(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? edu-nft token-id))
)

(define-read-only (get-last-token-id)
  (ok (var-get token-id-nonce))
)

(define-read-only (is-paused)
  (ok (var-get contract-paused))
)

(define-read-only (get-admin)
  (ok (var-get admin))
)
class Attachment < ApplicationRecord
  MAX_BYTES = 25.megabytes
  TEAM_QUOTA_BYTES = 500.megabytes
  IMAGE_TYPES = %w[image/png image/jpeg image/gif image/webp].freeze
  KINDS = %w[file inline].freeze
  ATTACHABLE_TYPES = %w[Ticket Page].freeze
  TEMPLATE_TYPES = [].freeze
  PENDING_TTL = 24.hours

  belongs_to :team
  belongs_to :attachable, polymorphic: true, optional: true
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id

  has_one_attached :file, dependent: false
  has_many :attachment_references, dependent: :delete_all

  scope :files, -> { where(kind: "file") }
  scope :inline, -> { where(kind: "inline") }
  scope :pending, -> { where(attachable_id: nil) }
  scope :newest_first, -> { order(created_at: :desc, id: :desc) }

  before_validation { self.byte_size = file.blob.byte_size if file.attached? }

  validates :kind, inclusion: { in: KINDS }
  validates :attachable_type, inclusion: { in: ATTACHABLE_TYPES + TEMPLATE_TYPES }, allow_nil: true
  validate :file_is_allowed

  after_create :change_ticket_count, if: :ticket?
  after_destroy :change_ticket_count, if: :ticket?, unless: :destroyed_by_association
  after_destroy :detach_file
  after_destroy_commit :purge_unused_blob

  def self.team_usage(team)
    where(team_id: team.id).sum(:byte_size)
  end

  def self.fits_quota?(team, extra_bytes)
    team_usage(team) + extra_bytes <= TEAM_QUOTA_BYTES
  end

  def self.purge_stale_pending
    pending.where(created_at: ...PENDING_TTL.ago).find_each(&:destroy)
  end

  def copy_for(attachable, user)
    copy = Attachment.new(team_id: team_id, attachable: attachable, kind: kind, byte_size: byte_size, creator: user)
    copy.file.attach(file.blob)
    copy
  end

  def image?
    IMAGE_TYPES.include?(file.blob.content_type)
  end

  def pending?
    attachable_id.nil?
  end

  def ticket?
    attachable_type == "Ticket"
  end

  def template?
    TEMPLATE_TYPES.include?(attachable_type)
  end

  private

  def file_is_allowed
    return errors.add(:file, :blank) unless file.attached?

    errors.add(:file, :too_large, message: "must be 25 MB or smaller") if file.blob.byte_size > MAX_BYTES
    errors.add(:kind, :inline_image_type, message: "inline images must be PNG, JPEG, GIF or WebP") if kind == "inline" && !image?
    errors.add(:kind, :ticket_inline, message: "tickets only take files") if kind == "inline" && ticket?
  end

  def change_ticket_count
    delta = destroyed? ? -1 : 1
    Ticket.where(id: attachable_id).update_all([ "attachments_count = attachments_count + ?, updated_at = ?", delta, Time.current ])
  end

  def detach_file
    @detached_blob = file.blob
    file_attachment&.delete
  end

  def purge_unused_blob
    @detached_blob.purge_later if @detached_blob && !ActiveStorage::Attachment.exists?(blob_id: @detached_blob.id)
  end
end

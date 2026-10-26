class User < ApplicationRecord
  AVATAR_COLORS = %w[red orange green lime yellow blue cyan pink purple brown beige light_grey dark_grey].freeze
  AVATAR_IMAGE_TYPES = %w[image/png image/jpeg image/webp].freeze
  AVATAR_IMAGE_MAX_BYTES = 256.kilobytes
  AVATAR_PRELOAD = { avatar_image_attachment: :blob }.freeze
  THEMES = %w[purple_haze midnight_purple graphite coffee teal_ocean terminal paper winter_forest nature].freeze
  THEME_MODES = %w[system light dark].freeze
  PASSWORD_MIN_LENGTH = 8

  has_secure_password

  has_many :memberships, -> { active }
  has_many :all_memberships, class_name: "Membership"
  has_many :teams, through: :memberships
  has_many :favorites, dependent: :destroy
  has_many :ticket_assignees, dependent: :destroy
  has_many :user_sessions, dependent: :delete_all
  has_one_attached :avatar_image

  before_save { self.email = email.downcase }

  scope :active, -> { where(deleted_at: nil) }

  validates :email, presence: true, uniqueness: { case_sensitive: false }, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: PASSWORD_MIN_LENGTH }, allow_nil: true
  validates :show_favorites_on_home, inclusion: { in: [ true, false ] }
  validates :show_favorites_in_sidebar, inclusion: { in: [ true, false ] }
  validates :show_my_work_on_home, inclusion: { in: [ true, false ] }
  validates :theme, inclusion: { in: THEMES }
  validates :theme_mode, inclusion: { in: THEME_MODES }
  validates :avatar_color, inclusion: { in: AVATAR_COLORS }, allow_nil: true
  validate :avatar_image_is_allowed

  def deleted?
    deleted_at.present?
  end

  def anonymise!
    transaction do
      memberships.each(&:remove!)
      avatar_image.purge if avatar_image.attached?
      update!(email: "deleted-#{id}@deleted.invalid", password: SecureRandom.hex(32), avatar_color: nil, deleted_at: Time.current)
    end
  end

  def effective_avatar_color
    avatar_color || AVATAR_COLORS[id % AVATAR_COLORS.length]
  end

  private

  def avatar_image_is_allowed
    return unless avatar_image.attached?

    errors.add(:avatar_image, "must be a PNG, JPEG or WebP image") unless AVATAR_IMAGE_TYPES.include?(avatar_image.blob.content_type)
    errors.add(:avatar_image, "must be 256 kB or smaller") if avatar_image.blob.byte_size > AVATAR_IMAGE_MAX_BYTES
  end
end

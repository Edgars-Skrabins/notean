class User < ApplicationRecord
  AVATAR_COLORS = %w[red orange green lime yellow blue cyan pink purple brown beige light_grey dark_grey].freeze
  AVATAR_IMAGE_TYPES = %w[image/png image/jpeg image/webp].freeze
  AVATAR_IMAGE_MAX_BYTES = 2.megabytes
  AVATAR_PRELOAD = { avatar_image_attachment: :blob }.freeze

  has_secure_password

  has_many :memberships
  has_many :teams, through: :memberships
  has_many :favorites, dependent: :destroy
  has_many :ticket_assignees, dependent: :destroy
  has_one_attached :avatar_image

  before_save { self.email = email.downcase }

  validates :email, presence: true, uniqueness: { case_sensitive: false }, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :show_favorites_on_home, inclusion: { in: [ true, false ] }
  validates :show_favorites_in_sidebar, inclusion: { in: [ true, false ] }
  validates :avatar_color, inclusion: { in: AVATAR_COLORS }, allow_nil: true
  validate :avatar_image_is_allowed

  def effective_avatar_color
    avatar_color || AVATAR_COLORS[id % AVATAR_COLORS.length]
  end

  private

  def avatar_image_is_allowed
    return unless avatar_image.attached?

    errors.add(:avatar_image, "must be a PNG, JPEG or WebP image") unless AVATAR_IMAGE_TYPES.include?(avatar_image.blob.content_type)
    errors.add(:avatar_image, "must be 2 MB or smaller") if avatar_image.blob.byte_size > AVATAR_IMAGE_MAX_BYTES
  end
end

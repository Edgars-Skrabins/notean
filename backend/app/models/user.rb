class User < ApplicationRecord
  has_secure_password

  has_many :memberships
  has_many :teams, through: :memberships
  has_many :favorites, dependent: :destroy

  before_save { self.email = email.downcase }

  validates :email, presence: true, uniqueness: { case_sensitive: false }, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :show_favorites_on_home, inclusion: { in: [true, false] }
  validates :show_favorites_in_sidebar, inclusion: { in: [true, false] }
end

class User < ApplicationRecord
  has_secure_password

  has_many :memberships
  has_many :teams, through: :memberships

  before_save { self.email = email.downcase }

  validates :email, presence: true, uniqueness: { case_sensitive: false }, format: { with: URI::MailTo::EMAIL_REGEXP }
end

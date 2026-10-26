class Team < ApplicationRecord
  FEATURES = %w[pages diagrams boards].freeze

  has_secure_password

  has_many :memberships, -> { active }
  has_many :all_memberships, class_name: "Membership", dependent: :destroy
  has_many :users, through: :memberships
  has_many :pages, dependent: :destroy
  has_many :diagrams, dependent: :destroy
  has_many :folders, dependent: :destroy
  has_many :boards, dependent: :destroy
  has_many :favorites, dependent: :destroy
  has_many :projects, dependent: :destroy

  validates :name, presence: true
  validates :code, presence: true, uniqueness: true

  before_validation :generate_code, on: :create

  def feature_enabled?(feature)
    FEATURES.include?(feature.to_s) && self["#{feature}_enabled"]
  end

  private

  def generate_code
    self.code ||= loop do
      candidate = SecureRandom.alphanumeric(32)
      break candidate unless Team.exists?(code: candidate)
    end
  end
end

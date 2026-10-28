class Team < ApplicationRecord
  include ContentLimits

  FEATURES = %w[pages diagrams boards chat].freeze

  has_secure_password

  has_many :memberships, -> { active }
  has_many :all_memberships, class_name: "Membership", dependent: :destroy
  has_many :users, through: :memberships
  has_many :pages, dependent: :destroy
  has_many :diagrams, dependent: :destroy
  has_many :folders, dependent: :destroy
  has_many :boards, dependent: :destroy
  has_many :favorites, dependent: :destroy
  has_many :notifications, dependent: :delete_all
  has_many :projects, dependent: :destroy
  has_many :templates, dependent: :delete_all
  has_many :chat_channels, dependent: :destroy
  has_many :trash_entries
  has_many :attachments, dependent: :destroy

  validates :name, presence: true, length: { maximum: TITLE_MAX_LENGTH }
  validates :code, presence: true, uniqueness: true

  before_validation :generate_code, on: :create
  before_destroy :purge_trash, prepend: true

  def feature_enabled?(feature)
    FEATURES.include?(feature.to_s) && self["#{feature}_enabled"]
  end

  private

  def purge_trash
    trash_entries.find_each { |entry| Trash.purge(entry) }
  end

  def generate_code
    self.code ||= loop do
      candidate = SecureRandom.alphanumeric(32)
      break candidate unless Team.exists?(code: candidate)
    end
  end
end

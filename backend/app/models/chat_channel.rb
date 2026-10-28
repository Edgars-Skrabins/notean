class ChatChannel < ApplicationRecord
  include ContentLimits
  include Trashable

  SCOPES = %w[team project users].freeze
  GIF_RATINGS = %w[pg pg-13].freeze

  belongs_to :team
  belongs_to :project, optional: true
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id
  has_many :chat_channel_members, dependent: :delete_all
  has_many :members, through: :chat_channel_members, source: :user
  has_many :chat_messages, dependent: :delete_all
  has_many :chat_read_states, dependent: :delete_all

  validates :name, presence: true, length: { maximum: TITLE_MAX_LENGTH }
  validates :scope, inclusion: { in: SCOPES }
  validates :gif_rating, inclusion: { in: GIF_RATINGS }
  validates :project, presence: true, if: -> { scope == "project" }
  validates :project_id, absence: true, unless: -> { scope == "project" }
  validate :name_unique_in_team

  before_validation { self.name = name.to_s.strip }
  before_destroy { Notification.where(chat_channel_id: id).delete_all }

  def self.name_taken?(team, name, except_id = nil)
    unscoped.where(team_id: team.id).where("LOWER(name) = ?", name.to_s.strip.downcase).where.not(id: except_id).exists?
  end

  def title
    name
  end

  private

  def name_unique_in_team
    errors.add(:name, :taken) if team && name.present? && self.class.name_taken?(team, name, id)
  end
end

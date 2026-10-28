class Template < ApplicationRecord
  include TitleSearchable
  include ContentLimits

  KINDS = %w[page diagram board].freeze
  PRIORITY_NAME_MAX_LENGTH = 40

  scope :without_content, -> { select(column_names - %w[content]) }

  belongs_to :team
  belongs_to :creator, class_name: "User", foreign_key: :created_by_user_id

  validates :kind, inclusion: { in: KINDS }
  validates :title, presence: true, length: { maximum: TITLE_MAX_LENGTH }
  validate :content_size
  validate :board_content_shape, if: -> { kind == "board" }

  def self.board_content_from(board)
    {
      columns: board.columns.map(&:title),
      priorities: board.priorities.map { |priority| { name: priority.name, color: priority.color } },
      tags: board.tags.map { |tag| { name: tag.name, color: tag.color } }
    }.to_json
  end

  def board_columns
    parsed_board_content["columns"]
  end

  def board_priorities
    parsed_board_content["priorities"]
  end

  def board_tags
    parsed_board_content.fetch("tags", [])
  end

  private

  def parsed_board_content
    JSON.parse(content)
  end

  def content_size
    errors.add(:content, :too_large) if content && content.bytesize > CONTENT_MAX_BYTES
  end

  def board_content_shape
    data = JSON.parse(content.to_s)
    errors.add(:content, :invalid) unless data.is_a?(Hash) && valid_columns?(data["columns"]) && valid_priorities?(data["priorities"]) && valid_tags?(data.fetch("tags", []))
  rescue JSON::ParserError
    errors.add(:content, :invalid)
  end

  def valid_columns?(columns)
    columns.is_a?(Array) && columns.all? { |title| title.is_a?(String) && title.strip.present? && title.length <= TITLE_MAX_LENGTH }
  end

  def valid_priorities?(priorities)
    return false unless priorities.is_a?(Array)
    return false unless priorities.all? { |priority| valid_priority?(priority) }

    names = priorities.map { |priority| priority["name"].downcase }
    names.uniq.length == names.length
  end

  def valid_tags?(tags)
    return false unless tags.is_a?(Array) && tags.length <= BoardTag::MAX_PER_BOARD
    return false unless tags.all? { |tag| valid_tag?(tag) }

    names = tags.map { |tag| tag["name"].strip.downcase }
    names.uniq.length == names.length
  end

  def valid_tag?(tag)
    tag.is_a?(Hash) &&
      tag["name"].is_a?(String) && tag["name"].strip.present? && tag["name"].strip.length <= BoardTag::NAME_MAX_LENGTH &&
      BoardTag::COLORS.include?(tag["color"])
  end

  def valid_priority?(priority)
    priority.is_a?(Hash) &&
      priority["name"].is_a?(String) && priority["name"].strip.present? && priority["name"].length <= PRIORITY_NAME_MAX_LENGTH &&
      BoardPriority::COLORS.include?(priority["color"])
  end
end

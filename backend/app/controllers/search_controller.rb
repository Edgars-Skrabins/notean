class SearchController < ApplicationController
  TYPES = %w[project page diagram board ticket].freeze
  TYPE_FEATURES = { "page" => :pages, "diagram" => :diagrams, "board" => :boards, "ticket" => :boards }.freeze
  MIN_QUERY_LENGTH = 1
  SECTION_LIMIT = 5
  MORE_LIMIT = 10
  SNIPPET_LENGTH = 80

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!

  def index
    @term = params[:q].to_s.strip
    return render_error(ErrorCodes::Search::QUERY_TOO_SHORT, :unprocessable_entity) if @term.length < MIN_QUERY_LENGTH

    type = params[:type]
    return render_error(ErrorCodes::Search::INVALID_TYPE, :unprocessable_entity) if type.present? && TYPES.exclude?(type)
    return render_error(ErrorCodes::Teams::FEATURE_DISABLED, :forbidden) if type.present? && enabled_types.exclude?(type)

    @boards = project_filtered(@team.boards)
    return if @boards.nil?

    if type.present?
      render json: { section: section_json(type, [ params[:offset].to_i, 0 ].max, MORE_LIMIT) }
    else
      render json: { sections: enabled_types.map { |section_type| section_json(section_type, 0, SECTION_LIMIT) } }
    end
  end

  private

  def enabled_types
    TYPES.select { |type| TYPE_FEATURES[type].nil? || @team.feature_enabled?(TYPE_FEATURES[type]) }
  end

  def section_json(type, offset, limit)
    records = search_scope(type).text_search(@term).title_match_first(@term).offset(offset).limit(limit + 1).to_a

    {
      type: type,
      results: records.first(limit).map { |record| search_result_json(type, record) },
      has_more: records.length > limit
    }
  end

  def search_scope(type)
    case type
    when "project" then visible_projects
    when "page" then project_filtered(@team.pages).includes(:project)
    when "diagram" then project_filtered(@team.diagrams).includes(:project)
    when "board" then @boards.includes(:project)
    when "ticket" then Ticket.where(team: @team, board: @boards).includes(board: :project)
    end
  end

  def visible_projects
    projects = @team.projects.where(id: project_access.visible_project_ids)
    params[:project_id].present? ? projects.where(id: params[:project_id]) : projects
  end

  def search_result_json(type, record)
    json = {
      type: type,
      id: record.id,
      title: type == "project" ? record.name : record.title,
      updated_at: record.updated_at,
      project_name: result_project_name(type, record),
      snippet: snippet(record)
    }
    return json unless type == "ticket"

    json.merge(board_id: record.board_id, board_title: record.board.title, in_backlog: record.column_id.nil?)
  end

  def result_project_name(type, record)
    case type
    when "project" then nil
    when "ticket" then record.board.project&.name
    else record.project&.name
    end
  end

  def snippet(record)
    title_column, *content_columns = record.text_search_columns
    return nil if matches?(record[title_column])

    text = content_columns.map { |column| record[column].to_s.squish }.find { |value| matches?(value) }
    text && snippet_around_match(text)
  end

  def matches?(value)
    value.to_s.downcase.include?(@term.downcase)
  end

  def snippet_around_match(text)
    return text if text.length <= SNIPPET_LENGTH

    match_index = text.downcase.index(@term.downcase)
    start = (match_index - (SNIPPET_LENGTH - @term.length) / 2).clamp(0, text.length - SNIPPET_LENGTH)
    finish = start + SNIPPET_LENGTH

    "#{start.positive? ? "…" : ""}#{text[start...finish].strip}#{finish < text.length ? "…" : ""}"
  end
end

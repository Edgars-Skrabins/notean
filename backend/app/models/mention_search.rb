class MentionSearch
  LIMIT = 8
  ITEM_TYPES = %w[ticket page diagram board project].freeze
  TYPE_FEATURES = { "ticket" => :boards, "page" => :pages, "diagram" => :diagrams, "board" => :boards }.freeze

  Result = Struct.new(:type, :record, :prefix, :context_rank)

  def initialize(team:, project_access:, query:, board_id: nil, project_id: nil)
    @team = team
    @project_access = project_access
    @query = query.to_s.strip
    @board_id = board_id.presence&.to_i
    @project_id = project_id.presence&.to_i
  end

  def results
    people = member_results
    return people if @query.empty? || people.length >= LIMIT

    people + item_results.first(LIMIT - people.length)
  end

  private

  def member_results
    memberships = @team.memberships.joins(:user).merge(User.active).includes(user: User::AVATAR_PRELOAD)
    memberships = memberships.where("LOWER(memberships.nickname) LIKE ? ESCAPE '\\'", contains_pattern) if @query.present?
    memberships.order(Arel.sql(prefix_order("memberships.nickname")), Arel.sql("LOWER(memberships.nickname)")).limit(LIMIT).map do |membership|
      Result.new("user", membership)
    end
  end

  def item_results
    ITEM_TYPES.select { |type| enabled?(type) }.flat_map { |type| type_results(type) }
      .sort_by { |result| [ result.prefix ? 0 : 1, result.context_rank, -result.record.updated_at.to_f ] }
  end

  def type_results(type)
    column = title_column(type)
    relation = scope(type)
    relation.where(title_attribute(type).lower.matches(contains_pattern, "\\", true))
      .order(Arel.sql(prefix_order(column)), Arel.sql(context_order(type)), "#{relation.table_name}.updated_at DESC")
      .limit(LIMIT).map do |record|
        title = type == "project" ? record.name : record.title
        Result.new(type, record, title.downcase.start_with?(@query.downcase), context_rank(type, record))
      end
  end

  def scope(type)
    case type
    when "ticket" then Ticket.without_description.where(team: @team, board: visible_boards).includes(board: :project)
    when "page" then @project_access.scope(@team.pages.without_content).includes(:project)
    when "diagram" then @project_access.scope(@team.diagrams.without_content).includes(:project)
    when "board" then visible_boards.includes(:project)
    when "project" then @team.projects.where(id: @project_access.visible_project_ids)
    end
  end

  def visible_boards
    @project_access.scope(@team.boards)
  end

  def enabled?(type)
    TYPE_FEATURES[type].nil? || @team.feature_enabled?(TYPE_FEATURES[type])
  end

  def title_attribute(type)
    type == "project" ? Project.arel_table[:name] : type.classify.constantize.arel_table[:title]
  end

  def title_column(type)
    case type
    when "ticket" then "tickets.title"
    when "page" then "pages.title"
    when "diagram" then "diagrams.title"
    when "board" then "boards.title"
    when "project" then "projects.name"
    end
  end

  def context_order(type)
    case type
    when "ticket"
      ActiveRecord::Base.sanitize_sql_array([ "CASE WHEN tickets.board_id = ? THEN 0 WHEN tickets.board_id IN (SELECT id FROM boards WHERE project_id = ?) THEN 1 ELSE 2 END", @board_id, @project_id ])
    when "board"
      ActiveRecord::Base.sanitize_sql_array([ "CASE WHEN boards.id = ? THEN 0 WHEN boards.project_id = ? THEN 1 ELSE 2 END", @board_id, @project_id ])
    when "project"
      ActiveRecord::Base.sanitize_sql_array([ "CASE WHEN projects.id = ? THEN 1 ELSE 2 END", @project_id ])
    else
      ActiveRecord::Base.sanitize_sql_array([ "CASE WHEN #{type}s.project_id = ? THEN 1 ELSE 2 END", @project_id ])
    end
  end

  def context_rank(type, record)
    case type
    when "ticket"
      return 0 if @board_id && record.board_id == @board_id

      @project_id && record.board.project_id == @project_id ? 1 : 2
    when "board"
      return 0 if @board_id && record.id == @board_id

      @project_id && record.project_id == @project_id ? 1 : 2
    when "project" then @project_id && record.id == @project_id ? 1 : 2
    else @project_id && record.project_id == @project_id ? 1 : 2
    end
  end

  def prefix_order(column)
    ActiveRecord::Base.sanitize_sql_array([ "CASE WHEN LOWER(#{column}) LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END", prefix_pattern ])
  end

  def contains_pattern
    "%#{ActiveRecord::Base.sanitize_sql_like(@query.downcase)}%"
  end

  def prefix_pattern
    "#{ActiveRecord::Base.sanitize_sql_like(@query.downcase)}%"
  end
end

class MentionsController < ApplicationController
  QUERY_MAX_LENGTH = 200
  RESOLVE_LIMIT = 200

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!

  def search
    results = MentionSearch.new(
      team: @team,
      project_access: project_access,
      query: params[:q].to_s.strip.first(QUERY_MAX_LENGTH),
      board_id: params[:board_id],
      project_id: params[:project_id]
    ).results

    render json: { results: results.map { |result| search_result_json(result) } }
  end

  def resolve
    refs = resolve_mentions_params.map { |mention| [ mention[:type].to_s, mention[:id].to_s ] }
    return render_error(ErrorCodes::Mentions::TOO_MANY_MENTIONS, :unprocessable_entity) if refs.length > RESOLVE_LIMIT
    return render_error(ErrorCodes::Mentions::INVALID_MENTION, :unprocessable_entity) unless refs.all? { |type, id| Mentions::TYPES.include?(type) && id.match?(/\A\d+\z/) }

    resolved = MentionResolver.new(team: @team, project_access: project_access).resolve(refs.map { |type, id| [ type, id.to_i ] })
    render json: { mentions: resolved.map { |mention| resolved_json(mention) } }
  end

  private

  def search_result_json(result)
    record = result.record
    case result.type
    when "user"
      { type: "user", id: record.user_id, title: record.nickname, subtitle: nil, avatar: avatar_json(record.user) }
    when "ticket"
      { type: "ticket", id: record.id, title: record.title, subtitle: record.board.title, board_id: record.board_id, in_backlog: record.column_id.nil? }
    when "project"
      { type: "project", id: record.id, title: record.name, subtitle: nil }
    else
      { type: result.type, id: record.id, title: record.title, subtitle: record.project&.name }
    end
  end

  def resolved_json(mention)
    json = { type: mention.type, id: mention.id, status: mention.status }
    record = mention.record

    case mention.status
    when "removed"
      json.merge(nickname: record.nickname)
    when "ok"
      case mention.type
      when "user" then json.merge(nickname: record.nickname, avatar: avatar_json(record.user))
      when "ticket" then json.merge(title: record.title, board_id: record.board_id, in_backlog: record.column_id.nil?)
      when "project" then json.merge(title: record.name)
      else json.merge(title: record.title)
      end
    else
      json
    end
  end
end

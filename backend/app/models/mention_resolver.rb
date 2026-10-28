class MentionResolver
  TYPE_FEATURES = MentionSearch::TYPE_FEATURES

  Resolved = Struct.new(:type, :id, :status, :record)

  def initialize(team:, project_access:)
    @team = team
    @project_access = project_access
  end

  def resolve(refs)
    records = refs.group_by(&:first).to_h { |type, typed_refs| [ type, load(type, typed_refs.map(&:last).uniq) ] }

    refs.map do |type, id|
      record = records[type][id]
      Resolved.new(type, id, status(type, record), record)
    end
  end

  private

  def load(type, ids)
    relation = case type
    when "user" then @team.all_memberships.where(user_id: ids).includes(user: User::AVATAR_PRELOAD)
    when "ticket" then Ticket.without_description.where(team: @team, id: ids).includes(:board)
    when "page" then @team.pages.without_content.where(id: ids)
    when "diagram" then @team.diagrams.without_content.where(id: ids)
    when "board" then @team.boards.where(id: ids)
    when "project" then @team.projects.where(id: ids)
    end
    relation.index_by { |record| type == "user" ? record.user_id : record.id }
  end

  def status(type, record)
    return "deleted" if record.nil? || (type == "ticket" && record.board.nil?)
    return record.removed_at.nil? && record.user.deleted_at.nil? ? "ok" : "removed" if type == "user"
    return "hidden" if TYPE_FEATURES[type] && !@team.feature_enabled?(TYPE_FEATURES[type])

    @project_access.visible?(record) ? "ok" : "hidden"
  end
end

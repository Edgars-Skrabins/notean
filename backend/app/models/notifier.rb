class Notifier
  def self.owners(item)
    owner_ids_by_item([ item ])[item.id]
  end

  def self.assigned(tickets, actor, users)
    deliver("assigned", Array(tickets), actor) { user_ids(users) }
  end

  def self.unassigned(tickets, actor, users)
    deliver("unassigned", Array(tickets), actor) { user_ids(users) }
  end

  def self.commented(item, actor, recipients:, excerpt:, except: [])
    user_ids = owners(item) | user_ids(recipients)
    deliver("commented", [ item ], actor, excerpt: excerpt&.truncate(Notification::EXCERPT_MAX_LENGTH)) { user_ids - user_ids(except) }
  end

  def self.mentioned(item, actor, users, excerpt:)
    deliver("mentioned", [ item ], actor, excerpt: excerpt&.truncate(Notification::EXCERPT_MAX_LENGTH)) { user_ids(users) }
  end

  def self.item_changed(items, actor, fields)
    items = Array(items)
    return if items.empty? || fields.empty?

    owner_ids = owner_ids_by_item(items)
    recipients = visible_recipient_ids(items.first, actor, owner_ids.values.flatten)
    return if recipients.empty?

    now = Time.current
    existing = Notification.where(kind: "item_changed", read_at: nil, item_type: items.first.class.name, item_id: items.map(&:id), user_id: recipients)
    existing_pairs = existing.pluck(:id, :user_id, :item_id)
    collapse(existing, items, actor, fields, now) if existing_pairs.any?

    collapsed = existing_pairs.map { |_, user_id, item_id| [ user_id, item_id ] }
    rows = items.flat_map do |item|
      (owner_ids[item.id] & recipients).reject { |user_id| collapsed.include?([ user_id, item.id ]) }.map do |user_id|
        row("item_changed", item, actor, user_id, now, changed_fields: fields)
      end
    end

    NotificationBroadcast.upserted(existing_pairs.map(&:first) + insert(rows))
  end

  def self.item_deleted(item, actor, &block)
    items_deleted([ item ], actor, &block)
  end

  def self.items_deleted(items, actor)
    items = Array(items)
    return yield if items.empty? || !Notification::FEATURES.key?(items.first.class.name)

    owner_ids = owner_ids_by_item(items)
    recipients = visible_recipient_ids(items.first, actor, owner_ids.values.flatten)
    snapshots = items.map { |item| [ item, owner_ids[item.id] & recipients ] }
    team = items.first.team
    earlier = Notification.where(item_type: items.first.class.name, item_id: items.map(&:id))
    removed = earlier.pluck(:id, :user_id).group_by(&:last)

    result = yield
    earlier.delete_all

    now = Time.current
    rows = snapshots.flat_map do |item, user_ids|
      user_ids.map { |user_id| row("item_deleted", item, actor, user_id, now).merge(item_id: nil) }
    end
    inserted = insert(rows)

    NotificationBroadcast.removed(team, User.where(id: removed.keys).map { |user| [ user, removed[user.id].map(&:first) ] })
    NotificationBroadcast.upserted(inserted)
    result
  end

  def self.deliver(kind, items, actor, **attributes)
    return if items.empty?

    recipients = visible_recipient_ids(items.first, actor, yield)
    return if recipients.empty?

    now = Time.current
    rows = items.flat_map { |item| recipients.map { |user_id| row(kind, item, actor, user_id, now, **attributes) } }
    NotificationBroadcast.upserted(insert(rows))
  end

  def self.visible_recipient_ids(item, actor, user_ids)
    feature = Notification::FEATURES[item.class.name]
    return [] if feature && !item.team.feature_enabled?(feature)

    candidate_ids = user_ids.compact.uniq - [ actor.id ]
    return [] if candidate_ids.empty?

    ProjectAccess.users_who_can_see(item).merge(User.active).where(id: candidate_ids).pluck(:id)
  end

  def self.owner_ids_by_item(items)
    owner_ids = items.to_h { |item| [ item.id, [ item.created_by_user_id ] ] }
    if items.first.is_a?(Ticket)
      TicketAssignee.where(ticket_id: items.map(&:id)).pluck(:ticket_id, :user_id).each { |ticket_id, user_id| owner_ids[ticket_id] |= [ user_id ] }
    end
    owner_ids
  end

  def self.collapse(existing, items, actor, fields, now)
    existing.update_all([
      "changed_fields = ARRAY(SELECT DISTINCT field FROM unnest(changed_fields || ARRAY[?]::varchar[]) AS field ORDER BY field), " \
      "event_count = event_count + 1, actor_user_id = ?, occurred_at = ?, updated_at = ?, " \
      "item_title = COALESCE((SELECT title FROM unnest(ARRAY[?]::bigint[], ARRAY[?]::varchar[]) AS titles(id, title) WHERE titles.id = item_id), item_title)",
      fields, actor.id, now, now, items.map(&:id), items.map { |item| title_of(item) }
    ])
  end

  def self.row(kind, item, actor, user_id, now, **attributes)
    {
      user_id: user_id,
      team_id: item.team_id,
      actor_user_id: actor.id,
      kind: kind,
      item_type: item.class.name,
      item_id: item.id,
      item_title: title_of(item),
      board_id: item.is_a?(Ticket) ? item.board_id : nil,
      project_id: ProjectAccess.project_id_of(item),
      occurred_at: now,
      created_at: now,
      updated_at: now,
      **attributes
    }
  end

  def self.insert(rows)
    return [] if rows.empty?

    Notification.insert_all(rows, returning: :id).rows.flatten
  end

  def self.title_of(item)
    item.is_a?(Project) ? item.name : item.title
  end

  def self.user_ids(users)
    Array(users).map { |user| user.is_a?(User) ? user.id : user.to_i }
  end

  private_class_method :deliver, :visible_recipient_ids, :owner_ids_by_item, :collapse, :row, :insert, :title_of, :user_ids
end

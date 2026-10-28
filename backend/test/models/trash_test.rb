require "test_helper"

class TrashTest < ActiveSupport::TestCase
  setup do
    @team = Team.create!(name: "Engineering", password: "supersecret")
    @user = create_member(@team, "Alice")
    @user.memberships.first.update!(role: "owner")
    @board = Board.create!(team: @team, creator: @user, title: "Sprint")
    @column = Column.create!(board: @board, title: "To Do", position: 0)
  end

  def create_page(title, folder: nil)
    Page.create!(team: @team, creator: @user, title: title, folder: folder, project: folder&.project)
  end

  def create_folder(title, parent: nil)
    Folder.create!(team: @team, creator: @user, title: title, item_type: "Page", parent: parent)
  end

  def create_tickets(column, count, board: @board)
    Array.new(count) { |index| Ticket.create!(board: board, column: column, team: @team, creator: @user, title: "Ticket #{index}", position: index) }
  end

  def positions(tickets)
    Ticket.unscoped.where(id: tickets.map(&:id)).order(:id).pluck(:position)
  end

  test "trashed items are hidden from default queries but reachable unscoped" do
    page = create_page("Notes")

    entry = Trash.move(page, @user)

    assert_not Page.exists?(page.id)
    assert_equal entry.id, Page.unscoped.find(page.id).trash_entry_id
    assert_equal page, entry.item
  end

  test "moving a page keeps its lock version" do
    page = create_page("Notes")

    Trash.move(page, @user)

    assert_equal page.lock_version, Page.unscoped.find(page.id).lock_version
  end

  test "moving a folder hides its whole tree under one entry" do
    root = create_folder("Root")
    child = create_folder("Child", parent: root)
    page = create_page("Inside", folder: child)
    outside = create_page("Outside")

    entry = Trash.move(root, @user)

    assert_equal [ entry.id ] * 3, [ root, child ].map { |folder| Folder.unscoped.find(folder.id).trash_entry_id } + [ Page.unscoped.find(page.id).trash_entry_id ]
    assert Page.exists?(outside.id)
    assert_equal 1, TrashEntry.count
  end

  test "moving a board hides its tickets" do
    tickets = create_tickets(@column, 2)

    entry = Trash.move(@board, @user)

    assert_empty Ticket.where(id: tickets.map(&:id))
    assert_equal [ entry.id ] * 2, Ticket.unscoped.where(id: tickets.map(&:id)).pluck(:trash_entry_id)
  end

  test "moving tickets creates one entry each and keeps the remaining positions dense" do
    tickets = create_tickets(@column, 5)

    entries, shifts = Trash.move_tickets(@board, [ tickets[1], tickets[3] ], @user)

    assert_equal 2, entries.length
    assert_equal [ 0, 1, 2 ], @column.tickets.reload.map(&:position)
    assert_equal [ { column_id: @column.id, from_position: 2, to_position: 2, delta: -1 }, { column_id: @column.id, from_position: 4, to_position: nil, delta: -2 } ], shifts
  end

  test "restoring a ticket appends it to the end of its column" do
    tickets = create_tickets(@column, 3)
    entries, = Trash.move_tickets(@board, [ tickets[0] ], @user)

    Trash.restore(entries.first)

    assert_equal [ 2, 0, 1 ], positions(tickets)
    assert_equal @column.id, tickets[0].reload.column_id
    assert_not TrashEntry.exists?(entries.first.id)
  end

  test "restoring a ticket whose column is gone puts it at the end of the backlog" do
    backlog = create_tickets(nil, 2)
    ticket = create_tickets(@column, 1).first
    entries, = Trash.move_tickets(@board, [ ticket ], @user)
    @column.destroy!

    Trash.restore(entries.first)

    ticket.reload
    assert_nil ticket.column_id
    assert_equal 2, ticket.position
    assert_equal [ 0, 1 ], positions(backlog)
  end

  test "a ticket of a trashed board can't be restored and the board's restore leaves it in the trash" do
    ticket = create_tickets(@column, 1).first
    ticket_entries, = Trash.move_tickets(@board, [ ticket ], @user)
    board_entry = Trash.move(@board, @user)

    assert_raises(Trash::BoardInTrash) { Trash.restore(ticket_entries.first) }

    Trash.restore(board_entry)
    assert_not Ticket.exists?(ticket.id)
    assert TrashEntry.exists?(ticket_entries.first.id)
  end

  test "restoring an item whose folder is trashed or gone moves it to the top level" do
    folder = create_folder("Folder")
    other = create_folder("Other")
    page = create_page("In trashed folder", folder: folder)
    lost = create_page("In deleted folder", folder: other)
    page_entry = Trash.move(page, @user)
    lost_entry = Trash.move(lost, @user)
    Trash.move(folder, @user)
    other.destroy!

    Trash.restore(page_entry)
    Trash.restore(lost_entry)

    assert_nil page.reload.folder_id
    assert_nil lost.reload.folder_id
  end

  test "restoring a page into a live folder keeps it there" do
    folder = create_folder("Folder")
    page = create_page("Notes", folder: folder)
    entry = Trash.move(page, @user)

    Trash.restore(entry)

    assert_equal folder.id, page.reload.folder_id
  end

  test "purging a board removes its tickets, separately trashed ones and their favorites" do
    tickets = create_tickets(@column, 2)
    Favorite.create!(user: @user, team: @team, favoritable: tickets[0], home_position: 0, sidebar_position: 0)
    Trash.move_tickets(@board, [ tickets[1] ], @user)
    entry = Trash.move(@board, @user)

    Trash.purge(entry)

    assert_not Board.unscoped.exists?(@board.id)
    assert_empty Ticket.unscoped.where(id: tickets.map(&:id))
    assert_equal 0, TrashEntry.count
    assert_equal 0, Favorite.count
  end

  test "purging removes comments, diagram comment pins and ticket tags" do
    page = create_page("Notes")
    diagram = Diagram.create!(team: @team, creator: @user, title: "Flow", content: "")
    pin = DiagramCommentPin.create!(team: @team, diagram: diagram, creator: @user, x: 1, y: 2)
    tag = BoardTag.create!(board: @board, name: "bug", color: "red")
    tickets = create_tickets(@column, 2)
    tickets.each { |ticket| TicketTag.create!(ticket: ticket, tag: tag) }
    [ page, pin, tickets[0] ].each { |commentable| Comment.create!(team: @team, commentable: commentable, creator: @user, body: "<p>Hi</p>") }
    ticket_entries, = Trash.move_tickets(@board, [ tickets[0] ], @user)
    entries = [ Trash.move(page, @user), Trash.move(diagram, @user) ]

    Trash.purge(ticket_entries.first)
    assert_equal [ tickets[1].id ], TicketTag.pluck(:ticket_id)

    (entries + [ Trash.move(@board, @user) ]).each { |entry| Trash.purge(entry) }
    assert_equal 0, Comment.count
    assert_equal 0, DiagramCommentPin.count
    assert_equal 0, TicketTag.count
    assert_equal 0, BoardTag.count
  end

  test "purging a folder removes its tree and pages trashed inside it earlier" do
    root = create_folder("Root")
    child = create_folder("Child", parent: root)
    earlier = create_page("Earlier", folder: child)
    later = create_page("Later", folder: root)
    Trash.move(earlier, @user)
    entry = Trash.move(root, @user)

    Trash.purge(entry)

    assert_empty Folder.unscoped.where(id: [ root.id, child.id ])
    assert_empty Page.unscoped.where(id: [ earlier.id, later.id ])
    assert_equal 0, TrashEntry.count
  end

  test "expired picks entries older than the retention period" do
    old = Trash.move(create_page("Old"), @user)
    old.update_column(:created_at, 15.days.ago)
    Trash.move(create_page("Fresh"), @user)

    assert_equal [ old ], TrashEntry.expired.to_a
  end

  test "destroying a team purges its trash" do
    Trash.move(create_page("Notes"), @user)
    Trash.move_tickets(@board, create_tickets(@column, 1), @user)

    @team.destroy!

    assert_equal 0, TrashEntry.count
    assert_equal 0, Page.unscoped.count
    assert_equal 0, Ticket.unscoped.count
  end

  test "destroying a project releases its trashed items" do
    project = Project.create!(team: @team, name: "Game", owner: @user, creator: @user)
    page = Page.create!(team: @team, creator: @user, title: "Notes", project: project)
    entry = Trash.move(page, @user)

    project.destroy!

    assert_nil Page.unscoped.find(page.id).project_id
    assert_nil entry.reload.project_id
  end

  test "removing a member drops their assignments on trashed tickets" do
    bob = create_member(@team, "Bob")
    ticket = create_tickets(@column, 1).first
    TicketAssignee.create!(ticket: ticket, user: bob)
    Trash.move(@board, @user)

    MembershipRemoval.apply(bob.memberships.first)

    assert_not TicketAssignee.exists?(ticket_id: ticket.id)
  end
end

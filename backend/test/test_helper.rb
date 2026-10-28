ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
    IGNORED_QUERY = /\A\s*(BEGIN|COMMIT|SAVEPOINT|RELEASE|ROLLBACK)/i

    def query_count(&block)
      count = 0
      counter = lambda do |*, payload|
        count += 1 unless payload[:name] == "SCHEMA" || payload[:sql].match?(IGNORED_QUERY)
      end
      ActiveSupport::Notifications.subscribed(counter, "sql.active_record", &block)
      count
    end

    def ticket_description_selects(&block)
      queries = []
      collector = lambda do |*, payload|
        select_list = payload[:sql][/\ASELECT ([^()]*?) FROM "tickets"/, 1]
        queries << payload[:sql] if select_list&.match?(/"tickets"\.\*|"description"/)
      end
      ActiveSupport::Notifications.subscribed(collector, "sql.active_record", &block)
      queries
    end

    def create_member(team, nickname, with_avatar: false)
      user = User.create!(email: "#{nickname.downcase}@example.com", password: "supersecret")
      Membership.create!(user: user, team: team, nickname: nickname)
      attach_avatar(user) if with_avatar
      user
    end

    def session_token(user)
      JsonWebToken.encode(session_id: user.user_sessions.create!(last_used_at: Time.current).id)
    end

    def attach_avatar(user)
      user.avatar_image.attach(io: file_fixture("avatar.png").open, filename: "avatar.png", content_type: "image/png")
    end

    def board_broadcasts(board)
      broadcasts(BoardChannel.stream_name(board)).map { |message| ::JSON.parse(message) }
    end

    def ticket_broadcast_json(ticket_json)
      ticket_json.slice("id", "title", "position", "column_id", "priority_id", "lock_version", "assignees", "tag_ids", "created_at", "updated_at", "description")
    end

    def nickname_for(index)
      "Member#{("a".."z").to_a[index]}"
    end
  end
end

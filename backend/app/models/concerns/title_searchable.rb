module TitleSearchable
  extend ActiveSupport::Concern

  included do
    scope :search_title, lambda { |term|
      next all if term.blank?

      where("LOWER(title) LIKE ? ESCAPE '\\'", "%#{sanitize_sql_like(term.downcase)}%")
    }
  end
end

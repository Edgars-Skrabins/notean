module TextSearchable
  extend ActiveSupport::Concern

  class_methods do
    def text_searchable(*columns)
      class_attribute :text_search_columns, instance_writer: false, default: columns.freeze

      scope :text_search, lambda { |term|
        conditions = text_search_columns.map { |column| "LOWER(#{table_name}.#{column}) LIKE :pattern ESCAPE '\\'" }

        where(conditions.join(" OR "), pattern: text_search_pattern(term))
      }

      scope :title_match_first, lambda { |term|
        title_match = sanitize_sql_array([
          "CASE WHEN LOWER(#{table_name}.#{text_search_columns.first}) LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END",
          text_search_pattern(term)
        ])

        order(Arel.sql(title_match), Arel.sql("#{table_name}.updated_at DESC"))
      }
    end

    def text_search_pattern(term)
      "%#{sanitize_sql_like(term.to_s.downcase)}%"
    end
  end
end

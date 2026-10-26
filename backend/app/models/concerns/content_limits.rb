module ContentLimits
  extend ActiveSupport::Concern

  TITLE_MAX_LENGTH = 200
  CONTENT_MAX_BYTES = 1.megabyte
  DESCRIPTION_MAX_LENGTH = 10_000
end
